// Job runner: npm run job -- <name> [args]
// The Actions workflows call the same names.

import { existsSync } from 'node:fs';

// Local runs read .env and .env.local (Vercel's env pull). Actions sets real env vars instead.
for (const f of ['.env', '.env.local']) if (existsSync(f)) process.loadEnvFile(f);

import { openStore } from '../../src/lib/store/index.ts';
import { JOBS as INGEST_JOBS } from './registry.ts';
import { PIPELINE_JOBS } from './pipeline-jobs.ts';

const JOBS = { ...INGEST_JOBS, ...PIPELINE_JOBS };

const [name, ...args] = process.argv.slice(2);
const job = JOBS[name];
if (!job) {
	console.log(`Unknown job "${name}". Jobs: ${Object.keys(JOBS).join(', ')}`);
	process.exit(2);
}
const store = await openStore();
const t0 = Date.now();
try {
	await job(store, args);
	console.log(`${name}: done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} catch (e) {
	console.error(`${name}: failed: ${(e as Error).stack ?? e}`);
	process.exitCode = 1;
} finally {
	await store.close?.();
}
