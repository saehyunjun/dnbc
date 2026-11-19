import assert from 'node:assert/strict';
import { CONDITIONS, isDerivedId, segmentInScope } from '../../src/lib/channel/scope.ts';
import { checkSegment } from '../../src/lib/pipeline/check.ts';
import { landscapes, landscapeItem, writeLandscape, scopedActive, scopedSponsors, scopeProfileItem, writeScopeProfile, landscapeLine } from '../../src/lib/pipeline/write-landscape.ts';
import type { Trial } from '../../src/lib/store/index.ts';

const NOW = Date.parse('2026-11-19T15:00:00Z');
const DAYS = ['2026-11-01', '2026-11-05', '2026-11-09', '2026-11-12', '2026-11-15', '2026-11-18'];
const trial = (i: number, over: Partial<Trial> = {}): Trial => ({
	nct: `NCT0700000${i}`,
	title: `A Study of ABC-10${i} in Parkinson's Disease`,
	sponsor: i % 2 ? 'Acme Therapeutics, Inc.' : 'Beta Pharma Ltd.',
	phase: i < 3 ? 'PHASE3' : i < 5 ? 'PHASE2' : 'PHASE1|PHASE2',
	status: 'RECRUITING',
	interventions: [`ABC-10${i}`],
	conditions: ["Parkinson's Disease"],
	firstPosted: DAYS[i % 6],
	...over
});
const trials = Array.from({ length: 7 }, (_, i) => trial(i));
const pd = CONDITIONS.find((c) => c.id === 'parkinsons')!;
const ctx = (it: { id: string }, item: never) => ({ items: new Map([[it.id, item]]), now: NOW });

export const checks: [string, () => void][] = [
	['isDerivedId accepts landscape- and profile-scope-', () => {
		assert.ok(isDerivedId('landscape-ms-2026-11-19'));
		assert.ok(isDerivedId('profile-scope-acme-2026-11-19'));
		assert.ok(!isDerivedId('story-1'));
	}],
	['landscapes needs 5 active in-scope trials and ignores closed or out-of-scope ones', () => {
		const mixed = [...trials.slice(0, 4), trial(9, { status: 'COMPLETED' }), trial(8, { title: 'Flu', conditions: ['Influenza'] })];
		assert.equal(landscapes(scopedActive(mixed)).size, 0);
		const m = landscapes(scopedActive(trials));
		assert.equal(m.size, 1);
		assert.equal([...m.values()][0].length, 7);
	}],
	['landscape segment passes the fact check, carries scope, and states the count', () => {
		const it = landscapeItem(pd, trials, NOW);
		assert.equal(it.id, 'landscape-parkinsons-2026-11-19');
		const r = writeLandscape(pd, it, ctx(it, it as never));
		assert.ok(r.segment, r.dropped.join('; '));
		const seg = r.segment!;
		assert.deepEqual(seg.scope, ['parkinsons']);
		assert.equal(seg.libraryShow, 'condition-landscape');
		assert.ok(seg.library && seg.duration > 30);
		assert.ok(segmentInScope(seg));
		const text = JSON.stringify(seg.beats);
		assert.ok(text.includes("lists 7 active industry trials naming Parkinson's disease"));
		assert.ok(!/\b(first|only|leads|most|winner|race)\b/i.test(text), text);
		assert.ok(seg.citations?.length);
		assert.ok(checkSegment(seg, { items: ctx(it, it as never).items, now: NOW }).ok);
	}],
	['landscape shows phase counts and at most 6 recent registrations', () => {
		const it = landscapeItem(pd, trials, NOW);
		assert.ok(it.text.includes('Phase 3: 3 trials.'));
		assert.ok(it.text.includes('Phase 2: 2 trials.'));
		assert.ok(it.text.includes('Phase 1/2: 2 trials.'));
		assert.equal(it.text.split('\n').filter((l) => /^NCT\d{8}:/.test(l)).length, 6);
	}],
	['a wrong count in the beat is caught by the check', () => {
		const it = landscapeItem(pd, trials, NOW);
		const seg = writeLandscape(pd, it, ctx(it, it as never)).segment!;
		const bad = JSON.parse(JSON.stringify(seg).replace('lists 7 active', 'lists 17 active'));
		assert.ok(!checkSegment(bad, { items: ctx(it, it as never).items, now: NOW }).ok);
	}],
	['closing line is chosen by rule', () => {
		assert.ok(landscapeLine([['Phase 3', 2]]).startsWith('Phase 3 trials'));
		assert.ok(landscapeLine([['Phase 1', 4]]).startsWith('None of these'));
	}],
	['scope sponsor profile counts only in-scope trials', () => {
		const withOut = [...trials, trial(20, { sponsor: 'Acme Therapeutics, Inc.', title: 'Flu', conditions: ['Influenza'] })];
		const by = scopedSponsors(scopedActive(withOut));
		assert.equal(by.size, 0); // Acme has 4 in-scope trials, Beta 3
		const more = [...trials, ...[10, 12, 14].map((i) => trial(i, { sponsor: 'Acme Therapeutics, Inc.' }))];
		const m = scopedSponsors(scopedActive(more));
		assert.equal([...m.keys()].join(), 'Acme Therapeutics, Inc.');
		const rows = m.get('Acme Therapeutics, Inc.')!;
		const it = scopeProfileItem('Acme Therapeutics, Inc.', rows, NOW);
		assert.ok(it.id.startsWith('profile-scope-acme-therapeutics-inc-'));
		assert.ok(it.text.includes(`lists ${rows.length} active industry trials from`));
		const r = writeScopeProfile(it, ctx(it, it as never));
		assert.ok(r.segment, r.dropped.join('; '));
		assert.deepEqual(r.segment!.scope, ['parkinsons']);
		assert.ok(JSON.stringify(r.segment!.beats).includes('Acme Therapeutics'));
	}]
];
