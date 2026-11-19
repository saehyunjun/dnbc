import assert from 'node:assert/strict';
import { etToUtc, etParts, channelDay, etOffsetMinutes, addDays } from '../../src/lib/channel/time.ts';
import { wheelsFor, gridFor, WEEKDAY, WEEKEND, HOLIDAY, SHOWS } from '../../src/lib/channel/grid.ts';
import { holdSeconds, applyTiming, TIMING } from '../../src/lib/channel/timing.ts';
import { onAir, clockOffset } from '../../src/lib/channel/clock.ts';
import type { Beat, Playlist, Segment } from '../../src/lib/types.ts';

const minutes = (rows: typeof WEEKDAY) =>
	rows.reduce((n, r) => {
		const [sh, sm] = r.start.split(':').map(Number);
		const [eh, em] = r.end.split(':').map(Number);
		let s = sh * 60 + sm;
		let e = eh * 60 + em;
		if (s < 360) s += 1440;
		if (e <= 360) e += 1440;
		return n + (e - s);
	}, 0);

export const checks: [string, () => void][] = [
	['ET offset is -300 in November and -240 in July', () => {
		assert.equal(etOffsetMinutes(Date.UTC(2026, 10, 23, 12)), -300);
		assert.equal(etOffsetMinutes(Date.UTC(2026, 6, 1, 12)), -240);
	}],
	['etToUtc 06:00 ET on 23 Nov is 11:00 UTC', () => {
		assert.equal(new Date(etToUtc('2026-11-23', 6)).toISOString(), '2026-11-23T11:00:00.000Z');
	}],
	['etToUtc across DST start (8 Mar 2026, 03:00 EDT = 07:00 UTC)', () => {
		assert.equal(new Date(etToUtc('2026-03-08', 3)).toISOString(), '2026-03-08T07:00:00.000Z');
	}],
	['etParts reads date, hour, weekday', () => {
		const p = etParts(Date.UTC(2026, 10, 23, 14, 42));
		assert.deepEqual(p, { date: '2026-11-23', hour: 9, minute: 42, weekday: 1 });
	}],
	['channel day: 05:59 ET belongs to yesterday, 06:00 to today', () => {
		assert.equal(channelDay(etToUtc('2026-11-24', 5, 59)), '2026-11-23');
		assert.equal(channelDay(etToUtc('2026-11-24', 6, 0)), '2026-11-24');
	}],
	['addDays crosses a month', () => assert.equal(addDays('2026-11-30', 1), '2026-12-01')],
	['each grid covers exactly 24 hours', () => {
		for (const g of [WEEKDAY, WEEKEND, HOLIDAY]) assert.equal(minutes(g), 1440);
	}],
	['grids have no gaps: each row starts where the last ended', () => {
		for (const g of [WEEKDAY, WEEKEND, HOLIDAY]) {
			assert.equal(g[0].start, '06:00');
			for (let i = 1; i < g.length; i++) assert.equal(g[i].start, g[i - 1].end);
			assert.equal(g[g.length - 1].end, '06:00');
		}
	}],
	['every grid show exists', () => {
		for (const g of [WEEKDAY, WEEKEND, HOLIDAY]) for (const r of g) assert.ok(SHOWS[r.show], r.show);
	}],
	['weekday has 48 wheels of 30 minutes', () => {
		const w = wheelsFor('2026-11-23');
		assert.equal(w.length, 48);
		assert.ok(w.every((b) => b.minutes === 30));
	}],
	['wheels after midnight carry the next calendar date', () => {
		const w = wheelsFor('2026-11-23');
		const last = w[w.length - 1];
		assert.equal(last.date, '2026-11-24');
		assert.equal(last.startHour, 5);
		assert.equal(last.startMinute, 30);
	}],
	['grid picks weekday, weekend, and holiday', () => {
		assert.equal(gridFor('2026-11-23'), WEEKDAY); // Monday
		assert.equal(gridFor('2026-11-28'), WEEKEND); // Saturday
		assert.equal(gridFor('2026-11-26'), HOLIDAY); // Thanksgiving
	}],
	['hold time: short beat gets the minimum, long beat the maximum', () => {
		assert.equal(holdSeconds({ type: 'headline', text: 'FDA approves drug', sources: [] }), TIMING.min);
		const long = Array(60).fill('word').join(' ');
		assert.equal(holdSeconds({ type: 'anchor', who: 'anchor-a', text: long, sources: [] }), TIMING.max);
	}],
	['applyTiming sets every duration and sums them', () => {
		const beats: Beat[] = [
			{ type: 'headline', text: 'One', sources: [] },
			{ type: 'anchor', who: 'anchor-a', text: Array(21).fill('w').join(' '), sources: [] }
		];
		const total = applyTiming(beats);
		assert.ok(beats.every((b) => typeof b.duration === 'number'));
		assert.equal(total, (beats[0].duration ?? 0) + (beats[1].duration ?? 0));
	}],
	['onAir finds the beat at an instant, and blocked segments air as padding', () => {
		const t0 = etToUtc('2026-11-23', 6);
		const seg: Segment = {
			id: 's1', format: 'headlines', library: false, asOf: '2026-11-23', title: 't', createdAt: '', duration: 10,
			beats: [
				{ type: 'headline', text: 'a', sources: [], duration: 4 },
				{ type: 'anchor', who: 'anchor-a', text: 'b', sources: [], duration: 6 }
			]
		};
		const pl: Playlist = {
			day: '2026-11-23', version: 1, builtAt: '',
			slots: [{ show: 'morning-dose', start: t0, end: t0 + 30 * 60_000, entries: [{ kind: 'segment', segmentId: 's1', start: t0, duration: 10_000 }] }]
		};
		const segs = new Map([['s1', seg]]);
		assert.equal(onAir([pl], segs, t0 + 1000)?.beatIndex, 0);
		assert.equal(onAir([pl], segs, t0 + 5000)?.beatIndex, 1);
		assert.equal(onAir([pl], segs, t0 + 5000, new Set(['s1']))?.entry.kind, 'pad');
		assert.equal(onAir([pl], segs, t0 - 1), undefined);
	}],
	['clockOffset corrects a device clock 90 s slow', () => {
		const real = Date.UTC(2026, 10, 23, 12, 0, 0);
		const device = real - 90_000;
		const off = clockOffset(new Date(real).toUTCString(), device - 50, device + 50);
		assert.ok(Math.abs(device + off - real) <= 1000, String(off));
	}]
];
