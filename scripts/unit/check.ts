import assert from 'node:assert/strict';
import { checkSegment, dateKeys, numberKeys, drugTokens } from '../../src/lib/pipeline/check.ts';
import type { Beat, Segment, SourceItem, Story } from '../../src/lib/types.ts';

const NOW = Date.parse('2026-11-23T15:00:00Z');

const release: SourceItem = {
	id: 'pr-1',
	source: 'prnewswire',
	tier: 'primary',
	url: 'https://example.test/pr-1',
	fetchedAt: '2026-11-23T12:00:00Z',
	publishedAt: '2026-11-23T12:00:00Z',
	title: 'Acme Bio Announces Positive Topline Results From Phase 3 LUMEN Trial of zorbitamab in Lupus',
	text:
		'BOSTON, November 23, 2026 -- Acme Bio today announced that the Phase 3 LUMEN trial (NCT01234567) of zorbitamab met its primary endpoint. ' +
		'At week 52, 45% of patients on zorbitamab reached remission compared with 21% on placebo. The trial enrolled 1,204 patients. ' +
		'"We are encouraged by these results. They support our plan to file with the FDA," said Jane Rivera, Chief Executive Officer of Acme Bio. ' +
		'Separately, the company said its earlier drug ACM-200 did not meet its primary endpoint in a Phase 2 study. ' +
		'Acme plans to submit a Biologics License Application in the first half of 2027.',
	entities: { drugs: ['zorbitamab', 'ACM-200'], sponsors: ['Acme Bio'], nctIds: ['NCT01234567'], conditions: ['Lupus'] },
	kind: 'readout'
};
const old: SourceItem = { ...release, id: 'pr-old', publishedAt: '2026-11-01T12:00:00Z' };
const reddit: SourceItem = {
	id: 'rd-1', source: 'reddit', tier: 'social', url: '', fetchedAt: '2026-11-22T00:00:00Z', publishedAt: '2026-11-22T00:00:00Z',
	title: 'post', text: 'I have had lupus for ten years. Any new option feels like hope.', entities: { drugs: [], sponsors: [], nctIds: [], conditions: ['Lupus'] }, kind: 'post',
	speaker: { community: 'r/lupus' }
};
const items = new Map([release, old, reddit].map((i) => [i.id, i]));
const story: Story = {
	id: 'story-1', itemIds: ['pr-1', 'rd-1'], kind: 'readout', title: release.title, score: 8,
	entities: release.entities, firstSeen: release.publishedAt, updatedAt: release.publishedAt
};

function seg(beats: Beat[], extra: Partial<Segment> = {}): Segment {
	return { id: 'seg', storyId: 'story-1', format: 'readout', library: false, asOf: '2026-11-23', title: 't', createdAt: '', duration: 0, beats, ...extra };
}
const S = ['pr-1'];
const origin: Beat = { type: 'anchor', who: 'anchor-b', text: 'In a press release on 23 November, Acme Bio’s chief executive said:', sources: S };
const goodQuote: Beat = {
	type: 'quote', text: 'We are encouraged by these results. They support our plan to file with the FDA.',
	speaker: { name: 'Jane Rivera', role: 'Chief Executive Officer' }, publisher: 'Acme Bio', date: '2026-11-23', url: release.url, sources: S
};
const run = (beats: Beat[], extra?: Partial<Segment>) => checkSegment(seg(beats, extra), { items, story, now: NOW });
const fails = (beats: Beat[], match: RegExp, extra?: Partial<Segment>) => {
	const r = run(beats, extra);
	assert.ok(!r.ok, 'expected a failure');
	assert.ok(r.errors.some((e) => match.test(e)), r.errors.join(' | '));
};

export const checks: [string, () => void][] = [
	['date keys: 23 November, Nov 23, 2026-11-23 all agree', () => {
		const a = dateKeys('on 23 November').keys, b = dateKeys('Nov 23').keys, c = dateKeys('2026-11-23').keys;
		assert.ok(a.has('11-23') && b.has('11-23') && c.has('11-23'));
	}],
	['number keys: 45%, 45 percent; ignore Phase 3 and NCT ids', () => {
		assert.deepEqual([...numberKeys('45% vs 45 percent')], ['45%']);
		assert.equal(numberKeys('Phase 3 trial NCT01234567').size, 0);
		assert.ok(numberKeys('1,204 patients').has('1204'));
	}],
	['drug tokens find INN stems and code names', () => {
		assert.deepEqual(drugTokens('zorbitamab and ACM-200 vs placebo').sort(), ['acm-200', 'zorbitamab']);
	}],
	['a clean readout segment passes', () => {
		const r = run([
			{ type: 'headline', text: 'Zorbitamab meets its goal in a lupus trial', sources: S },
			{ type: 'anchor', who: 'anchor-b', text: 'Acme Bio says zorbitamab met its primary endpoint in the Phase 3 LUMEN trial.', sources: S },
			{ type: 'stat', value: '45% vs 21%', label: 'patients in remission at week 52, zorbitamab vs placebo', sources: S },
			origin,
			goodQuote,
			{ type: 'anchor', who: 'anchor-b', text: 'Acme plans to file in the first half of 2027.', sources: S }
		]);
		assert.ok(r.ok, r.errors.join(' | '));
	}],
	['planted: beat with no source', () => fails([{ type: 'headline', text: 'Something', sources: [] }], /no source/)],
	['planted: invented number', () => fails([{ type: 'stat', value: '52%', label: 'in remission', sources: S }], /number "52%"/)],
	['planted: wrong date', () => fails([{ type: 'anchor', who: 'anchor-a', text: 'Acme reported on 20 November.', sources: S }], /date/)],
	['planted: invented NCT id', () => fails([{ type: 'anchor', who: 'anchor-a', text: 'The trial is NCT09999999.', sources: S }], /NCT09999999/)],
	['planted: unknown drug', () => fails([{ type: 'anchor', who: 'anchor-a', text: 'Results for fakeximab look strong.', sources: S }], /fakeximab/)],
	['planted: reversed outcome (says missed of the drug that met)', () => fails([{ type: 'anchor', who: 'anchor-a', text: 'Zorbitamab missed its primary endpoint.', sources: S }], /missed/)],
	['planted: outcome moved to the wrong drug', () => fails([{ type: 'anchor', who: 'anchor-a', text: 'ACM-200 met its primary endpoint.', sources: S }], /"met"/)],
	['planted: approval the source never states', () => fails([{ type: 'headline', text: 'FDA approves zorbitamab', sources: S }], /approved/)],
	['planted: fact cited only to a social item', () => fails([{ type: 'anchor', who: 'advocate', text: '45% of patients improved.', sources: ['rd-1'] }], /only social/)],
	['planted: quote not verbatim', () => fails([origin, { ...goodQuote, text: 'We are thrilled by these results.' }], /not verbatim/)],
	['planted: quote cut mid-sentence', () => fails([origin, { ...goodQuote, text: 'encouraged by these results.' }], /whole sentences|mid-sentence/)],
	['planted: wrong speaker', () => fails([origin, { ...goodQuote, speaker: { name: 'Tom Okoye', role: 'CMO' } }], /speaker/)],
	['planted: quote from another story', () => fails([origin, { ...goodQuote, sources: ['pr-old'] }], /another story/)],
	['planted: quote older than 7 days', () => fails([origin, { ...goodQuote, sources: ['pr-old'] }], /days old/)],
	['library segments may use older quotes', () => {
		const r = checkSegment(seg([origin, { ...goodQuote, sources: ['pr-old'] }], { library: true }), { items, story: { ...story, itemIds: ['pr-old'] }, now: NOW });
		assert.ok(!r.errors.some((e) => /days old/.test(e)), r.errors.join(' | '));
	}],
	['planted: question before a quote', () => fails([{ ...origin, text: 'What did the CEO say?' } as Beat, goodQuote], /question/)],
	['planted: patient quote with a username', () =>
		fails([{ type: 'anchor', who: 'advocate', text: 'On r/lupus this week, one patient wrote:', sources: ['rd-1'] },
			{ type: 'quote', text: 'Any new option feels like hope.', speaker: { community: 'r/lupus', handle: 'u/someone' }, publisher: 'Reddit', date: '2026-11-22', sources: ['rd-1'] }], /username/)],
	['a clean patient quote passes', () => {
		const r = run([{ type: 'anchor', who: 'advocate', text: 'On r/lupus this week, one patient wrote:', sources: ['rd-1'] },
			{ type: 'quote', text: 'Any new option feels like hope.', speaker: { community: 'r/lupus' }, publisher: 'Reddit', date: '2026-11-22', sources: ['rd-1'] }]);
		assert.ok(r.ok, r.errors.join(' | '));
	}],
	['planted: beat over 40 words', () => fails([{ type: 'anchor', who: 'anchor-a', text: Array(45).fill('word').join(' '), sources: S }], /over 40/)],
	['planted: no as-of date', () => fails([{ type: 'headline', text: 'Acme news', sources: S }], /as of/, { asOf: '' })],
	['a year-less source date takes the item year; the item date counts for the Source line', () => {
		const r = run([
			{ type: 'headline', text: 'Zorbitamab meets its goal', sources: S },
			{ type: 'anchor', who: 'anchor-a', text: 'Acme reported results on 23 November 2026.', sources: S },
			{ type: 'anchor', who: 'anchor-b', text: 'Source: Acme Bio, 23 November 2026.', sources: S }
		]);
		assert.ok(r.ok, r.errors.join(' | '));
	}],
	['"did not meet" of ACM-200 supports "missed" of ACM-200', () => {
		const r = run([
			{ type: 'headline', text: 'ACM-200 misses in Phase 2', sources: S },
			{ type: 'anchor', who: 'anchor-a', text: 'ACM-200 missed its primary endpoint in a Phase 2 study.', sources: S }
		]);
		assert.ok(r.ok, r.errors.join(' | '));
	}]
];
