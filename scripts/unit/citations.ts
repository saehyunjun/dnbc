import assert from 'node:assert/strict';
import { citationsFor, isSourceLine, labelFor } from '../../src/lib/pipeline/citations.ts';
import type { Beat, SourceItem } from '../../src/lib/types.ts';

const it = (id: string, source: SourceItem['source'], url: string, extra: Partial<SourceItem> = {}): SourceItem => ({
	id, source, tier: 'primary', url, fetchedAt: '2026-11-18T00:00:00Z', publishedAt: '2026-11-17T09:00:00Z',
	title: `title ${id}`, text: '', entities: { drugs: [], sponsors: [], nctIds: [], conditions: [] }, kind: 'other', ...extra
});
const items = new Map([
	it('a', 'prnewswire', 'https://pr.test/a'),
	it('b', 'ctgov', 'https://clinicaltrials.gov/study/NCT1'),
	it('r', 'reddit', '', { tier: 'social', speaker: { community: 'r/lupus' } }),
	it('ref', 'reference', 'https://www.cancer.gov/research/x')
].map((x) => [x.id, x]));

export const checks: [string, () => void][] = [
	['citations in first-cited order, one per id, with label, date, and url', () => {
		const beats: Beat[] = [
			{ type: 'headline', text: 'h', sources: ['b'] },
			{ type: 'anchor', who: 'anchor-a', text: 'x', sources: ['a', 'b'] }
		];
		assert.deepEqual(citationsFor(beats, items).map((c) => [c.id, c.label, c.date, c.url]), [
			['b', 'ClinicalTrials.gov', '2026-11-17', 'https://clinicaltrials.gov/study/NCT1'],
			['a', 'PR Newswire', '2026-11-17', 'https://pr.test/a']
		]);
	}],
	['Reddit citations carry the community and no link', () => {
		const c = citationsFor([{ type: 'headline', text: 'h', sources: ['r'] }], items)[0];
		assert.equal(c.label, 'r/lupus');
		assert.equal(c.url, undefined);
	}],
	['reference items are labelled by their site', () => assert.equal(labelFor(items.get('ref')!), 'National Cancer Institute')],
	['spoken source lines are recognised, other lines are not', () => {
		assert.ok(isSourceLine({ type: 'anchor', who: 'anchor-b', text: 'Source: ClinicalTrials.gov.', sources: [] }));
		assert.ok(!isSourceLine({ type: 'anchor', who: 'anchor-b', text: 'The source of the delay is unclear.', sources: [] }));
	}]
];
