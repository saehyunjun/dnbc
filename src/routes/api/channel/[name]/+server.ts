// One cached function serves the player: playlist, segments, blocked. Plus `time`, an uncached clock read.

import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { openStore } from '../../../../lib/store/index';
import { addDays, channelDay } from '../../../../lib/channel/time';
import type { Playlist } from '../../../../lib/types';
import type { RequestHandler } from './$types';

export const prerender = false;

const CACHE = 'public, s-maxage=60, stale-while-revalidate=30';

async function store() {
	// Vercel sets process.env itself. In dev, SvelteKit reads .env.local into `env` only.
	for (const k of ['DATABASE_URL', 'DNBC_STORE', 'DNBC_DATA_DIR']) {
		if (env[k] && !process.env[k]) process.env[k] = env[k];
	}
	return openStore();
}

async function playlistsFor(day: string): Promise<Playlist[]> {
	const s = await store();
	const found = await Promise.all([s.getPlaylist(day), s.getPlaylist(addDays(day, 1))]);
	return found.filter((p): p is Playlist => !!p);
}

function dayParam(url: URL): string {
	const asked = url.searchParams.get('day');
	return asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : channelDay(Date.now());
}

export const GET: RequestHandler = async ({ params, url }) => {
	const date = new Date().toUTCString();
	const headers = { 'Cache-Control': CACHE, Date: date };
	switch (params.name) {
		case 'time':
			return json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store', Date: date } });
		case 'playlist': {
			return json({ playlists: await playlistsFor(dayParam(url)) }, { headers });
		}
		case 'segments': {
			const s = await store();
			const ids = url.searchParams.get('ids');
			let wanted: string[];
			if (ids) {
				wanted = ids.split(',').filter(Boolean).slice(0, 2000);
			} else {
				const day = dayParam(url);
				const names = new Set<string>();
				for (const p of await playlistsFor(day))
					for (const slot of p.slots)
						for (const e of slot.entries) if (e.kind === 'segment') names.add(e.segmentId);
				wanted = [...names];
			}
			const segments = wanted.length ? await s.getSegments({ ids: wanted }) : [];
			return json({ segments }, { headers });
		}
		case 'blocked': {
			const s = await store();
			return json({ blocked: (await s.getBlocked()).map((b) => b.id) }, { headers });
		}
		default:
			error(404, 'Unknown endpoint');
	}
};
