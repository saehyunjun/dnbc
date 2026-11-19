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
	{ id: 'dementia', name: 'Dementia', group: 'neurology', terms: ['dementias?', 'frontotemporal', 'lewy bod(?:y|ies)', 'mild cognitive impairment'], cased: ['MCI'] },
	{ id: 'parkinsons', name: "Parkinson's disease", group: 'neurology', terms: ["parkinson'?s?"] },
	{ id: 'als', name: 'ALS', group: 'neurology', terms: ['amyotrophic lateral sclerosis', 'motor neuron disease'], cased: ['ALS'] },
	{ id: 'huntingtons', name: "Huntington's disease", group: 'neurology', terms: ["huntington'?s?"] },
	{ id: 'psp', name: 'Progressive supranuclear palsy', group: 'neurology', terms: ['progressive supranuclear palsy', 'multiple system atrophy'], cased: ['PSP', 'MSA'] },
	{ id: 'ataxia', name: 'Ataxias', group: 'neurology', terms: ['spinocerebellar ataxias?', "friedreich'?s? ataxia", 'ataxias?'] },
	// Neuroimmune
	{ id: 'ms', name: 'Multiple sclerosis', group: 'neurology', terms: ['multiple sclerosis'], cased: ['RRMS', 'PPMS', 'SPMS'] },
	{ id: 'nmosd', name: 'Neuromyelitis optica', group: 'neurology', terms: ['neuromyelitis optica', 'myelin oligodendrocyte glycoprotein'], cased: ['NMOSD', 'MOGAD'] },
	{ id: 'myasthenia', name: 'Myasthenia gravis', group: 'neurology', terms: ['myasthenia gravis'], cased: ['gMG'] },
	{ id: 'cidp', name: 'CIDP', group: 'neurology', terms: ['chronic inflammatory demyelinating polyneuropathy', 'guillain[- ]barr[ée]'], cased: ['CIDP'] },
	// Epilepsy
	{ id: 'epilepsy', name: 'Epilepsy', group: 'neurology', terms: ['epilep(?:sy|sies|tic)', 'seizures?', 'dravet', 'lennox[- ]gastaut', 'tuberous sclerosis', 'infantile spasms'], cased: ['LGS', 'TSC'], not: ['asset seizures?', 'seizure of (?:assets|funds|property)'] },
	// Neuromuscular
	{ id: 'sma', name: 'Spinal muscular atrophy', group: 'neurology', terms: ['spinal muscular atrophy'], cased: ['SMA'] },
	{ id: 'dmd', name: 'Duchenne and Becker muscular dystrophy', group: 'neurology', terms: ["duchenne'?s?", 'becker muscular dystrophy'], cased: ['DMD'] },
	{ id: 'dystrophy', name: 'Other muscular dystrophies', group: 'neurology', terms: ['myotonic dystrophy', 'facioscapulohumeral', 'limb[- ]girdle muscular dystrophy'], cased: ['FSHD', 'LGMD'] },
	{ id: 'cmt', name: 'Charcot-Marie-Tooth disease', group: 'neurology', terms: ['charcot[- ]marie[- ]tooth'] },
	{ id: 'neuropathy', name: 'Neuropathy', group: 'neurology', terms: ['(?:peripheral |diabetic |painful |small fiber |hereditary )?(?:poly)?neuropath(?:y|ies|ic pain)', 'transthyretin amyloid(?:osis)? (?:with )?polyneuropathy'], not: ['(?:ischemic |ischaemic |hereditary |leber )?optic neuropath(?:y|ies)'] },
	// Headache, movement, sleep
	{ id: 'migraine', name: 'Migraine', group: 'neurology', terms: ['migraines?', 'cluster headaches?'] },
	{ id: 'movement', name: 'Movement disorders', group: 'neurology', terms: ['essential tremor', 'dystonias?', "tourette'?s?", 'tardive dyskinesia', 'restless legs'] },
	{ id: 'narcolepsy', name: 'Narcolepsy', group: 'neurology', terms: ['narcolep(?:sy|tic)', 'idiopathic hypersomnia'] },
	// Rare genetic
	{ id: 'rare-neuro', name: 'Rare genetic brain conditions', group: 'neurology', terms: ["rett'?s? syndrome", "angelman'?s? syndrome", '(?:adreno)?leukodystroph(?:y|ies)', 'adrenomyeloneuropathy', 'niemann[- ]pick', 'neuronopathic gaucher', 'gaucher(?:\'s)? disease,? type (?:3|iii)', 'mct8 deficiency', 'allan[- ]herndon[- ]dudley', 'grin[12]?[abd]?[- ]related', 'grin disorders?', 'cdkl5', 'scn2a', 'scn8a', 'dup15q', 'phelan[- ]mcdermid', 'metachromatic', 'krabbe', 'canavan', 'alexander disease', 'mucopolysaccharidosis type (?:ii|iii)', 'sanfilippo', 'hunter syndrome', 'batten disease', 'neuronal ceroid lipofuscinos[ie]s', 'neurofibromatosis', 'fragile x', 'prader[- ]willi'], cased: ['CLN2', 'CLN3'] },
	// Acute
	{ id: 'sci', name: 'Spinal cord injury', group: 'neurology', terms: ['spinal cord injur(?:y|ies)'] },
	{ id: 'stroke', name: 'Stroke', group: 'neurology', terms: ['(?:ischemic |ischaemic |hemorrhagic |haemorrhagic |acute )?strokes?', 'intracerebral h(?:a)?emorrhage', 'subarachnoid h(?:a)?emorrhage'], not: ['(?:secondary |primary )?(?:prevention of |preventing |prevents? |help(?:s)? prevent )(?:secondary |recurrent )?(?:ischemic |ischaemic )?strokes?', '(?:ischemic |ischaemic )?stroke (?:and systemic embolism|prevention)', '(?:reduce|reduces|reducing|lower|lowers|lowering) (?:the )?risk of (?:ischemic )?stroke', 'secondary stroke', 'heat ?strokes?', 'stroke volume', 'strokes? of (?:luck|genius)', 'back ?stroke', 'breast ?stroke'] },
	{ id: 'tbi', name: 'Traumatic brain injury', group: 'neurology', terms: ['traumatic brain injur(?:y|ies)', 'concussions?'] },
	// Psychiatry
	{ id: 'depression', name: 'Depression', group: 'psychiatry', terms: ['(?:major |treatment[- ]resistant |postpartum |bipolar )?depressi(?:on|ve disorder)'], cased: ['MDD', 'TRD'], not: ['(?:respiratory|bone marrow|myelo|cardiac|cns|st[- ]segment|st) ?depression', 'depression of (?:the )?(?:st|bone)'] },
	{ id: 'schizophrenia', name: 'Schizophrenia and psychosis', group: 'psychiatry', terms: ['schizophreni[ac]', 'schizoaffective', 'psychos[ie]s', 'psychotic disorders?'] },
	{ id: 'bipolar', name: 'Bipolar disorder', group: 'psychiatry', terms: ['bipolar (?:(?:[i1]{1,2}|type [i1]{1,2})(?: (?:or|and) (?:[i1]{1,2}))? )?(?:disorder|depression|mania)', 'manic episodes?', 'mania'] },
	{ id: 'anxiety', name: 'Anxiety disorders', group: 'psychiatry', terms: ['(?:generali[sz]ed |social )?anxiety disorders?', 'panic disorder'] },
	{ id: 'ptsd', name: 'PTSD', group: 'psychiatry', terms: ['post[- ]?traumatic stress'], cased: ['PTSD'] },
	{ id: 'ocd', name: 'OCD', group: 'psychiatry', terms: ['obsessive[- ]compulsive'] },
	{ id: 'adhd', name: 'ADHD', group: 'psychiatry', terms: ['attention[- ]deficit'], cased: ['ADHD'] },
	{ id: 'autism', name: 'Autism', group: 'psychiatry', terms: ['autism', 'autistic'] },
	{ id: 'substance', name: 'Substance use disorders', group: 'psychiatry', terms: ['(?:opioid|alcohol|substance|cocaine|methamphetamine|stimulant|cannabis|nicotine|tobacco) use disorders?', 'opioid dependence', 'alcohol dependence'], cased: ['OUD', 'AUD'] },
	{ id: 'insomnia', name: 'Insomnia', group: 'psychiatry', terms: ['insomnia'] },
	{ id: 'eating', name: 'Eating disorders', group: 'psychiatry', terms: ['anorexia nervosa', 'bulimia', 'binge[- ]eating disorder'] },
	{ id: 'agitation', name: 'Agitation in dementia', group: 'psychiatry', terms: ["agitation (?:associated with |in )(?:alzheimer'?s?|dementia)"] },
	// Brain cancers
	{ id: 'glioma', name: 'Glioblastoma and other gliomas', group: 'brain-cancer', terms: ['glioblastomas?', 'gliomas?', 'astrocytomas?', 'oligodendrogliomas?', 'diffuse (?:intrinsic )?pontine glioma', 'diffuse midline glioma'], cased: ['GBM', 'DIPG'], not: ['anti[- ]?GBM', 'anti[- ]glomerular basement membrane'] },
	{ id: 'brain-tumour', name: 'Other brain tumours', group: 'brain-cancer', terms: ['medulloblastomas?', 'ependymomas?', 'meningiomas?', 'brain (?:tumou?rs?|cancers?|neoplasms?)', '(?:cns|central nervous system) (?:tumou?rs?|neoplasms?|cancers?|lymphomas?)', 'primary (?:cns|central nervous system) lymphomas?', 'leptomeningeal', 'atypical teratoid', 'craniopharyngiomas?'] },
	{ id: 'brain-mets', name: 'Brain metastases', group: 'brain-cancer', terms: ['brain metastas[ie]s', 'cns metastas[ie]s'] }
];


/** Drug names (generic and brand) that put an item in scope even when the condition is named late
 * or not at all ("Leqembi three-year data"). From memory, 2026-11-19: add a name only when its main
 * use is in this area. Drugs with big uses elsewhere (eculizumab, rituximab, buprenorphine) stay out. */
export const DRUGS: Record<string, string[]> = {
	alzheimers: ['lecanemab', 'leqembi', 'donanemab', 'kisunla', 'aducanumab', 'aduhelm', 'remternetug', 'trontinemab', 'blarcamesine', 'valiltramiprosate', 'buntanetap', 'posdinemab', 'bepranemab', 'e2814', 'lu af87908'],
	parkinsons: ['levodopa', 'carbidopa', 'foscarbidopa', 'foslevodopa', 'vyalev', 'tavapadon', 'prasinezumab', 'opicapone', 'istradefylline', 'safinamide', 'bemdaneprocel'],
	als: ['tofersen', 'qalsody', 'edaravone', 'radicava', 'riluzole', 'ulefnersen', 'pridopidine', 'masitinib'],
	huntingtons: ['tominersen', 'votoplam', 'valbenazine', 'tetrabenazine', 'deutetrabenazine', 'austedo', 'ingrezza', 'amt-130'],
	ms: ['ocrelizumab', 'ocrevus', 'ofatumumab', 'kesimpta', 'ublituximab', 'briumvi', 'natalizumab', 'tysabri', 'tolebrutinib', 'fenebrutinib', 'remibrutinib', 'frexalimab', 'fingolimod', 'siponimod', 'ozanimod', 'ponesimod', 'cladribine', 'dimethyl fumarate', 'diroximel fumarate', 'teriflunomide', 'glatiramer'],
	nmosd: ['inebilizumab', 'uplizna', 'satralizumab', 'enspryng'],
	myasthenia: ['efgartigimod', 'vyvgart', 'rozanolixizumab', 'rystiggo', 'zilucoplan', 'zilbrysq', 'nipocalimab', 'imaavy', 'batoclimab', 'pozelimab', 'gefurulimab', 'descartes-08'],
	epilepsy: ['cenobamate', 'xcopri', 'fenfluramine', 'fintepla', 'ganaxolone', 'ztalmy', 'stiripentol', 'epidiolex', 'zorevunersen', 'bexicaserin', 'soticlestat', 'xen1101', 'azetukalner', 'vormatrigine', 'staccato alprazolam', 'diazepam nasal', 'valtoco', 'lacosamide', 'levetiracetam', 'brivaracetam', 'perampanel'],
	sma: ['nusinersen', 'spinraza', 'risdiplam', 'evrysdi', 'onasemnogene', 'zolgensma', 'itvisma', 'apitegromab', 'taldefgrobep'],
	dmd: ['eteplirsen', 'golodirsen', 'viltolarsen', 'casimersen', 'delandistrogene', 'elevidys', 'givinostat', 'duvyzat', 'vamorolone', 'agamree', 'deramiocel', 'del-zota', 'rgx-202', 'sat-3247'],
	dystrophy: ['del-desiran', 'del-brax', 'losmapimod'],
	neuropathy: ['vutrisiran', 'amvuttra', 'patisiran', 'onpattro', 'eplontersen', 'wainua', 'tafamidis', 'nexiguran ziclumeran', 'suzetrigine'],
	migraine: ['erenumab', 'aimovig', 'fremanezumab', 'ajovy', 'galcanezumab', 'emgality', 'eptinezumab', 'vyepti', 'ubrogepant', 'ubrelvy', 'rimegepant', 'nurtec', 'atogepant', 'qulipta', 'zavegepant', 'zavzpret', 'lasmiditan'],
	movement: ['ulixacaltamide', 'suvecaltamide', 'ecopipam'],
	narcolepsy: ['pitolisant', 'wakix', 'solriamfetol', 'sunosi', 'sodium oxybate', 'xywav', 'lumryz', 'oveporexton', 'alixorexton', 'orexin agonist', 'tak-861', 'alks 2680'],
	'rare-neuro': ['trofinetide', 'daybue', 'omaveloxolone', 'skyclarys', 'arimoclomol', 'miplyffa', 'levacetylleucine', 'aqneursa', 'cerliponase', 'brineura', 'tiratricol', 'emcitate', 'elivaldogene', 'skysona', 'atidarsagene', 'lenmeldy', 'tideglusib'],
	stroke: ['tenecteplase', 'alteplase', 'nerinetide', 'glenzocimab'],
	depression: ['esketamine', 'spravato', 'zuranolone', 'zurzuvae', 'brexanolone', 'zulresso', 'aticaprant', 'navacaprant', 'seltorexant', 'auvelity', 'dextromethorphan-bupropion', 'psilocybin', 'comp360', 'mm120', 'cyb003', 'osavampator', 'vortioxetine', 'esmethadone'],
	schizophrenia: ['xanomeline', 'trospium', 'cobenfy', 'karxt', 'emraclidine', 'ulotaront', 'iclepertin', 'brilaroxazine', 'lumateperone', 'caplyta', 'cariprazine', 'vraylar', 'brexpiprazole', 'rexulti', 'olanzapine and samidorphan', 'lybalvi', 'paliperidone palmitate', 'invega', 'aripiprazole lauroxil', 'clozapine', 'evenamide', 'nbi-1117568'],
	anxiety: ['fasedienol', 'mm120'],
	ptsd: ['brexpiprazole and sertraline', 'mdma-assisted', 'midomafetamine'],
	adhd: ['centanafadine', 'viloxazine', 'qelbree', 'serdexmethylphenidate', 'methylphenidate', 'lisdexamfetamine'],
	substance: ['vivitrol', 'lofexidine', 'nalmefene', 'sublocade', 'brixadi'],
	insomnia: ['suvorexant', 'belsomra', 'lemborexant', 'dayvigo', 'daridorexant', 'quviviq'],
	glioma: ['vorasidenib', 'voranigo', 'tovorafenib', 'ojemda', 'temozolomide', 'dordaviprone', 'modeyso', 'onc201', 'tumor treating fields', 'tumour treating fields', 'optune', 'lomustine', 'berubicin', 'paxalisib'],
	'brain-tumour': ['tovorafenib'],
	agitation: ['axs-05', 'auvelity']
};

interface Compiled {
	c: Condition;
	re: RegExp;
	cased?: RegExp;
	not?: RegExp;
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- ]/g, '[- ]?');

const COMPILED: Compiled[] = CONDITIONS.map((c) => ({
	c,
	re: new RegExp(`\\b(?:${[...c.terms, ...(DRUGS[c.id] ?? []).map(esc)].join('|')})\\b`, 'i'),
	cased: c.cased?.length ? new RegExp(`\\b(?:${c.cased.join('|')})\\b`) : undefined,
	not: c.not?.length ? new RegExp(c.not.join('|'), 'gi') : undefined
}));

const CARDIO = /\batrial fibrillation\b|\bmajor adverse cardiovascular\b|\bMACE\b|\bmyocardial infarction\b|\bheart attacks?\b|\bcardiovascular death\b|\bsystemic embolism\b/i;

/** Conditions named in a text. Phrases in `not` are blanked before the terms are matched. */
export function matchScope(text: string): Condition[] {
	if (!text) return [];
	const out: Condition[] = [];
	for (const k of COMPILED) {
		const s = k.not ? text.replace(k.not, ' ') : text;
		if (k.re.test(s) || (k.cased && k.cased.test(s))) out.push(k.c);
	}
	// Stroke named beside atrial fibrillation or heart outcomes is a cardiology endpoint, not neurology.
	if (out.some((c) => c.id === 'stroke') && CARDIO.test(text)) return out.filter((c) => c.id !== 'stroke');
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
		// Social posts and derived cards (catalyst, profile) do not decide a story's scope.
		if (it && it.tier !== 'social' && !isDerivedId(it.id)) for (const c of itemScope(it)) seen.set(c.id, c);
	}
	return [...seen.values()];
}

/** Items we build ourselves from the trials table. They are footnote sources, never story members. */
export const isDerivedId = (id: string) => /^(?:catalyst|profile|landscape)-/.test(id);

/** A segment's conditions: from its story when it has one, else from its own words. */
export function segmentScope(seg: { title: string; beats: unknown[] }): Condition[] {
	const words = (seg.beats as Record<string, unknown>[]).flatMap((b) => [b.text, b.title, b.label, b.clue, b.sponsor, b.drug, ...((b.items as string[]) ?? []), ...(((b.lines as { text: string }[]) ?? []).map((l) => l.text))]);
	return matchScope([seg.title, ...words.filter((x): x is string => typeof x === 'string')].join(' \n '));
}

/** A stored story is in scope by its `scope` field, or, for stories saved before that field, by `storyScope`. */
export function storyInScope(story: Story, items?: Map<string, SourceItem>): boolean {
	return story.scope ? story.scope.length > 0 : storyScope(story, items).length > 0;
}

/** A segment airs when its story is in scope, or, with no story (library), when its own words name a listed condition or drug. */
export function segmentInScope(seg: { title: string; beats: unknown[]; scope?: string[] }, story?: Story): boolean {
	if (seg.scope) return seg.scope.length > 0;
	if (story && storyInScope(story)) return true;
	return segmentScope(seg).length > 0;
}

/** Daily library cards carry the date in their id (`seg-landscape-als-2026-11-19`). Only the newest of each airs. */
const DATED = /-\d{4}-\d{2}-\d{2}$/;
/** Whole-area cards written before the scope change. They name an in-scope drug now and then but are not about the area. */
const ALL_AREA = /^seg-(?:catalyst-(?!neurology-|psychiatry-)|profile-(?!scope-))/;

/** The segments that may air: in scope, not an all-area card, and the newest copy of each dated card. */
export function airPool<T extends { id: string; createdAt: string; title: string; beats: unknown[]; scope?: string[]; storyId?: string }>(
	segments: T[],
	storyOf: (id: string) => Story | undefined = () => undefined
): T[] {
	const newest = new Map<string, T>();
	for (const g of segments) {
		if (ALL_AREA.test(g.id)) continue;
		if (!segmentInScope(g, g.storyId ? storyOf(g.storyId) : undefined)) continue;
		const base = g.id.replace(DATED, '');
		const had = newest.get(base);
		if (!had || g.createdAt > had.createdAt) newest.set(base, g);
	}
	return [...newest.values()];
}

export const inScope = (cs: Condition[]) => cs.length > 0;
export const scopeGroups = groups;
