// Minimal RSS reader. Regex based, enough for the feeds we use.
import { plainText } from './http';

export interface RssItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	creator: string;
	categories: string[];
}

const tag = (block: string, name: string): string => {
	const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
	if (!m) return '';
	return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
};

export function parseRss(xml: string): RssItem[] {
	const out: RssItem[] = [];
	for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
		const b = m[0];
		out.push({
			title: plainText(tag(b, 'title')),
			link: plainText(tag(b, 'link')),
			description: plainText(tag(b, 'description')),
			pubDate: tag(b, 'pubDate'),
			creator: plainText(tag(b, 'dc:creator')),
			categories: [...b.matchAll(/<(?:category|prn:industry|prn:subject)[^>]*>([\s\S]*?)<\/(?:category|prn:industry|prn:subject)>/gi)].map((c) =>
				plainText(c[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1'))
			)
		});
	}
	return out;
}

/** RFC 822 date, with US zone names, to ISO. Falls back to now. */
export function rssDate(s: string): string {
	const zones: Record<string, string> = { EST: '-0500', EDT: '-0400', CST: '-0600', CDT: '-0500', PST: '-0800', PDT: '-0700' };
	const fixed = s.replace(/\b(EST|EDT|CST|CDT|PST|PDT)\b/, (z) => zones[z]);
	const t = Date.parse(fixed);
	return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}
