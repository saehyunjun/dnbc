// The channel clock: an instant plus a playlist gives the show, entry, and beat on air.
// Pure functions, so the player, the soak test, and the unit tests all agree.

import type { Entry, Playlist, Segment, Slot } from '$lib/types';

export interface OnAir {
	slot: Slot;
	entry: Entry;
	entryIndex: number;
	/** Beat index inside the segment, or 0 for padding. */
	beatIndex: number;
	/** Seconds into the current beat. */
	beatElapsed: number;
	/** Seconds left in the current beat. */
	beatRemaining: number;
}

export function findSlot(playlist: Playlist, now: number): Slot | undefined {
	// Slots are sorted and do not overlap.
	let lo = 0;
	let hi = playlist.slots.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		const s = playlist.slots[mid];
		if (now < s.start) hi = mid - 1;
		else if (now >= s.end) lo = mid + 1;
		else return s;
	}
	return undefined;
}

export function onAir(
	playlists: Playlist[],
	segments: Map<string, Segment>,
	now: number,
	blocked: Set<string> = new Set()
): OnAir | undefined {
	for (const p of playlists) {
		const slot = findSlot(p, now);
		if (!slot) continue;
		for (let i = 0; i < slot.entries.length; i++) {
			const e = slot.entries[i];
			if (now < e.start || now >= e.start + e.duration) continue;
			if (e.kind === 'pad') {
				const elapsed = (now - e.start) / 1000;
				return {
					slot,
					entry: e,
					entryIndex: i,
					beatIndex: 0,
					beatElapsed: elapsed,
					beatRemaining: e.duration / 1000 - elapsed
				};
			}
			const seg = segments.get(e.segmentId);
			if (!seg || blocked.has(seg.id) || (seg.storyId && blocked.has(seg.storyId))) {
				// A blocked or missing segment airs as padding for its own time.
				const elapsed = (now - e.start) / 1000;
				return {
					slot,
					entry: { kind: 'pad', text: 'DNBC', start: e.start, duration: e.duration },
					entryIndex: i,
					beatIndex: 0,
					beatElapsed: elapsed,
					beatRemaining: e.duration / 1000 - elapsed
				};
			}
			let t = (now - e.start) / 1000;
			for (let b = 0; b < seg.beats.length; b++) {
				const d = seg.beats[b].duration ?? 5;
				if (t < d) return { slot, entry: e, entryIndex: i, beatIndex: b, beatElapsed: t, beatRemaining: d - t };
				t -= d;
			}
			const last = seg.beats.length - 1;
			return { slot, entry: e, entryIndex: i, beatIndex: last, beatElapsed: 0, beatRemaining: 0 };
		}
		return undefined;
	}
	return undefined;
}

/**
 * Offset to add to the device clock, from the server's Date header and the request's round trip.
 * Date has one-second resolution, so the result is within about half a second plus the round trip.
 */
export function clockOffset(serverDate: string | null, sentAt: number, receivedAt: number): number {
	if (!serverDate) return 0;
	const server = Date.parse(serverDate);
	if (Number.isNaN(server)) return 0;
	const mid = (sentAt + receivedAt) / 2;
	return server + 500 - mid;
}
