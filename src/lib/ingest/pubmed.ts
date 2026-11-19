// PubMed E-utilities: recent trial papers in a fixed journal list.
import type { SourceItem } from '../types';
import type { Store } from '../store/index';
import { getJson, getText, hashId, plainText } from './http';
import { guessEntities } from './entities';

const EU = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
export const JOURNALS = ['N Engl J Med', 'Lancet', 'JAMA', 'Nat Med', 'Lancet Oncol', 'J Clin Oncol', 'Blood', 'Nature', 'Science'];
const TERMS = '(trial[Title/Abstract] OR phase[Title/Abstract] OR randomized[Title/Abstract] OR randomised[Title/Abstract])';

export function buildTerm(): string {
	return `(${JOURNALS.map((j) => `"${j}"[ta]`).join(' OR ')}) AND ${TERMS}`;
}

export interface Article {
	pmid: string;
	title: string;
	abstract: string;
	journal: string;
	date: string; // YYYY-MM-DD
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseArticles(xml: string): Article[] {
	const out: Article[] = [];
	for (const m of xml.matchAll(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g)) {
		const b = m[0];
		const pmid = b.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
		if (!pmid) continue;
		const title = plainText(b.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/)?.[1] ?? '');
		const abstract = [...b.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)]
			.map((a) => {
				const label = a[1].match(/Label="([^"]*)"/)?.[1];
				const t = plainText(a[2]);
				return label ? `${label}: ${t}` : t;
			})
			.join('\n');
		const journal = plainText(b.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] ?? '');
		const pd = b.match(/<(?:ArticleDate|PubDate)[^>]*>([\s\S]*?)<\/(?:ArticleDate|PubDate)>/)?.[1] ?? '';
		const y = pd.match(/<Year>(\d{4})/)?.[1] ?? String(new Date().getUTCFullYear());
		const mo = pd.match(/<Month>([^<]+)/)?.[1] ?? '01';
		const mi = /^\d+$/.test(mo) ? Number(mo) : MONTHS.indexOf(mo.slice(0, 3)) + 1;
		const d = pd.match(/<Day>(\d+)/)?.[1] ?? '01';
		out.push({ pmid, title, abstract, journal, date: `${y}-${String(mi || 1).padStart(2, '0')}-${d.padStart(2, '0')}` });
	}
	return out;
}

export async function fetchItems(store: Store, opts: { days?: number; limit?: number } = {}): Promise<SourceItem[]> {
	const q = new URLSearchParams({ db: 'pubmed', retmode: 'json', retmax: String(opts.limit ?? 100), datetype: 'edat', reldate: String(opts.days ?? 2), term: buildTerm() });
	const res = await getJson<{ esearchresult?: { idlist?: string[] } }>(`${EU}/esearch.fcgi?${q}`);
	const seen = new Set((await store.getKV<string[]>('pubmed:seen')) ?? []);
	const ids = (res.esearchresult?.idlist ?? []).filter((id) => !seen.has(id));
	if (!ids.length) return [];
	await new Promise((r) => setTimeout(r, 400)); // 3 requests per second without a key
	const xml = await getText(`${EU}/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(',')}`, { timeoutMs: 60_000 });
	const now = new Date().toISOString();
	const items = parseArticles(xml).map<SourceItem>((a) => ({
		id: hashId('pubmed', a.pmid),
		source: 'pubmed',
		tier: 'primary',
		url: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`,
		fetchedAt: now,
		publishedAt: `${a.date}T00:00:00Z`,
		title: a.title,
		text: a.abstract,
		entities: guessEntities(`${a.title}\n${a.abstract}`),
		kind: 'paper',
		meta: { pmid: a.pmid, journal: a.journal }
	}));
	await store.setKV('pubmed:seen', [...seen, ...ids].slice(-2000));
	return items;
}
