// openFDA complete response letters (transparency/crl.json).
import type { SourceItem } from '../types';
import type { Store } from '../store/index';
import { getJson, hashId } from './http';
import { guessEntities } from './entities';

const API = 'https://api.fda.gov/transparency/crl.json';

export interface CrlRecord {
	letter_date?: string; // MM/DD/YYYY
	letter_year?: string;
	company_name?: string;
	application_number?: string[];
	letter_type?: string;
	approval_status?: string;
	file_name?: string;
	text?: string;
}

export function crlDate(s?: string): string {
	const m = s?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	return m ? `${m[3]}-${m[1]}-${m[2]}T00:00:00Z` : new Date().toISOString();
}

export function toItem(r: CrlRecord, now: string): SourceItem {
	const app = (r.application_number ?? []).join(', ');
	const text = (r.text ?? '').replace(/\s+\n/g, '\n').slice(0, 20_000);
	return {
		id: hashId('crl', r.file_name ?? `${app}${r.letter_date}`),
		source: 'fda-crl',
		tier: 'primary',
		url: r.file_name ? `https://api.fda.gov/transparency/crl.json?search=file_name:"${r.file_name}"` : API,
		fetchedAt: now,
		publishedAt: crlDate(r.letter_date),
		title: `Complete response letter: ${r.company_name ?? 'unknown sponsor'}${app ? ` (${app})` : ''}`,
		text,
		entities: guessEntities(text, r.company_name ? [r.company_name] : []),
		kind: 'crl',
		meta: { applicationNumber: r.application_number, letterType: r.letter_type, approvalStatus: r.approval_status }
	};
}

export async function fetchItems(store: Store, opts: { limit?: number; sinceDays?: number } = {}): Promise<SourceItem[]> {
	const limit = opts.limit ?? 200;
	// letter_date is a string (MM/DD/YYYY), so a date sort or range does not work. Pull this and last year, filter dates ourselves.
	const y = new Date().getUTCFullYear();
	const u = `${API}?search=letter_year:[${y - 1}+TO+${y}]&limit=${limit}`;
	const page = await getJson<{ results?: CrlRecord[] }>(u);
	const cursor = (await store.getKV<string>('fda-crl:cursor')) ?? '';
	const now = new Date().toISOString();
	const recs = (page.results ?? []).filter((r) => r.letter_type !== 'APPROVAL');
	const items = recs.map((r) => toItem(r, now)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
	const cutoff = cursor || new Date(Date.now() - (opts.sinceDays ?? 90) * 86400_000).toISOString();
	const fresh = items.filter((i) => i.publishedAt > cutoff);
	if (items.length) await store.setKV('fda-crl:cursor', items[0].publishedAt);
	return fresh;
}
