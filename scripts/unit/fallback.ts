import assert from 'node:assert/strict';
import { redate, resolvePlaylists } from '../../src/lib/channel/fallback.ts';
import { etToUtc } from '../../src/lib/channel/time.ts';
import type { Playlist } from '../../src/lib/types.ts';

const mk = (day: string, version = 1): Playlist => {
	const t = etToUtc(day, 6);
	return { day, version, builtAt: 'x', slots: [{ show: 'morning-dose', start: t, end: t + 1800_000, entries: [{ kind: 'segment', segmentId: 'a', start: t, duration: 60_000 }] }] };
};

export const checks: [string, () => void][] = [
	['today present: not stale, today and tomorrow served', () => {
		const r = resolvePlaylists('2026-11-19', mk('2026-11-19'), mk('2026-11-20'), undefined);
		assert.equal(r.stale, false);
		assert.deepEqual(r.playlists.map((p) => p.day), ['2026-11-19', '2026-11-20']);
	}],
	['today missing: newest earlier playlist is re-dated to today and tomorrow, marked stale', () => {
		const r = resolvePlaylists('2026-11-19', undefined, undefined, mk('2026-11-17'));
		assert.equal(r.stale, true);
		assert.equal(r.sourceDay, '2026-11-17');
		assert.deepEqual(r.playlists.map((p) => p.day), ['2026-11-19', '2026-11-20']);
		assert.equal(r.playlists[0].slots[0].start, etToUtc('2026-11-19', 6));
		assert.equal(r.playlists[1].slots[0].entries[0].start, etToUtc('2026-11-20', 6));
	}],
	['today missing but tomorrow stored: tomorrow stays as stored', () => {
		const tm = mk('2026-11-20', 3);
		const r = resolvePlaylists('2026-11-19', undefined, tm, mk('2026-11-18'));
		assert.equal(r.stale, true);
		assert.equal(r.playlists[1], tm);
	}],
	['nothing stored: empty, not stale', () => {
		const r = resolvePlaylists('2026-11-19', undefined, undefined, undefined);
		assert.deepEqual(r, { playlists: [], stale: false });
	}],
	['redate keeps times of day across a DST change', () => {
		const p = redate(mk('2026-11-01'), '2026-11-03');
		assert.equal(p.slots[0].start, etToUtc('2026-11-03', 6));
	}]
];
