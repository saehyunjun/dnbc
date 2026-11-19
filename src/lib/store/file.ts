// File store: one JSON file per collection under a data folder. For local work and tests.

import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { Playlist, Segment, SourceItem, Story } from '../types';
import type { Blocked, Store, Trial } from './index';

type Coll = 'items' | 'stories' | 'segments' | 'playlists' | 'trials' | 'blocked' | 'kv';

export class FileStore implements Store {
	private mem = new Map<Coll, Map<string, unknown>>();
	constructor(private dir: string) {
		mkdirSync(dir, { recursive: true });
	}

	private load<T>(c: Coll): Map<string, T> {
		let m = this.mem.get(c) as Map<string, T> | undefined;
		if (m) return m;
		const f = join(this.dir, `${c}.json`);
		m = new Map<string, T>(existsSync(f) ? Object.entries(JSON.parse(readFileSync(f, 'utf8'))) : []);
		this.mem.set(c, m as Map<string, unknown>);
		return m;
	}

	private save(c: Coll) {
		const m = this.load(c);
		const f = join(this.dir, `${c}.json`);
		writeFileSync(f + '.tmp', JSON.stringify(Object.fromEntries(m)));
		renameSync(f + '.tmp', f);
	}

	async putItems(items: SourceItem[]) {
		const m = this.load<SourceItem>('items');
		let added = 0;
		for (const i of items) {
			if (!m.has(i.id)) added++;
			m.set(i.id, i);
		}
		this.save('items');
		return added;
	}
	async getItems(q: { since?: string; ids?: string[]; source?: string } = {}) {
		const m = this.load<SourceItem>('items');
		const list = q.ids ? q.ids.map((id) => m.get(id)).filter((x): x is SourceItem => !!x) : [...m.values()];
		return list.filter((i) => (!q.since || i.fetchedAt >= q.since) && (!q.source || i.source === q.source));
	}
	async putStories(stories: Story[]) {
		const m = this.load<Story>('stories');
		for (const s of stories) m.set(s.id, s);
		this.save('stories');
	}
	async getStories(q: { since?: string; ids?: string[] } = {}) {
		const m = this.load<Story>('stories');
		const list = q.ids ? q.ids.map((id) => m.get(id)).filter((x): x is Story => !!x) : [...m.values()];
		return list.filter((s) => !q.since || s.updatedAt >= q.since);
	}
	async putSegments(segments: Segment[]) {
		const m = this.load<Segment>('segments');
		for (const s of segments) m.set(s.id, s);
		this.save('segments');
	}
	async getSegments(q: { ids?: string[]; library?: boolean; since?: string } = {}) {
		const m = this.load<Segment>('segments');
		const list = q.ids ? q.ids.map((id) => m.get(id)).filter((x): x is Segment => !!x) : [...m.values()];
		return list.filter(
			(s) => (q.library === undefined || s.library === q.library) && (!q.since || s.createdAt >= q.since)
		);
	}
	async putPlaylist(p: Playlist) {
		this.load<Playlist>('playlists').set(p.day, p);
		this.save('playlists');
	}
	async getPlaylist(day: string) {
		return this.load<Playlist>('playlists').get(day);
	}
	async putTrials(trials: Trial[]) {
		const m = this.load<Trial>('trials');
		for (const t of trials) m.set(t.nct, t);
		this.save('trials');
	}
	async getTrials(q: { ncts?: string[]; sponsor?: string } = {}) {
		const m = this.load<Trial>('trials');
		if (q.ncts) return q.ncts.map((n) => m.get(n)).filter((x): x is Trial => !!x);
		const all = [...m.values()];
		return q.sponsor ? all.filter((t) => t.sponsor === q.sponsor) : all;
	}
	async countTrials() {
		return this.load<Trial>('trials').size;
	}
	async getBlocked() {
		return [...this.load<Blocked>('blocked').values()];
	}
	async block(id: string, reason: string) {
		this.load<Blocked>('blocked').set(id, { id, reason, at: new Date().toISOString() });
		this.save('blocked');
	}
	async getKV<T>(key: string) {
		return this.load<T>('kv').get(key);
	}
	async setKV(key: string, value: unknown) {
		this.load<unknown>('kv').set(key, value);
		this.save('kv');
	}
}
