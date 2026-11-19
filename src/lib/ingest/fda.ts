// FDA press releases RSS, filtered to drug and biologic news. Full text from each release page.
import type { ItemKind, SourceItem } from '../types';
import type { Store } from '../store/index';
import { getText, hashId, plainText } from './http';
import { guessEntities } from './entities';
import { parseRss, rssDate } from './rss';

export const FEED = 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml';
const MAX_TEXT = 20_000;

const DRUGISH = /\b(drug|drugs|biologic|biologics|approv\w*|treatment|therapy|therapies|vaccine|gene therapy|cell therapy|clinical|trial|label|NDA|BLA|complete response|advisory committee|biosimilar|generic|opioid|cancer|disease|patients|medicine|medicines)\b/i;

export function classifyFda(title: string, desc = ''): ItemKind {
	const t = `${title} ${desc}`;
	if (/complete response|\bCRL\b/i.test(t)) return 'crl';
	if (/advisory committee|adcomm/i.test(title)) return 'adcomm';
	if (/\bapprov(es|al|ed)\b|\bclears\b|\bgrants (accelerated|full)? ?approval/i.test(title)) return 'approval';
	return 'other';
}

export function isDrugNews(title: string, desc = ''): boolean {
	return DRUGISH.test(`${title} ${desc}`);
}

/** Main article body of an FDA press release page. */
export function extractFdaBody(html: string): string {
	let body = html;
	const start = body.search(/<div class="col-md-8" role="main">/);
	if (start >= 0) body = body.slice(start);
	else {
		const a = body.search(/<article[^>]*id="main-content"/);
		if (a >= 0) body = body.slice(a);
	}
	const end = body.search(/<\/article>/);
	if (end >= 0) body = body.slice(0, end);
	body = body
		.replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
		.replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
		.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
	let text = plainText(body);
	text = text.replace(/\n?Content current as of:[\s\S]*$/, '').replace(/\n?Regulated Product\(s\)[\s\S]*$/, '').trim();
	return text.slice(0, MAX_TEXT);
}

export async function fetchItems(store: Store, opts: { limit?: number } = {}): Promise<SourceItem[]> {
	const xml = await getText(FEED);
	const seen = new Set((await store.getKV<string[]>('fda:seen')) ?? []);
	const now = new Date().toISOString();
	const out: SourceItem[] = [];
	for (const r of parseRss(xml).slice(0, opts.limit ?? 30)) {
		if (!r.link || seen.has(r.link) || !isDrugNews(r.title, r.description)) continue;
		let text = r.description;
		try {
			const body = extractFdaBody(await getText(r.link.replace(/^http:/, 'https:')));
			if (body.length > text.length) text = body;
		} catch (e) {
			console.warn(`fda: page fetch failed ${r.link}: ${(e as Error).message}`);
		}
		out.push({
			id: hashId('fda', r.link),
			source: 'fda-press',
			tier: 'primary',
			url: r.link.replace(/^http:/, 'https:'),
			fetchedAt: now,
			publishedAt: rssDate(r.pubDate),
			title: r.title,
			text,
			entities: guessEntities(`${r.title}\n${text}`),
			kind: classifyFda(r.title, r.description)
		});
		seen.add(r.link);
	}
	await store.setKV('fda:seen', [...seen].slice(-500));
	return out;
}
