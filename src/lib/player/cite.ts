// Footnotes: which citations a beat shows, numbered by place in `Segment.citations`.

import type { Beat, Citation } from '../types';

export interface Note {
	n: number;
	c: Citation;
}

/**
 * Notes for one beat. A quote's own attribution line already names its publisher, date, and link,
 * so a citation that says the same thing is not repeated as a footnote.
 */
export function notesFor(beat: Beat, citations?: Citation[]): Note[] {
	if (!citations?.length) return [];
	const out: Note[] = [];
	for (const id of beat.sources) {
		const i = citations.findIndex((c) => c.id === id);
		if (i < 0 || out.some((o) => o.n === i + 1)) continue;
		const c = citations[i];
		if (beat.type === 'quote' && c.label === beat.publisher && (c.date ?? beat.date).slice(0, 10) === beat.date.slice(0, 10) && (c.url ?? beat.url) === beat.url) continue;
		out.push({ n: i + 1, c });
	}
	return out.sort((a, b) => a.n - b.n);
}
