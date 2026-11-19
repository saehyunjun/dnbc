// PR Newswire and Business Wire health and biotech RSS, drug development items only.
import type { ItemKind, SourceId, SourceItem } from '../types';
import type { Store } from '../store/index';
import { getText, hashId, plainText } from './http';
import { guessEntities } from './entities';
import { parseRss, rssDate } from './rss';

export interface Feed {
	source: Extract<SourceId, 'prnewswire' | 'businesswire'>;
	url: string;
}

export const PRN_FEEDS: Feed[] = [
	{ source: 'prnewswire', url: 'https://www.prnewswire.com/rss/health-latest-news/health-latest-news-list.rss' },
	{ source: 'prnewswire', url: 'https://www.prnewswire.com/rss/health-latest-news/biotechnology-list.rss' },
	{ source: 'prnewswire', url: 'https://www.prnewswire.com/rss/health-latest-news/pharmaceuticals-list.rss' }
];

/**
 * Business Wire needs a feed id per industry from its RSS builder, and a wrong id answers 200 with an
 * empty "channel unavailable" feed. Set BUSINESSWIRE_FEEDS to a comma list of feed URLs.
 */
export function businessWireFeeds(): Feed[] {
	return (process.env.BUSINESSWIRE_FEEDS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((url) => ({ source: 'businesswire' as const, url }));
}

const KEEP = /\b(FDA|phase\s*(1|2|3|I{1,3}|one|two|three)\b|clinical|trial|therapeutics?|pharmaceuticals?|pharma|biotech\w*|biopharma\w*|approval|approves|approved|NDA|BLA|PDUFA|IND|licen[sc]e|licensing|topline|endpoint|oncology|biologics?|gene therapy|cell therapy|vaccine)\b/i;
const NOISE = /\b(webinar|conference call|to present at|to participate in|investor conference|announces date|earnings call|appoints|appointment of)\b/i;

export function isDrugDevelopment(title: string, desc = ''): boolean {
	return KEEP.test(`${title} ${desc}`) && !(NOISE.test(title) && !/\b(FDA|phase|topline|approval)\b/i.test(title));
}

export function classifyRelease(title: string, text = ''): ItemKind {
	const t = title;
	const all = `${title} ${text.slice(0, 2000)}`;
	if (/complete response letter|\bCRL\b/i.test(all)) return 'crl';
	if (/\bPDUFA\b/i.test(all) && /(target action date|PDUFA (target )?(goal )?date|accepts|acceptance|priority review)/i.test(all)) return 'pdufa';
	if (/\b(FDA|European Commission|EC|EMA|CHMP|Health Canada|NMPA)\b[^.]{0,40}\bapprov(es|al|ed)\b|\bapproved by the FDA\b|receives? FDA approval/i.test(t)) return 'approval';
	if (/\b(topline|top-line|primary endpoint|met (its|the) primary|results from|data from|positive (data|results)|interim (analysis|results))\b/i.test(all)) return 'readout';
	if (/\b(acquir\w*|license|licensing|collaboration|merger|financing|public offering|private placement|buyout|to be acquired|royalty|option agreement)\b/i.test(t)) return 'deal';
	if (/\bPDUFA\b/i.test(t)) return 'pdufa';
	return 'other';
}

/** Body and issuer of a release page. */
export function extractRelease(html: string): { text: string; sponsor: string } {
	const sponsor = plainText(html.match(/<meta name="author" content="([^"]*)"/i)?.[1] ?? '');
	let body = '';
	const i = html.search(/<div class="release-content"|itemprop="articleBody"|class="bw-release-story"/);
	if (i >= 0) {
		const rest = html.slice(i);
		const end = rest.search(/<\/section>|<footer|class="bw-release-contact|<div class="release-contacts/i);
		body = rest.slice(0, end > 0 ? end : 40_000);
	}
	return { text: plainText(body).slice(0, 20_000), sponsor };
}

export async function fetchItems(store: Store, opts: { feeds?: Feed[]; limit?: number } = {}): Promise<SourceItem[]> {
	const feeds = opts.feeds ?? [...PRN_FEEDS, ...businessWireFeeds()];
	const seen = new Set((await store.getKV<string[]>('wires:seen')) ?? []);
	const now = new Date().toISOString();
	const out: SourceItem[] = [];
	if (!feeds.some((f) => f.source === 'businesswire')) console.warn('wires: no Business Wire feed configured (BUSINESSWIRE_FEEDS)');
	for (const f of feeds) {
		let xml: string;
		try {
			xml = await getText(f.url);
		} catch (e) {
			console.warn(`wires: ${f.url}: ${(e as Error).message}`);
			continue;
		}
		const rows = parseRss(xml).slice(0, opts.limit ?? 60);
		if (!rows.length) console.warn(`wires: no items in ${f.url}`);
		for (const r of rows) {
			if (!r.link || seen.has(r.link) || !isDrugDevelopment(r.title, r.description)) continue;
			let text = r.description;
			let sponsor = '';
			try {
				const page = extractRelease(await getText(r.link));
				if (page.text.length > text.length) text = page.text;
				sponsor = page.sponsor;
			} catch (e) {
				console.warn(`wires: page ${r.link}: ${(e as Error).message}`);
			}
			seen.add(r.link);
			out.push({
				id: hashId(f.source, r.link),
				source: f.source,
				tier: 'primary',
				url: r.link,
				fetchedAt: now,
				publishedAt: rssDate(r.pubDate),
				title: r.title,
				text,
				entities: guessEntities(`${r.title}\n${text}`, [sponsor]),
				kind: classifyRelease(r.title, text),
				meta: { categories: r.categories }
			});
		}
	}
	await store.setKV('wires:seen', [...seen].slice(-1500));
	return out;
}
