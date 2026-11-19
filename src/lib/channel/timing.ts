// Hold time per beat, applied when a segment is written. Changing these affects only
// segments written afterwards, because each beat stores its own duration.

import type { Beat } from '$lib/types';

export const TIMING = {
	base: 1.5, // seconds
	wordsPerSecond: 3.5,
	min: 4,
	max: 12,
	maxWords: 40,
	quizPause: 4 // extra seconds between clue and answer
};

export function beatWords(b: Beat): number {
	const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
	switch (b.type) {
		case 'headline':
		case 'anchor':
		case 'bumper':
			return count(b.text);
		case 'quote':
			return count(b.text) + 4;
		case 'panel':
			return b.lines.reduce((n, l) => n + count(l.text), 0);
		case 'pipeline':
			return 6 + b.phases.length * 2;
		case 'timeline':
			return b.points.reduce((n, p) => n + count(p.label) + 1, 0);
		case 'stat':
			return count(b.value) + count(b.label);
		case 'list':
			return count(b.title) + b.items.reduce((n, i) => n + count(i), 0);
		case 'quiz':
			return count(b.clue) + count(b.answer);
	}
}

export function holdSeconds(b: Beat): number {
	const words = beatWords(b);
	let s = TIMING.base + words / TIMING.wordsPerSecond;
	if (b.type === 'quiz') s += TIMING.quizPause;
	// A panel shows several lines in turn, so it may run longer than one beat.
	const max = b.type === 'panel' ? TIMING.max * Math.max(1, b.lines.length) : TIMING.max;
	return Math.round(Math.min(max, Math.max(TIMING.min, s)) * 10) / 10;
}

/** Fill in each beat's duration and return the total, in seconds. */
export function applyTiming(beats: Beat[]): number {
	let total = 0;
	for (const b of beats) {
		b.duration = holdSeconds(b);
		total += b.duration;
	}
	return Math.round(total * 10) / 10;
}
