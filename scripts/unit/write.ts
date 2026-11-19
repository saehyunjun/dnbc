import assert from 'node:assert/strict';
import { sayDate, sayPhase, shortSponsor, shortDrug, screenSentences, writeRegistration, writeAnniversary, writeStory } from '../../src/lib/pipeline/write-templates.ts';
import type { SourceItem, Story } from '../../src/lib/types.ts';

const NOW = Date.parse('2026-11-18T15:00:00Z');
const reg = (meta: Record<string, unknown>, id = 'r1'): SourceItem => ({
	id, source: 'ctgov', tier: 'primary', url: '', fetchedAt: '2026-11-18T12:00:00Z', publishedAt: '2026-11-17T00:00:00Z',
	title: 'A Study of BRC-201 in Influenza',
	text: 'NCT07943390: A Study of BRC-201 in Influenza. Sponsor: Boryung Biopharma Co., Ltd.. Phase: Phase 3. Status: recruiting. Interventions: BRC-201. Conditions: Influenza. Enrollment: 348 participants. Start date: 2026-11. Primary completion date: 2027-04. First posted: 2026-11-17.',
	entities: { drugs: ['BRC-201'], nctIds: ['NCT07943390'], sponsors: ['Boryung Biopharma Co., Ltd.'], conditions: ['Influenza'] }, kind: 'registration', meta
});
const story = (it: SourceItem): Story => ({ id: `story-${it.id}`, itemIds: [it.id], kind: it.kind, title: it.title, entities: it.entities, score: 1, firstSeen: it.publishedAt, updatedAt: it.publishedAt });
const anniv: SourceItem = {
	id: 'd1', source: 'drugsfda', tier: 'primary', url: '', fetchedAt: '2026-11-18T12:00:00Z', publishedAt: '1946-11-19T00:00:00Z',
	title: 'FDA approved Methergine on 1946-11-19', text: 'Methergine (Methylergonovine Maleate), Edison Theraps Llc. Original approval 1946-11-19. Application NDA006035.',
	entities: { drugs: ['Methergine', 'Methylergonovine Maleate'], nctIds: [], sponsors: ['Edison Theraps Llc'], conditions: [] }, kind: 'approval', meta: { monthDay: '11-19', application: 'NDA006035' }
};

export const checks: [string, () => void][] = [
	['sayDate and sayPhase', () => {
		assert.equal(sayDate('2027-04'), 'April 2027');
		assert.equal(sayDate('2026-11-23'), '23 November 2026');
		assert.equal(sayPhase('Phase 1/Phase 2'), 'Phase 1/2');
	}],
	['shortSponsor drops suffixes; shortDrug prefers code names and skips placebo', () => {
		assert.equal(shortSponsor('Boryung Biopharma Co., Ltd.'), 'Boryung Biopharma');
		assert.equal(shortSponsor('Anixa Biosciences, Inc.'), 'Anixa Biosciences');
		assert.equal(shortDrug(['Placebo', 'Omalizumab', 'LP-003 Injection']), 'LP-003');
	}],
	['screenSentences keeps "U.S." whole and drops the dateline', () => {
		const s = screenSentences('For Immediate Release: \n November 18, 2026 \n The U.S. Food and Drug Administration today approved Infilbray tablets for adults. It is the first treatment of its kind for this disease.');
		assert.ok(s[0].startsWith('The U.S. Food and Drug Administration'), s[0]);
	}],
	['a registration writes a pipeline segment that passes the check', () => {
		const it = reg({ phase: 'PHASE3', phaseMove: false, priorTrials: 0 });
		const r = writeRegistration(story(it), { items: new Map([[it.id, it]]), now: NOW });
		assert.ok(r.segment, r.dropped.join(' | '));
		assert.equal(r.segment.format, 'pipeline');
		assert.equal(r.segment.beats[0].type === 'headline' && r.segment.beats[0].text, 'Boryung Biopharma registers a Phase 3 trial in influenza');
		assert.ok(r.segment.duration > 0);
	}],
	['a registration with no phase is not written', () => {
		const it = reg({ phase: 'NA' });
		assert.ok(!writeRegistration(story(it), { items: new Map([[it.id, it]]), now: NOW }).segment);
	}],
	['a past completion date is not announced', () => {
		const it = reg({ phase: 'PHASE2' });
		it.text = it.text.replace('2027-04', '2025-11');
		const r = writeRegistration(story(it), { items: new Map([[it.id, it]]), now: NOW });
		assert.ok(r.segment && !r.segment.beats.some((b) => b.type === 'anchor' && /completion/.test(b.text)));
	}],
	['an anniversary is a library segment for This Day in Approvals', () => {
		const r = writeAnniversary(story(anniv), { items: new Map([[anniv.id, anniv]]), now: NOW });
		assert.ok(r.segment, r.dropped.join(' | '));
		assert.equal(r.segment.library, true);
		assert.equal(r.segment.libraryShow, 'this-day');
	}],
	['stories with no template are left for the model writer', () => {
		const it = { ...reg({}), source: 'prnewswire' as const, kind: 'readout' as const };
		assert.match(writeStory(story(it), { items: new Map([[it.id, it]]), now: NOW }).dropped[0], /model writer/);
	}]
];
