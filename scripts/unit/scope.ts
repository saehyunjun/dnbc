import assert from 'node:assert/strict';
import { itemScope, matchScope, storyScope, trialScope } from '../../src/lib/channel/scope.ts';

const ids = (t: string) => matchScope(t).map((c) => c.id);

const hits: [string, string][] = [
	['A Phase 3 Study of Lecanemab in Early Alzheimer’s Disease', 'alzheimers'],
	['Tofersen in SOD1-ALS', 'als'],
	['Relapsing Multiple Sclerosis (RRMS)', 'ms'],
	['Dravet Syndrome', 'epilepsy'],
	['Spinal Muscular Atrophy Type 2', 'sma'],
	['Treatment-Resistant Depression', 'depression'],
	['Schizophrenia', 'schizophrenia'],
	['Opioid Use Disorder', 'substance'],
	['Newly Diagnosed Glioblastoma', 'glioma'],
	['Diffuse Intrinsic Pontine Glioma (DIPG)', 'glioma'],
	['Solid tumors with brain metastases', 'brain-mets'],
	['Acute Ischemic Stroke', 'stroke'],
	['Agitation Associated With Alzheimer’s Dementia', 'agitation'],
	['Chronic Migraine', 'migraine']
];
const misses = [
	'Opioid-induced respiratory depression after surgery',
	'Bone marrow depression with chemotherapy',
	'ST depression on the ECG',
	'Heat stroke in outdoor workers',
	'Stroke volume in heart failure',
	'Moderate-to-severe atopic dermatitis (AD)',
	'Atrial septal defect (ASD) closure',
	'Total body irradiation (TBI) before transplant',
	'Asset seizure ordered by the court',
	'Non-small cell lung cancer',
	'Nerve block for knee replacement surgery'
];

export const checks: [string, () => void][] = [
	...hits.map(([t, id]): [string, () => void] => [`scope hits: ${t}`, () => assert.ok(ids(t).includes(id), `${t} -> ${ids(t).join(',')}`)]),
	['scope misses look-alikes', () => {
		for (const t of misses) assert.deepEqual(ids(t), [], t);
	}],
	['side effect deep in an item does not put it in scope', () => {
		const it = { title: 'Drug X approved for HER2-positive breast cancer', entities: { drugs: [], sponsors: [], nctIds: [], conditions: [] }, text: 'x '.repeat(300) + 'Adverse events included peripheral neuropathy and seizures.' };
		assert.deepEqual(itemScope(it), []);
	}],
	['trial scope reads conditions and title', () => {
		assert.ok(trialScope({ title: 'A study of drug Y', conditions: ['Glioma'] }).length);
		assert.equal(trialScope({ title: 'A study of drug Y', conditions: ['Psoriasis'] }).length, 0);
	}],
	['story falls back to its items', () => {
		const items = new Map([['a', { id: 'a', title: 'Company files for approval in Parkinson’s disease', text: '', entities: { drugs: [], sponsors: [], nctIds: [], conditions: [] } } as any]]);
		const s = { title: 'Acme files with FDA', itemIds: ['a'], entities: { drugs: [], sponsors: [], nctIds: [], conditions: [] } };
		assert.equal(storyScope(s).length, 0);
		assert.deepEqual(storyScope(s, items).map((c) => c.id), ['parkinsons']);
	}]
];

import { buildStories } from '../../src/lib/pipeline/stories.ts';
import { segmentScope } from '../../src/lib/channel/scope.ts';
const E = { drugs: [], sponsors: [], nctIds: [], conditions: [] as string[] };
const item = (id: string, title: string, conditions: string[] = [], text = '') => ({ id, source: 'ctgov', tier: 'primary', kind: 'registration', url: 'https://clinicaltrials.gov/', title, text, publishedAt: '2026-11-18T12:00:00Z', fetchedAt: '2026-11-18T12:00:00Z', entities: { ...E, conditions } }) as any;

checks.push(
	['scope fixes from the 2026-11-19 review', () => {
		const t = (x: string) => ids(x);
		assert.deepEqual(t('Anti-GBM Disease (Goodpasture)'), []);
		assert.deepEqual(t('FTD/TPI plus bevacizumab in colorectal cancer'), []);
		assert.deepEqual(t('Osteochondritis Dissecans (OCD) of the knee'), []);
		assert.deepEqual(t('Non-arteritic anterior ischemic optic neuropathy'), []);
		assert.deepEqual(t('Prevention of stroke and systemic embolism in atrial fibrillation'), []);
		for (const [x, id] of [['Brain Neoplasms', 'brain-tumour'], ['Primary CNS Lymphoma', 'brain-tumour'], ['Adrenoleukodystrophy', 'rare-neuro'], ['Bipolar I or II Disorder', 'bipolar'], ['MOGAD', 'nmosd'], ['Niemann-Pick Disease Type C', 'rare-neuro'], ['Spinal Cord Injury', 'sci']] as const)
			assert.ok(t(x).includes(id), `${x} -> ${t(x).join(',')}`);
	}],
	['brand names put a release in scope', () => {
		assert.ok(ids('Eisai presents LEQEMBI three-year data at CTAD').includes('alzheimers'));
		assert.ok(ids('Cobenfy label update').includes('schizophrenia'));
		assert.ok(ids('Voranigo approved in a new country').includes('glioma'));
	}],
	['derived cards do not join stories or set scope', () => {
		const a = item('ctgov-NCT1-registration', 'Hexavalent vaccine study in infants', ['Hepatitis B Immunisation']);
		const p = item('profile-sanofi-2026-11-19', 'Sanofi pipeline on ClinicalTrials.gov', ['Multiple Sclerosis']);
		const s = buildStories([a, p], Date.parse('2026-11-19T12:00:00Z'));
		assert.equal(s.length, 1);
		assert.deepEqual(s[0].itemIds, [a.id]);
		assert.deepEqual(s[0].scope, []);
	}],
	['segment scope reads its beats', () => {
		assert.ok(segmentScope({ title: 'How It Works', beats: [{ type: 'anchor', text: 'Nusinersen was the first drug for SMA.' }] }).length);
		assert.equal(segmentScope({ title: 'How It Works', beats: [{ type: 'anchor', text: 'PDUFA dates explained.' }] }).length, 0);
	}]
);
checks.push(['stroke as a heart endpoint is out', () => {
	assert.deepEqual(ids('Atrial Fibrillation; Stroke; Bleeding'), []);
	assert.deepEqual(ids('FDA approves first Factor XIa inhibitor to help prevent stroke in certain adults'), []);
	assert.deepEqual(ids('Same-day genetic testing in the prevention of secondary stroke'), []);
	assert.ok(ids('Tenecteplase for acute ischemic stroke within 4.5 hours').includes('stroke'));
}]);
