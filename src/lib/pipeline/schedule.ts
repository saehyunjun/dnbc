// The scheduler: a channel day's segments into a Playlist of 30-minute wheels.
// Rules (docs/PLAN.md section 2, "fill"):
// - Each show hour has one wheel, played in both of its halves.
// - A live segment airs at most once per wheel and in at most 3 show hours a day (reruns don't count).
//   If a wheel is still short, a second pass allows up to 6 hours, never two hours in a row.
// - A library segment airs at most once a day (the week limit is the caller's: pass `libraryAired`).
// - Weekday daytime wheels open with one library segment from the show's library slot.
// - A short wheel adds library segments, then padding. A wheel never airs empty.
// - Rerun wheels replay the day's live wheels in order. Library hours (overnight) cycle every
//   library segment with no daily cap (Aaron 2026-11-18: cycle content 21:00 to 07:00).
// - A daytime show with no matching segments takes other live segments (pass 3), same repeat rules.
// - A wheel still short after that cycles the library again (a library segment may then air twice a day).
// Pure: same input, same playlist.

import type { Entry, ItemKind, Playlist, Segment, ShowId, Slot } from '../types';
import { SHOWS, wheelsFor, type Block } from '../channel/grid';
import { etToUtc } from '../channel/time';

export const MAX_LIVE_HOURS = 3;
/** Second pass, when fresh segments run out: daytime repeats, never in adjacent hours. */
export const MAX_REPEAT_HOURS = 6;
const NON_LIVE: ShowId[] = ['reruns', 'library'];

export interface ScheduleInput {
	segments: Segment[];
	kindOf: Map<string, ItemKind>;
	score?: Map<string, number>;
	/** Library segment id to the number of days it aired in the last 7 (cap 3). */
	libraryAired?: Map<string, number>;
	version?: number;
	builtAt?: string;
}

export interface ScheduleStats {
	wheels: number;
	liveSeconds: number;
	librarySeconds: number;
	padSeconds: number;
	liveSegments: number;
	librarySegments: number;
}

type Item = { id: string; seconds: number; library: boolean } | { pad: string; seconds: number };

function matches(seg: Segment, show: ShowId, kindOf: Map<string, ItemKind>): 0 | 1 | 2 {
	const s = SHOWS[show];
	if (!s.format || seg.library) return 0;
	const kind = seg.storyId ? kindOf.get(seg.storyId) : undefined;
	const kindOk = !s.kinds?.length || (kind !== undefined && s.kinds.includes(kind));
	if (!kindOk) return 0;
	if (seg.format === s.format) return 2;
	// Headline shows also take other live formats about their kinds.
	if (s.format === 'headlines' && ['pipeline', 'readout', 'headlines'].includes(seg.format)) return 1;
	return 0;
}

export function buildPlaylist(day: string, input: ScheduleInput): { playlist: Playlist; stats: ScheduleStats } {
	const blocks = wheelsFor(day);
	const live = input.segments.filter((s) => !s.library && s.duration > 0);
	const library = input.segments
		.filter((s) => s.library && s.duration > 0 && (input.libraryAired?.get(s.id) ?? 0) < 3)
		.sort((a, b) => (input.libraryAired?.get(a.id) ?? 0) - (input.libraryAired?.get(b.id) ?? 0) || a.id.localeCompare(b.id));
	const score = (s: Segment) => (s.storyId ? input.score?.get(s.storyId) ?? 0 : 0);
	const hoursUsed = new Map<string, number[]>();
	const libraryUsed = new Set<string>();
	const stats: ScheduleStats = { wheels: blocks.length, liveSeconds: 0, librarySeconds: 0, padSeconds: 0, liveSegments: 0, librarySegments: 0 };

	const takeLibrary = (room: number, show?: Segment['libraryShow']) => {
		const pick = library.find((s) => !libraryUsed.has(s.id) && s.duration <= room && (!show || s.libraryShow === show));
		if (pick) libraryUsed.add(pick.id);
		return pick;
	};

	const fillLive = (show: ShowId, hourIndex: number, seconds: number, daytime: boolean): Item[] => {
		const out: Item[] = [];
		let room = seconds;
		const slot = SHOWS[show].librarySlot;
		if (daytime && slot) {
			const lib = takeLibrary(room, slot);
			if (lib) {
				out.push({ id: lib.id, seconds: lib.duration, library: true });
				room -= lib.duration;
			}
		}
		const pool = live
			.map((s) => ({ s, m: matches(s, show, input.kindOf) }))
			.filter((x) => x.m > 0)
			.sort((a, b) => b.m - a.m || score(b.s) - score(a.s) || a.s.id.localeCompare(b.s.id));
		// Pass 1: the strict rule. Pass 2, only if the wheel is still short: up to
		// MAX_REPEAT_HOURS, never in the hour before or after one it already airs in.
		const any = live.filter((s) => matches(s, show, input.kindOf) === 0).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
		for (const pass of [1, 2, 3]) {
			for (const s of pass === 3 ? any : pool.map((x) => x.s)) {
				if (s.duration > room) continue;
				if (out.some((x) => 'id' in x && x.id === s.id)) continue;
				const used = hoursUsed.get(s.id) ?? [];
				if (pass === 1 && used.length >= MAX_LIVE_HOURS) continue;
				if (pass >= 2 && (used.length >= MAX_REPEAT_HOURS || used.some((h) => Math.abs(h - hourIndex) <= 1))) continue;
				used.push(hourIndex);
				hoursUsed.set(s.id, used);
				out.push({ id: s.id, seconds: s.duration, library: false });
				room -= s.duration;
			}
			if (room < 20) break;
		}
		const filled = fillLibrary(out, room);
		// Last fallback: cycle the library again rather than air a padded wheel.
		const left = seconds - filled.reduce((n, x) => n + x.seconds, 0);
		return left >= 20 ? [...filled, ...cycleLibrary(left)] : filled;
	};

	const fillLibrary = (out: Item[], room: number): Item[] => {
		for (let lib = takeLibrary(room); lib; lib = takeLibrary(room)) {
			out.push({ id: lib.id, seconds: lib.duration, library: true });
			room -= lib.duration;
		}
		return out;
	};

	// Overnight library hours: walk the whole library in order, round and round.
	let cursor = 0;
	const cycleLibrary = (seconds: number): Item[] => {
		const out: Item[] = [];
		let room = seconds;
		for (let tries = 0; library.length && tries < library.length; tries++) {
			const s = library[cursor++ % library.length];
			if (s.duration > room) continue;
			out.push({ id: s.id, seconds: s.duration, library: true });
			room -= s.duration;
			tries = -1;
			if (room < 20) break;
		}
		return out;
	};

	// One wheel per show hour, built in grid order so earlier shows get first pick.
	const wheelOf = new Map<string, Item[]>();
	const liveOrder: Item[][] = [];
	const hourKey = (b: Block) => `${b.show}|${b.date}|${b.startHour}`;
	for (const b of blocks) {
		const key = hourKey(b);
		if (wheelOf.has(key) || NON_LIVE.includes(b.show)) continue;
		const daytime = b.startHour >= 6 && b.startHour < 21;
		const items = fillLive(b.show, (b.date > day ? 24 : 0) + b.startHour, b.minutes * 60, daytime);
		wheelOf.set(key, items);
		liveOrder.push(items);
	}
	let rerun = 0;
	for (const b of blocks) {
		const key = hourKey(b);
		if (wheelOf.has(key)) continue;
		if (b.show === 'library') wheelOf.set(key, cycleLibrary(b.minutes * 60));
		else if (b.show === 'reruns' && liveOrder.length) wheelOf.set(key, liveOrder[rerun++ % liveOrder.length]);
		else wheelOf.set(key, []);
	}

	const slots: Slot[] = [];
	for (const b of blocks) {
		const start = etToUtc(b.date, b.startHour, b.startMinute);
		const end = start + b.minutes * 60_000;
		const entries: Entry[] = [];
		let t = start;
		for (const it of wheelOf.get(hourKey(b)) ?? []) {
			const ms = Math.round(it.seconds * 1000);
			if (t + ms > end) break;
			if ('id' in it) {
				entries.push({ kind: 'segment', segmentId: it.id, start: t, duration: ms });
				if (it.library) {
					stats.librarySeconds += it.seconds;
					stats.librarySegments++;
				} else {
					stats.liveSeconds += it.seconds;
					stats.liveSegments++;
				}
			}
			t += ms;
		}
		if (t < end) {
			entries.push({ kind: 'pad', text: `${SHOWS[b.show].name} on DNBC`, start: t, duration: end - t });
			stats.padSeconds += (end - t) / 1000;
		}
		slots.push({ show: b.show, start, end, entries });
	}

	return {
		playlist: { day, version: input.version ?? 1, builtAt: input.builtAt ?? new Date().toISOString(), slots },
		stats
	};
}
