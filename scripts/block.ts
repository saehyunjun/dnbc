// Kill switch: npm run block -- <segment or story id> "<reason>"
// The player skips a blocked segment within 60 s. The scheduler never schedules it again.

import { existsSync } from 'node:fs';

for (const f of ['.env', '.env.local']) if (existsSync(f)) process.loadEnvFile(f);

import { openStore } from '../src/lib/store/index.ts';

const [id, ...rest] = process.argv.slice(2);
const reason = rest.join(' ').trim();
if (!id || !reason) {
	console.log('Usage: npm run block -- <id> "<reason>"');
	process.exit(2);
}
const store = await openStore();
try {
	await store.block(id, reason);
	console.log(`Blocked ${id}: ${reason}`);
} finally {
	await store.close?.();
}
