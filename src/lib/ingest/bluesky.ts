// Bluesky search. Uses an app-password session when BLUESKY_HANDLE and BLUESKY_APP_PASSWORD are set,
// otherwise the public search endpoint. Returns [] with a warning if both fail.
import { screenQuote } from '../pipeline/screen';
import type { SourceItem } from '../types';
import type { Store } from '../store/index';
import { getJson, hashId, userAgent } from './http';
import { guessEntities } from './entities';

export const KEYWORDS = [
	// Scope since 2026-11-19 (docs/PLAN.md section 0). Posts still pass `screenQuote` and `storyScope`.
	"Alzheimer's trial", "Parkinson's trial", 'ALS trial', 'multiple sclerosis trial', 'epilepsy trial', 'migraine drug',
	'Duchenne', 'spinal muscular atrophy', 'myasthenia gravis', 'Huntington disease', 'glioblastoma trial',
	'schizophrenia drug', 'depression trial', 'psychedelic trial', 'neurology FDA', 'psychiatry FDA'
];

export interface BskyPost {
	uri: string;
	author?: { handle?: string };
	record?: { text?: string; createdAt?: string };
	indexedAt?: string;
}

export function postUrl(p: BskyPost): string {
	const rkey = p.uri.split('/').pop();
	return `https://bsky.app/profile/${p.author?.handle}/post/${rkey}`;
}

export function toItem(p: BskyPost, keyword: string, now: string): SourceItem | undefined {
	const text = p.record?.text?.trim();
	if (!text || !p.author?.handle || text.length < 40) return undefined;
	return {
		id: hashId('bsky', p.uri),
		source: 'bluesky',
		tier: 'social',
		url: postUrl(p),
		fetchedAt: now,
		publishedAt: p.record?.createdAt ?? p.indexedAt ?? now,
		title: text.slice(0, 120),
		text,
		entities: guessEntities(text),
		kind: 'post',
		meta: { keyword },
		speaker: { handle: p.author.handle } // handle only, never a display name
	};
}

async function session(): Promise<string | undefined> {
	const identifier = process.env.BLUESKY_HANDLE;
	const password = process.env.BLUESKY_APP_PASSWORD;
	if (!identifier || !password) return undefined;
	const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent() },
		body: JSON.stringify({ identifier, password }),
		signal: AbortSignal.timeout(30_000)
	});
	if (!res.ok) throw new Error(`createSession ${res.status}`);
	return ((await res.json()) as { accessJwt?: string }).accessJwt;
}

export async function fetchItems(store: Store, opts: { keywords?: string[]; limit?: number } = {}): Promise<SourceItem[]> {
	let jwt: string | undefined;
	try {
		jwt = await session();
	} catch (e) {
		console.warn(`bluesky: session failed, trying public search: ${(e as Error).message}`);
	}
	const base = jwt ? 'https://bsky.social/xrpc' : 'https://api.bsky.app/xrpc';
	const headers: Record<string, string> = jwt ? { Authorization: `Bearer ${jwt}` } : {};
	const since = (await store.getKV<string>('bluesky:cursor')) ?? new Date(Date.now() - 6 * 3600_000).toISOString();
	const now = new Date().toISOString();
	const byId = new Map<string, SourceItem>();
	for (const kw of opts.keywords ?? KEYWORDS) {
		const q = new URLSearchParams({ q: kw, sort: 'latest', limit: String(opts.limit ?? 25), since, lang: 'en' });
		try {
			const res = await getJson<{ posts?: BskyPost[] }>(`${base}/app.bsky.feed.searchPosts?${q}`, { headers, retries: 1 });
			for (const p of res.posts ?? []) {
				const it = toItem(p, kw, now);
				if (it && !byId.has(it.id) && screenQuote(it.text).ok) byId.set(it.id, it);
			}
		} catch (e) {
			console.warn(`bluesky: search "${kw}" failed: ${(e as Error).message}`);
			if (/\b40[13]\b/.test((e as Error).message)) return []; // blocked, stop
		}
		await new Promise((r) => setTimeout(r, 250));
	}
	await store.setKV('bluesky:cursor', now);
	return [...byId.values()];
}
