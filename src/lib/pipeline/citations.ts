// Footnotes. Sources are shown as numbered footnotes under the beat, never as a spoken line
// (Aaron 2026-11-19). Beats cite item ids in `sources`; a segment carries one Citation per id.

import type { Beat, Citation, SourceId, SourceItem } from '../types';

const LABEL: Record<SourceId, string> = {
	ctgov: 'ClinicalTrials.gov',
	'fda-press': 'FDA',
	'fda-approvals': 'FDA',
	'fda-crl': 'FDA complete response letters',
	edgar: 'SEC EDGAR',
	prnewswire: 'PR Newswire',
	businesswire: 'Business Wire',
	pubmed: 'PubMed',
	drugsfda: 'Drugs@FDA',
	bluesky: 'Bluesky',
	reddit: 'Reddit',
	linkedin: 'LinkedIn',
	reference: 'Reference',
	fixture: 'Fixture'
};

const HOSTS: [RegExp, string][] = [
	[/accessdata\.fda\.gov/, 'Drugs@FDA'],
	[/fda\.gov/, 'FDA'],
	[/clinicaltrials\.gov/, 'ClinicalTrials.gov'],
	[/pubmed\.ncbi|ncbi\.nlm\.nih\.gov\/pmc|pmc\.ncbi/, 'PubMed Central'],
	[/cancer\.gov/, 'National Cancer Institute'],
	[/nih\.gov/, 'NIH'],
	[/who\.int/, 'WHO'],
	[/sec\.gov/, 'SEC EDGAR']
];

export function labelFor(it: SourceItem): string {
	if (it.source === 'reddit') return it.speaker?.community ?? 'Reddit';
	if (it.source === 'reference' || it.source === 'fixture') {
		const host = HOSTS.find(([re]) => re.test(it.url));
		if (host) return host[1];
		try {
			return new URL(it.url).hostname.replace(/^www\./, '');
		} catch {
			return LABEL[it.source];
		}
	}
	return LABEL[it.source] ?? it.source;
}

/** A closing "Source: ..." line, which older segments spoke as an anchor beat. */
export function isSourceLine(b: Beat): boolean {
	return b.type === 'anchor' && /^\s*(sources?|via)\s*:/i.test(b.text);
}

export function citationsFor(beats: Beat[], items: Map<string, SourceItem>): Citation[] {
	const out: Citation[] = [];
	const seen = new Set<string>();
	for (const b of beats)
		for (const id of b.sources ?? []) {
			if (seen.has(id)) continue;
			seen.add(id);
			const it = items.get(id);
			if (!it) continue;
			out.push({
				id,
				label: labelFor(it),
				title: it.title?.slice(0, 140),
				date: it.publishedAt?.slice(0, 10) || undefined,
				url: it.source === 'reddit' ? undefined : it.url || undefined
			});
		}
	return out;
}
