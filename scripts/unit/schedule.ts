import assert from 'node:assert/strict';
import { buildPlaylist, MAX_REPEAT_HOURS } from '../../src/lib/pipeline/schedule.ts';
import type { ItemKind, Segment } from '../../src/lib/types.ts';

const DAY = '2026-11-23';
const kinds: ItemKind[] = ['registration', 'approval', 'readout', 'deal', 'paper'];
const live: Segment[] = Array.from({ length: 40 }, (_, i) => ({
	id: `live-${String(i).padStart(2, '0')}`, storyId: `st-${i}`, format: i % 2 ? 'headlines' : 'pipeline', library: false,
	asOf: DAY, title: `L${i}`, beats: [], createdAt: '', duration: 30 + (i % 5) * 5
}));
const lib: Segment[] = Array.from({ length: 20 }, (_, i) => ({
	id: `lib-${String(i).padStart(2, '0')}`, format: 'explainer', library: true, libraryShow: i % 2 ? 'this-day' : 'blockbuster',
	asOf: DAY, title: `B${i}`, beats: [], createdAt: '', duration: 90 + i
}));
const kindOf = new Map(live.map((s, i) => [s.storyId!, kinds[i % kinds.length]]));
const build = (segments = [...live, ...lib]) => buildPlaylist(DAY, { segments, kindOf, builtAt: 'x' });

/** For each live segment, the daytime show hours it airs in (reruns and library excluded). */
function liveHours() {
	const { playlist } = build();
	const hours = new Map<string, Set<number>>();
	for (const s of playlist.slots) {
		if (s.show === 'reruns' || s.show === 'library') continue;
		for (const e of s.entries) if (e.kind === 'segment' && e.segmentId.startsWith('live-')) {
			const h = Math.floor((s.start - playlist.slots[0].start) / 3_600_000);
			hours.set(e.segmentId, (hours.get(e.segmentId) ?? new Set()).add(h));
		}
	}
	return hours;
}

export const checks: [string, () => void][] = [
	['48 wheels that tile the day with no gaps or overlaps', () => {
		const { playlist } = build();
		assert.equal(playlist.slots.length, 48);
		for (const s of playlist.slots) {
			let t = s.start;
			for (const e of s.entries) {
				assert.equal(e.start, t);
				t += e.duration;
			}
			assert.equal(t, s.end);
		}
		for (let i = 1; i < 48; i++) assert.equal(playlist.slots[i].start, playlist.slots[i - 1].end);
	}],
	['no wheel is empty with this much content, and padding is under 5%', () => {
		const { playlist, stats } = build();
		for (const s of playlist.slots) assert.ok(s.entries.some((e) => e.kind === 'segment'), `${s.show} empty`);
		assert.ok(stats.padSeconds / (24 * 3600) < 0.05, `padding ${stats.padSeconds}`);
	}],
	['both halves of a show hour play the same wheel', () => {
		const { playlist } = build();
		for (let i = 0; i < 48; i += 2) {
			const a = playlist.slots[i].entries.map((e) => (e.kind === 'segment' ? e.segmentId : 'pad'));
			const b = playlist.slots[i + 1].entries.map((e) => (e.kind === 'segment' ? e.segmentId : 'pad'));
			if (playlist.slots[i].show === playlist.slots[i + 1].show && playlist.slots[i].show !== 'reruns') assert.deepEqual(a, b);
		}
	}],
	['a live segment airs once per wheel, in at most 6 daytime hours, repeats never in adjacent hours', () => {
		const { playlist } = build();
		for (const s of playlist.slots) {
			const ids = s.entries.flatMap((e) => (e.kind === 'segment' ? [e.segmentId] : []));
			assert.equal(new Set(ids).size, ids.length, `${s.show} repeats a segment`);
		}
		for (const [id, hs] of liveHours()) {
			assert.ok(hs.size <= MAX_REPEAT_HOURS, `${id} in ${hs.size} hours`);
			const sorted = [...hs].sort((a, b) => a - b);
			if (sorted.length > 3) for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] > 1 || i < 3, `${id} adjacent`);
		}
	}],
	['same input, same playlist', () => assert.deepEqual(build().playlist, build().playlist)],
	['no segments at all: every wheel is one pad', () => {
		const { playlist, stats } = build([]);
		for (const s of playlist.slots) assert.deepEqual(s.entries.map((e) => e.kind), ['pad']);
		assert.equal(stats.padSeconds, 24 * 3600);
	}]
];
