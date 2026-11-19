// The fact check. Rules only, no model. A segment fails when any beat says something its
// cited sources don't. See docs/PLAN.md section 5, step 4.

import type { Beat, Segment, SourceItem, Story } from '../types';
import { TIMING } from '../channel/timing';

export interface CheckResult {
	ok: boolean;
	errors: string[];
}

const DAY = 86400_000;
const QUOTE_MAX_AGE_DAYS = 7;
const SPEAKER_WINDOW = 300;

// ---------- text helpers ----------

/** Fold quotes, dashes, and spaces so verbatim matching survives typography. */
export function fold(s: string): string {
	return s
		.replace(/[‘’‛′]/g, "'")
		.replace(/[“”‟″]/g, '"')
		.replace(/[‐-―−]/g, '-')
		.replace(/ /g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

const lower = (s: string) => fold(s).toLowerCase();

export function beatTexts(b: Beat): string[] {
	switch (b.type) {
		case 'headline':
		case 'anchor':
		case 'bumper':
			return [b.text];
		case 'quote':
			return []; // checked by the quote rules
		case 'panel':
			return b.lines.map((l) => l.text);
		case 'pipeline':
			return [b.sponsor, b.drug ?? '', b.highlight ?? ''];
		case 'timeline':
			return b.points.flatMap((p) => [p.date, p.label]);
		case 'stat':
			return [b.value, b.label];
		case 'list':
			return [b.title, ...b.items];
		case 'quiz':
			return [b.clue, b.answer];
	}
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';

/** Dates as normalised keys: "m-d" (month-day), "y-m" and "y-m-d" when the year is given, and "y" for a bare year. */
export function dateKeys(text: string): { keys: Set<string>; stripped: string } {
	const keys = new Set<string>();
	let s = ' ' + lower(text) + ' ';
	const mon = (m: string) => MONTHS.indexOf(m.slice(0, 3)) + 1;
	const add = (y: number | undefined, m: number, d?: number) => {
		if (d) keys.add(`${m}-${d}`);
		if (y) {
			keys.add(String(y));
			keys.add(`${y}-${m}`);
			if (d) keys.add(`${y}-${m}-${d}`);
		}
	};
	// 2026-11-17 or 2026-11
	s = s.replace(/\b(\d{4})-(\d{1,2})(?:-(\d{1,2}))?\b/g, (_, y, m, d) => (add(+y, +m, d ? +d : undefined), ' '));
	// November 17, 2026 / Nov 17
	s = s.replace(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'g'), (_, m, d, y) => (add(y ? +y : undefined, mon(m), +d), ' '));
	// 17 November 2026 / 17 Nov
	s = s.replace(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:,?\\s+(\\d{4}))?\\b`, 'g'), (_, d, m, y) => (add(y ? +y : undefined, mon(m), +d), ' '));
	// November 2026
	s = s.replace(new RegExp(`\\b${MONTH_RE}\\s+(\\d{4})\\b`, 'g'), (_, m, y) => (add(+y, mon(m)), ' '));
	// bare years 1900-2099 stay numbers too, but record them
	for (const m of s.matchAll(/\b(19|20)\d{2}\b/g)) keys.add(m[0]);
	return { keys, stripped: s };
}

/** Numbers that carry meaning: anything with a decimal, comma, percent, or two or more digits. */
export function numberKeys(text: string): Set<string> {
	const out = new Set<string>();
	const s = text
		.replace(/\bNCT\d{8}\b/gi, ' ')
		.replace(/\bphase\s*(?:[1-4]|i{1,3}v?|iv)(?:\s*[/-]\s*(?:[1-4]|i{1,3}v?))?[ab]?\b/gi, ' ')
		.replace(/\b[A-Z]{2,6}-?\d{2,6}[A-Z]?\b/g, ' '); // code names like ABC-1234 are names, not numbers
	for (const m of s.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(%|percent|per cent)?/gi)) {
		const raw = m[1].replace(/,/g, '');
		if (!raw) continue;
		const pct = !!m[2];
		if (!pct && !raw.includes('.') && raw.length < 2) continue; // single digits are prose
		const n = Number(raw);
		if (Number.isNaN(n)) continue;
		out.add(pct ? `${n}%` : String(n));
	}
	return out;
}

function sourceNumbers(text: string): Set<string> {
	const out = new Set<string>();
	for (const k of numberKeys(text)) {
		out.add(k);
		if (k.endsWith('%')) out.add(k.slice(0, -1));
		else {
			const n = Number(k);
			if (n > 0 && n < 1) out.add(`${Math.round(n * 1000) / 10}%`);
		}
	}
	return out;
}

const INN = /\b[a-z]{3,}(?:mab|nib|tide|cel|gene|stat|parin|vir|lisib|zumab|ximab|umab|ciclib|rafenib|platin|taxel|mycin|cillin|oxacin|sartan|pril|olol|gliflozin|gliptin|glutide|dronate|lukast|setron|tinib|degib|tecan|vedotin|deruxtecan)\b/gi;
const CODE = /\b[A-Z]{2,6}-\d{2,6}[A-Z]?\b/g;

/** Drug-like names in text: INN stems and code names. */
export function drugTokens(text: string): string[] {
	const out = new Set<string>();
	for (const m of fold(text).matchAll(INN)) out.add(m[0].toLowerCase());
	for (const m of fold(text).matchAll(CODE)) out.add(m[0].toLowerCase());
	return [...out];
}

const OUTCOMES: [string, RegExp, RegExp][] = [
	// [name, how a beat says it, how a source must say it]
	['approved', /\b(approv(?:ed|es|al))\b/i, /\bapprov/i],
	['met', /\bmet (?:its|the|both|all)?\s*(?:primary|secondary|co-primary)?\s*(?:end ?points?|goal)\b|\bhit (?:its|the) (?:primary )?end ?point\b/i, /\b(met|achieved|meeting) (?:its |the |both |all )?(?:co-)?(?:primary|secondary|key)?\s*(?:end ?points?|goal|objective)|statistically significant/i],
	['missed', /\b(missed|failed to meet|did not meet|fell short)\b/i, /\b(did not (?:meet|achieve)|failed to|missed|not statistically significant)\b/i],
	['rejected', /\b(rejected|complete response letter|\bCRL\b|turned down)\b/i, /\b(complete response|CRL|not approv|declined to approve)\b/i],
	['discontinued', /\bdiscontinu/i, /\bdiscontinu|terminat|stop(?:ped|ping) (?:the )?(?:trial|study|development)/i],
	['halted', /\b(halt(?:ed|s)?|paused|suspended|clinical hold)\b/i, /\b(halt|pause|suspend|clinical hold)/i],
	['withdrawn', /\bwithdr[ae]w/i, /\bwithdr[ae]w/i]
];

function sentences(text: string): string[] {
	return fold(text).split(/(?<=[.!?])\s+(?=[A-Z"'(])/);
}

// ---------- the check ----------

export interface CheckContext {
	items: Map<string, SourceItem>;
	story?: Story;
	now?: number;
}

export function checkSegment(seg: Segment, ctx: CheckContext): CheckResult {
	const errors: string[] = [];
	const now = ctx.now ?? Date.now();
	const err = (i: number, msg: string) => errors.push(`beat ${i} (${seg.beats[i]?.type}): ${msg}`);

	if (!seg.asOf || !/^\d{4}-\d{2}-\d{2}$/.test(seg.asOf)) errors.push('segment: no "as of" date');
	if (!seg.beats.length) errors.push('segment: no beats');

	const lexicon = new Set<string>();
	for (const d of [...(ctx.story?.entities.drugs ?? []), ...(ctx.story?.entities.sponsors ?? [])]) lexicon.add(lower(d));

	seg.beats.forEach((b, i) => {
		// Rule: length
		const texts = b.type === 'quote' ? [] : beatTexts(b);
		for (const t of texts) {
			const w = t.split(/\s+/).filter(Boolean).length;
			if (w > TIMING.maxWords) err(i, `${w} words, over ${TIMING.maxWords}`);
		}
		if (b.type === 'bumper') return;

		// Rule: citations exist
		if (!b.sources?.length) {
			err(i, 'cites no source item');
			return;
		}
		const cited = b.sources.map((id) => ctx.items.get(id));
		if (cited.some((c) => !c)) {
			err(i, `cites a missing item (${b.sources.filter((id) => !ctx.items.get(id)).join(', ')})`);
			return;
		}
		const items = cited as SourceItem[];
		const factual = items.filter((x) => x.tier !== 'social');
		const factText = factual.map((x) => `${x.title}\n${x.text}`).join('\n');

		if (b.type === 'quote') {
			checkQuote(seg, b, i, items, ctx, now, err);
			return;
		}

		const joined = texts.join(' \n ');
		const { keys: beatDates, stripped } = dateKeys(joined);
		const beatNums = numberKeys(stripped);
		const drugs = drugTokens(joined);
		const hasFact = beatDates.size > 0 || beatNums.size > 0 || OUTCOMES.some(([, say]) => say.test(joined));

		// Rule: facts need a primary or reference source
		if (hasFact && !factual.length) {
			err(i, 'states a fact (number, date, or outcome) citing only social items');
			return;
		}

		// Rule: numbers and dates must be in a cited factual item
		if (beatDates.size || beatNums.size) {
			const { keys: srcDates, stripped: srcStripped } = dateKeys(factText);
			const srcNums = sourceNumbers(srcStripped);
			for (const k of srcDates) if (/^\d{4}$/.test(k)) srcNums.add(k);
			for (const d of beatDates) if (!srcDates.has(d) && !(/^\d{4}$/.test(d) && srcNums.has(d))) err(i, `date "${d}" not in its sources`);
			for (const n of beatNums) {
				if (/^(19|20)\d{2}$/.test(n) && srcDates.has(n)) continue;
				if (!srcNums.has(n)) err(i, `number "${n}" not in its sources`);
			}
		}

		// Rule: NCT ids must be in the sources
		for (const m of joined.matchAll(/\bNCT\d{8}\b/g)) if (!factText.includes(m[0])) err(i, `${m[0]} not in its sources`);

		// Rule: drug names must be known
		const srcLower = lower(factText);
		for (const d of drugs) if (!lexicon.has(d) && !srcLower.includes(d)) err(i, `drug "${d}" not in the story or its sources`);

		// Rule: outcome words sit in the same source sentence as the drug
		for (const [name, say, src] of OUTCOMES) {
			if (!say.test(joined)) continue;
			const subjects = drugs.length ? drugs : [...lexicon].filter((x) => lower(joined).includes(x));
			const sents = sentences(factText);
			const ok = sents.some((s) => src.test(s) && (subjects.length === 0 || subjects.some((d) => s.toLowerCase().includes(d))));
			if (!ok) err(i, `says "${name}" but no cited source sentence says it of ${subjects.join(', ') || 'this story'}`);
		}
	});

	return { ok: errors.length === 0, errors };
}

function checkQuote(
	seg: Segment,
	b: Extract<Beat, { type: 'quote' }>,
	i: number,
	items: SourceItem[],
	ctx: CheckContext,
	now: number,
	err: (i: number, m: string) => void
) {
	if (items.length !== 1) err(i, 'a quote cites exactly one item');
	const it = items[0];
	const src = fold(it.text);
	const q = fold(b.text).replace(/^["']|["']$/g, '');
	// Press releases close a quote with a comma before "said". Match the words, then allow
	// the source to end that sentence with . ! ? or , (plus a closing quote mark).
	const core = q.replace(/[.!?,]+$/, '');
	let at = -1;
	for (let from = 0; (from = src.indexOf(core, from)) >= 0; from++) {
		if (/^[.!?,]/.test(src.slice(from + core.length))) {
			at = from;
			break;
		}
	}

	// Rule: verbatim
	if (at < 0) {
		err(i, 'quote is not verbatim in its item');
	} else {
		// Rule: whole sentences
		const before = src.slice(Math.max(0, at - 2), at);
		const startsSentence = at === 0 || /[.!?"'\n]\s*$/.test(before) || /^\s*$/.test(before) || /[:]\s$/.test(before);
		const endsSentence = /[.!?]["']?$/.test(q) && /^[.!?]|^,\s*["']/.test(src.slice(at + core.length));
		if (!startsSentence || !endsSentence) err(i, 'quote is not whole sentences');
		if (/^[a-z]/.test(q)) err(i, 'quote starts mid-sentence');

		// Rule: speaker named near the quote (named speakers only)
		const name = b.speaker.name?.trim();
		if (name && it.tier !== 'social') {
			const last = name.split(/\s+/).pop() as string;
			const win = src.slice(Math.max(0, at - SPEAKER_WINDOW), at + q.length + SPEAKER_WINDOW);
			if (!win.includes(last)) err(i, `speaker "${name}" not named within ${SPEAKER_WINDOW} characters of the quote`);
		}
	}

	// Rule: same story
	if (ctx.story && !ctx.story.itemIds.includes(it.id)) err(i, 'quote comes from another story');

	// Rule: fresh enough for a live show
	if (!seg.library) {
		const age = (now - Date.parse(it.publishedAt)) / DAY;
		if (age > QUOTE_MAX_AGE_DAYS) err(i, `quote is ${Math.floor(age)} days old, over ${QUOTE_MAX_AGE_DAYS}`);
	}

	// Rule: attribution by source
	if (it.source === 'reddit') {
		if (b.speaker.name || b.speaker.handle || b.url) err(i, 'patient quote shows a username or link');
		if (!b.speaker.community) err(i, 'patient quote has no community');
	}
	if (it.source === 'bluesky' && (b.speaker.name || b.speaker.role)) err(i, 'Bluesky quote shows a name or role');

	// Rule: the beat before a quote is a statement of origin, never a question
	const prev = seg.beats[i - 1];
	if (!prev || prev.type !== 'anchor') err(i, 'the beat before a quote must be an anchor line naming its origin');
	else if (/\?\s*$/.test(prev.text)) err(i, 'the line before a quote is a question');
}
