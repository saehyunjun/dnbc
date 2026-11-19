# DNBC: plan

DNBC is a 24/7 text-only TV channel about drug development, styled on CNBC's schedule. Live shows are built from news, registry changes, papers, and social posts that are pulled in on a timer. Library shows (history, explainers, and forward-looking) fill the rest. It is a public hobby demo. It launches on Monday 23 November 2026.

- Name: DNBC (Aaron, 2026-11-18). The repo stays `~/drug-channel`.
- Status: plan v3, 2026-11-18. No code yet.
- v2 folded in Fable's review. v3 adds the library shows and moves the stack to free plans (section 5, Stack). See section 11.
- **2026-11-19: narrowed to neurology** (Aaron: "narrow the focus to something like just neurological conditions … to hone the overall project before expanding"). Section 0 holds the scope and the phases it adds. Where section 0 disagrees with a later section, section 0 wins.

## 0. Focus: neurology first (2026-11-19)

DNBC covers neurology, psychiatry, and brain cancers only until the format is right (Aaron 2026-11-19: psychiatry and brain cancers in, Monday launch kept). Other areas come back one at a time, each with its own condition list and library.

### Scope

In: diseases of the brain, spinal cord, nerves, and muscles, mental health conditions, and brain cancers.

| Group | Conditions |
|---|---|
| Neurodegenerative | Alzheimer's disease and other dementias (frontotemporal, Lewy body), Parkinson's disease, ALS, Huntington's disease, progressive supranuclear palsy, spinocerebellar ataxias, Friedreich's ataxia |
| Neuroimmune | multiple sclerosis, neuromyelitis optica, myasthenia gravis, CIDP, Guillain-Barré syndrome |
| Epilepsy | epilepsy and the rare epilepsies (Dravet, Lennox-Gastaut, tuberous sclerosis) |
| Neuromuscular | spinal muscular atrophy, Duchenne and Becker muscular dystrophy, myotonic dystrophy, Charcot-Marie-Tooth |
| Headache and movement | migraine, essential tremor, dystonia, Tourette syndrome, tardive dyskinesia, restless legs, narcolepsy |
| Rare genetic | Rett and Angelman syndromes, leukodystrophies, Batten disease |
| Acute | stroke, traumatic brain injury |
| Psychiatry | depression (including treatment-resistant and postpartum), schizophrenia, bipolar disorder, anxiety, PTSD, OCD, ADHD, autism, substance use disorders, insomnia, eating disorders, agitation in dementia |
| Brain cancers | glioblastoma and other gliomas, DIPG, medulloblastoma, ependymoma, meningioma, brain metastases |

Out for now: pain other than migraine and neuropathy, and eye disease.

Brain cancer trials often enrol other solid tumours too. A trial is in scope when a brain cancer is one of its conditions. Psychiatry stories touch suicide and self-harm, so the patient screen (`src/lib/pipeline/screen.ts`) keeps its self-harm rule, and Patient Desk takes no psychiatry quotes about self-harm, dosing, or stopping medicine.

### Size of the area (checked list `src/lib/channel/scope.ts`, Neon snapshot, 2026-11-19)

| Measure | All areas | Neurology | Psychiatry | Brain cancers | In scope |
|---|---|---|---|---|---|
| Active trials | 16,655 | 1,171 | 360 | 202 | 1,697 (10%) |
| New registrations, last 90 days | 1,737 | 89 | 28 | 11 | 128, about 1.4 a day |
| Stories, last 7 days | 294 | 31 | 5 | 2 | 36, about 5 a day |
| Segments in the store | 184 | 9 | 1 | 0 | 10 (4 library) |

A trial can sit in more than one group, so the groups add up to more than the in-scope column. Stories count when the story or one of its items names a listed condition in its title, conditions, or first 400 characters.

### What this changes

1. **Live is thin.** About 5 stories a day cannot fill 13 live hours. Live shows shrink to three wheels (Morning Dose, Pipeline Close, Patient Desk) and the library carries the rest. Reruns run 21:00 to 07:00 as before.
2. **The library becomes neurology.** This Day in Approvals keeps only neurology drugs. Blockbuster, The Failure Files, Rare Ones, How It Works, and Future Pipeline get neurology lists (`docs/SHOWS.md`, Neurology library).
3. **The ticker stays neurology only.** Other areas leave the channel, not just the main screen.
4. **Analysis gets easier.** A fixed list of about 40 conditions, each checked by hand, replaces open condition terms. That answers Fable's "ambiguous term" refusal for this area (`docs/ANALYSIS.md` section 10).
5. **Sources stay the same.** The filter runs after ingest, so nothing is lost when an area returns.
6. **Patient Desk gets easier to screen.** The Reddit and Bluesky allowlists shrink to neurology communities.

### Phases (before Phase 4 soak)

| # | Goal | Done when |
|---|---|---|
| N1 | Scope list | **Done 2026-11-19.** `src/lib/channel/scope.ts`: 38 conditions in three groups with synonyms and acronyms, look-alike phrases blanked (`not`), and acronyms that clash outside the area left out (AD, ASD, GAD, PPD, TBI). `trialScope`, `itemScope` (title, conditions, first 400 characters), and `storyScope` (falls back to its items). 18 unit cases in `scripts/unit/scope.ts`, 112 of 112. Counts above rerun with it. MeSH ids are not added: from memory they would be guesses. They come with the MeSH work after launch |
| N2 | Filter | **Done 2026-11-19** (see G3): stories carry `scope`; `write` and `schedule` take in-scope stories and segments only (`storyInScope`, `segmentInScope` in `src/lib/channel/scope.ts`); out-of-scope segments stay in the store and never air |
| N3a | Fact library | a `facts` table of neurology facts (section 12): each fact one sentence with its source item, date, and condition; a second session subagent checks each against its source before it is saved; about 300 facts at launch (approvals, trial results, condition basics, scale definitions) |
| N3 | Library | the launch counts in `docs/SHOWS.md` written by session subagents from the fact library only, through `import-segments`; every beat cites a fact or a source item |
| N4 | Grid | `src/lib/channel/grid.ts` with three live wheels; fill measured again |
| N5 | Analysis | `docs/ANALYSIS.md` section 9 slice S1 to S5, scoped to the condition list |

Launch stays on Monday 23 November (Aaron 2026-11-19). N5 follows launch.

### Fable gap review, 2026-11-19 (verdict: not ready as planned, ready with the cuts below)

| # | Gap | Fix | Hours | Status |
|---|---|---|---|---|
| G1 | Too little content: 27 library plus 15 live segments make a 24-minute loop, each airing 72 to 80 times a day, and the holiday and weekend grids are 98% library | template profiles from the trials table for the 38 conditions and about 48 sponsors with 5 or more in-scope trials, 60 library segments of about 90 s, and a labelled 3-hour library block that repeats | 14 | part done `4c0694d`: 36 condition landscapes and 53 in-scope sponsor profiles a day from the trials table (`src/lib/pipeline/write-landscape.ts`); `airPool` in `scope.ts` airs only the newest dated copy and drops all-area cards; 102 segments, about 94 minutes, can air. Still open: 60 library segments of about 90 s (N3) and the 3-hour block (N4) |
| G2 | Jobs late: the 15-minute ingest ran once today, the daily ran 8 hours late, `schedule` builds today only | build today and tomorrow in every run, the player falls back to the newest playlist, an outside timer triggers `workflow_dispatch`, a stale-playlist alarm | 4 | done `518060f`: today and tomorrow, stale fallback, `health` job; outside timer not done (needs a GitHub token, Aaron) |
| G3 | Story scope wrong both ways: derived items join stories by URL, and brand-name releases name the condition after character 400 | keep derived items out of `buildStories`, judge a story by its lead item, add drug names to `scope.ts`, give segments a `scope` field (N2) | 8 | done `7ecd1b4` and N2: derived cards out of stories, `Story.scope`, drug names; write and schedule filter by scope (27 of 196 segments in scope) |
| G4 | Library sources are typed into the import file, not fetched, so the check compares the writer's numbers with the writer's own text | the import fetches each URL and requires the stored text verbatim in the page; each fact gets a status check | 4 plus 6 for 100 facts | part done `c2a6c27`: `src/lib/pipeline/verify-source.ts`; `import-segments` fetches every reference item and rejects text not on the page; `verify-library [dry]` found 31 of 32 pass (the Kalydeco FDA page is a 404, out of scope). Still open: a result-status check (the semaglutide segment's "does not report a result" passes) |
| G5 | Patient Desk has no writer and no in-scope quotes | cut for launch | 0.5 | open |
| G6 | Live writing has no owner after Monday | a daily runbook for one morning session | 1 | open |
| G7 | This Day in Approvals cannot be filtered: `drugsfda` items have no conditions | drug list in `scope.ts`, or cut | 1 | done with G3: drug names put anniversaries in scope; only in-scope ones are written |
| G8 | Trial scope: about 60 false positives in 1,698 (anti-GBM kidney disease, FTD chemotherapy, osteochondritis, optic neuropathy, stroke prevention in cardiology) and misses ("Brain Neoplasms", CNS lymphoma, adrenoleukodystrophy, "Bipolar I or II", MOGAD) | fix the terms and add cases | 2 | done `7ecd1b4`: the flagged ids fixed, 122 unit cases |
| G9 | Sources miss the area: PubMed journals and Bluesky keywords are general, Catalyst Calendar uses a second condition list | neurology and psychiatry journals and keywords, Catalyst Calendar on `scope.ts` | 2 | done `043f5b5`: neurology, psychiatry, and neuro-oncology journals and Bluesky keywords. Catalyst Calendar still uses its own area list; `airPool` airs only the neurology and psychiatry catalysts. Reddit list unchanged (Reddit is cut for launch) |
| G10 | Psychiatry safeguards cover quotes only; no crisis line, corrections contact, or about page | self-harm rule on segment text, an `/about` page with a crisis line and corrections contact | 2 | done `993c32a`: crisis line (988) under any segment that mentions suicide, self-harm, or overdose; `/about` with the crisis line, AI cast note, and a GitHub issues link for corrections; 202 headless checks, 201 pass (the clock-skew timing check missed by 52 ms while the machine was busy) |
| G11 | Launch chores: deploy approval, domain, link preview, PIQHome card, `scripts/soak.mjs`, rehearsal, retiring 185 out-of-scope segments | Phase 4 | 6 | open |
| G12 | Owner decisions: the DNBC name and CNBC styling may draw a trademark complaint (Fable's judgment, not checked); Vercel Hobby is for non-commercial use | Aaron | 0 | open |

Cut for launch (Fable): Patient Desk, Fast Science, Mad Science, Lab Notes, and Deal Desk. The weekday grid is Morning Dose, one Pipeline hour, and the library block. N3a is 100 facts with no analysis lines. EDGAR, Business Wire, Reddit, and LinkedIn wait. This Day in Approvals airs only if G7 is done.


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
- Permanent parts: the DNBC bug, a show clock ("Morning Dose, 7:42 ET"), a live ticker, and an "Up next" strip.
- Anchors and panelists are illustrated name plates (initial, colour, and role), each tagged "AI character". No faces.

### Beats (the building blocks of a segment)

A segment is a list of beats. The player draws each beat for the duration stored with it in the playlist (section 5, step 6).

| Beat | What shows |
|---|---|
| `headline` | the story title, show colour, and a source chip |
| `anchor` | a fictional anchor's line, typed out as a caption |
| `quote` | a real quote, a whole sentence or more, verbatim, with attribution (section 2, Interviews) |
| `panel` | two or three fictional panelists' lines in turn (debate shows) |
| `pipeline` | a sponsor's or drug's registered trials counted by phase from ClinicalTrials.gov, with the new trial highlighted |
| `timeline` | trial milestones (start, primary completion, results posted, and a PDUFA date when a company release gives one), or the dates in a drug's history |
| `stat` | one number with its label and source |
| `list` | three to five items, such as the day's phase moves |
| `quiz` | a clue, a pause, then the answer (Name That Mechanism) |
| `bumper` | the show's opening card, "after the break", and the like |

Hold time when a segment is written is `1.5 s + words / 3.5` seconds, with a 4 s minimum and 12 s maximum (a 40-word beat reaches 12.9 s, so 12 s caps it). The settings go in `src/lib/channel/timing.ts`. A change there affects only segments written after the change, because each beat's duration is stored.

### Interviews

The interview format puts a real quote beside a fictional anchor's framing. The quote never reads as an answer to us.

- The anchor line before a quote is a statement that names where the quote came from, for example "In a press release on 17 November, the company's CEO said". It is never a question.
- Real people only appear in `quote` beats. A quote is one or more whole sentences, verbatim from a stored source item.
- The speaker's name must appear in the source within 300 characters of the quote, so a release that quotes two people can't be misattributed.
- In live shows, the quote's source item must belong to the same story and be dated within 7 days of airtime. Library shows are exempt from the 7-day rule but not from the same-story rule.
- Fictional cast members say everything else, and they are tagged AI on screen.
- No show, including the history shows, invents words for a real person.

Attribution by source:

| Source | Shown |
|---|---|
| Press release, 8-K, FDA, journal, or reference page | name, role, publisher, date, and link |
| Bluesky | handle, date, and link. No name or role, because those are unverified |
| LinkedIn (hand-filled) | name and role as written on the post, date, and link |
| Reddit or patient forum (hand-filled) | community and date only ("r/MultipleSclerosis, 17 Nov"). No username and no link |

Patient quotes pass a screen before use (section 5, step 4).

### Cast (fictional)

| Character | Role | Shows |
|---|---|---|
| Anchor A | morning lead | Morning Dose, Pipeline Open, This Day in Approvals |
| Anchor B | afternoon lead | Deal Desk, Pipeline Close, Catalyst Calendar |
| The Clinician | panelist, reads trial design | Readout, Fast Science, Trial vs Trial |
| The Skeptic | panelist, asks what could go wrong | Fast Science, The Failure Files |
| The Advocate | panelist, patient view | Fast Science, Patient Desk, Rare Ones |
| The Professor | opinion and history host, with Opinion labels on opinion segments | Mad Science, Blockbuster, Future Pipeline, What If |

Names and colours go in `src/lib/channel/cast.ts`.

### Grid (ET, weekdays)

The channel day runs from 06:00 ET to 06:00 ET. There is no stock talk and no market prices. Pipeline talk takes their place.

Five live formats ship at launch. The other live shows are grid entries that reuse a launch format with their own name, colour, and story filter.

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
| 21:00–06:00 | overnight reruns | **Rerun wheel**, with library hours | none | the day's shows again in order. Every third hour is a library hour (section 3) | archive, library |

Weekends, and Thanksgiving (Thursday 26 and Friday 27 November), use the library grid in section 3.

### How the grid gets filled

Each show hour is a 30-minute wheel that plays twice. Each wheel holds 10 to 15 segments of 2 to 3 minutes. Every story gets one version per format it fits, so a deal can air as a Headlines segment in Deal Desk and as a Panel segment in Fast Science.

- Each weekday daytime wheel has one library slot (section 3).
- Repeat rule for live segments: a segment airs at most once in each wheel and in no more than 3 show hours a day, not counting the rerun wheel.
- Volume: about 15 live hours of 2 wheels each, with shows sharing segments and one library slot per wheel, needs about 110 to 160 new live segments a day. Ingest gives about 50 to 80 stories a day, at 2 to 3 formats each.
- When a wheel runs short, it first adds library segments, then falls back to the same show from the most recent earlier day. If that is missing too (day one), it falls back to the fixture day's segments. A wheel never airs empty.
- Padding: when the segments don't add up to 30 minutes, the gap is filled by `bumper` beats ("Up next", schedule card, ticker full-screen) of 4 to 12 s each.

## 3. Library shows

Library segments don't depend on the day's news. Each one is written once, checked once, and can air for months. They fill reruns, weekends, holidays, and quiet days. CNBC does the same with its evening and weekend shows (American Greed, CNBC Originals).

### History

| Show | Modelled on | What it is | Sources | Made by |
|---|---|---|---|---|
| **This Day in Approvals** | "this day in history" spots | drugs the FDA approved on today's date in past years: the drug, the disease, and what it changed | Drugs@FDA approval dates, FDA labels, PubMed | automatic, a few segments every day |
| **Blockbuster** | CNBC Originals | the life of one big drug: discovery, trials, approval, sales peak, and patent cliff (penicillin, insulin, statins, Humira, GLP-1s) | Drugs@FDA, PubMed, FDA history pages, company filings | written ahead |
| **The Failure Files** | American Greed | well-documented failures and withdrawals (thalidomide, Vioxx, torcetrapib), and what the rules changed after each | FDA records, Federal Register, PubMed | written ahead, documented facts only |
| **Ad Break** | (new) | the history of drug marketing: the 1997 FDA guidance that opened TV ads, the "ask your doctor" era, famous campaigns, and the rules on ads now | FDA guidance documents, Federal Register, PubMed | written ahead |
| **Lab Legends** | biography shows | scientists behind landmark drugs (Banting and Best, Gertrude Elion, Katalin Karikó) | PubMed, Nobel Prize pages | written ahead |
| **Rare Ones** | (new) | orphan drugs and the patient advocates who pushed for them, from the 1983 Orphan Drug Act on | FDA orphan designations, PubMed | written ahead. Ties to PatientlyIQ and the PIQHome rare pediatric vouchers page |

### Explainers

| Show | What it is | Sources | Made by |
|---|---|---|---|
| **How It Works** | one rule or process per segment: trial phases, PDUFA dates, accelerated approval, breakthrough designation, priority review vouchers, biosimilars, and patent cliffs | FDA guidance pages | written ahead, about 20 segments |
| **Molecule of the Week** | one mechanism as beats: the target, what the drug does, and which drugs use it | FDA labels, PubMed | written ahead, one a week |
| **Trial vs Trial** | two trials in the same disease, side by side on design, endpoints, and size | ClinicalTrials.gov | automatic from registry data |
| **Name That Mechanism** | a `quiz` break between segments | FDA labels | written ahead, short interstitials |

### Forward-looking

| Show | What it is | Sources | Made by |
|---|---|---|---|
| **Future Pipeline** | where drug development is heading: AI-designed molecules now in trials, protein structure prediction, gene editing, cell therapy, and the next GLP-1s | ClinicalTrials.gov (trials by AI-first biotechs), PubMed, company releases | written ahead, refreshed monthly |
| **Catalyst Calendar** | trials due to read out in the next 30 days, and PDUFA dates from company releases | CT.gov primary completion dates, press wires | automatic, daily |
| **Patent Cliff Countdown** | big drugs losing exclusivity in the next few years, and who has a biosimilar or generic ready | FDA Orange and Purple Books, company filings | written ahead, refreshed quarterly |
| **Conference Countdown** | what to watch at the next big meeting (ASH in early December, then JPM in January) | abstract releases, press wires | written ahead of each meeting |
| **What If** | a Fast Science panel on a future question ("What if AI cuts trial time in half?"), labelled Opinion | the Future Pipeline sources | written ahead |

### Where the library airs

| Slot | Mix |
|---|---|
| Weekday daytime | one library segment per 30-minute wheel: This Day in Approvals in Morning Dose, Catalyst Calendar in Pipeline Open, How It Works in Regulatory Hour, Future Pipeline in Lab Notes, and other shows by turns elsewhere |
| Weekday 21:00–06:00 | reruns of the day, with a library hour every third hour (22:00, 01:00, 04:00) |
| Weekends | library hours, plus one block of the week's top live segments at 09:00 and 18:00 |
| Thanksgiving, 26 and 27 November | Blockbuster, Lab Legends, Rare Ones, and This Day in Approvals in turn, with Catalyst Calendar each morning |

### Library rules

- **Reference tier.** History pages, Nobel Prize pages, FDA history and guidance pages, and review papers are `reference` items. Facts in library segments may come from `primary` or `reference` items, never `social`.
- **`library` flag.** A library segment skips the 7-day quote rule and the live repeat rule. It airs at most once a day and 3 times a week.
- **"As of" date.** Every segment shows the date its facts were checked. Forward-looking segments (Future Pipeline, Catalyst Calendar, Patent Cliff Countdown, Conference Countdown, and What If) leave the grid 30 days after that date unless rewritten.
- **The Failure Files** cites every claim about harm, and it says only what the cited records say.

### Library size for launch

| Show | Segments by Monday 23 November |
|---|---|
| This Day in Approvals | automatic, every day |
| Catalyst Calendar | automatic, every day |
| How It Works | 10 |
| Blockbuster | 5 |
| The Failure Files | 5 |
| Ad Break | 5 |
| Future Pipeline | 5 |

The others come after launch. Trial vs Trial and Name That Mechanism are the cheapest to add next.

## 4. Sources

All requests send `User-Agent: DNBC/0.1 (<DNBC_CONTACT>)`. SEC requires a contact name and email address. `DNBC_CONTACT` is an environment variable: a GitHub Actions secret in production and `.env` locally (git-ignored). Aaron chose the contact on 2026-11-18 and sets the secret himself. The address is never written in the repo, because the repo is public.

| Source | Tier | Method | Every | Notes |
|---|---|---|---|---|
| ClinicalTrials.gov API v2 | primary | `query.term=AREA[LastUpdatePostDate]RANGE[<yesterday>,MAX]` | 24 h (data refreshes once a day) | seed a slim snapshot (NCT id, sponsor, phase, status, interventions, conditions, and dates) of the about 115,000 industry interventional studies first, in Phase 1. Records rarely change phase, so a **phase move** is a new registration at a later phase for the same drug and sponsor. Also status changes and results posted |
| FDA press releases and novel approvals | primary | RSS (returns 200) | 1 h | |
| FDA CRLs | primary | openFDA `transparency/crl.json` | 24 h | `letter_date` is an MM/DD/YYYY string, so range and sort fail. Pull this year and last by `letter_year` and filter dates in code |
| PDUFA and adcomm dates | primary | parsed from company releases and the FDA adcomm calendar page | with the wires | FDA publishes no PDUFA calendar |
| SEC EDGAR 8-Ks for a list of biotech CIKs | primary | full-text search (returns 200 with a User-Agent), then Exhibit 99.1 for the news text | 15 min | the 8-K atom feed returned 0 entries in review, so it's not used |
| PR Newswire and Business Wire health feeds | primary | RSS. PR Newswire: `health-latest-news-list`, `biotechnology-list`, and `pharmaceuticals-list` all return 200 | 15 min | GlobeNewswire dropped, because it returned 403. Business Wire feeds are keyed by an id, and a wrong id returns 200 with an empty feed. No health id found yet, so Business Wire reads the `BUSINESSWIRE_FEEDS` secret (comma list) and is skipped until it is set |
| PubMed | primary | E-utilities, a fixed journal list | 24 h | preprints cut from launch |
| Drugs@FDA | primary | openFDA `drug/drugsfda.json` | 24 h | approval dates for This Day in Approvals. openFDA has no month-day search, so each past year's exact date is queried (about 80 requests, about 80 s), cached per day. BLAs appear too |
| FDA Orange and Purple Books | primary | the published data files | weekly | Patent Cliff Countdown |
| FDA guidance, history pages, Federal Register, and Nobel Prize pages | reference | fetched by hand per library segment and stored as items | by hand | library only |
| Bluesky | social | `app.bsky.feed.searchPosts`, with an app-password session when `BLUESKY_HANDLE` is set | 30 min | on 2026-11-18 unauthenticated public search returned 200 with posts (an earlier test got 403), so the app password is a fallback |
| Reddit | social | `data/quotes/reddit.json`, hand-filled from an allowlist of subreddits, stored without usernames | by hand | unauthenticated `.json` returned 403, and new OAuth apps need Reddit approval (reported as 1 to 4 weeks). Apply anyway, for after launch |
| LinkedIn | social | `data/quotes/linkedin.json`, hand-filled | by hand | posts sit behind login |

Cut from launch: EMA and preprints.

Every ingested item is stored as a `SourceItem`: `id`, `source`, `tier` (`primary`, `reference`, or `social`), `url`, `fetchedAt`, `publishedAt`, `title`, `text` (full text kept for the check), `entities` (drug, sponsor, NCT id, condition), and `kind`.

## 5. Pipeline

```
ingest  ->  stories  ->  write  ->  check  ->  schedule  ->  serve  ->  player
(GitHub    (dedupe,     (LLM, per   (rules +   (wheels,     (Vercel     (static page,
 Actions)   score)       format)     screen)    lock 30 m)   function,   UTC clock)
                                                             60 s cache)
```

1. **Ingest** jobs write `SourceItem`s to Neon.
2. **Stories.** Items about the same thing (same NCT id, drug, or 8-K event) are grouped into a `Story`. Stories are scored by recency, kind (approval > CRL > readout > deal > registration > paper > post), and number of primary sources. Haiku tags entities and kind. A story needs at least one primary item to air. Social items only add quotes.
3. **Write.** For each story and each format it fits, Sonnet writes a segment as beats in JSON, with each beat citing source item ids. Library segments are written from library briefs in `data/library/` with their reference items. Format templates go in `src/lib/channel/formats/`.
4. **Check** (rules, with no LLM except the patient screen). A segment is rejected when:
   - a beat cites no source item, or cites only `social` items for a fact (a number, date, outcome, or approval),
   - a number, date, or NCT id is not in a cited `primary` or `reference` item. Numbers and dates are normalised first ("45%", "45 percent", and "0.45"; "17 Nov" and "November 17"),
   - a drug or sponsor name is not in the story's entity list (the lexicon is the entities Haiku tagged from primary and reference items),
   - an outcome word (met, missed, approved, rejected, CRL, discontinued, halted, or withdrawn) is not in the same source sentence as the drug it is said of,
   - a `quote` is not whole sentences verbatim from its item, the speaker's name is not within 300 characters of it in the source, the item is from another story, or a live quote is older than 7 days,
   - a patient quote carries a username or link,
   - a beat runs over 40 words,
   - a segment has no "as of" date.

   **Patient screen.** Haiku checks each Reddit and Bluesky quote before it enters the pool. It drops quotes with cure claims, dosing or medical advice, or identifying details (names, places, dates of birth, and rare personal facts). Reddit quotes come only from the subreddit allowlist.

   A failed segment is rewritten once, then dropped. Failures go to a log the soak test reads.
5. **Schedule** builds the channel day (06:00 to 06:00 ET) at 03:00 ET, and patches it every 15 minutes for slots more than 30 minutes ahead. A slot inside 30 minutes, or already started, never changes.
6. **Serve.** The playlist stores each beat's start offset and duration, so viewers stay in sync whatever `timing.ts` says later. One Vercel function, `src/routes/api/channel/[name]/+server.ts`, reads Neon and returns `playlist` (today and tomorrow), `segments`, and `blocked`, with `Cache-Control: s-maxage=60, stale-while-revalidate=300`. The CDN answers almost every request, so the function runs about once a minute per region.
7. **Player** fetches the playlist, then the segments it names. It works out the current beat from UTC time, corrected by the offset from the server's `Date` header so a wrong device clock doesn't matter. It refetches the playlist and `blocked` every 60 s.

### Kill switch

A `blocked` table in Neon lists blocked segment and story ids. The player skips a blocked segment and shows the next one within 60 s. The scheduler never schedules it again. Add an id with `node scripts/block.mjs <id> "<reason>"`. It must work before launch.

### Stack (free plans, no Vercel Pro)

Vercel Pro is not needed, because no work runs on Vercel's timer. Checked on 2026-11-18:

| Limit on the free plan | Source | What we do |
|---|---|---|
| Vercel Hobby cron runs once a day, within a 59-minute window. A more frequent expression fails the deploy | vercel.com/docs/cron-jobs/usage-and-pricing | all jobs run in GitHub Actions |
| Vercel Hobby functions run for up to 300 s | vercel.com/docs/plans/hobby | the long jobs (ingest, write) run in Actions, which allows hours per job. Vercel only serves |
| Vercel Blob on Hobby allows 2,000 advanced operations a month, and going over locks Blob for 30 days (from Fable's review) | vercel.com/docs/vercel-blob/usage-and-pricing | Blob is not used. Neon plus one cached function serves everything |
| Vercel Hobby allows personal or non-commercial use only (Terms, section 4) | vercel.com/legal/terms | DNBC is a hobby project (Aaron, 2026-11-18) |
| GitHub Actions schedules run every 5 minutes at the most, can be delayed at busy times (most often at the top of the hour), and can be dropped under high load | docs.github.com, events that trigger workflows | schedules run off the hour (minutes 7, 22, 37, and 52). Slots lock 30 minutes ahead, and the 24-hour buffer of library and earlier segments covers a missed run |
| GitHub Actions is free on standard runners in public repos. Private repos get $12 of compute a month (about 2,000 Linux minutes), and a 15-minute schedule would use more than that | docs.github.com, Actions billing | the repo is public on GitHub. Secrets stay in Actions secrets. Nothing in the repo is private, because quote files are stored without usernames |
| GitHub disables scheduled workflows in a public repo after 60 days with no repo activity | same | fine for a demo. A monthly library refresh commit keeps it active |

| Part | Choice |
|---|---|
| App | SvelteKit 2, Svelte 5, TypeScript, Tailwind v4 (same as PIQHome) |
| Host | Vercel Hobby, its own project in "saehyunjun's projects". It serves the player page and the one cached function |
| Database | Neon Postgres, free plan (through the Vercel Marketplace), for items, stories, segments, the schedule, and `blocked`. The CT.gov snapshot is slim, so storage stays well under the free limit (to confirm in Phase 0) |
| Jobs | GitHub Actions workflows in `.github/workflows/`: `ingest.yml` (every 15 min), `daily.yml` (CT.gov, Drugs@FDA, openFDA, and PubMed), and `produce.yml` (stories, write, check, and schedule, every 15 min). Each uses a `concurrency` group so runs never overlap. They run `npm run job -- <name>` (`scripts/jobs/run.ts`), which calls `src/lib/ingest/` and `src/lib/pipeline/` |
| Secrets | Actions secrets: `DATABASE_URL`, `AI_GATEWAY_API_KEY`, `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, and `DNBC_CONTACT`. Vercel holds only `DATABASE_URL` |
| LLM | AI Gateway. `anthropic/claude-sonnet-5.5` for writing, `anthropic/claude-haiku-5.5` for tagging and the patient screen. Daily spend cap set in the gateway |
| Checks | `playwright-core` headless suite, `node scripts/check.mjs <out-dir> <port>` |

### File map (planned)

| Path | Role |
|---|---|
| `src/routes/+page.svelte` | the channel player |
| `src/routes/schedule/+page.svelte` | the TV guide for today and tomorrow |
| `src/routes/study/[template]/+page.svelte` | one study page per format (dev and review) |
| `src/routes/api/channel/[name]/+server.ts` | serves `playlist`, `segments`, and `blocked` from Neon, cached for 60 s |
| `src/lib/channel/grid.ts` | weekday, weekend, and holiday grids, with each show's format, story filter, and library slots |
| `src/lib/channel/cast.ts` | fictional cast |
| `src/lib/channel/formats/` | live formats `headlines`, `pipeline`, `readout`, `panel`, and `voices`, plus library formats `day-in-approvals`, `catalyst`, `explainer`, and `story` (for Blockbuster, The Failure Files, Ad Break, and Future Pipeline) |
| `src/lib/channel/timing.ts` | hold-time settings, used at write time |
| `src/lib/channel/clock.ts` | UTC plus offset to the current show, segment, and beat |
| `src/lib/ingest/<source>.ts` | one module per source |
| `src/lib/ingest/http.ts` | the shared fetch, which sets the User-Agent from `DNBC_CONTACT` and fails fast when it is unset |
| `src/lib/pipeline/{stories,write,check,screen,schedule}.ts` | pipeline stages |
| `scripts/jobs/{ingest,daily,produce}.mjs` | entry points the Actions workflows run |
| `.github/workflows/` | the three schedules |
| `data/library/` | one brief per library segment: show, topic, and reference item URLs |
| `data/quotes/{reddit,linkedin}.json` | hand-filled quotes |
| `data/subreddits.json` | allowlist |
| `scripts/check.mjs` | headless suite |
| `scripts/soak.mjs` | runs the clock across a simulated 24 hours on fixtures and reports gaps, repeats, and check failures |
| `scripts/block.mjs` | adds an id to `blocked` |
| `fixtures/` | a frozen day of source items and segments, for offline tests and the day-one fallback |

## 6. Phases

Each phase ends with `npm run check` (0 errors), the headless suite, screenshots at desktop (1440 x 900) and phone (390 x 844) of every state the phase touched, and an update to this plan, `CHANGELOG.md`, and `CLAUDE.md`.

| # | Day | Goal | Done when |
|---|---|---|---|
| 0 | Wed 18 | Plan | v3 written. `CLAUDE.md` and `docs/SHOWS.md` written. Neon free limits confirmed. Public GitHub repo created and pushed. Aaron has set the Actions secrets |
| 1 | Thu 19 | Ingest | 9 automated sources write `SourceItem`s to Neon, and the CT.gov snapshot is seeded. A dry run makes at least 50 stories with entities. The fixture day is frozen. **`ingest.yml` and `daily.yml` run on schedule from Thursday night**, so stories build up before launch. **Status 2026-11-18:** built a day early. 7 of 9 sources live, 180 stories (129 airable), fixture day frozen. The schedule waits on the Actions secrets (section 10). Business Wire and EDGAR not live |
| 2 | Fri 20 | Write and check | the 5 live formats and 4 library formats. 120 live segments from the fixture day pass the check, and the check catches 15 planted bad segments (one per rule, plus wrong speaker, reversed outcome, and social-only fact). The patient screen drops 5 planted bad quotes. The 30 written-ahead library segments pass. Reddit and LinkedIn files have 20 quotes each. **Status 2026-11-19:** template writer (pipeline, FDA releases, CRLs, This Day in Approvals, Catalyst Calendar, Pipeline Profile), 10 model-written live segments and 30 written-ahead library segments from session subagents (the AI Gateway free tier blocks Claude models), all through the check. 184 segments in Neon. Scheduler `src/lib/pipeline/schedule.ts` built early from Phase 4: 2026-11-19 is 0% padding, 43% live and 57% library. Patient screen and quote files not done |
| 3 | Sat 21 | Player | every beat type and format draws at both sizes. Two browsers with clocks set 90 s apart land on the same beat. The ticker, up-next strip, `/schedule`, and kill switch work **Status 2026-11-19:** built a day early. Player at `/`, `/schedule`, `/study/<beat type or all>`, the cached API (`playlist`, `segments`, `blocked`, plus an uncached `time` read for the clock offset), `npm run block`. All 10 beat types draw at both sizes. Headless suite `scripts/check.mjs`, 154 of 154. Not done: the quiz beat has no real data yet, and the 10-minute memory check is not written |
| 4 | Sun 22 | Schedule and soak | `soak.mjs` on a simulated 24 hours of fixtures finds no empty wheel, no repeat that breaks the live or library rules, and no blocked or failed segment on air. The same check passes on the weekend and holiday grids. `produce.yml` runs on schedule from Sunday morning, and Sunday evening's wheels are watched live. Watch notes are fixed. Added 2026-11-19 from PNN: a rehearsal runs the next day's playlist through the headless player at the shifted clock (`?t=`) before the playlist is published, and fails on an empty wheel, a clipped beat, or a blocked segment |
| 5 | Mon 23 | Launch | public at a domain, with a link preview image and a card on PIQHome `/experiments`. Holiday grid set for 26 and 27 November |

If time runs short, cut in this order: the `pipeline` beat (Pipeline Open and Close then use Headlines), Lab Notes, LinkedIn, Mad Science, the `timeline` beat, and then the written-ahead library down to How It Works (This Day in Approvals and Catalyst Calendar stay, because they are automatic).

### Headless checks (target about 70 by Phase 4)

- Clock: the same corrected UTC time gives the same beat. Slot edges, 06:00 day start, midnight, the weekend switch, the holiday grid, and a device clock 90 s off.
- Player: each beat type renders, with no text overflow at either size and no page errors. Holding a beat for 10 minutes doesn't leak memory. A blocked segment is skipped within 60 s.
- Check stage: each reject rule fires on a planted segment, and a clean one passes. Number and date normalisation doesn't reject a matching fact.
- Screen: each kind of bad patient quote is dropped.
- Schedule: every wheel is filled for 7 days on each grid. Fallbacks work in order. A slot inside 30 minutes stays unchanged after a patch. Library segments keep to once a day and 3 times a week. Forward-looking segments past 30 days are left out.
- Interviews: the beat before each quote is a statement, not a question. Patient quotes show no username or link. Bluesky quotes show a handle only.
- Serve: the function sends the 60 s cache header and the server `Date` header.
- Pages: `/` and `/schedule` load in under 2 s on the preview build.

### Fill rules as built (2026-11-19)

Template segments run about 35 s, not the 2 to 3 minutes the plan assumed, so the fill needs repeats:

- 21:00 to 07:00 ET is reruns and library hours, cycled as often as needed (Aaron 2026-11-18). Morning Dose is 07:00 to 09:00, and 06:00 to 07:00 is reruns.
- Pass 1: a live segment airs in at most 3 daytime hours. Pass 2, only for a short wheel: up to 6 hours, never in the hour next to one it already airs in. Pass 3: a show with no segments of its kinds takes other live segments under the same rules.
- Library hours cycle the whole library. A wheel still short after pass 3 cycles the library too, so a library segment can air twice a day.

## 7. Risks

| Risk | Guard |
|---|---|
| A wrong FDA decision or trial result goes on air under the PatientlyIQ name | facts from primary sources only, the outcome-word rule, and the kill switch |
| History shows repeat a popular but wrong story | facts from `primary` or `reference` items only, with the same check |
| The Failure Files names companies over real harms | every claim cited, and only what the records say |
| Real people quoted out of context or misattributed | whole sentences, speaker name near the quote, the same story, a 7-day limit on live quotes, and a statement of origin before the quote |
| Patient quotes with harmful or identifying content | subreddit allowlist, Haiku screen, and no username or link |
| GitHub Actions runs delayed or dropped | off-hour schedules, 30-minute slot lock, and the library and earlier-day fallbacks |
| Too few stories on a quiet day | library slots first, then earlier-day fallbacks, and the holiday grid |
| LLM spend | gateway daily cap. Segments are written once and reused |
| Five days is short | the cut order in section 6 |

## 8. Out of scope for launch

Voices and sound, avatars or video, viewer polls, accounts, market prices, EMA, preprints, automated Reddit, non-English sources, and a mobile app.

## 9. Not verified

- Neon free plan storage and compute limits.
- Reddit OAuth approval time.
- Why the EDGAR 8-K atom feed returned 0 entries, and whether GlobeNewswire answers a real User-Agent.
- Bluesky search from GitHub's runners.
- EDGAR full-text search field names (`_id`, `file_type`, `sics`, `display_names`) are from memory and untested, because the job needs `DNBC_CONTACT`. The first real run shows whether they are right.

## 10. Open for Aaron


- Domain.
- Set the Actions secrets in `saehyunjun/dnbc` (Settings, Secrets and variables, Actions). `DATABASE_URL` is the Neon `DATABASE_URL` in `.env.local` (from `vercel env pull`). `DNBC_CONTACT` is the SEC contact. Optional: `BUSINESSWIRE_FEEDS` (a health feed URL from Business Wire's RSS builder) and `BLUESKY_HANDLE` plus `BLUESKY_APP_PASSWORD`. Until `DATABASE_URL` is set, both workflows start and skip.

- Model writing for live shows. Automated runs need AI Gateway credits beyond the free tier (Claude models return 403 on it) and an `AI_GATEWAY_API_KEY` secret. Until then live shows run on templates plus segments written by session subagents.

## 11. Review log

| Date | Reviewer | Result |
|---|---|---|
| 2026-11-18 | Fable | v1 not ready: Reddit ingest fails, the soak rule couldn't pass at the planned volume, and there was no kill switch. v2 fixes: 30-minute wheels and a new repeat rule, stricter check rules and a patient screen, statement-of-origin interviews, Neon plus versioned Blob files, the kill switch, stored beat timing and clock correction, corrected source methods and model ids, cuts to 5 formats, and ingest running from Thursday night |
| 2026-11-18 | Aaron, then Claude | v3: name DNBC, SEC contact chosen (kept in a secret), and library shows added (section 3). Pro checked against Vercel and GitHub docs and found not needed. Jobs move to GitHub Actions in a public repo, and serving moves from Blob to Neon plus one cached function. Not yet reviewed by Fable |

| 2026-11-19 | Fable | `docs/ANALYSIS.md` v1 ("so what" analysis layer): not ready. The check passed 11 planted wrong analysis beats, own-matcher counts are unreliable, and the plan did not fit before Monday. v2 adds a derived tier with a row rule and word rules, lets ClinicalTrials.gov do the grouping, and cuts the launch slice to Landscape for registrations (`docs/ANALYSIS.md` section 9) |
| 2026-11-19 | Fable | Gap review of the neurology scope: not ready as planned; G1 to G12 and the cut list in section 0 |

## 12. Lessons from PNN (2026-11-19)

PNN (pnn.watch) is a 24/7 AI news channel about crypto and the internet, built by one person with Claude Code. Aaron shared the builder's post on 2026-11-19. Every claim below is from that post and not checked by us.

### What PNN does that we take

| PNN practice | Here | Where |
|---|---|---|
| About 15,000 sourced facts in a research library, checked by a second agent before they are added | a neurology fact library: one sentence per fact with its source item, checked by a second session subagent before saving. Library shows, the Professor, and analysis lines draw only from it. Fable's "derived tier" (`docs/ANALYSIS.md` section 9) becomes one kind of fact | phase N3a |
| A number that does not match the data is rewritten or the line is killed | we already drop failing optional beats. Add one rewrite attempt for subagent-written segments before a beat is dropped, then drop | `import-segments` |
| Parody guests speak only from sourced research sheets, with a second standards check | every cast member speaks only from cited items or facts. That is our rule already. Opinion segments keep the Opinion label | `docs/SHOWS.md` |
| Characters remember earlier coverage | continuity lines: when a story's drug or trial was covered before, an anchor line says when ("We first covered this trial on 12 November"), taken from the segments store, so it can be checked. No invented memories | after launch |
| One shared timeline that everyone sees at the same moment | already built (`src/lib/channel/clock.ts`, playlist per day) | done |
| Changes run against a time-shifted copy of the station before going live | a rehearsal of the next day's playlist in the headless player before it is published | Phase 4 |
| About 2,500 checks run before each push | we have 186 headless and 94 unit checks. Every phase adds checks for what it changes | every phase |
| Cheap model for routine lines, stronger model for big shows and fact checks | if AI Gateway credits are approved: Haiku writes template-like segments, Sonnet writes panels and checks facts. Until then, session subagents do both | section 10 |
| Nothing is written when nobody is watching | not needed while writing costs nothing. If paid writing starts, live writing pauses when Vercel Analytics shows no viewers in the past hour | later |
| Distinct shows with a fixed premise and recurring characters | keep the six-character cast with fixed roles. A recurring bit per show is allowed if it is about the format, not a real person | `docs/SHOWS.md` |

### What we do not take

| PNN practice | Why not |
|---|---|
| Voices, music, house bands, lip sync | text only is a launch rule (section 8). It keeps writing cheap and the check simple |
| Parodies of real people | real patients, doctors, and companies in a health channel. A parody line can be read as a medical claim |
| Feuds, walk-offs, and opinions the cast holds about each other | the cast may disagree on how to read a trial design, never about each other. Drama pulls attention from the facts |
| Running on a home computer | we run on GitHub Actions, Neon, and Vercel free plans so it keeps going without Aaron's machine |
