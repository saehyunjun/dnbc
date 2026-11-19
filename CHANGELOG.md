# Changelog

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
