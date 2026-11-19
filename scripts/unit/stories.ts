import assert from 'node:assert/strict';
import { buildStories, therapyArea, airable } from '../../src/lib/pipeline/stories.ts';
import type { SourceItem } from '../../src/lib/types.ts';

const NOW = Date.parse('2026-11-23T15:00:00Z');
let n = 0;
function item(p: Partial<SourceItem>): SourceItem {
	n++;
	return {
		id: p.id ?? `t-${n}`,
		source: p.source ?? 'prnewswire',
		tier: p.tier ?? 'primary',
		url: p.url ?? `https://example.test/${n}`,
		fetchedAt: '2026-11-23T12:00:00Z',
		publishedAt: p.publishedAt ?? '2026-11-23T12:00:00Z',
		title: p.title ?? `Title ${n}`,
		text: p.text ?? '',
		entities: { drugs: [], sponsors: [], nctIds: [], conditions: [], ...p.entities },
		kind: p.kind ?? 'other',
		meta: p.meta
	};
}

export const checks: [string, () => void][] = [
	['items with the same NCT id form one story', () => {
		const s = buildStories([
			item({ kind: 'readout', entities: { nctIds: ['NCT01234567'], drugs: [], sponsors: [], conditions: [] } }),
			item({ source: 'ctgov', kind: 'results', entities: { nctIds: ['NCT01234567'], drugs: [], sponsors: [], conditions: [] } })
		], NOW);
		assert.equal(s.length, 1);
		assert.equal(s[0].kind, 'readout');
	}],
	['same drug from different sponsors stays apart', () => {
		const s = buildStories([
			item({ entities: { drugs: ['pembrolizumab'], sponsors: ['Merck'], nctIds: [], conditions: [] } }),
			item({ entities: { drugs: ['pembrolizumab'], sponsors: ['Other Bio'], nctIds: [], conditions: [] } })
		], NOW);
		assert.equal(s.length, 2);
	}],
	['wire copies with near-identical titles merge', () => {
		const s = buildStories([
			item({ source: 'prnewswire', title: 'Acme Bio Announces Positive Topline Phase 3 Results for ACM-101 in Lupus' }),
			item({ source: 'businesswire', title: 'Acme Bio announces positive topline Phase 3 results for ACM-101 in lupus', publishedAt: '2026-11-23T13:00:00Z' })
		], NOW);
		assert.equal(s.length, 1);
	}],
	['a social post joins the story about its drug, and adds no airability alone', () => {
		const s = buildStories([
			item({ kind: 'approval', entities: { drugs: ['zorbitamab'], sponsors: ['Acme'], nctIds: [], conditions: [] } }),
			item({ tier: 'social', source: 'bluesky', kind: 'post', entities: { drugs: ['zorbitamab'], sponsors: [], nctIds: [], conditions: [] } }),
			item({ tier: 'social', source: 'bluesky', kind: 'post', title: 'unrelated post' })
		], NOW);
		assert.equal(s.length, 2);
		const approval = s.find((x) => x.kind === 'approval');
		assert.equal(approval?.itemIds.length, 2);
		assert.equal(airable(s.find((x) => x.kind === 'post')!), false);
	}],
	['approvals outrank papers; older stories decay', () => {
		const s = buildStories([
			item({ kind: 'paper', title: 'A paper' }),
			item({ kind: 'approval', title: 'An approval' }),
			item({ kind: 'approval', title: 'An old approval', publishedAt: '2026-11-19T12:00:00Z' })
		], NOW);
		assert.equal(s[0].title, 'An approval');
		assert.ok(s.find((x) => x.title === 'An old approval')!.score < s[0].score);
	}],
	['phase moves weigh more than plain registrations', () => {
		const s = buildStories([
			item({ kind: 'registration', title: 'plain reg', source: 'ctgov' }),
			item({ kind: 'registration', title: 'phase move', source: 'ctgov', meta: { phaseMove: true } })
		], NOW);
		assert.equal(s[0].title, 'phase move');
	}],
	['story ids are stable when items arrive in a different order', () => {
		const a = item({ id: 'x1', entities: { nctIds: ['NCT07654321'], drugs: [], sponsors: [], conditions: [] }, publishedAt: '2026-11-22T00:00:00Z' });
		const b = item({ id: 'x2', entities: { nctIds: ['NCT07654321'], drugs: [], sponsors: [], conditions: [] } });
		assert.equal(buildStories([a, b], NOW)[0].id, buildStories([b, a], NOW)[0].id);
	}],
	['therapy area from conditions', () => {
		assert.equal(therapyArea('Triple Negative Breast Neoplasms'), 'Oncology');
		assert.equal(therapyArea('Sickle Cell Disease'), 'Hematology');
		assert.equal(therapyArea('nothing here'), undefined);
	}]
];
