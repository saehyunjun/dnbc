// Pipeline jobs (stories, and later write, check, schedule). Ingest jobs live in registry.ts.

import type { Job } from './registry.ts';
import { buildStories, airable } from '../../src/lib/pipeline/stories.ts';
import { writeStory, writeCatalyst, catalystItem, pickCatalysts, shortDrug, type PipelineCounts } from '../../src/lib/pipeline/write-templates.ts';
import { pipelineOf } from '../../src/lib/ingest/ctgov.ts';
import type { Segment } from '../../src/lib/types.ts';

const DAY = 86400_000;

export const PIPELINE_JOBS: Record<string, Job> = {
	stories: async (store, [days]) => {
		const since = new Date(Date.now() - Number(days ?? 7) * DAY).toISOString();
		const items = await store.getItems({ since });
		const stories = buildStories(items);
		await store.putStories(stories);
		const by = stories.reduce<Record<string, number>>((m, s) => ((m[s.kind] = (m[s.kind] ?? 0) + 1), m), {});
		console.log(`stories: ${stories.length} from ${items.length} items`, by);
		for (const s of stories.slice(0, 8)) console.log(`  ${s.score.toFixed(2)} ${s.kind.padEnd(12)} ${s.title.slice(0, 90)}`);
	},

	/** Template segments for every airable story with a template, plus the catalyst calendar. */
	write: async (store, [days, dry]) => {
		const now = Date.now();
		const since = new Date(now - Number(days ?? 7) * DAY).toISOString();
		const items = new Map((await store.getItems({ since })).map((i) => [i.id, i]));
		const stories = (await store.getStories({ since })).filter(airable);
		const pipelines = new Map<string, PipelineCounts[]>();
		for (const s of stories.filter((x) => x.kind === 'registration')) {
			const sponsor = s.entities.sponsors[0];
			if (!sponsor) continue;
			const drug = shortDrug(s.entities.drugs);
			const raw = s.entities.drugs.find((d) => d.startsWith(drug ?? '\u0000'));
			pipelines.set(`${sponsor}|${drug ?? ''}`, await pipelineOf(store, sponsor, raw));
		}
		const out: Segment[] = [];
		const why = new Map<string, number>();
		for (const s of stories) {
			const r = writeStory(s, { items, pipelines, now });
			if (r.segment) out.push(r.segment);
			else why.set(r.dropped[0]?.replace(/beat \d+ /, '') ?? '?', (why.get(r.dropped[0]?.replace(/beat \d+ /, '') ?? '?') ?? 0) + 1);
		}
		// This Day in Approvals: anniversaries for today and the next 6 days (drugsfda caches by day).
		const days7 = new Set(Array.from({ length: 7 }, (_, k) => new Date(now + k * DAY).toISOString().slice(5, 10)));
		for (const it of await store.getItems({ source: 'drugsfda' })) {
			if (!days7.has(String(it.meta?.monthDay ?? ''))) continue;
			items.set(it.id, it);
			const st = { id: `story-${it.id}`, itemIds: [it.id], kind: it.kind, title: it.title, entities: it.entities, score: 0, firstSeen: it.publishedAt, updatedAt: it.publishedAt };
			const r = writeStory(st, { items, now });
			if (r.segment) out.push(r.segment);
			else why.set(`anniversary: ${r.dropped[0]}`, (why.get(`anniversary: ${r.dropped[0]}`) ?? 0) + 1);
		}
		const cats = pickCatalysts(await store.getTrials(), now);
		const catItems = [];
		for (const [area, trials] of cats) {
			const it = catalystItem(area, trials, now);
			catItems.push(it);
			const r = writeCatalyst(area, it, trials, { items: new Map([[it.id, it]]), now });
			if (r.segment) out.push(r.segment);
			else why.set(`catalyst: ${r.dropped[0]}`, 1);
		}
		const by = out.reduce<Record<string, number>>((m, x) => ((m[x.format] = (m[x.format] ?? 0) + 1), m), {});
		console.log(`write: ${out.length} segments from ${stories.length} airable stories`, by);
		for (const [k, n] of [...why].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  not written (${n}): ${k}`);
		if (dry === 'dry') {
			for (const seg of out.slice(0, 3)) console.log(JSON.stringify(seg.beats.map((b) => ('text' in b ? b.text : b.type === 'stat' ? `${b.value}: ${b.label}` : b.type))));
			return;
		}
		if (catItems.length) await store.putItems(catItems);
		await store.putSegments(out);
	}
};
