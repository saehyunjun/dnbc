// Player fallback: when a channel day has no playlist, replay the newest earlier one on today's clock.

import type { Playlist } from '../types';
import { addDays, etToUtc, DAY_START_HOUR } from './time';

/** Move a playlist to another channel day. Slots are by time of day, so every time shifts by the gap between the two 06:00 ET starts. */
export function redate(p: Playlist, day: string): Playlist {
	if (p.day === day) return p;
	const shift = etToUtc(day, DAY_START_HOUR) - etToUtc(p.day, DAY_START_HOUR);
	return {
		...p,
		day,
		slots: p.slots.map((s) => ({
			...s,
			start: s.start + shift,
			end: s.end + shift,
			entries: s.entries.map((e) => ({ ...e, start: e.start + shift }))
		}))
	};
}

export interface Resolved {
	playlists: Playlist[];
	stale: boolean;
	/** The stored day that was replayed, when stale. */
	sourceDay?: string;
}

/**
 * `today` and `tomorrow` are what the store holds for the asked day and the next. `latest` is the newest stored
 * playlist on or before the asked day. If today is missing, the player gets `latest` re-dated to today (and to
 * tomorrow when that is missing too), so it never comes up empty. With no stored playlist at all the answer is empty.
 */
export function resolvePlaylists(day: string, today: Playlist | undefined, tomorrow: Playlist | undefined, latest: Playlist | undefined): Resolved {
	if (today) return { playlists: [today, ...(tomorrow ? [tomorrow] : [])], stale: false };
	if (!latest) return { playlists: tomorrow ? [tomorrow] : [], stale: false };
	return {
		playlists: [redate(latest, day), tomorrow ?? redate(latest, addDays(day, 1))],
		stale: true,
		sourceDay: latest.day
	};
}
