// Headless suite for the player. Usage: node scripts/check.mjs <out-dir> <port>
// Needs `npm run dev` running on <port> and the data in Neon (or a file store) for the channel day.

import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'out/check';
const port = process.argv[3] ?? '5321';
const BASE = `http://localhost:${port}`;
mkdirSync(out, { recursive: true });

let passed = 0;
let total = 0;
const failures = [];
function check(name, ok, detail = '') {
	total++;
	if (ok) passed++;
	else failures.push(`${name}${detail ? ` (${detail})` : ''}`);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`);
}

// Show colours, read from the grid so the check follows the data.
const gridSrc = readFileSync('src/lib/channel/grid.ts', 'utf8');
const SHOW_COLORS = {};
const SHOW_NAMES = {};
for (const m of gridSrc.matchAll(/id: '([a-z-]+)',\s*name: '([^']+)',(?:[^]*?)color: '(#[0-9a-f]{6})'/g)) {
	SHOW_NAMES[m[1]] = m[2];
	SHOW_COLORS[m[1]] = m[3];
}
const hexToRgb = (h) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;

// ---- data ----
const api = async (path) => {
	const res = await fetch(`${BASE}/api/channel/${path}`);
	return { res, json: res.headers.get('content-type')?.includes('json') ? await res.json() : undefined };
};
const pl = await api('playlist');
const sg = await api('segments');
const bl = await api('blocked');
const tm = await api('time');
const playlists = pl.json.playlists;
const segs = new Map(sg.json.segments.map((s) => [s.id, s]));

check('API playlist: 200 and JSON', pl.res.status === 200 && Array.isArray(playlists));
check('API playlist: Cache-Control has s-maxage=60', /s-maxage=60/.test(pl.res.headers.get('cache-control') ?? ''), pl.res.headers.get('cache-control'));
check('API playlist: stale-while-revalidate', /stale-while-revalidate/.test(pl.res.headers.get('cache-control') ?? ''));
check('API playlist: Date header', !!pl.res.headers.get('date'));
check('API playlist: at least one day with 48 slots', playlists.some((p) => p.slots.length === 48), playlists.map((p) => p.slots.length).join(','));
check('API segments: 200 with segments', sg.res.status === 200 && segs.size > 50, String(segs.size));
check('API segments: cache header and Date', /s-maxage=60/.test(sg.res.headers.get('cache-control') ?? '') && !!sg.res.headers.get('date'));
const someIds = [...segs.keys()].slice(0, 2);
const byIds = await api(`segments?ids=${someIds.join(',')}`);
check('API segments?ids returns only those ids', byIds.json.segments.length === 2 && byIds.json.segments.every((s) => someIds.includes(s.id)));
check('API blocked: array and cache header', Array.isArray(bl.json.blocked) && /s-maxage=60/.test(bl.res.headers.get('cache-control') ?? ''));
check('API time: no-store and Date header', /no-store/.test(tm.res.headers.get('cache-control') ?? '') && !!tm.res.headers.get('date'));
check('API unknown name: 404', (await fetch(`${BASE}/api/channel/nope`)).status === 404);
check('API playlist: day param is honoured', (await api('playlist?day=2026-11-19')).json.playlists[0]?.day === '2026-11-19');

// ---- pick times from the data ----
const entries = []; // { slot, entry, seg, start, beats: [{ start, dur, beat }] }
for (const p of playlists)
	for (const slot of p.slots)
		for (const entry of slot.entries) {
			if (entry.kind !== 'segment') continue;
			const seg = segs.get(entry.segmentId);
			if (!seg) continue;
			let t = entry.start;
			const beats = seg.beats.map((beat) => {
				const dur = (beat.duration ?? 5) * 1000;
				const b = { start: t, dur, beat };
				t += dur;
				return b;
			});
			entries.push({ slot, entry, seg, beats });
		}
const live = entries.filter((e) => !e.seg.library && e.slot.show !== 'reruns');
const sample = (live.length ? live : entries).find((e) => e.entry.duration >= 25_000 && e.beats.length >= 3);
const T = sample.entry.start + 1000;
console.log(`Using segment ${sample.seg.id} (${sample.slot.show}) at ${new Date(T).toISOString()}`);

// ---- browser ----
let browser;
try {
	browser = await chromium.launch({ channel: 'chrome' });
} catch {
	browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
}
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const errors = [];
const newPage = async (size, opts = {}) => {
	const ctx = await browser.newContext({ viewport: SIZES[size], deviceScaleFactor: 1, ...opts });
	const page = await ctx.newPage();
	page.on('pageerror', (e) => errors.push(`${size}: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|Failed to load resource/.test(m.text() + (m.location()?.url ?? ''))) errors.push(`${size}: ${m.text()}`);
	});
	return { page, ctx };
};
const ready = async (page) => {
	await page.waitForSelector('[data-player][data-loaded="true"]', { timeout: 20_000 });
	await page.waitForFunction(() => document.querySelector('[data-player]').dataset.beatType !== undefined);
	await page.waitForTimeout(500);
};
const readPlayer = (page) =>
	page.evaluate(() => {
		const d = document.querySelector('[data-player]').dataset;
		return { ...d };
	});
const overflow = (page) =>
	page.evaluate(() => {
		const bad = [];
		for (const body of document.querySelectorAll('[data-beat-body]')) {
			const r = body.getBoundingClientRect();
			if (body.scrollWidth > body.clientWidth + 1) bad.push('scrollWidth');
			if (body.scrollHeight > body.clientHeight + 1) bad.push('scrollHeight');
			for (const el of body.querySelectorAll('*')) {
				const c = el.getBoundingClientRect();
				if (c.width === 0 && c.height === 0) continue;
				if (c.right > r.right + 1.5 || c.bottom > r.bottom + 1.5 || c.left < r.left - 1.5 || c.top < r.top - 1.5) {
					bad.push(`child ${el.tagName}.${el.className} out of box`);
					break;
				}
			}
		}
		return bad;
	});
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// ---- player at a fixed time, both sizes ----
for (const size of ['desktop', 'phone']) {
	const { page, ctx } = await newPage(size);
	await page.goto(`${BASE}/?t=${T}`);
	await ready(page);
	const d = await readPlayer(page);
	check(`player ${size}: loads on the expected segment`, d.segment === sample.seg.id, `${d.segment} vs ${sample.seg.id}`);
	check(`player ${size}: show id matches the slot`, d.show === sample.slot.show);
	check(`player ${size}: ?t sets the clock`, Math.abs(Number(d.clock) - T) < 6000, `${Number(d.clock) - T} ms`);
	check(`player ${size}: default refresh is 60 s`, d.refreshMs === '60000');
	check(`player ${size}: DNBC bug`, (await page.locator('.bug').first().innerText()) === 'DNBC');
	const clk = await page.locator('[data-show-clock]').innerText();
	check(`player ${size}: show clock reads "Show, h:mm ET"`, /^.+, \d{1,2}:\d{2} ET$/.test(clk) && clk.startsWith(SHOW_NAMES[sample.slot.show]), clk);
	check(`player ${size}: ticker has items`, (await page.locator('[data-ticker] .item').count()) >= 4);
	check(`player ${size}: ticker scrolls`, (await page.locator('[data-ticker] .track').evaluate((el) => getComputedStyle(el).animationName)) !== 'none');
	check(`player ${size}: up next shows 3 entries`, (await page.locator('[data-up-next-item]').count()) === 3);
	const color = await page.locator('[data-show-name]').evaluate((el) => getComputedStyle(el).backgroundColor);
	check(`player ${size}: lower third uses the show colour`, color === hexToRgb(SHOW_COLORS[sample.slot.show]), `${color} vs ${SHOW_COLORS[sample.slot.show]}`);
	check(`player ${size}: lower third shows the segment title`, (await page.locator('[data-segment-title]').innerText()) === sample.seg.title);
	check(`player ${size}: no text overflow`, (await overflow(page)).length === 0, (await overflow(page)).join(','));
	check(`player ${size}: no horizontal scroll`, await noHScroll(page));
	check(`player ${size}: no images in the stage`, (await page.locator('[data-stage] img').count()) === 0);
	const geo = await page.evaluate(() => {
		const s = document.querySelector('[data-stage]').getBoundingClientRect();
		const t = document.querySelector('[data-ticker]').getBoundingClientRect();
		const p = document.querySelector('[data-player]').getBoundingClientRect();
		return { sw: s.width, sh: s.height, sb: s.bottom, tt: t.top, pl: p.left, vh: window.innerHeight, bottom: document.querySelector('[data-up-next]').getBoundingClientRect().bottom };
	});
	check(`player ${size}: ticker sits under the stage`, Math.abs(geo.tt - geo.sb) < 2, `${geo.tt} vs ${geo.sb}`);
	if (size === 'desktop') {
		check('player desktop: stage is 16:9', Math.abs(geo.sw / geo.sh - 16 / 9) < 0.03, (geo.sw / geo.sh).toFixed(3));
		check('player desktop: stage, ticker, and up next fit in the window', geo.bottom <= geo.vh, `${geo.bottom} vs ${geo.vh}`);
	} else {
		check('player phone: 16 px gutter', Math.abs(geo.pl - 16) < 1, String(geo.pl));
		check('player phone: stage fills the width inside the gutter', Math.abs(geo.sw - 358) < 2, String(geo.sw));
	}
	await page.screenshot({ path: join(out, `player-${size}.png`) });
	if (size === 'desktop') {
		const avg = await page.evaluate(
			() =>
				new Promise((resolve) => {
					const ts = [];
					const loop = (t) => {
						ts.push(t);
						if (ts[ts.length - 1] - ts[0] < 2000) requestAnimationFrame(loop);
						else resolve((ts[ts.length - 1] - ts[0]) / (ts.length - 1));
					};
					requestAnimationFrame(loop);
				})
		);
		check('player desktop: average frame interval under 50 ms', avg < 50, `${avg.toFixed(1)} ms`);
	}
	await ctx.close();
}

// ---- every beat type from the real data, at both sizes ----
const wanted = new Map(); // type -> longest sample
for (const e of entries)
	for (const b of e.beats) {
		if (b.dur < 3500) continue;
		const cur = wanted.get(b.beat.type);
		if (!cur || JSON.stringify(b.beat).length > JSON.stringify(cur.b.beat).length) wanted.set(b.beat.type, { e, b });
	}
check('data has at least 8 beat types on air', wanted.size >= 8, [...wanted.keys()].join(','));
for (const size of ['desktop', 'phone']) {
	const { page, ctx } = await newPage(size);
	for (const [type, { e, b }] of wanted) {
		await page.goto(`${BASE}/?t=${b.start + 300}`);
		await ready(page);
		const d = await readPlayer(page);
		check(`beat ${type} ${size}: draws on air`, d.beatType === type && d.segment === e.seg.id, `${d.beatType}/${d.segment}`);
		const bad = await overflow(page);
		check(`beat ${type} ${size}: no overflow`, bad.length === 0, bad.join(','));
		await page.screenshot({ path: join(out, `beat-${type}-${size}.png`) });
	}
	await ctx.close();
}

// ---- anchor typing and reduced motion ----
{
	const a = [...wanted.values()].find((w) => w.b.beat.type === 'anchor');
	const full = a.b.beat.text;
	const { page, ctx } = await newPage('desktop');
	await page.goto(`${BASE}/?t=${a.b.start + 100}`);
	await ready(page);
	const early = (await page.locator('[data-caption]').innerText()).length;
	check('anchor: caption is partly typed early in the beat', early < full.length, `${early} of ${full.length}`);
	await page.goto(`${BASE}/?t=${a.b.start + a.b.dur * 0.7}`);
	await ready(page);
	check('anchor: caption is complete by 70% of the beat', (await page.locator('[data-caption]').innerText()) === full);
	await ctx.close();
	const r = await newPage('desktop', { reducedMotion: 'reduce' });
	await r.page.goto(`${BASE}/?t=${a.b.start + 100}`);
	await ready(r.page);
	check('reduced motion: caption is instant', (await r.page.locator('[data-caption]').innerText()) === full);
	check('reduced motion: ticker does not scroll', (await r.page.locator('[data-ticker] .track').count()) === 0 && (await r.page.locator('[data-ticker] .still-text').count()) === 1);
	await r.ctx.close();
}

// ---- two devices, one off by 90 s, land on the same beat ----
{
	const long = entries.find((e) => !e.seg.library && e.beats.some((b) => b.dur >= 8000)) ?? entries.find((e) => e.beats.some((b) => b.dur >= 8000));
	const lb = long.beats.find((b) => b.dur >= 8000);
	const serverT0 = lb.start + 800;
	const realT0 = Date.now();
	const A = await newPage('desktop');
	const B = await newPage('desktop');
	await B.page.addInitScript(() => {
		const RealDate = Date;
		const skew = 90_000;
		class SkewDate extends RealDate {
			constructor(...args) {
				if (args.length === 0) super(RealDate.now() + skew);
				else super(...args);
			}
			static now() {
				return RealDate.now() + skew;
			}
		}
		window.Date = SkewDate;
	});
	for (const { page } of [A, B]) {
		// The server says it is serverT0 now (and counts on from there). The Date header is what the player trusts.
		await page.route('**/api/channel/time', (route) =>
			route.fulfill({
				status: 200,
				headers: { 'content-type': 'application/json', 'cache-control': 'no-store', date: new Date(serverT0 + (Date.now() - realT0)).toUTCString() },
				body: '{"now":0}'
			})
		);
	}
	await A.page.goto(BASE);
	await B.page.goto(BASE);
	await ready(A.page);
	await ready(B.page);
	const [da, db, rawA, rawB] = [
		await readPlayer(A.page),
		await readPlayer(B.page),
		await A.page.evaluate(() => Date.now()),
		await B.page.evaluate(() => Date.now())
	];
	check('clock skew: device B really is about 90 s off', Math.abs(rawB - rawA - 90_000) < 3000, String(rawB - rawA));
	check('clock skew: corrected clocks agree within 3 s', Math.abs(Number(da.clock) - Number(db.clock)) < 3000, String(Number(da.clock) - Number(db.clock)));
	check('clock skew: both land on the same segment', da.segment === db.segment && da.segment === long.seg.id, `${da.segment} ${db.segment}`);
	check('clock skew: both land on the same beat', da.beatIndex === db.beatIndex, `${da.beatIndex} ${db.beatIndex}`);
	check('clock skew: corrected clock follows the server, not the device', Math.abs(Number(db.clock) - serverT0) < 6000, String(Number(db.clock) - serverT0));
	await A.ctx.close();
	await B.ctx.close();
}

// ---- kill switch: a blocked segment is skipped ----
{
	const { page, ctx } = await newPage('desktop');
	let blockedIds = [];
	await page.route('**/api/channel/blocked', (route) =>
		route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ blocked: blockedIds }) })
	);
	await page.goto(`${BASE}/?t=${sample.entry.start + 500}&refresh=1500`);
	await ready(page);
	check('kill switch: segment is on air before the block', (await readPlayer(page)).segment === sample.seg.id);
	blockedIds = [sample.seg.id];
	await page.waitForFunction(() => document.querySelector('[data-player]').dataset.kind === 'pad', null, { timeout: 8000 }).catch(() => {});
	const d = await readPlayer(page);
	check('kill switch: blocked segment is replaced by a bumper', d.kind === 'pad' && d.segment === '', d.kind);
	const idx = sample.slot.entries.indexOf(sample.entry);
	const nextEntry = sample.slot.entries.slice(idx + 1).find((e) => e.kind === 'segment');
	const nextTitle = nextEntry ? segs.get(nextEntry.segmentId)?.title : undefined;
	const padText = await page.locator('[data-beat="pad"]').innerText();
	check('kill switch: bumper says "Up next" with the next title', /Up next/i.test(padText) && (!nextTitle || padText.includes(nextTitle)), padText.replace(/\n/g, ' | '));
	check('kill switch: bumper names the show', padText.toLowerCase().includes(SHOW_NAMES[sample.slot.show].toLowerCase()));
	check('kill switch: blocked title is not in the up-next strip', !(await page.locator('[data-up-next]').innerText()).includes(sample.seg.title));
	await page.waitForTimeout(500);
	await page.screenshot({ path: join(out, 'player-blocked.png') });
	blockedIds = [sample.seg.storyId ?? 'none'];
	if (sample.seg.storyId) {
		await page.waitForTimeout(2500);
		check('kill switch: blocking the story id also skips the segment', (await readPlayer(page)).kind === 'pad');
	}
	blockedIds = [];
	await page.waitForFunction(() => document.querySelector('[data-player]').dataset.kind === 'segment', null, { timeout: 8000 }).catch(() => {});
	check('kill switch: unblocking returns the segment', (await readPlayer(page)).segment === sample.seg.id);
	await ctx.close();
}

// ---- opinion label ----
{
	const op = entries.find((e) => e.seg.forwardLooking || e.slot.show === 'mad-science');
	const { page, ctx } = await newPage('desktop');
	if (op) {
		await page.goto(`${BASE}/?t=${op.entry.start + 500}`);
		await ready(page);
		check('opinion segment shows an Opinion label', (await page.locator('[data-opinion]').count()) === 1);
		await page.screenshot({ path: join(out, 'player-opinion.png') });
	} else console.log('skip opinion check: no opinion segment in the data');
	await page.goto(`${BASE}/?t=${T}`);
	await ready(page);
	check('a news segment has no Opinion label', (await page.locator('[data-opinion]').count()) === 0);
	await ctx.close();
}

// ---- schedule ----
for (const size of ['desktop', 'phone']) {
	const { page, ctx } = await newPage(size);
	await page.goto(`${BASE}/schedule?t=${T}`);
	await page.waitForSelector('[data-day]', { timeout: 20_000 });
	await page.waitForTimeout(400);
	const info = await page.evaluate(() => ({
		days: [...document.querySelectorAll('[data-day]')].map((d) => ({ day: d.dataset.day, rows: d.querySelectorAll('li').length })),
		now: [...document.querySelectorAll('[aria-current="true"]')].map((e) => e.textContent),
		shows: [...new Set([...document.querySelectorAll('li[data-show]')].map((e) => e.dataset.show))],
		text: document.body.innerText
	}));
	check(`schedule ${size}: today and tomorrow are listed`, info.days.length === 2, JSON.stringify(info.days));
	check(`schedule ${size}: each day lists its shows`, info.days.every((d) => d.rows >= 10), JSON.stringify(info.days));
	check(`schedule ${size}: exactly one show is marked on air`, info.now.length === 1);
	check(`schedule ${size}: the marked show is the one on air`, info.now[0]?.includes(SHOW_NAMES[sample.slot.show]) && info.now[0]?.includes('On air'), info.now[0]);
	const slotShows = new Set(playlists.flatMap((p) => p.slots.map((s) => s.show)));
	check(`schedule ${size}: every scheduled show appears`, [...slotShows].every((s) => info.shows.includes(s)));
	check(`schedule ${size}: times are in ET with AM or PM`, /\d{1,2}:\d{2} (AM|PM) to \d{1,2}:\d{2} (AM|PM)/.test(info.text) && /Eastern Time/.test(info.text));
	check(`schedule ${size}: no horizontal scroll`, await noHScroll(page));
	await page.screenshot({ path: join(out, `schedule-${size}.png`), fullPage: size === 'phone' });
	await ctx.close();
}

// ---- study pages ----
const TYPES = ['headline', 'anchor', 'quote', 'panel', 'pipeline', 'timeline', 'stat', 'list', 'quiz', 'bumper'];
for (const size of ['desktop', 'phone']) {
	const { page, ctx } = await newPage(size);
	for (const type of TYPES) {
		const res = await page.goto(`${BASE}/study/${type}`);
		await page.waitForSelector(`[data-study="${type}"] [data-beat-body]`);
		await page.waitForTimeout(700);
		const n = await page.locator(`[data-study="${type}"] [data-beat-body]`).count();
		const bad = await overflow(page);
		check(`study ${type} ${size}: renders ${n} samples with no overflow`, res.status() === 200 && n >= 1 && bad.length === 0, bad.join(','));
		await page.screenshot({ path: join(out, `study-${type}-${size}.png`), fullPage: true });
	}
	await page.goto(`${BASE}/study/all`);
	await page.waitForSelector('[data-study="bumper"]');
	await page.waitForTimeout(700);
	check(`study all ${size}: every type present`, (await page.locator('[data-study]').count()) === 10);
	check(`study all ${size}: no horizontal scroll`, await noHScroll(page));
	check(`study all ${size}: no overflow`, (await overflow(page)).length === 0);
	if (size === 'desktop') {
		check('study: noindex', (await page.locator('meta[name="robots"]').getAttribute('content')) === 'noindex');
		const by = async (label) => page.locator(`[data-study="quote"] [data-sample="${label}"] [data-by]`);
		const press = await (await by('Press release')).innerText();
		check('quote press: name, role, publisher, date, link', /Daniel P\. Gale/.test(press) && /University College London/.test(press) && /PR Newswire/.test(press) && /18 Nov 2026/.test(press) && /prnewswire\.com/.test(press), press);
		const bsky = await (await by('Bluesky')).innerText();
		check('quote Bluesky: handle, date, link, no name or role', /@trialwatcher/.test(bsky) && /18 Nov 2026/.test(bsky) && /bsky\.app/.test(bsky) && !/Daniel|Chief|Lead/.test(bsky), bsky);
		const reddit = await (await by('Reddit')).innerText();
		check('quote Reddit: community and date only', /r\/MultipleSclerosis/.test(reddit) && /17 Nov 2026/.test(reddit) && !/@|http|\.com/.test(reddit), reddit);
		check('quote Reddit: no link element', (await page.locator('[data-study="quote"] [data-sample="Reddit"] a').count()) === 0);
		check('quote Bluesky: link opens safely', (await page.locator('[data-study="quote"] [data-sample="Bluesky"] a').getAttribute('rel')) === 'noopener noreferrer');
		check('quote text is shown in full, verbatim', (await page.locator('[data-sample="Reddit"] blockquote').innerText()).includes('Three months in, the fatigue is better and I can walk to the shop again.'));
		check('cast plates carry the AI character tag', (await page.locator('[data-study="panel"] .plate .tag').allInnerTexts()).every((t) => t === 'AI character') && (await page.locator('[data-study="panel"] .plate').count()) >= 4);
		check('quiz: answer is revealed late in the beat', (await page.locator('[data-beat="quiz"]').getAttribute('data-revealed')) === 'true');
		check('list: all five items shown', (await page.locator('[data-study="list"] li').count()) === 5);
		check('pipeline: one bar per phase and the highlighted phase marked', (await page.locator('[data-study="pipeline"] .row').count()) === 6 && (await page.locator('[data-study="pipeline"] .row.hit').count()) === 1);
		check('study: unknown template is a 404', (await page.goto(`${BASE}/study/nope`)).status() === 404);
	}
	await ctx.close();
}

// ---- home page timing and errors ----
{
	const live = await newPage('phone');
	await live.page.goto(BASE);
	await ready(live.page);
	const ld = await readPlayer(live.page);
	check('player without ?t: draws a segment or a bumper from the real clock', ld.kind === 'segment' || ld.kind === 'pad', ld.kind);
	check('player without ?t: clock is the real time', Math.abs(Number(ld.clock) - Date.now()) < 5000);
	await live.ctx.close();
	const { page, ctx } = await newPage('desktop');
	const t0 = Date.now();
	await page.goto(`${BASE}/?t=${T}`);
	await page.waitForSelector('[data-player][data-loaded="true"]');
	check('player loads and shows a segment in under 4 s (dev server)', Date.now() - t0 < 4000, `${Date.now() - t0} ms`);
	await ctx.close();
}
check('no page errors or console errors across the run', errors.length === 0, errors.slice(0, 3).join(' || '));

await browser.close();
console.log(`\n${passed} of ${total} passed`);
if (failures.length) console.log('Failed:\n- ' + failures.join('\n- '));
process.exit(failures.length ? 1 : 0);
