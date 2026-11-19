// openFDA Drugs@FDA. Original approvals by month-day, for This Day in Approvals.
import type { SourceItem } from '../types';
import type { Store } from '../store/index';
import { getJson, hashId } from './http';
import { guessEntities } from './entities';

const API = 'https://api.fda.gov/drug/drugsfda.json';

export interface Approval {
	application: string;
	brand: string;
	generic: string;
	sponsor: string;
	date: string; // YYYY-MM-DD
}

interface Rec {
	application_number?: string;
	sponsor_name?: string;
	openfda?: { brand_name?: string[]; generic_name?: string[] };
	products?: { brand_name?: string; active_ingredients?: { name?: string }[] }[];
	submissions?: { submission_type?: string; submission_status?: string; submission_status_date?: string }[];
}

const cap = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const dash = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/** Original approvals in a record, optionally only those on a given YYYYMMDD. */
export function approvalsOf(r: Rec, onDate?: string): Approval[] {
	if (!r.application_number || /^ANDA/.test(r.application_number)) return [];
	const subs = (r.submissions ?? []).filter(
		(s) => s.submission_type === 'ORIG' && s.submission_status === 'AP' && s.submission_status_date && (!onDate || s.submission_status_date === onDate)
	);
	if (!subs.length) return [];
	const brand = r.openfda?.brand_name?.[0] ?? r.products?.[0]?.brand_name ?? '';
	const generic =
		r.openfda?.generic_name?.[0] ?? (r.products?.[0]?.active_ingredients ?? []).map((a) => a.name ?? '').filter(Boolean).join(', ');
	return subs.map((s) => ({
		application: r.application_number as string,
		brand: cap(brand),
		generic: cap(generic),
		sponsor: cap(r.sponsor_name ?? ''),
		date: dash(s.submission_status_date as string)
	}));
}

async function onDate(ymd: string): Promise<Approval[]> {
	const search = `submissions.submission_type:"ORIG"+AND+submissions.submission_status:"AP"+AND+submissions.submission_status_date:"${ymd}"`;
	try {
		const page = await getJson<{ results?: Rec[] }>(`${API}?search=${search}&limit=100`);
		return (page.results ?? []).flatMap((r) => approvalsOf(r, ymd));
	} catch (e) {
		if ((e as Error).message.startsWith('404')) return []; // openFDA answers 404 for no matches
		throw e;
	}
}

/**
 * Original NDA approvals on a month-day in past years, newest first. Queries each year's exact date
 * (openFDA has no month-day search), so about 80 requests. Callers should cache per day.
 */
export async function approvalsOn(monthDay: string, limit = 20, fromYear = 1939): Promise<Approval[]> {
	const thisYear = new Date().getUTCFullYear();
	const [mm, dd] = monthDay.split('-');
	const out: Approval[] = [];
	for (let y = thisYear - 1; y >= fromYear; y -= 4) {
		const batch = await Promise.all(
			[0, 1, 2, 3].filter((k) => y - k >= fromYear).map((k) => onDate(`${y - k}${mm}${dd}`))
		);
		out.push(...batch.flat());
		if (out.length >= limit * 3) break;
		await new Promise((r) => setTimeout(r, 300));
	}
	const real = out.filter((a) => a.brand || a.generic);
	return real.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export async function fetchItems(store: Store, opts: { monthDay?: string; limit?: number } = {}): Promise<SourceItem[]> {
	const d = new Date();
	const md = opts.monthDay ?? `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
	const key = `drugsfda:${md}:${d.getUTCFullYear()}`;
	if (await store.getKV(key)) return [];
	const list = await approvalsOn(md, opts.limit ?? 20);
	const now = new Date().toISOString();
	const items = list.map<SourceItem>((a) => {
		const name = a.brand || a.generic;
		return {
			id: hashId('drugsfda', `${a.application}${a.date}`),
			source: 'drugsfda',
			tier: 'primary',
			url: `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${a.application.replace(/\D/g, '')}`,
			fetchedAt: now,
			publishedAt: `${a.date}T00:00:00Z`,
			title: `FDA approved ${name} on ${a.date}`,
			text: `${name}${a.generic && a.brand ? ` (${a.generic})` : ''}, ${a.sponsor}. Original approval ${a.date}. Application ${a.application}.`,
			entities: { ...guessEntities(''), drugs: [a.brand, a.generic].filter(Boolean), sponsors: [a.sponsor].filter(Boolean) },
			kind: 'approval',
			meta: { application: a.application, monthDay: md }
		};
	});
	await store.setKV(key, true);
	return items;
}
