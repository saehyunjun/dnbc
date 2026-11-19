// The schedule as data. A schedule change is an edit here, not in code.

import type { FormatId, ItemKind, LibraryShowId, ShowId } from '$lib/types';
import { addDays, weekdayOf } from './time';

export interface Show {
	id: ShowId;
	name: string;
	modelledOn?: string;
	color: string;
	/** Live format, if the show is built from the story pool. */
	format?: FormatId;
	/** Story kinds this show picks from. Empty means any. */
	kinds?: ItemKind[];
	/** Library show that takes this show's library slot in each wheel. */
	librarySlot?: LibraryShowId;
	blurb: string;
}

export const SHOWS: Record<ShowId, Show> = {
	'morning-dose': {
		id: 'morning-dose',
		name: 'Morning Dose',
		modelledOn: 'Squawk Box',
		color: '#f5b700',
		format: 'headlines',
		kinds: ['approval', 'crl', 'readout', 'deal', 'adcomm', 'pdufa', 'filing', 'results'],
		librarySlot: 'this-day',
		blurb: 'Overnight FDA actions, readouts, and filings.'
	},
	'pipeline-open': {
		id: 'pipeline-open',
		name: 'Pipeline Open',
		modelledOn: 'Squawk on the Street',
		color: '#4cc3ff',
		format: 'pipeline',
		kinds: ['registration', 'status', 'results'],
		librarySlot: 'catalyst-calendar',
		blurb: 'New trials and phase moves since yesterday.'
	},
	'trial-desk': {
		id: 'trial-desk',
		name: 'Trial Desk',
		color: '#7aa2ff',
		format: 'headlines',
		kinds: [],
		librarySlot: 'how-it-works',
		blurb: 'The day’s top stories, on a rolling wheel.'
	},
	'deal-desk': {
		id: 'deal-desk',
		name: 'Deal Desk',
		modelledOn: 'Power Lunch',
		color: '#5ee0a0',
		format: 'headlines',
		kinds: ['deal', 'filing'],
		librarySlot: 'blockbuster',
		blurb: 'Deals, licensing, and financings as pipeline changes.'
	},
	readout: {
		id: 'readout',
		name: 'Readout',
		modelledOn: 'Halftime Report',
		color: '#ff8fab',
		format: 'readout',
		kinds: ['readout', 'results'],
		librarySlot: 'failure-files',
		blurb: 'One trial result at a time, beat by beat.'
	},
	'regulatory-hour': {
		id: 'regulatory-hour',
		name: 'Regulatory Hour',
		color: '#ff6b5e',
		format: 'headlines',
		kinds: ['approval', 'crl', 'adcomm', 'pdufa'],
		librarySlot: 'how-it-works',
		blurb: 'Approvals, CRLs, and advisory committees.'
	},
	'pipeline-close': {
		id: 'pipeline-close',
		name: 'Pipeline Close',
		modelledOn: 'Closing Bell',
		color: '#4cc3ff',
		format: 'pipeline',
		kinds: ['registration', 'status', 'results'],
		librarySlot: 'catalyst-calendar',
		blurb: 'The day’s phase moves by therapy area.'
	},
	'fast-science': {
		id: 'fast-science',
		name: 'Fast Science',
		modelledOn: 'Fast Money',
		color: '#c58cff',
		format: 'panel',
		kinds: [],
		librarySlot: 'ad-break',
		blurb: 'Three panelists, the day’s top four stories.'
	},
	'mad-science': {
		id: 'mad-science',
		name: 'Mad Science',
		modelledOn: 'Mad Money',
		color: '#ffa94d',
		format: 'panel',
		kinds: [],
		librarySlot: 'future-pipeline',
		blurb: 'One host, one story. Opinion.'
	},
	'patient-desk': {
		id: 'patient-desk',
		name: 'Patient Desk',
		color: '#c58cff',
		format: 'voices',
		kinds: ['post'],
		librarySlot: 'rare-ones',
		blurb: 'What patients said this week.'
	},
	'lab-notes': {
		id: 'lab-notes',
		name: 'Lab Notes',
		color: '#5ee0a0',
		format: 'headlines',
		kinds: ['paper'],
		librarySlot: 'future-pipeline',
		blurb: 'Journal papers of the day.'
	},
	reruns: {
		id: 'reruns',
		name: 'DNBC Overnight',
		color: '#8b9bb4',
		blurb: 'Today’s shows again, in order.'
	},
	library: {
		id: 'library',
		name: 'DNBC Library',
		color: '#ffa94d',
		blurb: 'History, explainers, and what comes next.'
	},
	'week-top': {
		id: 'week-top',
		name: 'Pipeline Week',
		color: '#f5b700',
		blurb: 'The week’s top stories.'
	}
};

export interface GridRow {
	start: string; // "HH:MM" ET
	end: string; // "HH:MM" ET; "06:00" after midnight means the next calendar day
	show: ShowId;
}

export const WEEKDAY: GridRow[] = [
	{ start: '06:00', end: '09:00', show: 'morning-dose' },
	{ start: '09:00', end: '10:00', show: 'pipeline-open' },
	{ start: '10:00', end: '12:00', show: 'trial-desk' },
	{ start: '12:00', end: '14:00', show: 'deal-desk' },
	{ start: '14:00', end: '15:00', show: 'readout' },
	{ start: '15:00', end: '16:00', show: 'regulatory-hour' },
	{ start: '16:00', end: '17:00', show: 'pipeline-close' },
	{ start: '17:00', end: '18:00', show: 'fast-science' },
	{ start: '18:00', end: '19:00', show: 'mad-science' },
	{ start: '19:00', end: '20:00', show: 'patient-desk' },
	{ start: '20:00', end: '21:00', show: 'lab-notes' },
	{ start: '21:00', end: '22:00', show: 'reruns' },
	{ start: '22:00', end: '23:00', show: 'library' },
	{ start: '23:00', end: '01:00', show: 'reruns' },
	{ start: '01:00', end: '02:00', show: 'library' },
	{ start: '02:00', end: '04:00', show: 'reruns' },
	{ start: '04:00', end: '05:00', show: 'library' },
	{ start: '05:00', end: '06:00', show: 'reruns' }
];

export const WEEKEND: GridRow[] = [
	{ start: '06:00', end: '09:00', show: 'library' },
	{ start: '09:00', end: '10:00', show: 'week-top' },
	{ start: '10:00', end: '18:00', show: 'library' },
	{ start: '18:00', end: '19:00', show: 'week-top' },
	{ start: '19:00', end: '06:00', show: 'library' }
];

export const HOLIDAY: GridRow[] = [
	{ start: '06:00', end: '07:00', show: 'library' },
	{ start: '07:00', end: '08:00', show: 'pipeline-open' },
	{ start: '08:00', end: '06:00', show: 'library' }
];

/** Channel days that use the holiday grid. */
export const HOLIDAYS = new Set(['2026-11-26', '2026-11-27', '2026-12-25', '2027-01-01']);

/** Library shows that lead each library hour on the holiday grid, in turn. */
export const HOLIDAY_LIBRARY: LibraryShowId[] = ['blockbuster', 'lab-legends', 'rare-ones', 'this-day'];

export function gridFor(day: string): GridRow[] {
	if (HOLIDAYS.has(day)) return HOLIDAY;
	const wd = weekdayOf(day);
	return wd === 0 || wd === 6 ? WEEKEND : WEEKDAY;
}

export const WHEEL_MINUTES = 30;

export interface Block {
	show: ShowId;
	date: string; // calendar date of the start
	startHour: number;
	startMinute: number;
	minutes: number;
}

/**
 * The day's grid cut into 30-minute wheels, in order from 06:00 ET.
 * Each wheel is one Block; a show hour is two wheels.
 */
export function wheelsFor(day: string): Block[] {
	const out: Block[] = [];
	for (const row of gridFor(day)) {
		const [sh, sm] = row.start.split(':').map(Number);
		const [eh, em] = row.end.split(':').map(Number);
		let start = sh * 60 + sm;
		let end = eh * 60 + em;
		// Times before 06:00 belong to the next calendar date.
		if (start < 6 * 60) start += 24 * 60;
		if (end <= 6 * 60) end += 24 * 60;
		for (let t = start; t < end; t += WHEEL_MINUTES) {
			const nextDay = t >= 24 * 60;
			const mins = t % (24 * 60);
			out.push({
				show: row.show,
				date: nextDay ? addDays(day, 1) : day,
				startHour: Math.floor(mins / 60),
				startMinute: mins % 60,
				minutes: Math.min(WHEEL_MINUTES, end - t)
			});
		}
	}
	return out;
}
