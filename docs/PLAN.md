# Drug Channel: plan

A 24/7 text-only TV channel about drug development, styled on CNBC's schedule. Every show is built from news, registry changes, papers, and social posts that are pulled in on a timer. It is a public demo app. It launches on Monday 23 November 2026.

Status: plan v2, 2026-11-18. Fable reviewed v1 the same day, and every finding is folded in (section 10). No code yet.

Working name: Drug Channel (placeholder until Aaron picks one).

## 1. What we copy from Scorchball TV

Source: https://scorchball.tv/how-it-was-built (three weeks, about 1,000 commits, static site, schedule-driven channel).

| Scorchball practice | Here |
|---|---|
| `vision.md`, a design doc per area, and `CLAUDE.md` read every session | this plan, `docs/SHOWS.md` (show bible), and `CLAUDE.md` |
| Teams, rules, timings, and lines live in data files | the grid, formats, cast, and rerun rules are data. A schedule change is a data edit |
| Content made ahead of airtime | segments are written before they air. Slots lock 30 minutes ahead |
| Static files, and every browser plays the same thing at the same moment | the channel clock comes from UTC time and the day's playlist |
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

A segment is a list of beats. The player draws each beat for the duration stored with it in the playlist (section 4, step 6).

| Beat | What shows |
|---|---|
| `headline` | the story title, show colour, and a source chip |
| `anchor` | a fictional anchor's line, typed out as a caption |
| `quote` | a real quote, a whole sentence or more, verbatim, with attribution (section 2, Interviews) |
| `panel` | two or three fictional panelists' lines in turn (debate shows) |
| `pipeline` | a sponsor's or drug's registered trials counted by phase from ClinicalTrials.gov, with the new trial highlighted |
| `timeline` | trial milestones (start, primary completion, results posted, PDUFA date when a company release gives one) |
| `stat` | one number with its label and source |
| `list` | three to five items, such as the day's phase moves |
| `bumper` | the show's opening card, "after the break", and the like |

Hold time when a segment is written is `1.5 s + words / 3.5` seconds, with a 4 s minimum and 12 s maximum (a 40-word beat reaches 12.9 s, so 12 s caps it). Settings in `src/lib/channel/timing.ts`. A change there affects only segments written after the change, because each beat's duration is stored.

### Interviews

The interview format puts a real quote beside a fictional anchor's framing. The quote never reads as an answer to us.

- The anchor line before a quote is a statement that names where the quote came from: "In a press release on 17 November, the company's CEO said". It is never a question.
- Real people only appear in `quote` beats. A quote is one or more whole sentences, verbatim from a stored source item.
- The speaker's name must appear in the source within 300 characters of the quote, so a release that quotes two people can't be misattributed.
- The quote's source item must belong to the same story and be dated within 7 days of airtime.
- Fictional cast members say everything else, and they are tagged AI on screen.

Attribution by source:

| Source | Shown |
|---|---|
| Press release, 8-K, FDA, or journal | name, role, publisher, date, and link |
| Bluesky | handle, date, and link. No name or role, because those are unverified |
| LinkedIn (hand-filled) | name and role as written on the post, date, and link |
| Reddit or patient forum (hand-filled) | community and date only ("r/MultipleSclerosis, 17 Nov"). No username and no link |

Patient quotes pass a screen before use (section 4, step 4).

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

The channel day runs from 06:00 ET to 06:00 ET. Stock talk is replaced by pipeline talk, and no market prices appear.

Five formats ship at launch. The other shows are grid entries that reuse a launch format with their own name, colour, and story filter.

| ET | Modelled on | Show | Format | Story filter | Fed by |
|---|---|---|---|---|---|
| 06:00–09:00 | Squawk Box | **Morning Dose** | Headlines | everything since 18:00 yesterday | FDA, EDGAR, press wires |
| 09:00–10:00 | Squawk on the Street | **Pipeline Open** | Pipeline | new registrations and phase moves | ClinicalTrials.gov |
| 10:00–12:00 | daytime wheel | **Trial Desk** | Headlines | top stories of the day | story pool |
| 12:00–14:00 | Power Lunch | **Deal Desk** | Headlines | 8-K deals, licensing, and financings | EDGAR, press wires |
| 14:00–15:00 | Halftime Report | **Readout** | Readout | one trial result per segment, with quotes | CT.gov results, press releases, PubMed |
| 15:00–16:00 | (new) | **Regulatory Hour** | Headlines | approvals, CRLs, and adcomms | FDA, openFDA CRLs, company releases |
| 16:00–17:00 | Closing Bell | **Pipeline Close** | Pipeline | the day's moves by therapy area | ClinicalTrials.gov |
| 17:00–18:00 | Fast Money | **Fast Science** | Panel | the day's top four stories | story pool |
| 18:00–19:00 | Mad Money | **Mad Science** | Panel (one host) | one story, labelled Opinion | story pool |
| 19:00–20:00 | (new) | **Patient Desk** | Voices | screened patient and Bluesky quotes | Bluesky, hand-filled Reddit file |
| 20:00–21:00 | (new) | **Lab Notes** | Headlines | journal papers of the day | PubMed |
| 21:00–06:00 | overnight reruns | **Rerun wheel** | — | the day's shows again, in order | archive |

Weekends and Thanksgiving (Thursday 26 and Friday 27 November): reruns of the latest weekday shows. Cut from launch: Pipeline Week, the Friday long-form show, and "Approvals of the Year".

### How the grid gets filled

Each show hour is a 30-minute wheel that plays twice. Each wheel holds 10 to 15 segments of 2 to 3 minutes. Every story gets one version per format it fits, so a deal can air as a Headlines segment in Deal Desk and as a Panel segment in Fast Science.

- Rule: a segment airs at most once in each wheel and in no more than 3 show hours a day, not counting the rerun wheel.
- Volume: about 15 live hours of 2 wheels each, with shows sharing segments, needs about 120 to 180 new segments a day. Ingest gives about 50 to 80 stories a day, at 2 to 3 formats each.
- When a wheel runs short, it falls back to the same show from the most recent earlier day. If that is missing too (day one), it falls back to the fixture day's segments. A wheel never airs empty.
- Padding: when the segments don't add up to 30 minutes, the gap is filled by `bumper` beats ("Up next", schedule card, ticker full-screen) of 4 to 12 s each.

## 3. Sources

All requests send `User-Agent: DrugChannel/0.1 (<contact>)`. SEC requires a contact (section 9).

| Source | Method | Every | Notes |
|---|---|---|---|
| ClinicalTrials.gov API v2 | `query.term=AREA[LastUpdatePostDate]RANGE[<yesterday>,MAX]` | 24 h (data refreshes once a day) | seed a snapshot of the about 115,000 industry interventional studies first (Phase 1). Records rarely change phase, so a **phase move** is a new registration at a later phase for the same drug and sponsor. Also status changes and results posted |
| FDA press releases and novel approvals | RSS (returns 200) | 1 h | |
| FDA CRLs | openFDA `transparency/crl.json` | 24 h | |
| PDUFA and adcomm dates | parsed from company releases and the FDA adcomm calendar page | with the wires | FDA publishes no PDUFA calendar |
| SEC EDGAR 8-Ks for a list of biotech CIKs | full-text search (returns 200 with a User-Agent), then Exhibit 99.1 for the news text | 15 min | the 8-K atom feed returned 0 entries in review, so it's not used |
| PR Newswire and Business Wire health feeds | RSS (both return 200) | 15 min | GlobeNewswire dropped, because it returned 403 |
| PubMed | E-utilities, a fixed journal list | 24 h | preprints cut from launch |
| Bluesky | `app.bsky.feed.searchPosts` with an app-password session | 30 min | unauthenticated public search returned 403 |
| Reddit | `data/quotes/reddit.json`, hand-filled from an allowlist of subreddits | by hand | unauthenticated `.json` returned 403, and new OAuth apps need Reddit approval (reported as 1 to 4 weeks). Apply anyway, for after launch |
| LinkedIn | `data/quotes/linkedin.json`, hand-filled | by hand | posts sit behind login |

Cut from launch: EMA and preprints.

Every ingested item is stored as a `SourceItem`: `id`, `source`, `tier` (`primary` for FDA, CT.gov, EDGAR, wires, and journals; `social` for Bluesky, Reddit, and LinkedIn), `url`, `fetchedAt`, `publishedAt`, `title`, `text` (full text kept for the check), `entities` (drug, sponsor, NCT id, condition), and `kind`.

## 4. Pipeline

```
ingest  ->  stories  ->  write  ->  check  ->  schedule  ->  player
(cron)     (dedupe,     (LLM, per   (rules +   (wheels,     (static page,
            score)       format)     screen)    lock 30 m)   UTC clock)
```

1. **Ingest** jobs write `SourceItem`s to Neon.
2. **Stories.** Items about the same thing (same NCT id, drug, or 8-K event) are grouped into a `Story`. Stories are scored by recency, kind (approval > CRL > readout > deal > registration > paper > post), and number of primary sources. Haiku tags entities and kind. A story needs at least one primary item to air. Social items only add quotes.
3. **Write.** For each story and each format it fits, Sonnet writes a segment as beats in JSON, with each beat citing source item ids. Format templates go in `src/lib/channel/formats/`. Each run writes in batches under a 240 s time budget and resumes on the next run.
4. **Check** (rules, no LLM except the patient screen). A segment is rejected when:
   - a beat cites no source item, or cites only `social` items for a fact (a number, date, outcome, or approval),
   - a number, date, or NCT id is not in a cited primary item. Numbers are normalised first ("45%", "45 percent", "0.45"; "17 Nov", "November 17"),
   - a drug or sponsor name is not in the story's entity list (the lexicon is the entities Haiku tagged from primary items),
   - an outcome word (met, missed, approved, rejected, CRL, discontinued, halted) is not in the same source sentence as the drug it is said of,
   - a `quote` is not whole sentences verbatim from its item, the speaker's name is not within 300 characters of it in the source, the item is from another story, or it is older than 7 days,
   - a patient quote carries a username or link,
   - a beat runs over 40 words.

   **Patient screen.** Haiku checks each Reddit and Bluesky quote before it enters the pool. It drops quotes with cure claims, dosing or medical advice, or identifying details (names, places, dates of birth, rare personal facts). Reddit quotes come only from the subreddit allowlist.

   A failed segment is rewritten once, then dropped. Failures go to a log the soak test reads.
5. **Schedule** builds the channel day (06:00 to 06:00 ET) at 03:00 ET, and patches it every 15 minutes for slots more than 30 minutes ahead. A slot inside 30 minutes, or already started, never changes.
6. **Publish.** The playlist stores each beat's start offset and duration, so viewers stay in sync whatever `timing.ts` says later. Files are written with versioned names (`playlists/2026-11-23.v14.json`, `segments/<id>.json`), and a small `playlists/current.json` names the latest version with `cacheControlMaxAge: 60`.
7. **Player** fetches `current.json`, then the playlist and its segments. It works out the current beat from UTC time, corrected by the offset from the server's `Date` header so a wrong device clock doesn't matter.

### Kill switch

`blocked.json` (in Blob, max age 60 s) lists blocked segment and story ids. The player skips a blocked segment and shows the next one, and the scheduler never schedules it again. It is edited by a script `scripts/block.mjs <id> "<reason>"`, or by hand. It must be live before launch.

### Stack

| Part | Choice |
|---|---|
| App | SvelteKit 2, Svelte 5, TypeScript, Tailwind v4 (same as PIQHome) |
| Host | Vercel, its own project. Needs the Pro plan for 15-minute schedules and 800 s functions. Hobby runs a job once a day |
| Database | Neon Postgres (Vercel Marketplace) for items, stories, segments, and the schedule |
| Published files | Vercel Blob, public, for playlists, segments, and `blocked.json` only. This keeps operations well under the Hobby limit of 2,000 advanced operations a month |
| Jobs | Vercel Schedules (formerly Cron Jobs) calling routes under `src/routes/api/jobs/` (`ingest`, `stories`, `write`, `schedule`), each guarded by `CRON_SECRET` |
| LLM | AI Gateway, `anthropic/claude-sonnet-5.5` for writing, `anthropic/claude-haiku-5.5` for tagging and the patient screen. Daily spend cap set in the gateway |
| Checks | `playwright-core` headless suite, `node scripts/check.mjs <out-dir> <port>` |

Fallback if the account is on Hobby and won't move to Pro: a `launchd` job on Aaron's Mac calls the same routes every 15 minutes.

### File map (planned)

| Path | Role |
|---|---|
| `src/routes/+page.svelte` | the channel player |
| `src/routes/schedule/+page.svelte` | the TV guide for today and tomorrow |
| `src/routes/study/[template]/+page.svelte` | one study page per format (dev and review) |
| `src/lib/channel/grid.ts` | weekday, weekend, and holiday grids, with each show's format and story filter |
| `src/lib/channel/cast.ts` | fictional cast |
| `src/lib/channel/formats/` | `headlines`, `pipeline`, `readout`, `panel`, `voices`: beat order and prompt |
| `src/lib/channel/timing.ts` | hold-time settings, used at write time |
| `src/lib/channel/clock.ts` | UTC plus offset to the current show, segment, and beat |
| `src/lib/ingest/<source>.ts` | one module per source |
| `src/lib/pipeline/{stories,write,check,screen,schedule,publish}.ts` | pipeline stages, callable from job routes and from scripts |
| `data/quotes/{reddit,linkedin}.json` | hand-filled quotes |
| `data/subreddits.json` | allowlist |
| `scripts/check.mjs` | headless suite |
| `scripts/soak.mjs` | runs the clock across a simulated 24 hours on fixtures and reports gaps, repeats, and check failures |
| `scripts/block.mjs` | adds an id to `blocked.json` |
| `fixtures/` | a frozen day of source items and segments, for offline tests and the day-one fallback |

## 5. Phases

Each phase ends with `npm run check` (0 errors), the headless suite, screenshots at desktop (1440 x 900) and phone (390 x 844) of every state the phase touched, and an update to this plan, `CHANGELOG.md`, and `CLAUDE.md`.

| # | Day | Goal | Done when |
|---|---|---|---|
| 0 | Wed 18 | Plan | v2 written after Fable's review. Aaron answers section 9. `CLAUDE.md` and `docs/SHOWS.md` written. Vercel plan confirmed |
| 1 | Thu 19 | Ingest | 7 automated sources write `SourceItem`s to Neon, and the CT.gov snapshot is seeded. A dry run makes at least 50 stories with entities. The fixture day is frozen. **Ingest runs on its schedule in production from Thursday night**, so stories build up before launch |
| 2 | Fri 20 | Write and check | the 5 formats. 120 segments from the fixture day pass the check, and the check catches 15 planted bad segments (one per rule, plus wrong speaker, reversed outcome, and social-only fact). The patient screen drops 5 planted bad quotes. Reddit and LinkedIn files have 20 quotes each |
| 3 | Sat 21 | Player | every beat type and format draws at both sizes. Two browsers with clocks set 90 s apart land on the same beat. Ticker, up-next strip, `/schedule`, and the kill switch work |
| 4 | Sun 22 | Schedule and soak | `soak.mjs` on a simulated 24 hours of fixtures finds no empty wheel, no repeat breaking the rule in section 2, and no blocked or failed segment on air. The production schedule and write jobs run from Sunday morning, and Sunday evening's wheels are watched live. Watch notes are fixed |
| 5 | Mon 23 | Launch | public at a domain with a link preview image and a card on PIQHome `/experiments`. Holiday grid set for 26 and 27 November |

If time runs short, cut in this order: the `pipeline` beat (Pipeline Open and Close then use Headlines), Lab Notes, LinkedIn, Mad Science, and the `timeline` beat.

### Headless checks (target about 60 by Phase 4)

- Clock: the same corrected UTC time gives the same beat. Slot edges, 06:00 day start, midnight, the weekend switch, the holiday grid, and a device clock 90 s off.
- Player: each beat type renders, with no text overflow at either size and no page errors. Holding a beat for 10 minutes doesn't leak memory. A blocked segment is skipped within 60 s.
- Check stage: each reject rule fires on a planted segment, and a clean one passes. Number and date normalisation doesn't reject a matching fact.
- Screen: each kind of bad patient quote is dropped.
- Schedule: every wheel is filled for 7 days, fallbacks work in order, and a slot inside 30 minutes stays unchanged after a patch.
- Interviews: the beat before each quote is a statement, not a question. Patient quotes show no username or link. Bluesky quotes show a handle only.
- Pages: `/` and `/schedule` load in under 2 s on the preview build.

## 6. Risks

| Risk | Guard |
|---|---|
| A wrong FDA decision or trial result goes on air under the PatientlyIQ name | facts from primary sources only, the outcome-word rule, and the kill switch |
| Real people quoted out of context or misattributed | whole sentences, speaker name near the quote, the same story, within 7 days, and a statement of origin before the quote |
| Patient quotes with harmful or identifying content | subreddit allowlist, Haiku screen, and no username or link |
| Too few stories on a quiet day (Thanksgiving week) | fallback order in section 2, and the holiday grid |
| Vercel plan limits | confirm Pro in Phase 0, with `launchd` as the fallback |
| LLM spend | gateway daily cap, batches under a time budget, and segments written once |
| Five days is short | the cut order in section 5 |

## 7. Out of scope for launch

Voices and sound, avatars or video, viewer polls, accounts, market prices, EMA, preprints, automated Reddit, non-English sources, and a mobile app.

## 8. Not verified

- The Vercel account's plan.
- Reddit OAuth approval time.
- Why the EDGAR 8-K atom feed returned 0 entries, and whether GlobeNewswire answers a real User-Agent.
- Bluesky search from Vercel's network.

## 9. Open for Aaron

- Channel name.
- Domain.
- The contact string for the User-Agent that SEC requires (a name and email address it can reach).
- Is the Vercel account on Pro, or will it move to Pro for this project?

## 10. Review log

| Date | Reviewer | Result |
|---|---|---|
| 2026-11-18 | Fable | v1 not ready: Reddit ingest fails, the soak rule couldn't pass at the planned volume, and there was no kill switch. v2 fixes: 30-minute wheels and a new repeat rule, stricter check rules and a patient screen, statement-of-origin interviews, Neon plus versioned Blob files, the kill switch, stored beat timing and clock correction, corrected source methods and model ids, cuts to 5 formats, and ingest running from Thursday night |
