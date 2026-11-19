# CLAUDE.md: DNBC

DNBC is a 24/7 text-only TV channel about drug development, laid out like CNBC's schedule. It is a public hobby demo. SvelteKit 2, Svelte 5 runes, Tailwind v4, Vercel Hobby, GitHub Actions for jobs, and Neon for storage (Vercel Marketplace store `dnbc-db`, free plan).

- Plan, phases, and every rule: `docs/PLAN.md`. Read it before changing behaviour.
- Short version for handoff: `docs/HANDOFF.md`.
- Show bible (tone and beat order per show): `docs/SHOWS.md`.
- Changelog: `CHANGELOG.md`.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5321) |
| Headless suite | `node scripts/check.mjs <out-dir> 5321` with the dev server running (`playwright-core`, system Chrome). Prints "N of M passed" |
| Block a segment | `npm run block -- <segment or story id> "<reason>"`. The player skips it within 60 s |
| Test the player at a fixed time | `/?t=<epoch ms>` (UTC). `?refresh=<ms>` sets the refetch interval |
| Type check | `npm run check` (0 errors, 0 warnings expected) |
| Unit checks | `npm test` (`scripts/unit.ts` runs every file in `scripts/unit/`) |
| Build | `npm run build` |
| Run a job locally | `npm run job -- <name>` (`scripts/jobs/run.ts`). Reads `.env` and `.env.local`, so it writes to Neon. Prefix `DNBC_STORE=file DNBC_DATA_DIR=<dir>` to test against local files |
| Pull env vars | `vercel env pull .env.local` (git-ignored; never print or commit it) |
| Jobs | ingest: `ingest` (fda, wires, edgar, bluesky), `daily` (ctgov-daily, drugsfda, fda-crl, pubmed, quotes), `stories`, `write` (template segments, `write 7 dry` prints without saving), `ctgov-seed` (one time, about 110 s). Each source is also its own job name |

TypeScript scripts run with `tsx`. Node 20 locally, Node 22 in Actions.

## Scope

Neurology only since 2026-11-19 (`docs/PLAN.md` section 0). The condition list goes in `src/lib/channel/scope.ts` (phase N1). New content outside it does not air.

## File map

| Path | Role |
|---|---|
| `src/lib/types.ts` | every shared type: `SourceItem`, `Story`, `Beat`, `Segment`, `Playlist`, `Slot`, `Entry` |
| `src/lib/channel/time.ts` | ET helpers (Intl only). The channel day runs 06:00 to 06:00 ET |
| `src/lib/channel/grid.ts` | shows, weekday, weekend, and holiday grids, and `wheelsFor(day)` (30-minute wheels) |
| `src/lib/channel/cast.ts` | the fictional cast, all tagged "AI character" on screen |
| `src/lib/channel/timing.ts` | beat hold time, applied when a segment is written and then stored |
| `src/lib/channel/clock.ts` | `onAir(playlists, segments, now, blocked)` and `clockOffset` from the server `Date` header |
| `src/routes/+page.svelte` | the player. State in `src/lib/player/channel.svelte.ts`, helpers in `src/lib/player/` (`fit.ts`, `format.ts`, `samples.ts`) |
| `src/routes/schedule/`, `src/routes/study/[template]/` | the TV guide, and the beat review pages (`noindex`) |
| `src/routes/api/channel/[name]/+server.ts` | `playlist`, `segments`, `blocked` (60 s cache) and `time` (no cache) |
| `src/lib/components/` | `StageFrame`, `BeatView`, `Ticker`, `UpNext`, `CastPlate` (avatar, name, role, AI tag), `Notes` (superscript footnote numbers) and `FootnoteStrip` (the beat's citations), `cast/Avatar.svelte` with art in `cast/avatars.ts` (six fictional SVG portraits, review at `/study/cast`), and one file per beat in `beats/`. Sources show only as footnotes from `Segment.citations` (`src/lib/pipeline/citations.ts`, player side `src/lib/player/cite.ts`): never a spoken line and never a chip |
| `docs/ANALYSIS.md` | the "so what" analysis layer design, v2 after Fable's review (section 9 holds the launch slice) |
| `scripts/check.mjs`, `scripts/block.ts` | headless suite, kill switch |
| `src/lib/ingest/` | one module per source: `ctgov.ts`, `fda.ts`, `fda-crl.ts`, `drugsfda.ts`, `wires.ts`, `edgar.ts`, `pubmed.ts`, `bluesky.ts`, `quotes.ts`; shared `http.ts` (User-Agent, retries), `rss.ts`, `entities.ts` |
| `src/lib/pipeline/` | `stories.ts` (grouping and score), `check.ts` (the rule-based fact check, planted cases in `scripts/unit/check.ts`), `write-templates.ts` (segments from structured fields with no model: registrations, FDA releases, CRLs, anniversaries, catalyst calendar, pipeline profiles; failing optional beats drop, failing required beats drop the segment), `write-model.ts` (AI Gateway writer and `checkWritten`, the gate for every non-template segment; `import-segments <file>` saves subagent-written segments through it), `schedule.ts` (playlist from segments, fill rules in `docs/PLAN.md` section 6); the patient screen comes next |
| `src/lib/store/` | storage. `neon.ts` (tables of id plus jsonb, created on first use) when `DATABASE_URL` is set, `file.ts` in `.data/` otherwise or with `DNBC_STORE=file` |
| `scripts/jobs/` | `run.ts` runner, `registry.ts` ingest jobs, `pipeline-jobs.ts` pipeline jobs |
| `.github/workflows/` | `ingest.yml` (minutes 7, 22, 37, 52) and `daily.yml` (11:17 UTC). Both skip until the `DATABASE_URL` secret is set |
| `data/` | hand-filled quotes, library briefs, and allowlists |
| `fixtures/` | a frozen day for offline tests and the day-one fallback |

## Rules

- Every word on screen is text. No voices, sound, avatars, or video.
- No market prices or stock talk.
- Real people only appear in `quote` beats, verbatim, with the source shown. The beat before a quote states where it came from, never a question. No invented words for a real person, in any show.
- Patient quotes show community and date only, with no username and no link.
- Facts come from `primary` or `reference` items, never `social` ones.
- Never write the SEC contact into the repo. It comes from the `DNBC_CONTACT` environment variable. The repo is public.
- Shows, grids, timings, and cast are data. Change the data, not the code.
- Lib modules use `import type` for `$lib` paths, or relative imports, so `tsx` jobs can load them.

## Phase routine

Each phase in `docs/PLAN.md` section 6 ends with `npm run check`, `npm test`, the headless suite (from Phase 3), screenshots at 1440 x 900 and 390 x 844, and updates to `docs/PLAN.md`, `CHANGELOG.md`, and this file.
