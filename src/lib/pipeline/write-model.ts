// Model writer: Sonnet writes beats from a story's primary items, through AI Gateway's
// OpenAI-compatible endpoint (plain fetch, so Node 20 works). The fact check then decides:
// failing optional beats drop, a failing required beat drops the segment.
// Paid: runs only with PIQ_PAID_RUN=1, and stops at DNBC_BUDGET_USD.

import type { Beat, FormatId, Segment, SourceItem, Story } from '../types';
import { finish, screenSentences, type Draft, type WriteContext } from './write-templates';

export const WRITER_MODEL = 'anthropic/claude-sonnet-5.5';
// Gateway list prices, USD per token, checked 2026-11-18 at ai-gateway.vercel.sh/v1/models.
const PRICE = { input: 0.000002, output: 0.00001 };
const URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

export class Budget {
	spent = 0;
	constructor(public cap: number) {}
	add(inTok: number, outTok: number) {
		this.spent += inTok * PRICE.input + outTok * PRICE.output;
	}
	get left() {
		return this.cap - this.spent;
	}
}

function token(): string {
	const t = process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN;
	if (!t) throw new Error('No AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. Run `vercel env pull .env.local`.');
	return t;
}

export function assertPaidRun() {
	if (process.env.PIQ_PAID_RUN !== '1') throw new Error('The model writer is a paid run. Prefix PIQ_PAID_RUN=1 and set DNBC_BUDGET_USD.');
}

const FORMAT_GUIDE: Partial<Record<FormatId, string>> = {
	headlines:
		'Beats in order: headline; anchor (what happened); optional stat; optional quote, with an anchor origin line right before it; anchor (why it matters).',
	readout:
		'Beats in order: headline; anchor (the question the trial asked); stat (primary endpoint result, exactly as the source gives it); optional quote, with an anchor origin line right before it; panel with two lines, clinician then skeptic, about design and limits; anchor (what is next).'
};

const SYSTEM = `You write segments for DNBC, a text-only TV channel about drug development. Output JSON only.

Rules, all strict:
- Use only facts in the SOURCES. Every number, date, drug name, and outcome must appear in the source you cite. Copy numbers exactly. Never round, convert, or compute.
- Say an outcome word (approved, met, missed, rejected, discontinued, halted, withdrawn) only if a source sentence says it of that same drug.
- Each beat has "sources": the ids of the items it relies on.
- At most 30 words per beat. Plain words a patient could follow. Define a term on first use. No hype words (breakthrough, game-changer, miracle). No stock prices or market talk.
- A quote beat copies whole sentences verbatim from one source, with the speaker named in that source near the quote. Put "name" and "role" as the source gives them. The beat before a quote is an anchor statement naming where the quote came from, ending with a colon. Never a question. Never present a quote as an answer to us.
- No invented words for any real person.
- Cast ids: anchor-a (fact-first anchor), anchor-b (calm anchor), clinician (reads design: endpoints, controls, size), skeptic (what could go wrong, no sneering).
- Never write a "Source:" line or name the source as something a cast member says. Sources show as footnotes from each beat's "sources" ids.

Beat shapes:
{"type":"headline","text":"..."} (under 12 words)
{"type":"anchor","who":"anchor-a","text":"..."}
{"type":"stat","value":"...","label":"..."}
{"type":"quote","text":"...","speaker":{"name":"...","role":"..."},"publisher":"...","date":"YYYY-MM-DD"}
{"type":"panel","lines":[{"who":"clinician","text":"..."},{"who":"skeptic","text":"..."}]}

Output: {"title":"...","beats":[...]} with "sources" on every beat.`;

function sourceBlock(items: SourceItem[]): string {
	return items
		.map((i) => {
			const body = i.text.length > 7000 ? i.text.slice(0, 7000) : i.text;
			return `<source id="${i.id}" publisher="${i.source}" date="${i.publishedAt.slice(0, 10)}">\nTITLE: ${i.title}\n${body}\n</source>`;
		})
		.join('\n\n');
}

function parse(text: string): { title: string; beats: Beat[] } | undefined {
	const m = /\{[\s\S]*\}/.exec(text);
	if (!m) return;
	try {
		const j = JSON.parse(m[0]);
		if (!Array.isArray(j.beats)) return;
		return j;
	} catch {
		return;
	}
}

export function formatFor(story: Story): FormatId {
	return story.kind === 'readout' ? 'readout' : 'headlines';
}

export async function writeWithModel(story: Story, ctx: WriteContext, budget: Budget, log = console.log) {
	const items = story.itemIds.map((id) => ctx.items.get(id)).filter((i): i is SourceItem => !!i && i.tier !== 'social');
	if (!items.length) return { dropped: ['no primary items'] };
	if (!items.some((i) => i.text.length > 200 || screenSentences(i.text).length)) return { dropped: ['sources have no body text'] };
	if (budget.left < 0.05) return { dropped: ['budget spent'] };

	const format = formatFor(story);
	const user = `FORMAT: ${format}\n${FORMAT_GUIDE[format]}\n\nSOURCES:\n${sourceBlock(items)}`;
	const res = await fetch(URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${token()}` },
		body: JSON.stringify({
			model: WRITER_MODEL,
			max_tokens: 1500,
			temperature: 0.3,
			messages: [
				{ role: 'system', content: SYSTEM },
				{ role: 'user', content: user }
			]
		})
	});
	if (!res.ok) return { dropped: [`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`] };
	const j = await res.json();
	budget.add(j.usage?.prompt_tokens ?? 0, j.usage?.completion_tokens ?? 0);
	const out = parse(j.choices?.[0]?.message?.content ?? '');
	if (!out) return { dropped: ['model output was not JSON'] };

	return checkWritten(story, out.beats, format, out.title ?? story.title, ctx);
}

/**
 * The gate for any written beats (model, subagent, or by hand). Headline, the first anchor,
 * and the closing anchor are required; the rest may drop. An origin line whose quote dropped
 * is removed with it.
 */
export function checkWritten(
	story: Story | undefined,
	raw: unknown[],
	format: FormatId,
	title: string,
	ctx: WriteContext,
	opts: { id?: string; library?: boolean; libraryShow?: Segment['libraryShow'] } = {}
) {
	const beats = raw.filter((b): b is Beat => !!b && typeof b === 'object' && 'type' in b);
	const firstAnchor = beats.findIndex((b) => b.type === 'anchor');
	const drafts: Draft[] = beats.map((beat, i) => ({
		beat: { ...beat, sources: Array.isArray(beat.sources) ? beat.sources : [] } as Beat,
		optional: !(i === 0 || i === firstAnchor || i === beats.length - 1)
	}));
	const r = finish(
		story,
		drafts,
		{
			id: opts.id ?? `seg-m-${story?.id ?? title.toLowerCase().replace(/\W+/g, '-')}`,
			format,
			title,
			library: opts.library ?? false,
			libraryShow: opts.libraryShow,
			asOf: new Date(ctx.now ?? Date.now()).toISOString().slice(0, 10)
		},
		ctx
	);
	if (r.segment) {
		const b = r.segment.beats;
		r.segment.beats = b.filter((x, i) => !(x.type === 'anchor' && /:\s*$/.test(x.text) && b[i + 1]?.type !== 'quote'));
	}
	return r;
}
