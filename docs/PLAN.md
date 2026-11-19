# Drug Channel: plan

A 24/7 text-only TV channel about drug development, styled on CNBC's schedule. Every show is built from news, registry changes, papers, and social posts that are pulled in on a timer. It is a public demo app. It launches on Monday 23 November 2026.

Status: plan written 2026-11-18. No code yet. For Fable to review before Phase 1 starts.

Working name: Drug Channel (placeholder until Aaron picks one).

## 1. What we copy from Scorchball TV

Source: https://scorchball.tv/how-it-was-built (three weeks, about 1,000 commits, static site, schedule-driven channel).

| Scorchball practice | Here |
|---|---|
| `vision.md`, a design doc per area, and `CLAUDE.md` read every session | this plan, `docs/SHOWS.md` (show bible), and `CLAUDE.md` |
| Teams, rules, timings, and lines live in data files | the grid, formats, cast, and rerun rules are JSON or TS data. A schedule change is a data edit |
| Content made ahead of airtime | segments are written before they air, and a buffer of at least 24 hours is kept |
| Static files, and every browser plays the same thing at the same moment | the channel clock comes from UTC time and the day's playlist, so every viewer sees the same segment and second |
| Mock-up pages A, B, and C before visual work | one study page per show template before it goes in the grid |
| One task per session, then commit, report, and pause | same |
| Leave the channel on and turn notes into small tasks | Phase 4 soak, then a daily watch-notes file |

What we do not copy: voices, sound, a simulation, or avatars. **Every word is text on screen.**

## 2. The channel

### Look

- A 16:9 stage that also works at phone width (stacked, with the ticker under the stage).
- Each show has its own colour, title bug, and lower-third style.
- Permanent parts: the channel bug, a show clock ("Morning Dose, 7:42 ET"), a live ticker, and an "Up next" strip.
- Anchors and panelists are illustrated name plates (initial, colour, and role), each tagged "AI character". No faces.

### Beats (the building blocks of a segment)

A segment is a list of beats. The player draws each beat and holds it for a time worked out from its word count.

| Beat | What shows |
|---|---|
| `headline` | the story title, show colour, and a source chip |
| `anchor` | a fictional anchor's line, typed out as a caption |
| `quote` | a real quote, verbatim, with name or handle, role, platform, date, and link |
| `panel` | two or three fictional panelists' lines in turn (debate shows) |
| `pipeline` | a chart of a drug's or company's pipeline by phase, with the change highlighted |
| `timeline` | trial milestones (start, primary completion, readout, PDUFA) |
| `stat` | one number with its label and source |
| `list` | three to five items, such as the day's phase moves |
| `bumper` | the show's opening card, "after the break", and the like |

Hold time is `1.5 s + words / 3.5` seconds, with a 4 s minimum and 14 s maximum. These go in `src/lib/channel/timing.ts` as settings.

### Interviews

The "interview" format pairs a fictional anchor's question with a real quote as the answer.

- Real people only ever appear in `quote` beats. The words are verbatim from a stored source item, with the source shown.
- The writer never invents words for a real person and never builds a back-and-forth that implies a real person spoke to us.
- Fictional cast members say everything else. They are tagged as AI on screen.
- Patients and other private individuals (Reddit and forum posts) appear by community and date only ("r/MultipleSclerosis, 17 Nov"), never by username. Executives, investigators, and officials appear by name and role.

The source check (Phase 2) enforces the verbatim rule.

### Cast (fictional)

| Character | Role | Shows |
|---|---|---|
| Anchor A | morning lead | Morning Dose, Pipeline Open |
| Anchor B | afternoon lead | Deal Desk, Pipeline Close |
| The Clinician | panelist, reads trial design | Readout, Fast Science |
| The Skeptic | panelist, asks what could go wrong | Fast Science |
| The Advocate | panelist, patient view | Fast Science, Patient Desk |
| The Professor | opinion host, labelled "Opinion" | Mad Science |

Names and colours go in `src/lib/channel/cast.ts`.

### Grid (ET, weekdays)

Stock talk is replaced by pipeline talk. Market prices are not shown anywhere.

| ET | Modelled on | Show | What it covers | Fed by |
|---|---|---|---|---|
| 6:00–9:00 | Squawk Box | **Morning Dose** | overnight FDA actions, readouts, and 8-K news | FDA, EDGAR, press wires |
| 9:00–10:00 | Squawk on the Street | **Pipeline Open** | phase moves and new trial registrations since yesterday | ClinicalTrials.gov diffs |
| 10:00–12:00 | daytime wheel | **Trial Desk** | rolling 30-minute wheel of the day's top stories | story pool |
| 12:00–14:00 | Power Lunch | **Deal Desk** | M&A, licensing, and financings, shown as pipeline changes | 8-Ks, press wires |
| 14:00–15:00 | Halftime Report | **Readout** | one trial result explained beat by beat, with an interview | CT.gov results, PubMed, press releases, quotes |
| 15:00–16:00 | (new) | **Regulatory Hour** | approvals, CRLs, adcomms, and the PDUFA calendar | FDA, EMA |
| 16:00–17:00 | Closing Bell | **Pipeline Close** | the day's phase changes by therapy area | CT.gov diffs, story pool |
| 17:00–18:00 | Fast Money | **Fast Science** | three panelists on the day's top four stories | story pool |
| 18:00–19:00 | Mad Money | **Mad Science** | one opinion host on one pipeline | story pool |
| 19:00–20:00 | (new) | **Patient Desk** | what patients said this week, through quotes | Reddit, Bluesky |
| 20:00–21:00 | (new) | **Lab Notes** | papers and preprints of the day | PubMed, medRxiv, bioRxiv |
| 21:00–6:00 | overnight reruns | **Rerun wheel** | the day's shows again in order, and a weekly long-form show at 22:00 Friday | archive |

Weekends: "Pipeline Week" (week in review) at 9:00 and 18:00 on Saturday and Sunday. The rest is reruns.

Thanksgiving Thursday (26 November) and the Friday after: a holiday grid of reruns, plus a special "Approvals of the Year" at 12:00 and 20:00.

### How 24 hours get filled

The channel runs as a headline wheel. A story is written once as a segment of 2 to 3 minutes. It then airs in several shows, each with its own bumper and anchor intro. New content comes to about 40 to 60 segments a day. The scheduler fills each show's slot from the pool by score and freshness. When a slot runs short, it falls back to a rerun of the same show from an earlier day. A slot never airs empty.

## 3. Sources

| Source | Method | Every |
|---|---|---|
| ClinicalTrials.gov API v2 | query by last-update date, then diff status, phase, and results against yesterday's snapshot | 6 h |
| FDA press releases, novel approvals, CRLs, and the adcomm calendar | RSS and pages | 1 h |
| SEC EDGAR 8-Ks from a list of biotech CIKs | EDGAR full-text and RSS | 15 min |
| GlobeNewswire, PR Newswire, and Business Wire health feeds | RSS | 15 min |
| PubMed, medRxiv, and bioRxiv | E-utilities and RSS | 24 h |
| EMA news and CHMP highlights | RSS and pages | 24 h |
| Bluesky | search API for a keyword list | 30 min |
| Reddit | JSON listings for a subreddit list (patient and biotech communities) | 1 h |
| LinkedIn | `data/quotes/linkedin.json`, filled by hand for the demo (posts sit behind login) | by hand |

Every ingested item is stored as a `SourceItem`: `id`, `source`, `url`, `fetchedAt`, `publishedAt`, `title`, `text` (full text kept for the check), `entities` (drug, sponsor, NCT id, condition), and `kind`.

## 4. Pipeline

```
ingest  ->  stories  ->  write  ->  check  ->  schedule  ->  player
(cron)     (dedupe,     (LLM, per   (verbatim  (daily       (static page,
            score)       format)     + facts)   playlist)    UTC clock)
```

1. **Ingest** jobs write `SourceItem`s.
2. **Stories.** Items about the same thing (same NCT id, drug, or 8-K event) are grouped into a `Story`, then scored by recency, kind (approval > readout > deal > registration > paper > post), and number of sources. Haiku tags the entities and kind.
3. **Write.** For each story and format, Sonnet writes a segment as beats in JSON. The prompt passes the source items, and a beat may only use facts from them. Format templates live in `src/lib/channel/formats/`.
4. **Check** (no LLM) rejects a segment when:
   - a `quote` beat's text is not a verbatim substring of its cited source item,
   - a number, date, NCT id, or drug name in any beat is not in the story's source items,
   - a beat has no source id,
   - a patient quote carries a username,
   - a beat runs over 40 words.
   A failed segment is rewritten once, then dropped. Failures go to a log the soak test reads.
5. **Schedule** builds the next day's playlist at 03:00 ET, and patches it every 15 minutes with new segments for the coming slots. A slot that has already started never changes.
6. **Player** fetches the day's playlist and the segments it names. It works out the current beat from UTC time, and so does every other viewer.

### Stack

| Part | Choice |
|---|---|
| App | SvelteKit 2, Svelte 5, TypeScript, Tailwind v4 (same as PIQHome) |
| Host | Vercel, its own project |
| Storage | Vercel Blob: `items/`, `stories/`, `segments/`, `playlists/YYYY-MM-DD.json` (public JSON) |
| Jobs | Vercel cron routes under `src/routes/api/cron/` (`ingest`, `stories`, `write`, `schedule`) |
| LLM | AI Gateway, `anthropic/claude-sonnet-5-5` for writing, `anthropic/claude-haiku-5-5` for tagging. Daily spend cap set in the gateway |
| Checks | `playwright-core` headless suite, `node scripts/check.mjs <out-dir> <port>` |

If the Vercel account's plan limits cron to once a day, the 15-minute jobs move to a GitHub Actions schedule calling the same routes (which needs a GitHub remote) or a `launchd` job on Aaron's Mac.

### File map (planned)

| Path | Role |
|---|---|
| `src/routes/+page.svelte` | the channel player |
| `src/routes/schedule/+page.svelte` | the TV guide for today and tomorrow |
| `src/routes/study/[template]/+page.svelte` | one study page per show template (dev and review) |
| `src/lib/channel/grid.ts` | the weekday, weekend, and holiday grids |
| `src/lib/channel/cast.ts` | fictional cast |
| `src/lib/channel/formats/` | one format per show: beat order and prompt |
| `src/lib/channel/timing.ts` | hold-time settings |
| `src/lib/channel/clock.ts` | UTC to current show, segment, and beat |
| `src/lib/ingest/<source>.ts` | one module per source |
| `src/lib/pipeline/{stories,write,check,schedule}.ts` | pipeline stages, callable from cron routes and from scripts |
| `scripts/check.mjs` | headless suite |
| `scripts/soak.mjs` | runs the clock across 24 hours and reports gaps, repeats, and check failures |
| `fixtures/` | a frozen day of source items, so the writer, check, and player can be tested offline |

## 5. Phases

Each phase ends with `npm run check` (0 errors), the headless suite, screenshots at desktop (1440 x 900) and phone (390 x 844) of every state the phase touched, and an update to this plan, `CHANGELOG.md`, and `CLAUDE.md`.

| # | Day | Goal | Done when |
|---|---|---|---|
| 0 | Wed 18 | Plan | this doc reviewed by Fable, Aaron's answers recorded, `CLAUDE.md` and `docs/SHOWS.md` written |
| 1 | Thu 19 | Ingest | 9 sources write `SourceItem`s to Blob. A dry run makes at least 50 stories with entities. A frozen fixture day is saved |
| 2 | Fri 20 | Write and check | formats for all 11 shows. 60 segments from the fixture day pass the check, which also catches 10 planted bad segments |
| 3 | Sat 21 | Player | every beat type and show template draws at desktop and phone sizes. The clock lands on the same beat in two browsers. The ticker, up-next strip, and `/schedule` work |
| 4 | Sun 22 | Schedule and soak | cron jobs run in production. `soak.mjs` over a 24-hour run finds no empty slot, no segment twice within 3 hours outside the rerun wheel, and no check failure on air. Watch notes fixed |
| 5 | Mon 23 | Launch | public at a domain, link preview image, card on PIQHome `/experiments`, holiday grid set for 26 and 27 November |

### Headless checks (target about 60 by Phase 4)

- Clock: the same UTC time gives the same beat. Slot edges, midnight ET, the weekend switch, and the holiday grid.
- Player: each beat type renders, with no text overflow at either size and no page errors. Holding a beat for 10 minutes doesn't leak memory.
- Check stage: each of the five reject rules fires on a planted segment and passes a clean one.
- Schedule: every slot is filled for 7 days, reruns fall back correctly, and started slots stay unchanged after a patch.
- Interviews: every `quote` beat shows a source link, and no patient quote shows a username.
- Pages: `/` and `/schedule` load in under 2 s on the preview build.

## 6. Risks

| Risk | Guard |
|---|---|
| A wrong FDA decision or trial result goes on air under the PatientlyIQ name | the check stage, plus a "Sources" chip on every beat that opens the link |
| Real people quoted out of context | verbatim only, with link and date. The writer can't add words to a quote |
| Too few stories on a quiet day (Thanksgiving week) | rerun fallback per slot, and the holiday grid |
| Cron limits on the Vercel plan | fallback to GitHub Actions or `launchd` (section 4) |
| LLM spend | gateway daily cap. Segments are written once and reused |
| Five days is short | Phase 2 can ship 6 show formats and alias the rest to the Trial Desk wheel. Phase 3 can drop the `timeline` beat |

## 7. Out of scope for launch

Voices and sound, avatars or video, viewer polls, accounts, market prices, non-English sources, and a mobile app.

## 8. For Fable to review

1. Is the grid right for a CNBC parody, and can 40 to 60 new segments a day fill it without the reruns showing?
2. Does the check stage catch invented facts and quotes well enough for a public demo, and what does it miss?
3. Is the five-day phase order realistic? What should be cut first?
4. Will Blob plus cron routes hold up, or is a small database (Neon) needed for the story pool?
5. Anything in the interview rules that still lets a real person look like they said something they didn't.

## 9. Open for Aaron

- Channel name.
- Domain.
