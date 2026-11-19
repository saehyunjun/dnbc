// Storage interface. The file store (`.data/`) is used when DATABASE_URL is unset; Neon otherwise.

import type { Playlist, Segment, SourceItem, Story } from '../types';

/** Slim ClinicalTrials.gov record, kept for diffing and the pipeline beat. */
export interface Trial {
	nct: string;
	title: string;
	sponsor: string;
	phase: string; // e.g. "PHASE2", "PHASE1|PHASE2", "NA"
	status: string;
	interventions: string[];
	conditions: string[];
	start?: string;
	primaryCompletion?: string;
	firstPosted?: string;
	lastUpdate?: string;
	resultsPosted?: string;
	enrollment?: number;
}

export interface Blocked {
	id: string;
	reason: string;
	at: string;
}

export interface Store {
	putItems(items: SourceItem[]): Promise<number>;
	getItems(q?: { since?: string; ids?: string[]; source?: string }): Promise<SourceItem[]>;
	putStories(stories: Story[]): Promise<void>;
	getStories(q?: { since?: string; ids?: string[] }): Promise<Story[]>;
	putSegments(segments: Segment[]): Promise<void>;
	getSegments(q?: { ids?: string[]; library?: boolean; since?: string }): Promise<Segment[]>;
	putPlaylist(p: Playlist): Promise<void>;
	getPlaylist(day: string): Promise<Playlist | undefined>;
	putTrials(trials: Trial[]): Promise<void>;
	getTrials(q?: { ncts?: string[]; sponsor?: string }): Promise<Trial[]>;
	countTrials(): Promise<number>;
	getBlocked(): Promise<Blocked[]>;
	block(id: string, reason: string): Promise<void>;
	getKV<T = unknown>(key: string): Promise<T | undefined>;
	setKV(key: string, value: unknown): Promise<void>;
	close?(): Promise<void>;
}

let cached: Store | undefined;

export async function openStore(): Promise<Store> {
	if (cached) return cached;
	if (process.env.DATABASE_URL && process.env.DNBC_STORE !== 'file') {
		const { NeonStore } = await import('./neon');
		cached = new NeonStore(process.env.DATABASE_URL);
	} else {
		const { FileStore } = await import('./file');
		cached = new FileStore(process.env.DNBC_DATA_DIR ?? '.data');
	}
	return cached;
}
