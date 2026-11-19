// Small text helpers for the player.

import { etParts } from '../channel/time';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "17 Nov 2026" from an ISO date or timestamp. Returns the input when it is not a date. */
export function shortDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return iso;
	return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "7:42 ET" for the show clock. */
export function clockText(ms: number): string {
	const p = etParts(ms);
	const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
	return `${h12}:${String(p.minute).padStart(2, '0')} ET`;
}

/** "7:30 AM" for the guide. */
export function guideTime(ms: number): string {
	const p = etParts(ms);
	const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
	return `${h12}:${String(p.minute).padStart(2, '0')} ${p.hour < 12 ? 'AM' : 'PM'}`;
}

const SOURCE_NAMES: Record<string, string> = {
	drugsfda: 'Drugs@FDA',
	fda: 'FDA',
	prnewswire: 'PR Newswire',
	businesswire: 'Business Wire',
	pubmed: 'PubMed',
	ctgov: 'ClinicalTrials.gov',
	profile: 'ClinicalTrials.gov',
	catalyst: 'ClinicalTrials.gov',
	edgar: 'SEC EDGAR',
	bluesky: 'Bluesky',
	reddit: 'Reddit',
	ref: 'Reference',
	fixture: 'Archive'
};

/** A short chip for the first source id of a beat. */
export function sourceLabel(ids: string[]): string {
	const first = ids[0];
	if (!first) return 'DNBC';
	return SOURCE_NAMES[first.split('-')[0]] ?? 'Source';
}

export function hostOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
}
