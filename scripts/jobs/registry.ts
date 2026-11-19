import type { Store } from '../../src/lib/store/index.ts';
import * as ctgov from '../../src/lib/ingest/ctgov.ts';
import * as fda from '../../src/lib/ingest/fda.ts';
import * as fdaCrl from '../../src/lib/ingest/fda-crl.ts';
import * as drugsfda from '../../src/lib/ingest/drugsfda.ts';
import * as wires from '../../src/lib/ingest/wires.ts';
import * as edgar from '../../src/lib/ingest/edgar.ts';
import * as pubmed from '../../src/lib/ingest/pubmed.ts';
import * as bluesky from '../../src/lib/ingest/bluesky.ts';
import * as quotes from '../../src/lib/ingest/quotes.ts';
import type { SourceItem } from '../../src/lib/types.ts';

export type Job = (store: Store, args: string[]) => Promise<void>;

async function save(name: string, store: Store, items: SourceItem[]) {
	const added = await store.putItems(items);
	const by = items.reduce<Record<string, number>>((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});
	console.log(`${name}: ${items.length} items (${added} new)`, by);
}

const source = (name: string, run: (store: Store, args: string[]) => Promise<SourceItem[]>): Job => async (store, args) => {
	await save(name, store, await run(store, args));
};

export const JOBS: Record<string, Job> = {
	'ctgov-seed': async (store) => {
		const n = await ctgov.seed(store);
		console.log(`ctgov seed: ${n} trials`);
	},
	'ctgov-daily': async (store, [since]) => {
		const items = await ctgov.daily(store, since);
		const added = await store.putItems(items);
		const by = items.reduce<Record<string, number>>((m, i) => ((m[i.kind] = (m[i.kind] ?? 0) + 1), m), {});
		console.log(`ctgov daily: ${items.length} items (${added} new)`, by);
	},
	fda: source('fda', (s) => fda.fetchItems(s)),
	'fda-crl': source('fda-crl', (s) => fdaCrl.fetchItems(s)),
	drugsfda: source('drugsfda', (s, [md]) => drugsfda.fetchItems(s, { monthDay: md })),
	wires: source('wires', (s) => wires.fetchItems(s)),
	edgar: source('edgar', (s) => edgar.fetchItems(s)),
	pubmed: source('pubmed', (s) => pubmed.fetchItems(s)),
	bluesky: source('bluesky', (s) => bluesky.fetchItems(s)),
	quotes: source('quotes', (s) => quotes.fetchItems(s)),
	/** Fast sources. One failure does not stop the rest. */
	ingest: async (store, args) => {
		await runAll(store, args, ['fda', 'wires', 'edgar', 'bluesky']);
	},
	daily: async (store, args) => {
		await runAll(store, args, ['ctgov-daily', 'fda-crl', 'drugsfda', 'pubmed', 'quotes']);
	}
};

async function runAll(store: Store, args: string[], names: string[]) {
	const failed: string[] = [];
	for (const n of names) {
		try {
			await JOBS[n](store, n === 'ctgov-daily' ? args : []);
		} catch (e) {
			failed.push(n);
			console.error(`${n}: failed: ${(e as Error).message}`);
		}
	}
	if (failed.length) console.error(`failed: ${failed.join(', ')}`);
}
