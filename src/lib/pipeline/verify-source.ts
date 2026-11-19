// Fetch a reference item's URL and require its stored text to appear in the page.
// The writer types excerpts into the import file, so without this the fact check
// compares the writer's numbers with the writer's own text (docs/PLAN.md section 0, G4).

import type { SourceItem } from '../types';
import { fold } from './check';

export interface VerifyResult {
	ok: boolean;
	/** Sentences of the item text that the page does not contain. */
	missing: string[];
	fetchedAt: string;
	/** HTTP status of the last request, 0 when none was made or it failed. */
	status: number;
	/** Why the page could not be checked, when it could not. */
	reason?: string;
}

export type FetchFn = typeof fetch;

const UA = 'DNBC hobby demo (https://github.com/saehyunjun/dnbc)';
const TIMEOUT_MS = 20_000;
const GAP_MS = 340; // at most 3 requests per second
const MIN_SENTENCE = 12;

let lastAt = 0;
async function polite(): Promise<void> {
	const wait = lastAt + GAP_MS - Date.now();
	lastAt = Math.max(Date.now(), lastAt + GAP_MS);
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

const NAMED: Record<string, string> = {
	amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
	ldquo: '“', rdquo: '”', hellip: '…', deg: '°', plusmn: '±', micro: 'µ', times: '×', ge: '≥', le: '≤', beta: 'β', alpha: 'α', reg: '®', trade: '™', copy: '©'
};

export function decodeEntities(s: string): string {
	return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
		if (e[0] === '#') {
			const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
			return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
		}
		return NAMED[e.toLowerCase()] ?? m;
	});
}

export function htmlToText(html: string): string {
	const s = html
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>/gi, ' ')
		.replace(/<[^>]*>/g, ' ');
	return decodeEntities(s);
}

/** The form used to compare: folded typography, lower case, punctuation and spacing collapsed. */
export function normalise(s: string): string {
	return fold(s)
		.toLowerCase()
		.replace(/[^\p{L}\p{N}%]+/gu, ' ')
		.trim();
}

/** Sentences of an excerpt. Ellipses split too, because excerpts skip text. */
export function sentencesOf(text: string): string[] {
	return text
		.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])|\s*(?:\.{3}|…|\[\.\.\.\])\s*|\n+/)
		.map((x) => x.trim())
		.filter((x) => normalise(x).length >= MIN_SENTENCE);
}

function flatten(v: unknown, out: string[]): void {
	if (v == null) return;
	if (typeof v === 'string' || typeof v === 'number') out.push(String(v));
	else if (Array.isArray(v)) for (const x of v) flatten(x, out);
	else if (typeof v === 'object') for (const x of Object.values(v)) flatten(x, out);
}

/** The plain endpoint worth fetching in place of the page, when there is one. */
function endpointFor(url: string): { url: string; kind: 'html' | 'json' | 'text' } {
	const nct = url.match(/clinicaltrials\.gov\/(?:study\/|ct2\/show\/|api\/v2\/studies\/)(NCT\d{8})/i);
	if (nct) return { url: `https://clinicaltrials.gov/api/v2/studies/${nct[1].toUpperCase()}`, kind: 'json' };
	const pm = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i) ?? url.match(/ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)/i);
	if (pm) return { url: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pm[1]}&rettype=abstract&retmode=text`, kind: 'text' };
	return { url, kind: 'html' };
}

export async function verifySource(item: Pick<SourceItem, 'url' | 'text'>, fetchFn: FetchFn = fetch): Promise<VerifyResult> {
	const fetchedAt = new Date().toISOString();
	const fail = (reason: string, status = 0): VerifyResult => ({ ok: false, missing: [], fetchedAt, status, reason });
	if (!/^https?:\/\//i.test(item.url)) return fail(`not an http url: ${item.url}`);
	const sentences = sentencesOf(item.text ?? '');
	if (!sentences.length) return fail('item text has no sentence to check');
	const ep = endpointFor(item.url);
	if (/\.pdf($|[?#])/i.test(ep.url)) return fail('pdf is not checked');
	let status = 0;
	let page: string;
	try {
		if (fetchFn === fetch) await polite();
		const res = await fetchFn(ep.url, {
			redirect: 'follow',
			headers: { 'User-Agent': UA, Accept: ep.kind === 'json' ? 'application/json' : 'text/html,text/plain;q=0.9,*/*;q=0.5' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		status = res.status;
		if (!res.ok) return fail(`http ${res.status}`, res.status);
		const type = res.headers.get('content-type') ?? '';
		if (/pdf/i.test(type)) return fail('pdf is not checked', status);
		const body = await res.text();
		if (ep.kind === 'json') {
			const parts: string[] = [];
			flatten(JSON.parse(body), parts);
			page = parts.join('\n');
		} else if (ep.kind === 'text') page = body;
		else page = htmlToText(body);
	} catch (e) {
		return fail(`fetch failed: ${(e as Error).message}`, status);
	}
	const hay = normalise(page);
	const missing = sentences.filter((s) => !hay.includes(normalise(s)));
	return { ok: missing.length === 0, missing, fetchedAt, status };
}
