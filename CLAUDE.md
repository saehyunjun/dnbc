# CLAUDE.md: DNBC

DNBC is a 24/7 text-only TV channel about drug development, laid out like CNBC's schedule. It is a public hobby demo. SvelteKit 2, Svelte 5 runes, Tailwind v4, Vercel Hobby, GitHub Actions for jobs, and Neon for storage (a local file store until Neon is set up).

- Plan, phases, and every rule: `docs/PLAN.md`. Read it before changing behaviour.
- Short version for handoff: `docs/HANDOFF.md`.
- Show bible (tone and beat order per show): `docs/SHOWS.md`.
- Changelog: `CHANGELOG.md`.

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (port 5321) |
| Type check | `npm run check` (0 errors, 0 warnings expected) |
| Unit checks | `npm test` (`scripts/unit.ts` runs every file in `scripts/unit/`) |
| Build | `npm run build` |
| Run a job locally | `npm run job -- <name>` (`scripts/jobs/run.ts`) |

TypeScript scripts run with `tsx`. Node 20 locally, Node 22 in Actions.

## File map

| Path | Role |
|---|---|
| `src/lib/types.ts` | every shared type: `SourceItem`, `Story`, `Beat`, `Segment`, `Playlist`, `Slot`, `Entry` |
| `src/lib/channel/time.ts` | ET helpers (Intl only). The channel day runs 06:00 to 06:00 ET |
| `src/lib/channel/grid.ts` | shows, weekday, weekend, and holiday grids, and `wheelsFor(day)` (30-minute wheels) |
| `src/lib/channel/cast.ts` | the fictional cast, all tagged "AI character" on screen |
| `src/lib/channel/timing.ts` | beat hold time, applied when a segment is written and then stored |
| `src/lib/channel/clock.ts` | `onAir(playlists, segments, now, blocked)` and `clockOffset` from the server `Date` header |
| `src/lib/ingest/` | one module per source (Phase 1) |
| `src/lib/pipeline/` | stories, write, check, screen, schedule (Phases 1 to 4) |
| `src/lib/store/` | storage. File store in `.data/` when `DATABASE_URL` is unset |
| `scripts/jobs/` | entry points the Actions workflows run |
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
