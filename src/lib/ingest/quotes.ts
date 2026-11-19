// Hand-filled social quotes: data/quotes/reddit.json and data/quotes/linkedin.json.
import { readFile } from 'node:fs/promises';
import { screenQuote } from '../pipeline/screen';
import type { SourceItem } from '../types';
import type { Store } from '../store/index';
import { hashId } from './http';
import { guessEntities } from './entities';

export interface QuoteRecord {
	text: string;
	community?: string; // reddit
	name?: string; // linkedin
	role?: string;
	date: string;
	url?: string;
	topic: string;
	entities?: Partial<{ drugs: string[]; sponsors: string[]; nctIds: string[]; conditions: string[] }>;
}

export function toItem(r: QuoteRecord, source: 'reddit' | 'linkedin', now: string): SourceItem | undefined {
	if (!r.text?.trim()) return undefined;
	const guess = guessEntities(r.text);
	const entities = {
		drugs: r.entities?.drugs ?? guess.drugs,
		sponsors: r.entities?.sponsors ?? [],
		nctIds: r.entities?.nctIds ?? guess.nctIds,
		conditions: r.entities?.conditions ?? []
	};
	const reddit = source === 'reddit';
	const when = /^\d{4}-\d{2}-\d{2}/.test(r.date) ? r.date : now;
	return {
		id: hashId(source, `${r.text}${r.date}`),
		source,
		tier: 'social',
		url: reddit ? '' : (r.url ?? ''), // Reddit quotes carry no link
		fetchedAt: now,
		publishedAt: when.length === 10 ? `${when}T00:00:00Z` : when,
		title: r.topic,
		text: r.text.trim(),
		entities,
		kind: 'post',
		meta: { topic: r.topic },
		speaker: reddit ? { community: r.community } : { name: r.name, role: r.role }
	};
}

async function load(file: string): Promise<QuoteRecord[]> {
	try {
		const data = JSON.parse(await readFile(new URL(`../../../data/quotes/${file}`, import.meta.url), 'utf8'));
		return Array.isArray(data) ? data : [];
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw e;
	}
}

export async function fetchItems(_store?: Store): Promise<SourceItem[]> {
	const now = new Date().toISOString();
	const out: SourceItem[] = [];
	for (const r of await load('reddit.json')) {
		const it = toItem(r, 'reddit', now);
		if (it && screenQuote(it.text).ok) out.push(it);
		else if (it) console.warn(`quotes: reddit quote dropped by the screen: ${screenQuote(it.text).reasons.join(', ')}`);
	}
	for (const r of await load('linkedin.json')) {
		const it = toItem(r, 'linkedin', now);
		if (it && screenQuote(it.text).ok) out.push(it);
		else if (it) console.warn(`quotes: linkedin quote dropped by the screen: ${screenQuote(it.text).reasons.join(', ')}`);
	}
	return out;
}
