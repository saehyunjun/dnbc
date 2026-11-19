// Neon store over HTTP (@neondatabase/serverless). Each collection is a table of id plus jsonb,
// with the few columns we filter on pulled out. Bulk writes go in chunks as one jsonb array.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { Playlist, Segment, SourceItem, Story } from '../types';
import type { Blocked, Store, Trial } from './index';

const SCHEMA = [
	`create table if not exists items (id text primary key, source text not null, fetched_at timestamptz not null, published_at timestamptz, data jsonb not null)`,
	`create index if not exists items_fetched on items (fetched_at)`,
	`create table if not exists stories (id text primary key, updated_at timestamptz not null, data jsonb not null)`,
	`create index if not exists stories_updated on stories (updated_at)`,
	`create table if not exists segments (id text primary key, library boolean not null, created_at timestamptz not null, data jsonb not null)`,
	`create table if not exists playlists (day text primary key, data jsonb not null)`,
	`create table if not exists trials (nct text primary key, sponsor text not null, data jsonb not null)`,
	`create index if not exists trials_sponsor on trials (sponsor)`,
	`create table if not exists blocked (id text primary key, reason text not null, at timestamptz not null default now())`,
	`create table if not exists kv (key text primary key, value jsonb not null)`
];

const CHUNK = 1500;

/** Last write wins per id: Postgres rejects one upsert that touches a row twice. */
function unique<T>(xs: T[], key: (x: T) => string): T[] {
	return [...new Map(xs.map((x) => [key(x), x])).values()];
}

function chunks<T>(xs: T[], n = CHUNK): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
	return out;
}

export class NeonStore implements Store {
	private sql: NeonQueryFunction<false, false>;
	private ready: Promise<void> | undefined;

	constructor(url: string) {
		this.sql = neon(url);
	}

	/** Neon over HTTP sometimes drops a response ("TypeError: terminated"). Every statement here is
	 * an idempotent select or upsert, so a dropped one is retried twice. */
	private async q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
		for (let attempt = 1; ; attempt++) {
			try {
				return (await this.sql.query(text, params)) as T[];
			} catch (e) {
				const dropped = e instanceof TypeError || /terminated|fetch failed|ECONNRESET/i.test(String(e));
				if (!dropped || attempt >= 3) throw e;
				await new Promise((r) => setTimeout(r, 1000 * attempt));
			}
		}
	}

	private init(): Promise<void> {
		this.ready ??= (async () => {
			for (const s of SCHEMA) await this.q(s);
		})();
		return this.ready;
	}

	async putItems(items: SourceItem[]) {
		await this.init();
		let added = 0;
		for (const c of chunks(unique(items, (x) => x.id))) {
			const rows = await this.q<{ inserted: boolean }>(
				`insert into items (id, source, fetched_at, published_at, data)
				 select x->>'id', x->>'source', (x->>'fetchedAt')::timestamptz, nullif(x->>'publishedAt','')::timestamptz, x
				 from jsonb_array_elements($1::jsonb) x
				 on conflict (id) do update set data = excluded.data, fetched_at = excluded.fetched_at, published_at = excluded.published_at
				 returning (xmax = 0) as inserted`,
				[JSON.stringify(c)]
			);
			added += rows.filter((r) => r.inserted).length;
		}
		return added;
	}

	async getItems(q: { since?: string; ids?: string[]; source?: string } = {}) {
		await this.init();
		const where: string[] = [];
		const params: unknown[] = [];
		if (q.ids) {
			params.push(q.ids);
			where.push(`id = any($${params.length})`);
		}
		if (q.since) {
			params.push(q.since);
			where.push(`fetched_at >= $${params.length}`);
		}
		if (q.source) {
			params.push(q.source);
			where.push(`source = $${params.length}`);
		}
		const rows = await this.q<{ data: SourceItem }>(
			`select data from items ${where.length ? 'where ' + where.join(' and ') : ''} order by published_at nulls last`,
			params
		);
		return rows.map((r) => r.data);
	}

	async putStories(stories: Story[]) {
		await this.init();
		for (const c of chunks(unique(stories, (x) => x.id))) {
			await this.q(
				`insert into stories (id, updated_at, data)
				 select x->>'id', (x->>'updatedAt')::timestamptz, x from jsonb_array_elements($1::jsonb) x
				 on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at`,
				[JSON.stringify(c)]
			);
		}
	}

	async getStories(q: { since?: string; ids?: string[] } = {}) {
		await this.init();
		const rows = q.ids
			? await this.q<{ data: Story }>(`select data from stories where id = any($1)`, [q.ids])
			: q.since
				? await this.q<{ data: Story }>(`select data from stories where updated_at >= $1`, [q.since])
				: await this.q<{ data: Story }>(`select data from stories`);
		return rows.map((r) => r.data);
	}

	async putSegments(segments: Segment[]) {
		await this.init();
		for (const c of chunks(unique(segments, (x) => x.id), 300)) {
			await this.q(
				`insert into segments (id, library, created_at, data)
				 select x->>'id', (x->>'library')::boolean, (x->>'createdAt')::timestamptz, x from jsonb_array_elements($1::jsonb) x
				 on conflict (id) do update set data = excluded.data, library = excluded.library`,
				[JSON.stringify(c)]
			);
		}
	}

	async getSegments(q: { ids?: string[]; library?: boolean; since?: string } = {}) {
		await this.init();
		const where: string[] = [];
		const params: unknown[] = [];
		if (q.ids) {
			params.push(q.ids);
			where.push(`id = any($${params.length})`);
		}
		if (q.library !== undefined) {
			params.push(q.library);
			where.push(`library = $${params.length}`);
		}
		if (q.since) {
			params.push(q.since);
			where.push(`created_at >= $${params.length}`);
		}
		const rows = await this.q<{ data: Segment }>(
			`select data from segments ${where.length ? 'where ' + where.join(' and ') : ''}`,
			params
		);
		return rows.map((r) => r.data);
	}

	async putPlaylist(p: Playlist) {
		await this.init();
		await this.q(
			`insert into playlists (day, data) values ($1, $2::jsonb) on conflict (day) do update set data = excluded.data`,
			[p.day, JSON.stringify(p)]
		);
	}

	async getPlaylist(day: string) {
		await this.init();
		const rows = await this.q<{ data: Playlist }>(`select data from playlists where day = $1`, [day]);
		return rows[0]?.data;
	}

	async getLatestPlaylist(day: string) {
		await this.init();
		const rows = await this.q<{ data: Playlist }>(`select data from playlists where day <= $1 order by day desc limit 1`, [day]);
		return rows[0]?.data;
	}

	async putTrials(trials: Trial[]) {
		await this.init();
		for (const c of chunks(unique(trials, (x) => x.nct), 2000)) {
			await this.q(
				`insert into trials (nct, sponsor, data)
				 select x->>'nct', coalesce(x->>'sponsor',''), x from jsonb_array_elements($1::jsonb) x
				 on conflict (nct) do update set data = excluded.data, sponsor = excluded.sponsor`,
				[JSON.stringify(c)]
			);
		}
	}

	async getTrials(q: { ncts?: string[]; sponsor?: string; due?: { from: string; to: string } } = {}) {
		await this.init();
		if (q.due) {
			const due = await this.q<{ data: Trial }>(
				`select data from trials where data->>'phase' like '%PHASE3%' and length(data->>'primaryCompletion') = 10
				 and data->>'primaryCompletion' between $1 and $2`,
				[q.due.from, q.due.to]
			);
			return due.map((r) => r.data);
		}
		const rows = q.ncts
			? await this.q<{ data: Trial }>(`select data from trials where nct = any($1)`, [q.ncts])
			: q.sponsor !== undefined
				? await this.q<{ data: Trial }>(`select data from trials where sponsor = $1`, [q.sponsor])
				: await this.allTrials();
		return rows.map((r) => r.data);
	}

	/** The whole table in pages by NCT id: one 50 MB HTTP response gets cut off. */
	private async allTrials() {
		const out: { data: Trial }[] = [];
		let after = '';
		for (;;) {
			const page = await this.q<{ nct: string; data: Trial }>(`select nct, data from trials where nct > $1 order by nct limit 5000`, [after]);
			out.push(...page);
			if (page.length < 5000) return out;
			after = page[page.length - 1].nct;
		}
	}

	async sponsorCounts(limit: number) {
		await this.init();
		const rows = await this.q<{ sponsor: string; n: string }>(
			`select sponsor, count(*)::text as n from trials
			 where sponsor <> '' and data->>'status' in ('RECRUITING','NOT_YET_RECRUITING','ACTIVE_NOT_RECRUITING','ENROLLING_BY_INVITATION')
			 group by sponsor order by count(*) desc limit $1`,
			[limit]
		);
		return rows.map((r) => ({ sponsor: r.sponsor, n: Number(r.n) }));
	}

	async countTrials() {
		await this.init();
		const rows = await this.q<{ n: string }>(`select count(*)::text as n from trials`);
		return Number(rows[0]?.n ?? 0);
	}

	async getBlocked() {
		await this.init();
		const rows = await this.q<{ id: string; reason: string; at: string }>(`select id, reason, at::text from blocked`);
		return rows as Blocked[];
	}

	async block(id: string, reason: string) {
		await this.init();
		await this.q(
			`insert into blocked (id, reason) values ($1, $2) on conflict (id) do update set reason = excluded.reason, at = now()`,
			[id, reason]
		);
	}

	async getKV<T>(key: string) {
		await this.init();
		const rows = await this.q<{ value: T }>(`select value from kv where key = $1`, [key]);
		return rows[0]?.value;
	}

	async setKV(key: string, value: unknown) {
		await this.init();
		await this.q(
			`insert into kv (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`,
			[key, JSON.stringify(value)]
		);
	}
}
