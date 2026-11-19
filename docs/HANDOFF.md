# Drug Channel: handoff

A 24/7 text-only TV channel about drug development, laid out like CNBC's schedule. It is a public demo app, with a launch target of Monday 23 November 2026.

- Repo: `~/drug-channel` (local git on `main`, no remote).
- Full plan: `docs/PLAN.md` (v2, reviewed by Fable on 2026-11-18).
- Status on 2026-11-18: plan only, no code.
- New in this doc and not yet in `PLAN.md`: the library shows in section 4.

## 1. Decisions already made

| Decision | Detail |
|---|---|
| Text only | every word is on screen. No voices, no sound, no avatars, no video |
| No stock talk | no market prices. Pipeline talk takes their place (phase moves, registrations, deals as pipeline changes) |
| Licensing | ignored. This is a demo app |
| Launch | public |
| Repo | `~/drug-channel` |
| Method | copied from Scorchball TV (https://scorchball.tv/how-it-was-built): docs first, shows and timings as data, content made before airtime, a static player on a shared UTC clock, one task per session, and watch-and-note fixes |

## 2. How the channel works

```
ingest  ->  stories  ->  write  ->  check  ->  schedule  ->  player
```

1. Jobs pull from FDA, ClinicalTrials.gov, SEC 8-Ks, PR Newswire, Business Wire, PubMed, and Bluesky. Reddit and LinkedIn quotes are added by hand.
2. Items about the same thing are grouped into stories and scored.
3. Sonnet writes each story as a segment for each format it fits. A segment is a list of on-screen beats (headline, anchor line, quote, panel, pipeline chart, timeline, stat, list, bumper).
4. A rule-based check rejects any segment with a fact, number, drug name, or quote not found in its primary sources. Haiku screens patient quotes.
5. The scheduler fills 30-minute blocks that each play twice per show hour. Slots lock 30 minutes before they air.
6. The player works out the current beat from UTC time, so every viewer sees the same thing. A kill switch file (`blocked.json`) pulls a segment off air within 60 seconds.

Stack: SvelteKit on Vercel (needs Pro), Neon for the story pool, Blob for published files, and AI Gateway for Sonnet 5.5 and Haiku 5.5.

## 3. Live shows (weekdays, ET)

The channel day runs 06:00 to 06:00 ET.

| ET | Modelled on | Show | Covers |
|---|---|---|---|
| 06–09 | Squawk Box | Morning Dose | overnight FDA actions, readouts, and 8-K news |
| 09–10 | Squawk on the Street | Pipeline Open | new trial registrations and phase moves |
| 10–12 | daytime | Trial Desk | rolling top stories |
| 12–14 | Power Lunch | Deal Desk | M&A, licensing, and financings as pipeline changes |
| 14–15 | Halftime Report | Readout | one trial result per segment, with quotes |
| 15–16 | (new) | Regulatory Hour | approvals, CRLs, and adcomms |
| 16–17 | Closing Bell | Pipeline Close | the day's moves by therapy area |
| 17–18 | Fast Money | Fast Science | three fictional panelists on the top four stories |
| 18–19 | Mad Money | Mad Science | one opinion host on one story |
| 19–20 | (new) | Patient Desk | screened patient and Bluesky quotes |
| 20–21 | (new) | Lab Notes | journal papers of the day |
| 21–06 | overnight | reruns and library shows | section 4 |

## 4. Library shows (proposed)

Live news can't fill 24 hours, and on quiet days (Thanksgiving week, weekends) it can't fill the daytime grid either. Library shows don't depend on the day's news. Each segment is written once, checked once, and can air for months.

CNBC does the same thing with its evening and weekend shows (American Greed, Shark Tank reruns, CNBC Originals documentaries).

### History

| Show | Modelled on | What it is | Sources | Made by |
|---|---|---|---|---|
| **This Day in Approvals** | "this day in history" spots | drugs the FDA approved on today's date in past years: the drug, the disease, and what it changed | Drugs@FDA approval dates, FDA labels, PubMed | automatic, a few segments every day |
| **Blockbuster** | CNBC Originals | the life of one big drug, from discovery to trials, approval, sales peak, and patent cliff (penicillin, insulin, statins, Humira, GLP-1s) | Drugs@FDA, PubMed, FDA history pages, company filings | written ahead |
| **The Failure Files** | American Greed | well-documented failures and withdrawals (thalidomide, Vioxx, torcetrapib), and what the rules changed after each | FDA records, Federal Register, PubMed | written ahead, documented facts only |
| **Ad Break** | (new) | the history of drug marketing: the 1997 FDA guidance that opened TV ads, the "ask your doctor" era, famous campaigns, and the rules on ads now | FDA guidance documents, Federal Register, PubMed | written ahead |
| **Lab Legends** | biography shows | scientists behind landmark drugs (Banting and Best, Gertrude Elion, Katalin Karikó) | PubMed, Nobel Prize pages | written ahead |
| **Rare Ones** | (new) | orphan drugs and the patient advocates who pushed for them, from the 1983 Orphan Drug Act on | FDA orphan designations, PubMed | written ahead. Ties to PatientlyIQ and the PIQHome rare pediatric vouchers page |

### Explainers

| Show | What it is | Sources | Made by |
|---|---|---|---|
| **How It Works** | one rule or process per segment: trial phases, PDUFA dates, accelerated approval, breakthrough designation, priority review vouchers, biosimilars, and patent cliffs | FDA guidance pages | written ahead, about 20 segments |
| **Molecule of the Week** | one mechanism drawn as beats (target, what the drug does, which drugs use it) | FDA labels, PubMed | written ahead, one a week |
| **Trial vs Trial** | two trials in the same disease compared side by side on design, endpoints, and size | ClinicalTrials.gov | automatic from registry data |
| **Name That Mechanism** | a quiz break between segments (clue, pause, answer) | FDA labels | written ahead, short interstitials |

### Forward-looking

| Show | What it is | Sources | Made by |
|---|---|---|---|
| **Future Pipeline** | where drug development is heading: AI-designed molecules now in trials, protein structure prediction, gene editing, cell therapy, and the next GLP-1s | ClinicalTrials.gov (trials by AI-first biotechs), PubMed, company releases | written ahead, refreshed monthly |
| **Catalyst Calendar** | trials due to read out in the next 30 days, and PDUFA dates from company releases | ClinicalTrials.gov primary completion dates, press wires | automatic, daily |
| **Patent Cliff Countdown** | big drugs losing exclusivity in the next few years, and who is ready with a biosimilar or generic | FDA Orange and Purple Books, company filings | written ahead, refreshed quarterly |
| **Conference Countdown** | what to watch at the next big meeting (ASH in early December, then JPM in January) | abstract releases, press wires | written ahead of each meeting |
| **What If** | a Fast Science panel on a future question ("What if AI cuts trial time in half?"), labelled Opinion | the Future Pipeline sources | written ahead |

### Where the library airs

| Slot | Mix |
|---|---|
| Weekday daytime | one library segment per 30-minute block (for example This Day in Approvals in Morning Dose, Catalyst Calendar in Pipeline Open, How It Works in Regulatory Hour) |
| Weekday 21:00–06:00 | reruns of the day, with a library hour every third hour |
| Weekends | mostly library shows, with one block of weekly reruns each morning and evening |
| Thanksgiving, 26 and 27 November | a holiday grid of Blockbuster, Lab Legends, and This Day in Approvals |

### Library size for launch

| Show | Segments by Monday 23 Nov |
|---|---|
| This Day in Approvals | automatic, every day |
| Catalyst Calendar | automatic, every day |
| How It Works | 10 |
| Blockbuster | 5 |
| The Failure Files | 5 |
| Ad Break | 5 |
| Future Pipeline | 5 |

The rest come after launch. Trial vs Trial and Name That Mechanism are the cheapest to add next.

### What the library needs that the plan doesn't have yet

- **A third source tier.** History pages, Nobel Prize pages, and review papers count as `reference` items. Facts in library segments may come from `primary` or `reference` items, never `social`.
- **A `library` flag on segments.** Library segments skip the 7-day rule for quotes and the "3 show hours a day" repeat rule. Instead, a library segment airs at most once a day and at most 3 times a week.
- **An "As of" date on every segment.** Forward-looking segments age. Each one shows its "as of" date and drops out of the grid after 30 days unless rewritten.
- **A Phase 2 add-on.** The 30 written-ahead library segments above, written from fixture source items and passed through the same check.

## 5. Interview rules

- Fictional cast members (two anchors, three panelists, and an opinion host) say everything except quotes. Each is tagged "AI character" on screen.
- Real people only appear in quote beats. A quote is one or more whole sentences, verbatim, from a stored source in the same story, dated within 7 days. The speaker's name must appear near the quote in the source.
- The anchor line before a quote states where it came from ("In a press release on 17 November, the CEO said"). It is never a question, so a quote never reads as an answer to us.
- Patients appear by community and date only, with no username and no link. Bluesky posts appear by handle.
- No invented words for real people, in any show, including the history shows.

## 6. Phases

| # | Day | Done when |
|---|---|---|
| 0 | Wed 18 | plan reviewed, Aaron's answers in, `CLAUDE.md` and `docs/SHOWS.md` written |
| 1 | Thu 19 | 7 sources write items to Neon, the trial registry snapshot is seeded, and ingest runs in production from Thursday night |
| 2 | Fri 20 | 5 formats, 120 fixture segments pass the check, 15 planted bad segments are caught, and the 30 library segments are written |
| 3 | Sat 21 | every beat and format draws at desktop and phone size, two browsers stay in sync, and the kill switch works |
| 4 | Sun 22 | a simulated 24-hour soak passes, and live jobs run from Sunday morning |
| 5 | Mon 23 | public launch at a domain, with a card on PIQHome `/experiments` |

Each phase ends with `npm run check`, the headless suite, desktop and phone screenshots, and a docs update.

If time runs short, cut in this order: the pipeline chart beat, Lab Notes, LinkedIn quotes, Mad Science, the timeline beat, and then library shows down to This Day in Approvals and Catalyst Calendar.

## 7. Risks

- A wrong FDA decision or trial result goes on air under the PatientlyIQ name. Guards: facts from primary sources only, outcome words checked against the source sentence, and the kill switch.
- History shows can repeat a popular but wrong story. Guard: the same check, with facts only from `primary` or `reference` items.
- Failure Files names companies over real harms. Guard: documented facts only, with every claim cited.
- Not verified yet: the Vercel plan, Reddit API approval time, why the SEC 8-K feed returned nothing in review, and whether Bluesky search works from Vercel.

## 8. Open decisions

Channel name?

Domain?

What contact name and email go in the User-Agent that SEC requires?

Is the Vercel account on Pro, or will this project move to Pro?

Is the library plan in section 4 approved to go into `PLAN.md`?
