// Library segments built from the trials table, limited to the channel's scope
// (src/lib/channel/scope.ts): one landscape per condition, one profile per sponsor.
// Wording rule: every number is a count of trials in DNBC's copy of ClinicalTrials.gov.
// Never "first", "only", "leads", "most", "winner", or "race". Counts are trials, not drugs.

import type { Segment, SourceItem } from '../types';
import type { Trial } from '../store/index';
import { trialScope, scopeGroups, type Condition } from '../channel/scope';
import { finish, shortDrug, shortSponsor, sayDate, sayPhase, type Draft, type WriteContext } from './write-templates';

export const ACTIVE = new Set(['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION']);
export const MIN_TRIALS = 5;
const PHASE_ORDER = ['Early Phase 1', 'Phase 1', 'Phase 1/2', 'Phase 2', 'Phase 2/3', 'Phase 3', 'Phase 4'];
const GROUP_NAME = { neurology: 'Neurology', psychiatry: 'Psychiatry', 'brain-cancer': 'Brain cancers' } as const;

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);
const slug = (s: string) => s.toLowerCase().replace(/\W+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

/** "PHASE1|PHASE2" to "Phase 1/2"; empty for trials with no phase. */
export function phaseLabel(raw: string): string {
	if (!raw || raw === 'NA') return '';
	return sayPhase(
		raw
			.split('|')
			.map((p) => (p === 'EARLY_PHASE1' ? 'Early Phase 1' : p.replace('PHASE', 'Phase ')))
			.join('/')
	);
}

export interface ScopedTrial {
	trial: Trial;
	conditions: Condition[];
}

/** Active trials that name a listed condition. */
export function scopedActive(trials: Trial[]): ScopedTrial[] {
	const out: ScopedTrial[] = [];
	for (const trial of trials) {
		if (!ACTIVE.has(trial.status) || !trial.sponsor) continue;
		const conditions = trialScope(trial);
		if (conditions.length) out.push({ trial, conditions });
	}
	return out;
}

function phaseCounts(trials: Trial[]): [string, number][] {
	const m = new Map<string, number>();
	for (const t of trials) {
		const p = phaseLabel(t.phase);
		if (p) m.set(p, (m.get(p) ?? 0) + 1);
	}
	return PHASE_ORDER.filter((p) => m.has(p)).map((p) => [p, m.get(p) as number]);
}

/** Early-stage and late-stage sums, stated in the item so the check can read them. */
function stageLines(phases: [string, number][]): string[] {
	const sum = (names: string[]) => phases.filter(([p]) => names.includes(p)).reduce((n, [, k]) => n + k, 0);
	const early = sum(['Early Phase 1', 'Phase 1']);
	const late = sum(['Phase 2/3', 'Phase 3']);
	return [
		...(early ? [`Phase 1 and Early Phase 1 together: ${early} ${early === 1 ? 'trial' : 'trials'}.`] : []),
		...(late ? [`Phase 2/3 and Phase 3 together: ${late} ${late === 1 ? 'trial' : 'trials'}.`] : [])
	];
}

const posted = (t: Trial) => t.firstPosted ?? t.start ?? '';
const recent = (trials: Trial[], n: number) =>
	trials
		.filter((t) => posted(t) && shortDrug(t.interventions) && phaseLabel(t.phase))
		.sort((a, b) => posted(b).localeCompare(posted(a)) || a.nct.localeCompare(b.nct))
		.slice(0, n);

/** Conditions with enough active in-scope trials, with those trials. */
export function landscapes(scoped: ScopedTrial[]): Map<Condition, Trial[]> {
	const by = new Map<string, { c: Condition; trials: Trial[] }>();
	for (const { trial, conditions } of scoped)
		for (const c of conditions) {
			const e = by.get(c.id) ?? { c, trials: [] };
			e.trials.push(trial);
			by.set(c.id, e);
		}
	return new Map([...by.values()].filter((e) => e.trials.length >= MIN_TRIALS).sort((a, b) => b.trials.length - a.trials.length).map((e) => [e.c, e.trials]));
}

/** Sponsors with enough active in-scope trials, with those trials. */
export function scopedSponsors(scoped: ScopedTrial[]): Map<string, ScopedTrial[]> {
	const by = new Map<string, ScopedTrial[]>();
	for (const s of scoped) by.set(s.trial.sponsor, [...(by.get(s.trial.sponsor) ?? []), s]);
	return new Map([...by].filter(([, v]) => v.length >= MIN_TRIALS).sort((a, b) => b[1].length - a[1].length));
}

function derived(id: string, title: string, lines: string[], trials: Trial[], now: number, meta: Record<string, unknown>, sponsors?: string[]): SourceItem {
	return {
		id,
		source: 'ctgov',
		tier: 'primary',
		url: 'https://clinicaltrials.gov/',
		fetchedAt: new Date(now).toISOString(),
		publishedAt: new Date(now).toISOString(),
		title,
		text: lines.join('\n'),
		entities: { drugs: trials.flatMap((t) => t.interventions), sponsors: sponsors ?? trials.map((t) => t.sponsor), nctIds: trials.map((t) => t.nct), conditions: trials.flatMap((t) => t.conditions) },
		kind: 'other',
		meta
	};
}

const regLine = (t: Trial) => `${t.nct}: ${shortSponsor(t.sponsor)}, ${shortDrug(t.interventions)}, ${phaseLabel(t.phase)}.`;
const regItem = (t: Trial) => `${shortDrug(t.interventions)}, ${shortSponsor(t.sponsor)}, ${phaseLabel(t.phase)} (${t.nct})`;

/** Anchors that read the stage sums back from the item text. */
function stageDrafts(it: SourceItem): Draft[] {
	const S = [it.id];
	const early = /^Phase 1 and Early Phase 1 together: (\d+) trials?\.$/m.exec(it.text)?.[1];
	const late = /^Phase 2\/3 and Phase 3 together: (\d+) trials?\.$/m.exec(it.text)?.[1];
	return [
		...(early ? [{ beat: { type: 'anchor', who: 'clinician', text: `Early stage, Phase 1 and Early Phase 1 together: ${early} ${early === '1' ? 'trial' : 'trials'}.`, sources: S }, optional: true } as Draft] : []),
		...(late ? [{ beat: { type: 'anchor', who: 'anchor-b', text: `Late stage, Phase 2/3 and Phase 3 together: ${late} ${late === '1' ? 'trial' : 'trials'}.`, sources: S }, optional: true } as Draft] : [])
	];
}

// ---------- Condition landscape ----------

export function landscapeItem(c: Condition, trials: Trial[], now: number): SourceItem {
	const phases = phaseCounts(trials);
	const sponsors = new Map<string, number>();
	for (const t of trials) sponsors.set(shortSponsor(t.sponsor), (sponsors.get(shortSponsor(t.sponsor)) ?? 0) + 1);
	const top = [...sponsors].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
	const rec = recent(trials, 6);
	const lines = [
		`DNBC's copy of ClinicalTrials.gov lists ${trials.length} active industry trials naming ${c.name}.`,
		...phases.map(([p, n]) => `${p}: ${n} ${n === 1 ? 'trial' : 'trials'}.`),
		...stageLines(phases),
		...top.map(([s, n]) => `Sponsor ${s}: ${n} ${n === 1 ? 'trial' : 'trials'}.`),
		...rec.map(regLine),
		`Counts as of ${dayOf(now)}.`
	];
	return derived(`landscape-${c.id}-${dayOf(now)}`, `${c.name} trials on ClinicalTrials.gov`, lines, rec, now, {
		landscape: true,
		condition: c.id,
		total: trials.length,
		phases: Object.fromEntries(phases),
		sponsors: top,
		recent: rec.map((t) => t.nct)
	});
}

/** The fixed closing line, chosen by rule from the counts. */
export function landscapeLine(phases: [string, number][]): string {
	const late = phases.filter(([p]) => p === 'Phase 3' || p === 'Phase 2/3').reduce((n, [, k]) => n + k, 0);
	return late
		? 'Phase 3 trials are the late stage. They still say nothing about which drugs will work.'
		: 'None of these trials is listed at Phase 3. The registry shows plans, not results.';
}

export function writeLandscape(c: Condition, it: SourceItem, ctx: WriteContext): { segment?: Segment; dropped: string[] } {
	const S = [it.id];
	const total = Number(it.meta?.total ?? 0);
	const phases = Object.entries((it.meta?.phases ?? {}) as Record<string, number>).sort((a, b) => PHASE_ORDER.indexOf(a[0]) - PHASE_ORDER.indexOf(b[0]));
	const sponsors = (it.meta?.sponsors ?? []) as [string, number][];
	const rec = [...it.text.matchAll(/^(NCT\d{8}): (.+?), (.+?), (Phase [\d/]+|Early Phase 1)\.$/gm)];
	const items = rec.map((m) => `${m[3]}, ${m[2]}, ${m[4]} (${m[1]})`);
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: `Condition Landscape: ${c.name}`, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-a', text: `DNBC's copy of ClinicalTrials.gov lists ${total} active industry trials naming ${c.name}. Here is how they split by phase.`, sources: S } },
		{ beat: { type: 'pipeline', sponsor: c.name, phases: phases.map(([phase, count]) => ({ phase, count })), sources: S }, optional: true },
		...stageDrafts(it),
		{ beat: { type: 'anchor', who: 'professor', text: `A trial is one registered study. One drug can sit behind several trials, so these counts are trials, not drugs.`, sources: S } },
		{ beat: { type: 'list', title: 'Sponsors in this set', items: sponsors.map(([s, n]) => `${s}: ${n} ${n === 1 ? 'trial' : 'trials'}`), sources: S }, optional: true },
		{ beat: { type: 'list', title: 'Recent registrations', items: items.slice(0, 3), sources: S }, optional: true },
		{ beat: { type: 'list', title: 'Also recently registered', items: items.slice(3, 6), sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'skeptic', text: landscapeLine(phases), sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `Counts as of ${sayDate(dayOf(ctx.now ?? Date.now()))}. They change as sponsors register and close trials.`, sources: S }, optional: true }
	].filter((d) => d.beat.type !== 'list' || (d.beat.items as string[]).length) as Draft[];
	const r = finish(undefined, drafts, { id: `seg-${it.id}`, format: 'explainer', title: `Condition Landscape: ${c.name}`, library: true, libraryShow: 'condition-landscape', asOf: dayOf(ctx.now ?? Date.now()) }, ctx);
	if (r.segment) r.segment.scope = [c.id];
	return r;
}

// ---------- Sponsor profile, in scope only ----------

export function scopeProfileItem(sponsor: string, rows: ScopedTrial[], now: number): SourceItem {
	const trials = rows.map((r) => r.trial);
	const groups = new Map<string, number>();
	const conds = new Map<string, number>();
	const ids = new Set<string>();
	for (const { conditions } of rows) {
		for (const g of scopeGroups(conditions)) groups.set(GROUP_NAME[g], (groups.get(GROUP_NAME[g]) ?? 0) + 1);
		for (const c of conditions) {
			conds.set(c.name, (conds.get(c.name) ?? 0) + 1);
			ids.add(c.id);
		}
	}
	const phases = phaseCounts(trials);
	const topConds = [...conds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
	const rec = recent(trials, 4);
	const lines = [
		`DNBC's copy of ClinicalTrials.gov lists ${trials.length} active industry trials from ${sponsor} naming neurology, psychiatry, or brain cancer conditions.`,
		...phases.map(([p, n]) => `${p}: ${n} ${n === 1 ? 'trial' : 'trials'}.`),
		...stageLines(phases),
		...[...groups].sort((a, b) => b[1] - a[1]).map(([g, n]) => `Group ${g}: ${n} ${n === 1 ? 'trial' : 'trials'}.`),
		...topConds.map(([c, n]) => `Condition ${c}: ${n} ${n === 1 ? 'trial' : 'trials'}.`),
		...rec.map(regLine),
		`Counts as of ${dayOf(now)}.`
	];
	return derived(`profile-scope-${slug(sponsor)}-${dayOf(now)}`, `${sponsor} in-scope trials on ClinicalTrials.gov`, lines, rec, now, {
		profile: true,
		scopeProfile: true,
		total: trials.length,
		phases: Object.fromEntries(phases),
		groups: Object.fromEntries(groups),
		conditions: topConds,
		conditionIds: [...ids],
		recent: rec.map((t) => t.nct)
	}, [sponsor]);
}

export function writeScopeProfile(it: SourceItem, ctx: WriteContext): { segment?: Segment; dropped: string[] } {
	const S = [it.id];
	const who = shortSponsor(it.entities.sponsors[0]);
	const total = Number(it.meta?.total ?? 0);
	const phases = Object.entries((it.meta?.phases ?? {}) as Record<string, number>).sort((a, b) => PHASE_ORDER.indexOf(a[0]) - PHASE_ORDER.indexOf(b[0]));
	const groups = Object.entries((it.meta?.groups ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]);
	const conds = (it.meta?.conditions ?? []) as [string, number][];
	const rec = [...it.text.matchAll(/^(NCT\d{8}): (.+?), (.+?), (Phase [\d/]+|Early Phase 1)\.$/gm)];
	const n = (k: number) => `${k} ${k === 1 ? 'trial' : 'trials'}`;
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: `Pipeline Profile: ${who}`, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `DNBC's copy of ClinicalTrials.gov lists ${total} active industry trials from ${who} naming neurology, psychiatry, or brain cancer conditions.`, sources: S } },
		{ beat: { type: 'pipeline', sponsor: who, phases: phases.map(([phase, count]) => ({ phase, count })), sources: S }, optional: true },
		...stageDrafts(it),
		{ beat: { type: 'anchor', who: 'professor', text: `A trial can name more than one condition, so the group counts below can add up to more than the total.`, sources: S }, optional: true },
		{ beat: { type: 'list', title: 'By area', items: groups.map(([g, k]) => `${g}: ${n(k)}`), sources: S }, optional: true },
		{ beat: { type: 'list', title: 'By condition', items: conds.map(([c, k]) => `${c}: ${n(k)}`), sources: S }, optional: true },
		{ beat: { type: 'list', title: 'Recent registrations', items: rec.map((m) => `${m[3]}, ${m[4]} (${m[1]})`), sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'clinician', text: `A registry count shows where a company is spending effort. It says nothing yet about which trials will work.`, sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'anchor-a', text: `Counts as of ${sayDate(dayOf(ctx.now ?? Date.now()))}. They change as sponsors register and close trials.`, sources: S }, optional: true }
	].filter((d) => d.beat.type !== 'list' || (d.beat.items as string[]).length) as Draft[];
	const r = finish(undefined, drafts, { id: `seg-${it.id}`, format: 'explainer', title: `Pipeline Profile: ${who}`, library: true, libraryShow: 'pipeline-profile', asOf: dayOf(ctx.now ?? Date.now()) }, ctx);
	if (r.segment) r.segment.scope = (it.meta?.conditionIds ?? []) as string[];
	return r;
}
