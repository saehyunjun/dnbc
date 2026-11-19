// SEC EDGAR 8-K press releases (Exhibit 99.1) for biotech filers, via full-text search.
// SEC requires a contact in the User-Agent, so every request uses requireContact. Max 10 requests per second.
import type { ItemKind, SourceItem } from '../types';
import type { Store } from '../store/index';
import { get, getJson, hashId, plainText } from './http';
import { guessEntities } from './entities';
import { classifyRelease } from './wires';

const SEARCH = 'https://efts.sec.gov/LATEST/search-index';
export const QUERIES = ['"phase 3"', '"topline"', '"complete response letter"', '"PDUFA"', '"FDA approval"', '"primary endpoint"'];
export const BIOTECH_SICS = new Set(['2834', '2836', '8731']);
const MIN_GAP_MS = 150; // under 10 requests per second

let last = 0;
async function paced<T>(fn: () => Promise<T>): Promise<T> {
	const wait = last + MIN_GAP_MS - Date.now();
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	last = Date.now();
	return fn();
}

export interface Hit {
	_id: string; // "<accession>:<filename>"
	_source: {
		ciks?: string[];
		display_names?: string[];
		file_date?: string;
		form?: string;
		root_forms?: string[];
		adsh?: string;
		file_type?: string;
		sics?: string[];
		items?: string[];
	};
}

export interface Filing {
	adsh: string;
	file: string;
	cik: string;
	company: string;
	date: string;
	fileType: string;
	url: string;
}

/** Hits to Exhibit 99 documents of biotech filers. Pure, so it is unit tested. */
export function parseHits(res: { hits?: { hits?: Hit[] } }): Filing[] {
	const out: Filing[] = [];
	for (const h of res.hits?.hits ?? []) {
		const s = h._source ?? {};
		const [adsh, file] = (h._id ?? '').split(':');
		const cik = s.ciks?.[0]?.replace(/^0+/, '');
		if (!adsh || !file || !cik) continue;
		if (!/^EX-99/i.test(s.file_type ?? '')) continue;
		if (s.sics?.length && !s.sics.some((c) => BIOTECH_SICS.has(c))) continue;
		out.push({
			adsh,
			file,
			cik,
			company: (s.display_names?.[0] ?? '').replace(/\s*\(CIK[^)]*\)\s*$/, '').replace(/\s*\([A-Z.,\s]{1,12}\)\s*$/, '').trim(),
			date: s.file_date ?? '',
			fileType: s.file_type ?? '',
			url: `https://www.sec.gov/Archives/edgar/data/${cik}/${adsh.replace(/-/g, '')}/${file}`
		});
	}
	return out;
}

export function searchUrl(q: string, start: string, end: string): string {
	const u = new URL(SEARCH);
	u.searchParams.set('q', q);
	u.searchParams.set('forms', '8-K');
	u.searchParams.set('dateRange', 'custom');
	u.searchParams.set('startdt', start);
	u.searchParams.set('enddt', end);
	return u.toString();
}

export function kindOf(title: string, text: string): ItemKind {
	return classifyRelease(title, text);
}

export async function fetchItems(store: Store, opts: { sinceDays?: number; limit?: number } = {}): Promise<SourceItem[]> {
	// Fail early and cleanly when no contact is set.
	await paced(() => get('https://www.sec.gov/robots.txt', { requireContact: true, retries: 0 }).then((r) => r.text()));
	const end = new Date().toISOString().slice(0, 10);
	const start = ((await store.getKV<string>('edgar:cursor')) ?? new Date(Date.now() - (opts.sinceDays ?? 2) * 86400_000).toISOString().slice(0, 10));
	const seen = new Set((await store.getKV<string[]>('edgar:seen')) ?? []);
	const found = new Map<string, Filing>();
	for (const q of QUERIES) {
		const res = await paced(() => getJson<{ hits?: { hits?: Hit[] } }>(searchUrl(q, start, end), { requireContact: true }));
		for (const f of parseHits(res)) found.set(`${f.adsh}:${f.file}`, f);
	}
	const now = new Date().toISOString();
	const out: SourceItem[] = [];
	for (const f of [...found.values()].slice(0, opts.limit ?? 60)) {
		const key = `${f.adsh}:${f.file}`;
		if (seen.has(key)) continue;
		const html = await paced(() => get(f.url, { requireContact: true }).then((r) => r.text()));
		const text = plainText(html).slice(0, 20_000);
		const title = text.split('\n').find((l) => l.trim().length > 20)?.trim().slice(0, 200) ?? `${f.company} 8-K`;
		seen.add(key);
		out.push({
			id: hashId('edgar', key),
			source: 'edgar',
			tier: 'primary',
			url: f.url,
			fetchedAt: now,
			publishedAt: f.date ? `${f.date}T00:00:00Z` : now,
			title,
			text,
			entities: guessEntities(`${title}\n${text}`, [f.company]),
			kind: kindOf(title, text),
			meta: { cik: f.cik, accession: f.adsh, exhibit: f.fileType }
		});
	}
	await store.setKV('edgar:seen', [...seen].slice(-2000));
	await store.setKV('edgar:cursor', end);
	return out;
}
