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
