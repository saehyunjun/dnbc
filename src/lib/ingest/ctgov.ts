// ClinicalTrials.gov API v2. Industry interventional studies only.
// seed(): full slim snapshot. daily(): studies updated since the last run, diffed against the snapshot.

import type { SourceItem } from '../types';
import type { Store, Trial } from '../store/index';
import { getJson } from './http';

const API = 'https://clinicaltrials.gov/api/v2/studies';
const FILTER = 'AREA[LeadSponsorClass]INDUSTRY AND AREA[StudyType]INTERVENTIONAL';
const FIELDS = [
	'NCTId',
	'BriefTitle',
	'LeadSponsorName',
	'Phase',
	'OverallStatus',
	'InterventionName',
	'InterventionType',
	'Condition',
	'StartDate',
	'PrimaryCompletionDate',
	'StudyFirstPostDate',
	'LastUpdatePostDate',
	'ResultsFirstPostDate',
	'EnrollmentCount'
].join(',');

interface ApiStudy {
	protocolSection: {
		identificationModule: { nctId: string; briefTitle?: string };
		statusModule?: {
			overallStatus?: string;
			startDateStruct?: { date?: string };
			primaryCompletionDateStruct?: { date?: string };
			studyFirstPostDateStruct?: { date?: string };
			lastUpdatePostDateStruct?: { date?: string };
			resultsFirstPostDateStruct?: { date?: string };
		};
		sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
		conditionsModule?: { conditions?: string[] };
		designModule?: { phases?: string[]; enrollmentInfo?: { count?: number } };
		armsInterventionsModule?: { interventions?: { type?: string; name?: string }[] };
	};
}

interface ApiPage {
	studies: ApiStudy[];
	nextPageToken?: string;
	totalCount?: number;
}

const DRUGLIKE = new Set(['DRUG', 'BIOLOGICAL', 'GENETIC', 'COMBINATION_PRODUCT']);
const IGNORE_INTERVENTIONS = /^(placebo|saline|standard of care|soc|best supportive care|rescue medication|vehicle)\b/i;

export function toTrial(s: ApiStudy): Trial {
	const p = s.protocolSection;
	const st = p.statusModule ?? {};
	return {
		nct: p.identificationModule.nctId,
		title: p.identificationModule.briefTitle ?? '',
		sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? '',
		phase: (p.designModule?.phases ?? ['NA']).join('|'),
		status: st.overallStatus ?? '',
		interventions: (p.armsInterventionsModule?.interventions ?? [])
			.filter((i) => i.name && DRUGLIKE.has(i.type ?? '') && !IGNORE_INTERVENTIONS.test(i.name))
			.map((i) => i.name as string),
		conditions: p.conditionsModule?.conditions ?? [],
		start: st.startDateStruct?.date,
		primaryCompletion: st.primaryCompletionDateStruct?.date,
		firstPosted: st.studyFirstPostDateStruct?.date,
		lastUpdate: st.lastUpdatePostDateStruct?.date,
		resultsPosted: st.resultsFirstPostDateStruct?.date,
		enrollment: p.designModule?.enrollmentInfo?.count
	};
}

async function* pages(term?: string) {
	let token: string | undefined;
	do {
		const u = new URL(API);
		if (term) u.searchParams.set('query.term', term);
		u.searchParams.set('filter.advanced', FILTER);
		u.searchParams.set('fields', FIELDS);
		u.searchParams.set('pageSize', '1000');
		if (token) u.searchParams.set('pageToken', token);
		const page = await getJson<ApiPage>(u.toString(), { timeoutMs: 60_000 });
		yield page.studies.map(toTrial);
		token = page.nextPageToken;
	} while (token);
}

/** Full snapshot. About 115 pages of 1,000. */
export async function seed(store: Store, log = console.log): Promise<number> {
	let n = 0;
	let buf: Trial[] = [];
	for await (const batch of pages()) {
		buf.push(...batch);
		n += batch.length;
		if (buf.length >= 20_000) {
			await store.putTrials(buf);
			buf = [];
			log(`ctgov seed: ${n}`);
		}
	}
	if (buf.length) await store.putTrials(buf);
	await store.setKV('ctgov:seededAt', new Date().toISOString());
	return n;
}

const PHASE_RANK: Record<string, number> = { EARLY_PHASE1: 0, PHASE1: 1, PHASE2: 2, PHASE3: 3, PHASE4: 4 };
export function phaseRank(phase: string): number {
	return Math.max(-1, ...phase.split('|').map((p) => PHASE_RANK[p] ?? -1));
}
export function phaseLabel(phase: string): string {
	if (!phase || phase === 'NA') return 'Not applicable';
	return phase
		.split('|')
		.map((p) => (p === 'EARLY_PHASE1' ? 'Early Phase 1' : p.replace('PHASE', 'Phase ')))
		.join('/');
}
export function statusLabel(s: string): string {
	return s.toLowerCase().replace(/_/g, ' ');
}

const NOTABLE_STATUS = new Set(['TERMINATED', 'SUSPENDED', 'WITHDRAWN', 'COMPLETED', 'ACTIVE_NOT_RECRUITING', 'RECRUITING']);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function trialText(t: Trial): string {
	const parts = [
		`${t.nct}: ${t.title}.`,
		`Sponsor: ${t.sponsor}.`,
		`Phase: ${phaseLabel(t.phase)}.`,
		`Status: ${statusLabel(t.status)}.`
	];
	if (t.interventions.length) parts.push(`Interventions: ${t.interventions.join(', ')}.`);
	if (t.conditions.length) parts.push(`Conditions: ${t.conditions.join(', ')}.`);
	if (t.enrollment) parts.push(`Enrollment: ${t.enrollment} participants.`);
	if (t.start) parts.push(`Start date: ${t.start}.`);
	if (t.primaryCompletion) parts.push(`Primary completion date: ${t.primaryCompletion}.`);
	if (t.firstPosted) parts.push(`First posted: ${t.firstPosted}.`);
	if (t.resultsPosted) parts.push(`Results first posted: ${t.resultsPosted}.`);
	return parts.join(' ');
}

function item(t: Trial, kind: SourceItem['kind'], date: string, meta: Record<string, unknown>, now: string): SourceItem {
	return {
		id: `ctgov-${t.nct}-${kind}-${date}`,
		source: 'ctgov',
		tier: 'primary',
		url: `https://clinicaltrials.gov/study/${t.nct}`,
		fetchedAt: now,
		publishedAt: (t.lastUpdate ?? date) + 'T00:00:00Z',
		title: t.title,
		text: trialText(t),
		entities: { drugs: t.interventions, sponsors: [t.sponsor].filter(Boolean), nctIds: [t.nct], conditions: t.conditions },
		kind,
		meta: { phase: t.phase, status: t.status, ...meta }
	};
}

/**
 * Studies updated since the last run. Emits:
 * - registration: first posted since the cursor. meta.phaseMove when the same sponsor already has
 *   the same drug at a lower phase.
 * - status: a notable status change against the snapshot.
 * - results: results first posted since the cursor.
 */
export async function daily(store: Store, since?: string, log = console.log): Promise<SourceItem[]> {
	const cursor = since ?? (await store.getKV<string>('ctgov:cursor')) ?? new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10);
	const now = new Date().toISOString();
	const out: SourceItem[] = [];
	const updated: Trial[] = [];
	for await (const batch of pages(`AREA[LastUpdatePostDate]RANGE[${cursor},MAX]`)) updated.push(...batch);
	log(`ctgov daily: ${updated.length} updated since ${cursor}`);

	const before = new Map((await store.getTrials({ ncts: updated.map((t) => t.nct) })).map((t) => [t.nct, t]));
	const bySponsor = new Map<string, Trial[]>();

	for (const t of updated) {
		const prev = before.get(t.nct);
		// Not `!prev`: a snapshot seeded after the cursor already holds new trials. Ids are stable, so re-emitting is harmless.
		if (t.firstPosted && t.firstPosted >= cursor) {
			let sponsorTrials = bySponsor.get(t.sponsor);
			if (!sponsorTrials) {
				sponsorTrials = await store.getTrials({ sponsor: t.sponsor });
				bySponsor.set(t.sponsor, sponsorTrials);
			}
			const drugs = new Set(t.interventions.map(norm));
			const earlier = sponsorTrials.filter(
				(o) => o.nct !== t.nct && o.interventions.some((d) => drugs.has(norm(d))) && phaseRank(o.phase) >= 0
			);
			const topEarlier = Math.max(-1, ...earlier.map((o) => phaseRank(o.phase)));
			const phaseMove = earlier.length > 0 && phaseRank(t.phase) > topEarlier;
			out.push(
				item(t, 'registration', t.firstPosted, { phaseMove, fromPhase: phaseMove ? earlier.find((o) => phaseRank(o.phase) === topEarlier)?.phase : undefined, priorTrials: earlier.length }, now)
			);
		} else if (prev && prev.status !== t.status && NOTABLE_STATUS.has(t.status)) {
			out.push(item(t, 'status', t.lastUpdate ?? cursor, { fromStatus: prev.status }, now));
		}
		if (t.resultsPosted && t.resultsPosted >= cursor && (!prev || !prev.resultsPosted)) {
			out.push(item(t, 'results', t.resultsPosted, {}, now));
		}
	}

	await store.putTrials(updated);
	await store.setKV('ctgov:cursor', now.slice(0, 10));
	return out;
}

/** Trials by phase for a sponsor and, optionally, a drug. Feeds the pipeline beat. */
export async function pipelineOf(store: Store, sponsor: string, drug?: string) {
	const trials = (await store.getTrials({ sponsor })).filter(
		(t) => !drug || t.interventions.some((d) => norm(d) === norm(drug))
	);
	const counts = new Map<string, number>();
	for (const t of trials) {
		if (['WITHDRAWN', 'TERMINATED'].includes(t.status)) continue;
		const label = phaseLabel(t.phase);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	const order = ['Early Phase 1', 'Phase 1', 'Phase 1/Phase 2', 'Phase 2', 'Phase 2/Phase 3', 'Phase 3', 'Phase 4'];
	return order.filter((p) => counts.has(p)).map((phase) => ({ phase, count: counts.get(phase) as number }));
}
