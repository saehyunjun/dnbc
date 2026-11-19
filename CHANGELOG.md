# Changelog

## 2026-11-19, Phase 3: the player

- Player at `/` (`src/routes/+page.svelte`, state in `src/lib/player/channel.svelte.ts`): clock offset from the server `Date` header (median of the last five reads of `/api/channel/time`), `onAir()` on every animation frame, playlist and blocked refetched every 60 s. A blocked or missing segment airs as a bumper with the show name, "Up next", and the next title.
- Permanent parts: DNBC bug, show clock ("Morning Dose, 7:42 ET"), live ticker (stills under reduced motion), and an "Up next" strip of three. Show colour on the lower third. Opinion label on forward-looking and Mad Science segments. Cast shown as name plates with an "AI character" tag.
- One component per beat in `src/lib/components/beats/`, dispatched by `BeatView.svelte`. Text shrinks to fit (`src/lib/player/fit.ts`). Quote attribution follows the PLAN table (Reddit shows community and date only, Bluesky shows handle, date, and link).
- `/schedule` (today and tomorrow, ET, current show marked), `/study/<beat type>` and `/study/all` (fixed samples, `noindex`).
- API `src/routes/api/channel/[name]/+server.ts`: `playlist`, `segments`, `blocked` with `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`, and `time` with `no-store`. All take `day` where it applies.
- Kill switch: `npm run block -- <id> "<reason>"` (`scripts/block.ts`).
- Test hooks: `?t=<epoch ms>` sets the clock, `?refresh=<ms>` sets the refetch interval.
- Headless suite `scripts/check.mjs`: 154 of 154. `npm run check` 0 errors, 0 warnings. `npm test` 90 of 90.
- Screenshots: `docs/screenshots/phase-3/` (player, every beat type, blocked, opinion, schedule, study pages; 1440 x 900 and 390 x 844).

## 2026-11-19, Phase 2 (part) and the scheduler

- Template writer `src/lib/pipeline/write-templates.ts`: registrations, FDA releases, CRLs, This Day in Approvals, Catalyst Calendar, and Pipeline Profile (one library segment for each of the top 60 sponsors by active trials).
- Model writer `src/lib/pipeline/write-model.ts` (AI Gateway, `PIQ_PAID_RUN=1` and a budget cap). Not used: the free tier blocks Claude models, $0 spent. Live and library segments were written by session subagents and saved through `import-segments`, which runs the same check.
- Check fixes: an item's own date counts and a month-day takes the item's year; "missing" counts as missed.
- Scheduler `src/lib/pipeline/schedule.ts` and the `schedule` job. Rules in `docs/PLAN.md` section 6. 2026-11-19: 48 wheels from 184 segments, 0% padding, 43% live, 57% library. Playlist saved in Neon.
- Neon store: upserts drop duplicate ids, a full trials read goes in pages of 5,000, dropped HTTP responses retry twice, and new queries `getTrials({ due })` and `sponsorCounts`.
- `daily.yml` adds `write-library` and `schedule`.
- Checks: `npm run check` 0 errors, 0 warnings. `npm test` 81 of 81.
- Screenshots: none (no UI yet).

## 2026-11-18, Phase 1: ingest

- Neon free store `dnbc-db` through Vercel Marketplace, linked to Vercel project `dnbc`. `src/lib/store/neon.ts` (tables of id plus jsonb, created on first use). 114,576 CT.gov trials seeded in 110 s.
- Source modules in `src/lib/ingest/`: ctgov, fda, fda-crl, drugsfda, wires, edgar, pubmed, bluesky, quotes, plus `rss.ts` and `entities.ts`.
- Live run into Neon: FDA 18, PR Newswire 20, Bluesky 52, CT.gov 75 registrations (2 phase moves), Drugs@FDA 14 anniversaries, CRLs 3, PubMed 5. 188 items, 180 stories, 129 airable.
- Not running: Business Wire (no health feed id, reads `BUSINESSWIRE_FEEDS`), EDGAR (needs `DNBC_CONTACT`, field names untested).
- Fixed: CT.gov `daily` skipped new registrations already in a fresh snapshot.
- Rule-based fact check `src/lib/pipeline/check.ts` (built early from Phase 2), with 23 planted and clean cases.
- Fixture day frozen in `fixtures/2026-11-18/` (`items.json`, `stories.json`).
- Workflows `ingest.yml` and `daily.yml`. They skip until the `DATABASE_URL` secret is set, so the schedule has not run yet.
- Checks: `npm run check` 0 errors, 0 warnings. `npm test` 65 of 65.
- Screenshots: none (no UI in this phase).

## 2026-11-18, Phase 0: plan and scaffold

- Plan v1 to v3 in `docs/PLAN.md`, reviewed by Fable at v1. Handoff in `docs/HANDOFF.md`. Show bible in `docs/SHOWS.md`.
- SvelteKit app scaffold, matching PIQHome's versions. Holding page at `/`.
- Core modules: `src/lib/types.ts`, and `time.ts`, `grid.ts`, `cast.ts`, `timing.ts`, and `clock.ts` in `src/lib/channel/`.
- Checks: `npm run check` 0 errors. `npm test` 16 of 16.
- Screenshots: none (holding page only).
