// Group source items into stories and score them.
// Items join when they share an NCT id, a sponsor plus drug, a URL, or a near-identical title
// within 3 days. Social items join a story only through a drug or NCT id; on their own they
// form 'post' stories, which only Patient Desk uses.

import type { ItemKind, SourceItem, Story } from '../types';

export const KIND_WEIGHT: Record<ItemKind, number> = {
	approval: 10,
	crl: 9,
	readout: 8,
	results: 7,
	deal: 6,
	adcomm: 6,
	pdufa: 5,
	registration: 4,
	status: 4,
	paper: 3,
	filing: 3,
	reference: 1,
	other: 2,
	post: 1
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 2));

function jaccard(a: Set<string>, b: Set<string>): number {
	let inter = 0;
	for (const w of a) if (b.has(w)) inter++;
	return inter / (a.size + b.size - inter || 1);
}

/** Weight of one item, with bumps for the notable registry events. */
export function itemWeight(i: SourceItem): number {
	let w = KIND_WEIGHT[i.kind] ?? 2;
	if (i.kind === 'registration' && i.meta?.phaseMove) w = 6;
	if (i.kind === 'status' && ['TERMINATED', 'SUSPENDED', 'WITHDRAWN'].includes(String(i.meta?.status))) w = 6;
	return w;
}

const AREAS: [string, RegExp][] = [
	['Oncology', /cancer|tumou?r|carcinoma|lymphoma|leukemia|leukaemia|myeloma|melanoma|sarcoma|neoplasm|oncolog|glioma/i],
	['Hematology', /anemia|anaemia|sickle|hemophilia|haemophilia|thalassemia|thrombocytopenia|blood disorder/i],
	['Neurology', /alzheimer|parkinson|als\b|amyotrophic|multiple sclerosis|epilep|migraine|neuropath|huntington|dementia/i],
	['Psychiatry', /depress|schizophren|bipolar|anxiety|ptsd|adhd|autism/i],
	['Immunology', /arthritis|lupus|psoria|crohn|colitis|atopic|eczema|autoimmun|sjogren|vasculitis/i],
	['Cardiometabolic', /heart|cardi|hypertension|obesity|diabetes|lipid|cholesterol|kidney|renal|nash|mash|steatohepatitis/i],
	['Infectious disease', /hiv|hepatitis|covid|influenza|rsv|infection|vaccine|bacterial|viral|malaria|tuberculosis/i],
	['Respiratory', /asthma|copd|pulmonary|cystic fibrosis|lung disease/i],
	['Ophthalmology', /retina|macular|glaucoma|ophthalm|eye disease|uveitis/i],
	['Rare disease', /rare|orphan|duchenne|spinal muscular|fabry|gaucher|pompe|amyloidosis/i]
];

export function therapyArea(text: string): string | undefined {
	for (const [area, re] of AREAS) if (re.test(text)) return area;
	return undefined;
}

class UnionFind {
	parent: number[];
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i);
	}
	find(i: number): number {
		while (this.parent[i] !== i) i = this.parent[i] = this.parent[this.parent[i]];
		return i;
	}
	union(a: number, b: number) {
		const ra = this.find(a);
		const rb = this.find(b);
		if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
	}
}

const DAY = 86400_000;

/** Build stories from items. `now` sets recency. Items should be sorted oldest first for stable ids. */
export function buildStories(items: SourceItem[], now = Date.now()): Story[] {
	const sorted = [...items].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id));
	const uf = new UnionFind(sorted.length);
	const byKey = new Map<string, number>();
	const link = (key: string, i: number) => {
		const j = byKey.get(key);
		if (j === undefined) byKey.set(key, i);
		else uf.union(i, j);
	};

	sorted.forEach((it, i) => {
		for (const n of it.entities.nctIds) link(`nct:${n}`, i);
		for (const d of it.entities.drugs) {
			const dn = norm(d);
			if (dn.length < 4) continue;
			// Social items join by drug alone; primary items need the sponsor too, so a common
			// comparator drug does not glue unrelated trials together.
			if (it.tier === 'social') {
				const j = byKey.get(`drug:${dn}`);
				if (j !== undefined) uf.union(i, j);
			} else {
				for (const s of it.entities.sponsors) link(`sd:${norm(s)}|${dn}`, i);
				if (!byKey.has(`drug:${dn}`)) byKey.set(`drug:${dn}`, i);
			}
		}
		if (it.url && it.tier !== 'social') link(`url:${it.url}`, i);
	});

	// Near-identical titles within 3 days (wire copies of the same release).
	const titled = sorted.map((it, i) => ({ i, w: words(it.title), t: Date.parse(it.publishedAt), social: it.tier === 'social' }));
	for (let a = 0; a < titled.length; a++) {
		if (titled[a].social || titled[a].w.size < 4) continue;
		for (let b = a + 1; b < titled.length; b++) {
			if (titled[b].social || titled[b].t - titled[a].t > 3 * DAY) continue;
			if (jaccard(titled[a].w, titled[b].w) >= 0.6) uf.union(titled[a].i, titled[b].i);
		}
	}

	const groups = new Map<number, SourceItem[]>();
	sorted.forEach((it, i) => {
		const r = uf.find(i);
		const g = groups.get(r);
		if (g) g.push(it);
		else groups.set(r, [it]);
	});

	const stories: Story[] = [];
	for (const g of groups.values()) {
		const primary = g.filter((i) => i.tier !== 'social');
		const lead = (primary.length ? primary : g).reduce((best, i) => (itemWeight(i) > itemWeight(best) ? i : best));
		const uniq = (xs: string[]) => [...new Map(xs.map((x) => [norm(x), x])).values()];
		const newest = Math.max(...g.map((i) => Date.parse(i.publishedAt) || 0));
		const ageDays = Math.max(0, (now - newest) / DAY);
		const sources = new Set(primary.map((i) => i.source)).size;
		const score = primary.length
			? Math.round((itemWeight(lead) * Math.pow(0.5, ageDays) + Math.min(3, sources - 1) * 0.8 + Math.min(2, g.length - primary.length) * 0.3) * 100) / 100
			: Math.round(itemWeight(lead) * Math.pow(0.5, ageDays) * 100) / 100;
		const text = g.map((i) => `${i.title} ${i.entities.conditions.join(' ')}`).join(' ');
		stories.push({
			id: `story-${g[0].id}`.slice(0, 120),
			itemIds: g.map((i) => i.id),
			kind: primary.length ? lead.kind : 'post',
			title: lead.title,
			entities: {
				drugs: uniq(g.flatMap((i) => i.entities.drugs)).slice(0, 12),
				sponsors: uniq(primary.flatMap((i) => i.entities.sponsors)).slice(0, 6),
				nctIds: uniq(g.flatMap((i) => i.entities.nctIds)).slice(0, 12),
				conditions: uniq(g.flatMap((i) => i.entities.conditions)).slice(0, 8)
			},
			score,
			firstSeen: g[0].publishedAt,
			updatedAt: new Date(newest || now).toISOString(),
			therapyArea: therapyArea(text)
		});
	}
	return stories.sort((a, b) => b.score - a.score);
}

/** A story may air in a live show only with at least one primary item. */
export function airable(story: Story): boolean {
	return story.kind !== 'post';
}
