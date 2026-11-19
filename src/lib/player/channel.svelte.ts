// The player's state: server clock, playlists, segments, blocked ids, and what is on air.

import { clockOffset, onAir } from '../channel/clock';
import { channelDay } from '../channel/time';
import type { Playlist, Segment, Slot } from '../types';

export const REFRESH_MS = 60_000;

export interface ChannelOptions {
	segments?: boolean;
	/** Test hook: refetch interval in ms. Default 60 s. */
	refreshMs?: number;
	/** Test hook: act as if this epoch ms (UTC) is now, then advance normally. */
	override?: number;
}

function median(xs: number[]): number {
	const s = [...xs].sort((a, b) => a - b);
	return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export class Channel {
	playlists = $state.raw<Playlist[]>([]);
	segments = $state.raw<Map<string, Segment>>(new Map());
	blocked = $state.raw<Set<string>>(new Set());
	loaded = $state(false);
	offline = $state(false);
	/** Corrected "now", epoch ms. */
	now = $state(0);

	// What is on air. Primitives change only at an edge, so views re-render once per beat.
	slot = $state.raw<Slot | undefined>(undefined);
	entryIndex = $state(-1);
	/** True when the entry is padding, or its segment is blocked or missing. */
	padded = $state(true);
	beatIndex = $state(0);
	elapsed = $state(0);
	remaining = $state(0);

	#opts: ChannelOptions;
	#offsets: number[] = [];
	#overrideBase: number | undefined;
	#timer: ReturnType<typeof setInterval> | undefined;
	#frame = 0;
	#stopped = false;

	constructor(opts: ChannelOptions = {}) {
		this.#opts = opts;
		if (opts.override !== undefined) this.#overrideBase = opts.override - Date.now();
	}

	get refreshMs() {
		return this.#opts.refreshMs ?? REFRESH_MS;
	}

	get offset(): number {
		if (this.#overrideBase !== undefined) return this.#overrideBase;
		return median(this.#offsets);
	}

	/** Read the server clock once. The median of the last five reads is the offset. */
	async #sync() {
		if (this.#overrideBase !== undefined) return;
		const sent = Date.now();
		try {
			const res = await fetch('/api/channel/time', { cache: 'no-store' });
			const received = Date.now();
			this.#offsets.push(clockOffset(res.headers.get('Date'), sent, received));
			if (this.#offsets.length > 5) this.#offsets.shift();
		} catch {
			/* keep the last offset */
		}
	}

	async #json<T>(path: string): Promise<T | undefined> {
		try {
			const res = await fetch(path);
			if (!res.ok) throw new Error(String(res.status));
			this.offline = false;
			return (await res.json()) as T;
		} catch {
			this.offline = true;
			return undefined;
		}
	}

	/** The channel day by the corrected clock, so a wrong device clock or a test override asks for the right day. */
	get #day() {
		return channelDay(Date.now() + this.offset);
	}

	async #loadPlaylistAndBlocked() {
		const [pl, bl] = await Promise.all([
			this.#json<{ playlists: Playlist[] }>(`/api/channel/playlist?day=${this.#day}`),
			this.#json<{ blocked: string[] }>('/api/channel/blocked')
		]);
		if (pl) this.playlists = pl.playlists;
		if (bl) this.blocked = new Set(bl.blocked);
	}

	async #loadSegments() {
		if (this.#opts.segments === false) return;
		const missing = this.playlists.some((p) =>
			p.slots.some((s) => s.entries.some((e) => e.kind === 'segment' && !this.segments.has(e.segmentId)))
		);
		if (!missing) return;
		const res = await this.#json<{ segments: Segment[] }>(`/api/channel/segments?day=${this.#day}`);
		if (!res) return;
		const next = new Map(this.segments);
		for (const s of res.segments) next.set(s.id, s);
		this.segments = next;
	}

	async #refresh() {
		await Promise.all([this.#sync(), this.#loadPlaylistAndBlocked()]);
		await this.#loadSegments();
	}

	async start() {
		this.#stopped = false;
		await Promise.all([this.#sync(), this.#sync(), this.#sync()]);
		await this.#loadPlaylistAndBlocked();
		await this.#loadSegments();
		this.loaded = true;
		this.#timer = setInterval(() => void this.#refresh(), this.refreshMs);
		const loop = () => {
			if (this.#stopped) return;
			this.tick();
			this.#frame = requestAnimationFrame(loop);
		};
		loop();
		// A hidden tab stops animation frames. Catch up when it comes back.
		document.addEventListener('visibilitychange', this.#onVisible);
	}

	#onVisible = () => {
		if (!document.hidden) void this.#refresh();
	};

	stop() {
		this.#stopped = true;
		clearInterval(this.#timer);
		cancelAnimationFrame(this.#frame);
		document.removeEventListener('visibilitychange', this.#onVisible);
	}

	tick() {
		const now = Date.now() + this.offset;
		this.now = now;
		const a = onAir(this.playlists, this.segments, now, this.blocked);
		if (!a) {
			if (this.slot) this.slot = undefined;
			this.entryIndex = -1;
			this.padded = true;
			this.beatIndex = 0;
			this.elapsed = 0;
			this.remaining = 0;
			return;
		}
		if (this.slot !== a.slot) this.slot = a.slot;
		this.entryIndex = a.entryIndex;
		this.padded = a.entry.kind === 'pad';
		this.beatIndex = a.beatIndex;
		this.elapsed = a.beatElapsed;
		this.remaining = a.beatRemaining;
	}

	/** The segment on air, or undefined for padding. */
	get segment(): Segment | undefined {
		if (this.padded || !this.slot) return undefined;
		const e = this.slot.entries[this.entryIndex];
		return e?.kind === 'segment' ? this.segments.get(e.segmentId) : undefined;
	}

	/** The next segment entries after the one on air, across slots. */
	upNext(n: number): { segment: Segment; slot: Slot; start: number }[] {
		const out: { segment: Segment; slot: Slot; start: number }[] = [];
		let started = !this.slot;
		for (const p of this.playlists) {
			for (const slot of p.slots) {
				if (!started) {
					if (slot !== this.slot) continue;
					started = true;
				}
				const from = slot === this.slot ? this.entryIndex + 1 : 0;
				for (let i = from; i < slot.entries.length; i++) {
					const e = slot.entries[i];
					if (e.kind !== 'segment') continue;
					const segment = this.segments.get(e.segmentId);
					if (!segment || this.blocked.has(segment.id)) continue;
					out.push({ segment, slot, start: e.start });
					if (out.length >= n) return out;
				}
			}
		}
		return out;
	}

	/** Titles for the ticker: the current slot and the next three. */
	tickerItems(max = 24): { show: Slot['show']; title: string }[] {
		const out: { show: Slot['show']; title: string }[] = [];
		const seen = new Set<string>();
		let started = !this.slot;
		let slots = 0;
		for (const p of this.playlists) {
			for (const slot of p.slots) {
				if (!started) {
					if (slot !== this.slot) continue;
					started = true;
				}
				if (slots++ >= 4) return out;
				for (const e of slot.entries) {
					if (e.kind !== 'segment') continue;
					const seg = this.segments.get(e.segmentId);
					if (!seg || this.blocked.has(seg.id) || seen.has(seg.title)) continue;
					seen.add(seg.title);
					out.push({ show: slot.show, title: seg.title });
					if (out.length >= max) return out;
				}
			}
		}
		return out;
	}
}
