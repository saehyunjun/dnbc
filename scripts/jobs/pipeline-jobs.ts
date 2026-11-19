// Pipeline jobs (stories, and later write, check, schedule). Ingest jobs live in registry.ts.

import type { Job } from './registry.ts';
import { buildStories } from '../../src/lib/pipeline/stories.ts';

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
	}
};
