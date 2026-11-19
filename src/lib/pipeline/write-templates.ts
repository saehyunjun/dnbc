// Template writer: segments built from structured source fields, with no model.
// Covers CT.gov registrations, FDA approvals and CRLs, Drugs@FDA anniversaries, and the
// catalyst calendar. Every beat cites its items; the fact check runs before anything is kept.
// A failing optional beat is dropped; a failing required beat drops the segment.

import type { Beat, CastId, FormatId, LibraryShowId, Segment, SourceItem, Story } from '../types';
import type { Trial } from '../store/index';
import { applyTiming, TIMING } from '../channel/timing';
import { checkSegment, fold } from './check';
import { therapyArea } from './stories';

export interface PipelineCounts {
	phase: string;
	count: number;
}

export interface WriteContext {
	items: Map<string, SourceItem>;
	/** Trials by phase for a sponsor and drug, from the CT.gov snapshot. */
	pipelines?: Map<string, PipelineCounts[]>;
	now?: number;
}

export interface Draft {
	beat: Beat;
	optional?: boolean;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2027-04" or "2027-04-30" to "April 2027" or "30 April 2027". */
export function sayDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	if (!y || !m) return iso;
	return d ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
}

/** "Phase 1/Phase 2" to "Phase 1/2". */
export function sayPhase(label: string): string {
	return label.replace(/Phase (\d)\/Phase (\d)/, 'Phase $1/$2');
}

function phaseOf(raw: string): string {
	if (!raw || raw === 'NA') return 'early';
	return sayPhase(
		raw
			.split('|')
			.map((p) => (p === 'EARLY_PHASE1' ? 'Early Phase 1' : p.replace('PHASE', 'Phase ')))
			.join('/')
	);
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const clip = (s: string, max = 8) => (words(s) <= max ? s : '');

/** A short drug name from a list of interventions: code names first, then short names. */
export function shortDrug(names: string[]): string | undefined {
	const clean = names.map((n) => n.replace(/\s+(injection|tablets?|capsules?|for injection|oral solution)$/i, '').trim());
	const ok = clean.filter((n) => n.length <= 28 && !/placebo|standard of care|saline|vehicle/i.test(n));
	return ok.find((n) => /\b[A-Z]{2,6}-?\d{2,6}[A-Z]?\b/.test(n)) ?? ok.sort((a, b) => a.length - b.length)[0];
}

/** Sponsor names without corporate suffixes, for speech. */
export function shortSponsor(s: string): string {
	return s
		.replace(/[,.]?\s*(Co\.?,?\s*)?(Ltd\.?|LTD|Inc\.?|LLC|Llc|GmbH|S\.?A\.?|AG|plc|Corp(oration)?\.?|Limited)\.*$/i, '')
		.replace(/[,.]+$/, '')
		.trim();
}

/** Sentences of an item's text, with the dateline and parentheticals removed, that fit on screen. */
export function screenSentences(text: string, max = TIMING.maxWords): string[] {
	const body = fold(text)
		.replace(/^For Immediate Release:\s*\S+ \d{1,2}, \d{4}\s*/i, '')
		.replace(/^.*?\/PRNewswire\/\s*--\s*/i, '');
	return body
		.replace(/\b(U\.S|Dr|Mr|Ms|Inc|Co|Corp|Ltd|No|St|vs|e\.g|i\.e)\.(?=\s)/g, '$1\u2024')
		.split(/(?<=[.!?])\s+(?=[A-Z])/)
		.map((s) => s.replace(/\u2024/g, '.'))
		.map((s) => s.replace(/\s*\([^()]{0,160}\)/g, '').replace(/\s+([,.])/g, '$1').trim())
		.filter((s) => words(s) >= 6 && words(s) <= max && /[.!?]$/.test(s));
}

export function finish(
	story: Story | undefined,
	drafts: Draft[],
	meta: { id: string; format: FormatId; title: string; library: boolean; libraryShow?: LibraryShowId; asOf: string },
	ctx: WriteContext
): { segment?: Segment; dropped: string[] } {
	let keep = drafts.slice();
	const dropped: string[] = [];
	for (let pass = 0; pass < 3; pass++) {
		const seg: Segment = { ...meta, storyId: story?.id, beats: keep.map((d) => d.beat), createdAt: new Date(ctx.now ?? Date.now()).toISOString(), duration: 0 };
		const r = checkSegment(seg, { items: ctx.items, story, now: ctx.now });
		if (r.ok) {
			seg.duration = applyTiming(seg.beats);
			return { segment: seg, dropped };
		}
		const bad = new Set(r.errors.map((e) => Number(/^beat (\d+)/.exec(e)?.[1])).filter((n) => !Number.isNaN(n)));
		if ([...bad].some((i) => !keep[i]?.optional) || r.errors.some((e) => e.startsWith('segment'))) {
			return { dropped: [...dropped, ...r.errors] };
		}
		dropped.push(...r.errors);
		keep = keep.filter((_, i) => !bad.has(i));
	}
	return { dropped };
}

const today = (now?: number) => new Date(now ?? Date.now()).toISOString().slice(0, 10);

// ---------- CT.gov registration: the pipeline format ----------

export function writeRegistration(story: Story, ctx: WriteContext) {
	const it = story.itemIds.map((id) => ctx.items.get(id)).find((i) => i?.source === 'ctgov' && i.kind === 'registration');
	if (!it) return { dropped: ['no registration item'] };
	const S = [it.id];
	const m = it.meta ?? {};
	const sponsor = it.entities.sponsors[0] ?? '';
	const who = shortSponsor(sponsor);
	const drug = shortDrug(it.entities.drugs);
	const phase = phaseOf(String(m.phase ?? ''));
	if (phase === 'early') return { dropped: ['registration has no phase'] };
	const condition = clip(it.entities.conditions[0] ?? '', 6);
	const enroll = /Enrollment: ([\d,]+) participants/.exec(it.text)?.[1];
	const done = /Primary completion date: (\d{4}-\d{2}(?:-\d{2})?)/.exec(it.text)?.[1];
	const nct = it.entities.nctIds[0];
	if (!who || !nct) return { dropped: ['no sponsor or NCT id'] };

	const move = m.phaseMove === true;
	const from = m.fromPhase ? phaseOf(String(m.fromPhase)) : '';
	const subject = drug ?? 'a new drug';
	const headline = move
		? `${who} moves ${subject} into ${phase}`
		
		: `${who} registers ${/^Early/.test(phase) ? 'an' : 'a'} ${phase} trial${condition ? ` in ${condition.toLowerCase()}` : ''}`;
	const pipelines = ctx.pipelines?.get(`${sponsor}|${drug ?? ''}`) ?? ctx.pipelines?.get(`${sponsor}|`);
	const lead: CastId = 'anchor-a';

	const drafts: Draft[] = [{ beat: { type: 'headline', text: headline, sources: S } }];
	const future = done && done >= today(ctx.now).slice(0, done.length);
	if (pipelines?.length)
		drafts.push({ beat: { type: 'pipeline', sponsor: who, drug, phases: pipelines, highlight: phase, sources: S }, optional: true });
	drafts.push({
		beat: {
			type: 'anchor',
			who: lead,
			text: `The ${phase} trial ${nct} tests ${subject}${condition ? ` in ${condition}` : ''}${enroll ? ` and plans to enroll ${enroll} people` : ''}.`,
			sources: S
		}
	});
	if (move && from)
		drafts.push({
			beat: { type: 'anchor', who: 'clinician', text: `${who} has ${m.priorTrials} earlier ${Number(m.priorTrials) === 1 ? 'trial' : 'trials'} of ${subject} on the registry, the furthest at ${from}.`, sources: S },
			optional: true
		});
	if (done && future) drafts.push({ beat: { type: 'anchor', who: lead, text: `The registry lists primary completion for ${sayDate(done)}.`, sources: S }, optional: true });
	drafts.push({ beat: { type: 'anchor', who: 'anchor-b', text: `Source: ClinicalTrials.gov, ${nct}.`, sources: S } });

	return finish(story, drafts, { id: `seg-reg-${nct}`, format: 'pipeline', title: headline, library: false, asOf: today(ctx.now) }, ctx);
}

// ---------- FDA press release: headlines ----------

export function writeFdaRelease(story: Story, ctx: WriteContext) {
	const it = story.itemIds.map((id) => ctx.items.get(id)).find((i) => i?.source === 'fda-press');
	if (!it) return { dropped: ['no FDA release'] };
	const S = [it.id];
	if (words(it.title) > 14) return { dropped: ['title too long for a headline'] };
	const lines = screenSentences(it.text, 34);
	if (!lines.length) return { dropped: ['no sentence fits on screen'] };
	const date = it.publishedAt.slice(0, 10);
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: it.title.replace(/\.$/, ''), sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-a', text: lines[0], sources: S } }
	];
	for (const l of lines.slice(1, 3)) drafts.push({ beat: { type: 'anchor', who: 'anchor-b', text: l, sources: S }, optional: true });
	drafts.push({ beat: { type: 'anchor', who: 'anchor-a', text: `Source: FDA press release, ${sayDate(date)}.`, sources: S } });
	return finish(story, drafts, { id: `seg-fda-${it.id}`, format: 'headlines', title: it.title, library: false, asOf: today(ctx.now) }, ctx);
}

// ---------- FDA complete response letter: headlines ----------

export function writeCrl(story: Story, ctx: WriteContext) {
	const it = story.itemIds.map((id) => ctx.items.get(id)).find((i) => i?.kind === 'crl');
	if (!it) return { dropped: ['no CRL'] };
	const S = [it.id];
	const who = shortSponsor(it.entities.sponsors[0] ?? '');
	const drug = shortDrug(it.entities.drugs);
	const app = (it.meta?.applicationNumber as string[] | undefined)?.[0];
	if (!who) return { dropped: ['no sponsor'] };
	const headline = `FDA sends ${who} a complete response letter${drug ? ` for ${drug}` : ''}`;
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: headline, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-a', text: `A complete response letter, or CRL, is the FDA's letter saying it can't approve an application yet.`, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-a', text: `The FDA published the letter to ${who}${app ? ` on ${app}` : ''}.`, sources: S } },
		{ beat: { type: 'anchor', who: 'skeptic', text: `A CRL lists what the FDA needs before it will look again. Some are fixed in months, some never.`, sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `Source: FDA's published complete response letters.`, sources: S } }
	];
	return finish(story, drafts, { id: `seg-crl-${it.id}`, format: 'headlines', title: headline, library: false, asOf: today(ctx.now) }, ctx);
}

// ---------- This Day in Approvals (library) ----------

export function writeAnniversary(story: Story, ctx: WriteContext) {
	const it = story.itemIds.map((id) => ctx.items.get(id)).find((i) => i?.source === 'drugsfda');
	if (!it) return { dropped: ['no Drugs@FDA item'] };
	const S = [it.id];
	const name = it.entities.drugs[0];
	const generic = it.entities.drugs[1];
	const date = it.publishedAt.slice(0, 10);
	const year = date.slice(0, 4);
	const app = String(it.meta?.application ?? '');
	const who = shortSponsor(it.entities.sponsors[0] ?? '');
	if (!name) return { dropped: ['no drug name'] };
	const kind = app.startsWith('BLA') ? 'biologics license' : 'new drug';
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: `On this day in ${year}`, sources: S } },
		{ beat: { type: 'stat', value: name, label: `approved by the FDA on ${sayDate(date)}${generic && generic.toLowerCase() !== name.toLowerCase() ? `, generic name ${generic.toLowerCase()}` : ''}`, sources: S } },
		{ beat: { type: 'anchor', who: 'professor', text: `The ${kind} application${app ? `, ${app},` : ''} is held today by ${who || 'its sponsor'}.`, sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'professor', text: `Source: Drugs@FDA.`, sources: S } }
	];
	return finish(story, drafts, { id: `seg-day-${it.id}`, format: 'day-in-approvals', title: `${name}, ${year}`, library: true, libraryShow: 'this-day', asOf: today(ctx.now) }, ctx);
}

// ---------- Catalyst Calendar (library): trials due to read out ----------

/** Make a catalyst item from trials, so the segment cites something the check can read. */
export function catalystItem(area: string, trials: Trial[], now: number): SourceItem {
	const lines = trials.map((t) => `${t.nct}: ${t.sponsor}, ${t.interventions.join(', ')}, ${phaseOf(t.phase)}, primary completion ${t.primaryCompletion}.`);
	return {
		id: `catalyst-${area.toLowerCase().replace(/\W+/g, '-')}-${new Date(now).toISOString().slice(0, 10)}`,
		source: 'ctgov',
		tier: 'primary',
		url: 'https://clinicaltrials.gov/',
		fetchedAt: new Date(now).toISOString(),
		publishedAt: new Date(now).toISOString(),
		title: `${area} Phase 3 trials with primary completion in the next 30 days`,
		text: lines.join('\n'),
		entities: {
			drugs: trials.flatMap((t) => t.interventions),
			sponsors: trials.map((t) => t.sponsor),
			nctIds: trials.map((t) => t.nct),
			conditions: trials.flatMap((t) => t.conditions)
		},
		kind: 'other',
		meta: { catalyst: true, area }
	};
}

export function pickCatalysts(trials: Trial[], now: number, perArea = 4): Map<string, Trial[]> {
	const from = new Date(now).toISOString().slice(0, 10);
	const to = new Date(now + 30 * 86400_000).toISOString().slice(0, 10);
	const due = trials.filter(
		(t) =>
			t.phase.includes('PHASE3') &&
			t.primaryCompletion &&
			t.primaryCompletion.length === 10 &&
			t.primaryCompletion >= from &&
			t.primaryCompletion <= to &&
			['RECRUITING', 'ACTIVE_NOT_RECRUITING'].includes(t.status) &&
			shortDrug(t.interventions)
	);
	const by = new Map<string, Trial[]>();
	for (const t of due.sort((a, b) => (b.enrollment ?? 0) - (a.enrollment ?? 0))) {
		const area = therapyArea(t.conditions.join(' ')) ?? 'Other';
		if (area === 'Other') continue;
		const list = by.get(area) ?? [];
		if (list.length < perArea) list.push(t);
		by.set(area, list);
	}
	return by;
}

export function writeCatalyst(area: string, it: SourceItem, trials: Trial[], ctx: WriteContext) {
	const S = [it.id];
	const items = trials.map((t) => `${shortDrug(t.interventions)}, ${shortSponsor(t.sponsor)}: ${sayDate(t.primaryCompletion as string)}`);
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: `Catalyst Calendar: ${area}`, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `These Phase 3 trials list primary completion in the next 30 days. Results usually follow months later.`, sources: S } },
		{ beat: { type: 'list', title: `${area}, Phase 3, primary completion`, items, sources: S } },
		{ beat: { type: 'anchor', who: 'skeptic', text: `Completion dates on the registry slip often. Treat them as a sponsor's plan, not a promise.`, sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `Source: ClinicalTrials.gov.`, sources: S } }
	];
	const story: Story = { id: `story-${it.id}`, itemIds: [it.id], kind: 'other', title: it.title, entities: it.entities, score: 0, firstSeen: it.publishedAt, updatedAt: it.publishedAt, therapyArea: area };
	return finish(story, drafts, { id: `seg-${it.id}`, format: 'catalyst', title: `Catalyst Calendar: ${area}`, library: true, libraryShow: 'catalyst-calendar', asOf: today(ctx.now) }, ctx);
}

// ---------- dispatch ----------

export function writeStory(story: Story, ctx: WriteContext): { segment?: Segment; dropped: string[] } {
	const sources = new Set(story.itemIds.map((id) => ctx.items.get(id)?.source));
	if (story.kind === 'registration' && sources.has('ctgov')) return writeRegistration(story, ctx);
	if (story.kind === 'crl') return writeCrl(story, ctx);
	if (sources.has('drugsfda')) return writeAnniversary(story, ctx);
	if (sources.has('fda-press')) return writeFdaRelease(story, ctx);
	return { dropped: ['no template for this story; needs the model writer'] };
}

// ---------- Pipeline Profile (library): one sponsor's registry pipeline ----------

const PHASE_ORDER = ['Early Phase 1', 'Phase 1', 'Phase 1/2', 'Phase 2', 'Phase 2/3', 'Phase 3', 'Phase 4'];
const ACTIVE = new Set(['RECRUITING', 'NOT_YET_RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION']);

/** Sponsors with the most active trials, with those trials. */
export function topSponsors(trials: Trial[], n = 60): Map<string, Trial[]> {
	const by = new Map<string, Trial[]>();
	for (const t of trials) {
		if (!ACTIVE.has(t.status) || !t.sponsor) continue;
		const list = by.get(t.sponsor) ?? [];
		list.push(t);
		by.set(t.sponsor, list);
	}
	return new Map([...by].sort((a, b) => b[1].length - a[1].length).slice(0, n));
}

/** The facts a profile may state, as a primary item the check can read. */
export function profileItem(sponsor: string, trials: Trial[], now: number): SourceItem {
	const phases = new Map<string, number>();
	const areas = new Map<string, number>();
	for (const t of trials) {
		const p = phaseOf(t.phase);
		if (p !== 'early') phases.set(p, (phases.get(p) ?? 0) + 1);
		const a = therapyArea(t.conditions.join(' '));
		if (a) areas.set(a, (areas.get(a) ?? 0) + 1);
	}
	const p3 = trials.filter((t) => t.phase.includes('PHASE3') && t.start).sort((a, b) => (b.start ?? '').localeCompare(a.start ?? '')).slice(0, 4);
	const lines = [
		`${sponsor} has ${trials.length} active industry interventional trials on ClinicalTrials.gov.`,
		...PHASE_ORDER.filter((p) => phases.has(p)).map((p) => `${p}: ${phases.get(p)} trials.`),
		...[...areas].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([a, n]) => `${a}: ${n} trials.`),
		...p3.map((t) => `${t.nct}: ${shortDrug(t.interventions) ?? 'drug'} in ${t.conditions[0] ?? 'unlisted condition'}, Phase 3, start ${t.start}.`)
	];
	return {
		id: `profile-${sponsor.toLowerCase().replace(/\W+/g, '-').slice(0, 50)}-${new Date(now).toISOString().slice(0, 10)}`,
		source: 'ctgov',
		tier: 'primary',
		url: `https://clinicaltrials.gov/search?lead=${encodeURIComponent(sponsor)}`,
		fetchedAt: new Date(now).toISOString(),
		publishedAt: new Date(now).toISOString(),
		title: `${sponsor} pipeline on ClinicalTrials.gov`,
		text: lines.join('\n'),
		entities: { drugs: p3.flatMap((t) => t.interventions), sponsors: [sponsor], nctIds: p3.map((t) => t.nct), conditions: p3.flatMap((t) => t.conditions) },
		kind: 'other',
		meta: { profile: true, phases: Object.fromEntries(phases), areas: Object.fromEntries(areas) }
	};
}

export function writeProfile(it: SourceItem, ctx: WriteContext) {
	const S = [it.id];
	const sponsor = it.entities.sponsors[0];
	const who = shortSponsor(sponsor);
	const phases = Object.entries((it.meta?.phases ?? {}) as Record<string, number>).map(([phase, count]) => ({ phase, count }));
	const areas = Object.entries((it.meta?.areas ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, 4);
	const total = /has (\d+) active/.exec(it.text)?.[1];
	const p3 = [...it.text.matchAll(/^(NCT\d{8}): (.+?) in (.+?), Phase 3, start (\S+)\.$/gm)];
	const drafts: Draft[] = [
		{ beat: { type: 'headline', text: `Pipeline Profile: ${who}`, sources: S } },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `${who} has ${total} active trials of its own on ClinicalTrials.gov. Here is where they sit.`, sources: S } },
		{ beat: { type: 'pipeline', sponsor: who, phases, sources: S }, optional: true },
		{ beat: { type: 'list', title: 'Where the trials are', items: areas.map(([a, n]) => `${a}: ${n} trials`), sources: S }, optional: true },
		{ beat: { type: 'list', title: 'Latest Phase 3 starts', items: p3.map((m) => `${m[2]}, ${clip(m[3], 6) || 'see registry'} (${sayDate(m[4])})`), sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'clinician', text: `A registry count shows where a company is spending effort. It says nothing yet about which trials will work.`, sources: S }, optional: true },
		{ beat: { type: 'anchor', who: 'anchor-b', text: `Source: ClinicalTrials.gov.`, sources: S } }
	];
	if (!areas.length) drafts.splice(3, 1);
	if (!p3.length) drafts.splice(drafts.findIndex((d) => d.beat.type === 'list' && d.beat.title.startsWith('Latest')), 1);
	return finish(undefined, drafts, { id: `seg-${it.id}`, format: 'explainer', title: `Pipeline Profile: ${who}`, library: true, libraryShow: 'pipeline-profile', asOf: today(ctx.now) }, ctx);
}
