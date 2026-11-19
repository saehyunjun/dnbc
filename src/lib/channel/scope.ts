// What DNBC covers: neurology, psychiatry, and brain cancers (Aaron 2026-11-19, docs/PLAN.md section 0).
// One checked list of conditions. Each term is a regex source matched case-insensitively against
// condition names and titles, except `cased` terms (acronyms), which match case-sensitively.
// Acronyms that clash outside the area are left out: AD (atopic dermatitis), ASD (atrial septal defect),
// GAD (an enzyme), PPD (a TB test), TBI (total body irradiation).
// `not` lists phrases that look like a term but mean something else ("respiratory depression").

import type { SourceItem, Story } from '../types';
import type { Trial } from '../store/index';

export type ScopeGroup = 'neurology' | 'psychiatry' | 'brain-cancer';

export interface Condition {
	id: string;
	name: string;
	group: ScopeGroup;
	terms: string[];
	cased?: string[];
	not?: string[];
}

export const CONDITIONS: Condition[] = [
	// Neurodegenerative
	{ id: 'alzheimers', name: "Alzheimer's disease", group: 'neurology', terms: ["alzheimer'?s?"] },
	{ id: 'dementia', name: 'Dementia', group: 'neurology', terms: ['dementias?', 'frontotemporal', 'lewy bod(?:y|ies)', 'mild cognitive impairment'], cased: ['FTD', 'MCI'] },
	{ id: 'parkinsons', name: "Parkinson's disease", group: 'neurology', terms: ["parkinson'?s?"] },
	{ id: 'als', name: 'ALS', group: 'neurology', terms: ['amyotrophic lateral sclerosis', 'motor neuron disease'], cased: ['ALS'] },
	{ id: 'huntingtons', name: "Huntington's disease", group: 'neurology', terms: ["huntington'?s?"] },
	{ id: 'psp', name: 'Progressive supranuclear palsy', group: 'neurology', terms: ['progressive supranuclear palsy', 'multiple system atrophy'], cased: ['PSP', 'MSA'] },
	{ id: 'ataxia', name: 'Ataxias', group: 'neurology', terms: ['spinocerebellar ataxias?', "friedreich'?s? ataxia", 'ataxias?'] },
	// Neuroimmune
	{ id: 'ms', name: 'Multiple sclerosis', group: 'neurology', terms: ['multiple sclerosis'], cased: ['RRMS', 'PPMS', 'SPMS'] },
	{ id: 'nmosd', name: 'Neuromyelitis optica', group: 'neurology', terms: ['neuromyelitis optica'], cased: ['NMOSD'] },
	{ id: 'myasthenia', name: 'Myasthenia gravis', group: 'neurology', terms: ['myasthenia gravis'], cased: ['gMG'] },
	{ id: 'cidp', name: 'CIDP', group: 'neurology', terms: ['chronic inflammatory demyelinating polyneuropathy', 'guillain[- ]barr[ée]'], cased: ['CIDP'] },
	// Epilepsy
	{ id: 'epilepsy', name: 'Epilepsy', group: 'neurology', terms: ['epilep(?:sy|sies|tic)', 'seizures?', 'dravet', 'lennox[- ]gastaut', 'tuberous sclerosis', 'infantile spasms'], cased: ['LGS', 'TSC'], not: ['asset seizures?', 'seizure of (?:assets|funds|property)'] },
	// Neuromuscular
	{ id: 'sma', name: 'Spinal muscular atrophy', group: 'neurology', terms: ['spinal muscular atrophy'], cased: ['SMA'] },
	{ id: 'dmd', name: 'Duchenne and Becker muscular dystrophy', group: 'neurology', terms: ["duchenne'?s?", 'becker muscular dystrophy'], cased: ['DMD'] },
	{ id: 'dystrophy', name: 'Other muscular dystrophies', group: 'neurology', terms: ['myotonic dystrophy', 'facioscapulohumeral', 'limb[- ]girdle muscular dystrophy'], cased: ['FSHD', 'LGMD'] },
	{ id: 'cmt', name: 'Charcot-Marie-Tooth disease', group: 'neurology', terms: ['charcot[- ]marie[- ]tooth'] },
	{ id: 'neuropathy', name: 'Neuropathy', group: 'neurology', terms: ['(?:peripheral |diabetic |painful |small fiber |hereditary )?(?:poly)?neuropath(?:y|ies|ic pain)', 'transthyretin amyloid(?:osis)? (?:with )?polyneuropathy'] },
	// Headache, movement, sleep
	{ id: 'migraine', name: 'Migraine', group: 'neurology', terms: ['migraines?', 'cluster headaches?'] },
	{ id: 'movement', name: 'Movement disorders', group: 'neurology', terms: ['essential tremor', 'dystonias?', "tourette'?s?", 'tardive dyskinesia', 'restless legs'] },
	{ id: 'narcolepsy', name: 'Narcolepsy', group: 'neurology', terms: ['narcolep(?:sy|tic)', 'idiopathic hypersomnia'] },
	// Rare genetic
	{ id: 'rare-neuro', name: 'Rare genetic brain conditions', group: 'neurology', terms: ["rett'?s? syndrome", "angelman'?s? syndrome", 'leukodystroph(?:y|ies)', 'batten disease', 'neuronal ceroid lipofuscinos[ie]s', 'neurofibromatosis', 'fragile x', 'prader[- ]willi'], cased: ['CLN2', 'CLN3'] },
	// Acute
	{ id: 'stroke', name: 'Stroke', group: 'neurology', terms: ['(?:ischemic |ischaemic |hemorrhagic |haemorrhagic |acute )?strokes?', 'intracerebral h(?:a)?emorrhage', 'subarachnoid h(?:a)?emorrhage'], not: ['heat ?strokes?', 'stroke volume', 'strokes? of (?:luck|genius)', 'back ?stroke', 'breast ?stroke'] },
	{ id: 'tbi', name: 'Traumatic brain injury', group: 'neurology', terms: ['traumatic brain injur(?:y|ies)', 'concussions?'] },
	// Psychiatry
	{ id: 'depression', name: 'Depression', group: 'psychiatry', terms: ['(?:major |treatment[- ]resistant |postpartum |bipolar )?depressi(?:on|ve disorder)'], cased: ['MDD', 'TRD'], not: ['(?:respiratory|bone marrow|myelo|cardiac|cns|st[- ]segment|st) ?depression', 'depression of (?:the )?(?:st|bone)'] },
	{ id: 'schizophrenia', name: 'Schizophrenia and psychosis', group: 'psychiatry', terms: ['schizophreni[ac]', 'schizoaffective', 'psychos[ie]s', 'psychotic disorders?'] },
	{ id: 'bipolar', name: 'Bipolar disorder', group: 'psychiatry', terms: ['bipolar(?: [i1]{1,2})? disorder', 'bipolar depression', 'mania'] },
	{ id: 'anxiety', name: 'Anxiety disorders', group: 'psychiatry', terms: ['(?:generali[sz]ed |social )?anxiety disorders?', 'panic disorder'] },
	{ id: 'ptsd', name: 'PTSD', group: 'psychiatry', terms: ['post[- ]?traumatic stress'], cased: ['PTSD'] },
	{ id: 'ocd', name: 'OCD', group: 'psychiatry', terms: ['obsessive[- ]compulsive'], cased: ['OCD'] },
	{ id: 'adhd', name: 'ADHD', group: 'psychiatry', terms: ['attention[- ]deficit'], cased: ['ADHD'] },
	{ id: 'autism', name: 'Autism', group: 'psychiatry', terms: ['autism', 'autistic'] },
	{ id: 'substance', name: 'Substance use disorders', group: 'psychiatry', terms: ['(?:opioid|alcohol|substance|cocaine|methamphetamine|stimulant|cannabis|nicotine|tobacco) use disorders?', 'opioid dependence', 'alcohol dependence'], cased: ['OUD', 'AUD'] },
	{ id: 'insomnia', name: 'Insomnia', group: 'psychiatry', terms: ['insomnia'] },
	{ id: 'eating', name: 'Eating disorders', group: 'psychiatry', terms: ['anorexia nervosa', 'bulimia', 'binge[- ]eating disorder'] },
	{ id: 'agitation', name: 'Agitation in dementia', group: 'psychiatry', terms: ["agitation (?:associated with |in )(?:alzheimer'?s?|dementia)"] },
	// Brain cancers
	{ id: 'glioma', name: 'Glioblastoma and other gliomas', group: 'brain-cancer', terms: ['glioblastomas?', 'gliomas?', 'astrocytomas?', 'oligodendrogliomas?', 'diffuse (?:intrinsic )?pontine glioma', 'diffuse midline glioma'], cased: ['GBM', 'DIPG'] },
	{ id: 'brain-tumour', name: 'Other brain tumours', group: 'brain-cancer', terms: ['medulloblastomas?', 'ependymomas?', 'meningiomas?', 'brain tumou?rs?', 'cns tumou?rs?', 'leptomeningeal'] },
	{ id: 'brain-mets', name: 'Brain metastases', group: 'brain-cancer', terms: ['brain metastas[ie]s', 'cns metastas[ie]s'] }
];

interface Compiled {
	c: Condition;
	re: RegExp;
	cased?: RegExp;
	not?: RegExp;
}

const COMPILED: Compiled[] = CONDITIONS.map((c) => ({
	c,
	re: new RegExp(`\\b(?:${c.terms.join('|')})\\b`, 'i'),
	cased: c.cased?.length ? new RegExp(`\\b(?:${c.cased.join('|')})\\b`) : undefined,
	not: c.not?.length ? new RegExp(c.not.join('|'), 'gi') : undefined
}));

/** Conditions named in a text. Phrases in `not` are blanked before the terms are matched. */
export function matchScope(text: string): Condition[] {
	if (!text) return [];
	const out: Condition[] = [];
	for (const k of COMPILED) {
		const s = k.not ? text.replace(k.not, ' ') : text;
		if (k.re.test(s) || (k.cased && k.cased.test(s))) out.push(k.c);
	}
	return out;
}

const groups = (cs: Condition[]) => [...new Set(cs.map((c) => c.group))];

/** A trial is in scope when one of its conditions, or its title, names a listed condition. */
export function trialScope(t: Pick<Trial, 'title' | 'conditions'>): Condition[] {
	return matchScope([...(t.conditions ?? []), t.title].join(' \n '));
}

/** Items are judged on title, conditions, and the opening of the text only: side effects and
 * background usually sit further down ("adverse events included peripheral neuropathy"). */
export const LEDE = 400;
export function itemScope(it: Pick<SourceItem, 'title' | 'text' | 'entities'>): Condition[] {
	return matchScope([it.title, ...(it.entities?.conditions ?? []), (it.text ?? '').slice(0, LEDE)].join(' \n '));
}

/** A story is in scope when its title or conditions name a listed condition, or any of its items is. */
export function storyScope(story: Pick<Story, 'title' | 'entities' | 'itemIds'>, items?: Map<string, SourceItem>): Condition[] {
	const own = matchScope([story.title, ...(story.entities?.conditions ?? [])].join(' \n '));
	if (own.length || !items) return own;
	const seen = new Map<string, Condition>();
	for (const id of story.itemIds) {
		const it = items.get(id);
		if (it) for (const c of itemScope(it)) seen.set(c.id, c);
	}
	return [...seen.values()];
}

export const inScope = (cs: Condition[]) => cs.length > 0;
export const scopeGroups = groups;
