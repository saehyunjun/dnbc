// Pipeline jobs (stories, and later write, check, schedule). Ingest jobs live in registry.ts.

import { itemScope, segmentInScope, storyInScope } from '../../src/lib/channel/scope.ts';
import type { Job } from './registry.ts';
import { buildStories, airable } from '../../src/lib/pipeline/stories.ts';
import { writeStory, writeCatalyst, catalystItem, pickCatalysts, shortDrug, topSponsors, profileItem, writeProfile, type PipelineCounts } from '../../src/lib/pipeline/write-templates.ts';
import { writeWithModel, checkWritten, assertPaidRun, Budget, WRITER_MODEL } from '../../src/lib/pipeline/write-model.ts';
import { applyTiming } from '../../src/lib/channel/timing.ts';
import { pipelineOf } from '../../src/lib/ingest/ctgov.ts';
import { citationsFor, isSourceLine } from '../../src/lib/pipeline/citations.ts';
import { verifySource } from '../../src/lib/pipeline/verify-source.ts';
import { buildPlaylist } from '../../src/lib/pipeline/schedule.ts';
import { addDays, channelDay } from '../../src/lib/channel/time.ts';
import type { Segment, SourceItem } from '../../src/lib/types.ts';
import type { Trial } from '../../src/lib/store/index.ts';

const DAY = 86400_000;
const STALE_MS = 3 * 3600_000;

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
		// Scope (docs/PLAN.md section 0): only neurology, psychiatry, and brain cancer stories are written.
		const all = (await store.getStories({ since })).filter(airable);
		const stories = all.filter((s) => storyInScope(s, items));
		console.log(`write: ${stories.length} of ${all.length} airable stories in scope`);
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
			if (!itemScope(it).length) continue; // This Day in Approvals keeps in-scope drugs only
			items.set(it.id, it);
			const st = { id: `story-${it.id}`, itemIds: [it.id], kind: it.kind, title: it.title, entities: it.entities, score: 0, firstSeen: it.publishedAt, updatedAt: it.publishedAt };
			const r = writeStory(st, { items, now });
			if (r.segment) out.push(r.segment);
			else why.set(`anniversary: ${r.dropped[0]}`, (why.get(`anniversary: ${r.dropped[0]}`) ?? 0) + 1);
		}
		const by = out.reduce<Record<string, number>>((m, x) => ((m[x.format] = (m[x.format] ?? 0) + 1), m), {});
		console.log(`write: ${out.length} segments from ${stories.length} airable stories`, by);
		for (const [k, n] of [...why].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  not written (${n}): ${k}`);
		if (dry === 'dry') {
			for (const seg of out.slice(0, 3)) console.log(JSON.stringify(seg.beats.map((b) => ('text' in b ? b.text : b.type === 'stat' ? `${b.value}: ${b.label}` : b.type))));
			return;
		}
		await store.putSegments(out);
	},

	/** Model segments for stories with no template. Paid: PIQ_PAID_RUN=1, cap DNBC_BUDGET_USD (default 0.25). */
	'write-model': async (store, [limit, days, dry]) => {
		assertPaidRun();
		const now = Date.now();
		const budget = new Budget(Number(process.env.DNBC_BUDGET_USD ?? 0.25));
		const since = new Date(now - Number(days ?? 7) * DAY).toISOString();
		const items = new Map((await store.getItems({ since })).map((i) => [i.id, i]));
		const done = new Set((await store.getSegments({ library: false, since })).map((s) => s.storyId));
		const todo = (await store.getStories({ since }))
			.filter(airable)
			.filter((s) => !done.has(s.id) && writeStory(s, { items, now }).dropped[0]?.includes('model writer'))
			.sort((a, b) => b.score - a.score)
			.slice(0, Number(limit ?? 3));
		console.log(`write-model: ${todo.length} stories, ${WRITER_MODEL}, cap $${budget.cap}`);
		const out: Segment[] = [];
		for (const s of todo) {
			const r = await writeWithModel(s, { items, now }, budget);
			if (r.segment) {
				r.segment.duration = applyTiming(r.segment.beats);
				out.push(r.segment);
			}
			console.log(`  ${r.segment ? 'ok  ' : 'drop'} ${s.title.slice(0, 70)}`);
			for (const d of r.dropped.slice(0, 4)) console.log(`       x ${d}`);
			if (dry === 'dry' && r.segment)
				for (const b of r.segment.beats)
					console.log(`       [${b.type}] ${'text' in b ? b.text : b.type === 'stat' ? `${b.value}: ${b.label}` : b.type === 'panel' ? b.lines.map((l) => `${l.who}: ${l.text}`).join(' / ') : ''}`);
		}
		console.log(`write-model: ${out.length} kept, spent $${budget.spent.toFixed(3)}`);
		if (dry !== 'dry') await store.putSegments(out);
	},

	/** Library segments from the trial snapshot: Catalyst Calendar and one Pipeline Profile per top sponsor. Runs daily. */
	'write-library': async (store, [count, dry]) => {
		const now = Date.now();
		const items: SourceItem[] = [];
		const out: Segment[] = [];
		const why = new Map<string, number>();
		// Catalyst Calendar: Phase 3 completions due in the next 30 days (filtered in SQL).
		const due = await store.getTrials({ due: { from: new Date(now).toISOString().slice(0, 10), to: new Date(now + 30 * DAY).toISOString().slice(0, 10) } });
		for (const [area, trials] of pickCatalysts(due, now)) {
			const it = catalystItem(area, trials, now);
			const r = writeCatalyst(area, it, trials, { items: new Map([[it.id, it]]), now });
			if (r.segment) {
				items.push(it);
				out.push(r.segment);
			} else why.set(`catalyst: ${r.dropped[0]}`, 1);
		}
		// Pipeline Profiles: the top sponsors by active trials, one query each.
		const top = new Map<string, Trial[]>();
		for (const { sponsor } of await store.sponsorCounts(Number(count ?? 60)))
			top.set(sponsor, [...topSponsors(await store.getTrials({ sponsor }), 1).values()][0] ?? []);
		for (const [sponsor, trials] of top) {
			const it = profileItem(sponsor, trials, now);
			const r = writeProfile(it, { items: new Map([[it.id, it]]), now });
			if (r.segment) {
				items.push(it);
				out.push(r.segment);
			} else why.set(r.dropped[0] ?? '?', (why.get(r.dropped[0] ?? '?') ?? 0) + 1);
		}
		console.log(`write-library: ${out.length} segments (catalysts and ${top.size} profiles)`);
		for (const [k, n] of why) console.log(`  not written (${n}): ${k}`);
		if (dry === 'dry') {
			for (const b of out[0]?.beats ?? []) console.log(`  [${b.type}] ${'text' in b ? b.text : b.type === 'list' ? `${b.title}: ${b.items.join('; ')}` : b.type === 'pipeline' ? b.phases.map((p) => `${p.phase} ${p.count}`).join(', ') : ''}`);
			return;
		}
		await store.putItems(items);
		await store.putSegments(out);
	},

	/** One-off migration: stored segments lose their spoken "Source:" lines and gain footnotes. */
	cite: async (store, [dry]) => {
		const segs = await store.getSegments();
		const ids = [...new Set(segs.flatMap((s) => s.beats.flatMap((b) => b.sources ?? [])))];
		const items = new Map((await store.getItems({ ids })).map((i) => [i.id, i]));
		let stripped = 0;
		for (const s of segs) {
			const before = s.beats.length;
			s.beats = s.beats.filter((b) => !isSourceLine(b));
			stripped += before - s.beats.length;
			s.duration = applyTiming(s.beats);
			s.citations = citationsFor(s.beats, items);
		}
		const none = segs.filter((s) => !s.citations?.length).length;
		console.log(`cite: ${segs.length} segments, ${stripped} source lines removed, ${none} with no citation`);
		if (dry !== 'dry') await store.putSegments(segs);
	},

	/** Build playlists. No day: today and tomorrow (ET channel days). `schedule <day> [dry]` builds one day. `dry` prints without saving. */
	schedule: async (store, [dayArg, dry]) => {
		const now = Date.now();
		const days = dayArg && dayArg !== '-' ? [dayArg] : [channelDay(now), addDays(channelDay(now), 1)];
		const since = new Date(now - 7 * DAY).toISOString();
		const pool = [...(await store.getSegments({ library: false, since })), ...(await store.getSegments({ library: true }))];
		const storyIds = [...new Set(pool.map((s) => s.storyId).filter((x): x is string => !!x))];
		const stories = storyIds.length ? await store.getStories({ ids: storyIds }) : [];
		// Scope (docs/PLAN.md section 0): out-of-scope segments stay in the store but never air.
		const storyById = new Map(stories.map((s) => [s.id, s]));
		const segments = pool.filter((g) => segmentInScope(g, g.storyId ? storyById.get(g.storyId) : undefined));
		console.log(`schedule: ${segments.length} of ${pool.length} segments in scope`);
		for (const day of days) {
			const prev = await store.getPlaylist(day);
			const { playlist, stats } = buildPlaylist(day, {
				segments,
				kindOf: new Map(stories.map((s) => [s.id, s.kind])),
				score: new Map(stories.map((s) => [s.id, s.score])),
				version: (prev?.version ?? 0) + 1
			});
			const total = stats.liveSeconds + stats.librarySeconds + stats.padSeconds;
			const pct = (x: number) => `${Math.round((100 * x) / total)}%`;
			console.log(`schedule ${day}: ${stats.wheels} wheels from ${segments.length} segments. Live ${pct(stats.liveSeconds)}, library ${pct(stats.librarySeconds)}, padding ${pct(stats.padSeconds)}`);
			const byShow = new Map<string, { air: number; pad: number }>();
			for (const s of playlist.slots) {
				const v = byShow.get(s.show) ?? { air: 0, pad: 0 };
				for (const e of s.entries) v[e.kind === 'pad' ? 'pad' : 'air'] += e.duration / 1000;
				byShow.set(s.show, v);
			}
			for (const [show, v] of byShow) console.log(`  ${show.padEnd(16)} ${Math.round((100 * v.air) / (v.air + v.pad))}% filled`);
			if (dry !== 'dry') await store.putPlaylist(playlist);
		}
	},

	/** Alarm: exit non-zero when today's or tomorrow's playlist is missing, or no item was fetched in the last 3 hours. */
	health: async (store) => {
		const now = Date.now();
		const today = channelDay(now);
		const bad: string[] = [];
		for (const day of [today, addDays(today, 1)]) {
			const p = await store.getPlaylist(day);
			console.log(`health: playlist ${day} ${p ? `ok (v${p.version}, built ${p.builtAt})` : 'MISSING'}`);
			if (!p) bad.push(`playlist ${day} is missing`);
		}
		const recent = await store.getItems({ since: new Date(now - STALE_MS).toISOString() });
		const newest = recent.map((i) => i.fetchedAt).sort().pop();
		console.log(`health: ${recent.length} items fetched in the last 3 hours${newest ? `, newest ${newest}` : ''}`);
		if (!recent.length) bad.push('no item fetched in the last 3 hours');
		if (bad.length) {
			console.error(`health: FAILED: ${bad.join('; ')}`);
			process.exitCode = 1;
		} else console.log('health: ok');
	},

	/**
	 * Check and save segments written outside the model writer (subagents, by hand).
	 * File: JSON array of { storyId?, format, title, beats, library?, libraryShow?, items? }.
	 * `items` are new reference items (for library segments) saved with the segment.
	 */
	'import-segments': async (store, args) => {
		const noVerify = args.includes('--no-verify'); // fixtures in tests only
		const [file, dry] = args.filter((a) => a !== '--no-verify');
		const { readFileSync } = await import('node:fs');
		const rows = JSON.parse(readFileSync(file, 'utf8')) as Array<{
			storyId?: string; format: Segment['format']; title: string; beats: unknown[];
			library?: boolean; libraryShow?: Segment['libraryShow']; items?: SourceItem[]; id?: string;
		}>;
		const now = Date.now();
		const newItems = rows.flatMap((r) => r.items ?? []);
		const storyIds = rows.map((r) => r.storyId).filter((x): x is string => !!x);
		const stories = new Map((storyIds.length ? await store.getStories({ ids: storyIds }) : []).map((s) => [s.id, s]));
		const ids = new Set([...[...stories.values()].flatMap((s) => s.itemIds), ...rows.flatMap((r) => r.beats.flatMap((b) => ((b as { sources?: string[] }).sources ?? [])))]);
		const items = new Map((ids.size ? await store.getItems({ ids: [...ids] }) : []).map((i) => [i.id, i]));
		for (const it of newItems) items.set(it.id, it);
		// G4: every reference item in the file must appear on its own page before anything is saved.
		const failed = new Map<string, string>();
		if (!noVerify) {
			for (const it of new Map(newItems.map((i) => [i.id, i])).values()) {
				const v = await verifySource(it);
				if (v.ok) continue;
				const why = v.reason ?? `not on the page: "${v.missing[0].slice(0, 120)}"${v.missing.length > 1 ? ` (+${v.missing.length - 1} more)` : ''}`;
				failed.set(it.id, why);
				console.log(`  verify FAIL ${it.id} ${it.url}\n       x ${why}`);
			}
			console.log(`import-segments: verified ${newItems.length - failed.size} of ${newItems.length} items`);
			for (const it of newItems) if (failed.has(it.id)) items.delete(it.id);
		}
		const out: Segment[] = [];
		let n = 0;
		for (const r of rows) {
			n++;
			const bad = r.beats.flatMap((b) => ((b as { sources?: string[] }).sources ?? [])).find((id) => failed.has(id));
			if (bad) {
				console.log(`  drop ${r.title.slice(0, 70)}\n       x source ${bad} failed verification: ${failed.get(bad)}`);
				continue;
			}
			const story = r.storyId ? stories.get(r.storyId) : undefined;
			if (r.storyId && !story) {
				console.log(`  drop ${r.title.slice(0, 70)}\n       x story ${r.storyId} not found`);
				continue;
			}
			const res = checkWritten(story, r.beats, r.format, r.title, { items, now }, { id: r.id ?? (story ? `seg-s-${story.id}` : `seg-lib-${n}-${r.title.toLowerCase().replace(/\W+/g, '-').slice(0, 40)}`), library: r.library, libraryShow: r.libraryShow });
			if (res.segment) {
				res.segment.duration = applyTiming(res.segment.beats);
				out.push(res.segment);
			}
			console.log(`  ${res.segment ? `ok   ${res.segment.beats.length} beats, ${Math.round(res.segment.duration)} s` : 'drop'} ${r.title.slice(0, 70)}`);
			for (const d of res.dropped.slice(0, 4)) console.log(`       x ${d}`);
		}
		console.log(`import-segments: ${out.length} of ${rows.length} passed`);
		if (dry === 'dry') return;
		const used = new Set(out.flatMap((s) => s.beats.flatMap((b) => b.sources)));
		const keepItems = newItems.filter((i) => used.has(i.id));
		if (keepItems.length) await store.putItems(keepItems);
		await store.putSegments(out);
	},

	/**
	 * Audit the library: fetch every reference item cited by a library segment and require its text
	 * in the page. `verify-library dry` only reports. Without `dry`, failing segments are blocked.
	 */
	'verify-library': async (store, [dry]) => {
		const segs = await store.getSegments({ library: true });
		const ids = [...new Set(segs.flatMap((s) => s.beats.flatMap((b) => b.sources)))];
		const items = (ids.length ? await store.getItems({ ids }) : []).filter((i) => i.tier === 'reference');
		console.log(`verify-library: ${segs.length} library segments, ${items.length} reference items`);
		const failed = new Map<string, string>();
		let pass = 0;
		for (const it of items) {
			const v = await verifySource(it);
			if (v.ok) {
				pass++;
				console.log(`  pass ${it.id}`);
				continue;
			}
			const why = v.reason ?? `missing: "${v.missing[0].slice(0, 140)}"${v.missing.length > 1 ? ` (+${v.missing.length - 1} more)` : ''}`;
			failed.set(it.id, why);
			console.log(`  FAIL ${it.id} ${it.url}\n       ${it.title.slice(0, 80)}\n       ${why}`);
		}
		const hit = segs.filter((s) => s.beats.some((b) => b.sources.some((id) => failed.has(id))));
		console.log(`verify-library: ${pass} pass, ${failed.size} fail; ${hit.length} of ${segs.length} segments cite a failing item`);
		for (const s of hit) {
			const id = s.beats.flatMap((b) => b.sources).find((x) => failed.has(x))!;
			console.log(`  segment ${s.id} "${s.title.slice(0, 70)}" cites ${id}`);
			if (dry !== 'dry') await store.block(s.id, `source failed verification: ${failed.get(id)}`.slice(0, 300));
		}
		if (dry === 'dry') console.log('verify-library: dry run, nothing blocked');
	}
};
