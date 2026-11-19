# DNBC show bible

Tone and beat order per show. Since 2026-11-19 every show covers neurology only (`docs/PLAN.md` section 0). The grid and show data are in `src/lib/channel/grid.ts`. The rules for facts and quotes are in `docs/PLAN.md` sections 2 and 5.

## House style on screen

- Plain words a patient could follow. Define a term the first time ("a CRL, the FDA's letter saying it can't approve yet").
- Lines are short: at most 40 words a beat, and usually under 20.
- No hype words ("breakthrough", "game-changer", "miracle") unless quoting.
- Numbers carry their unit and source.
- Opinion segments carry the Opinion label on every beat.
- Every segment opens with a `headline` beat and closes with an `anchor` line or a `bumper`.

## Live formats

| Format | Used by | Beat order |
|---|---|---|
| `headlines` | Morning Dose, Trial Desk, Deal Desk, Regulatory Hour, Lab Notes | `headline`, `anchor` (what happened), `stat` or `timeline` (optional), `quote` (optional, with its origin line first), `anchor` (why it matters) |
| `pipeline` | Pipeline Open, Pipeline Close | `headline`, `pipeline` (trials by phase, new one highlighted), `anchor` (what moved), `list` (other moves the same day, optional) |
| `readout` | Readout | `headline`, `anchor` (the question the trial asked), `stat` (primary endpoint), `timeline`, `quote` (optional), `panel` (Clinician and Skeptic), `anchor` (what's next) |
| `panel` | Fast Science, Mad Science | `headline`, `anchor` (set-up), `panel` (two or three lines), `anchor` (wrap). Mad Science uses one host, the Professor, and is labelled Opinion |
| `voices` | Patient Desk | `headline` (topic), `anchor` (context), then two or three `quote` beats from patients, each after an origin line, then `anchor` (the Advocate's summary) |

## Library formats

| Format | Used by | Beat order |
|---|---|---|
| `day-in-approvals` | This Day in Approvals | `headline` ("On this day in 1987"), `stat` (drug and condition), `anchor` (what it changed) |
| `catalyst` | Catalyst Calendar | `headline`, `list` (trials due to read out in the next 30 days), `anchor` |
| `explainer` | How It Works, Molecule of the Week | `headline`, `anchor` (the question), two or three `list` or `stat` beats, `anchor` (one-line takeaway) |
| `story` | Blockbuster, The Failure Files, Ad Break, Future Pipeline, Lab Legends, Rare Ones | `headline`, `timeline`, three to five `anchor` and `stat` beats, `quote` (optional), `anchor` (what it changed or what to watch) |

## Cast voice

| Character | Voice on screen |
|---|---|
| Dana Mercer, morning anchor | brisk, sets the facts out first |
| Theo Park, afternoon anchor | calm, connects the day's stories |
| Dr. Ines Alvarado, the Clinician | reads the design: endpoints, controls, size |
| Marcus Hale, the Skeptic | asks what could go wrong, without sneering |
| Priya Nair, the Advocate | the patient's view: access, burden, waiting |
| Prof. Walt Okafor, the Professor | history and opinion, with a long view |

All six are fictional and tagged "AI character" on screen.

## Neurology library (2026-11-19)

Candidates from memory. Every date and fact is checked against a primary or reference source before a segment is written.

| Show | Neurology segments | Launch count |
|---|---|---|
| This Day in Approvals | neurology drugs only (levodopa, the first MS interferons, nusinersen, onasemnogene, the anti-CGRP migraine drugs, lecanemab, tofersen) | automatic |
| Catalyst Calendar | neurology trials due to read out in 30 days | automatic |
| How It Works | accelerated approval on a biomarker (amyloid, neurofilament), natural-history controls in rare disease, gene therapy dosing, the blood-brain barrier, functional rating scales (ALSFRS-R, CDR-SB, EDSS) | 6 |
| Blockbuster | levodopa, the MS drugs, nusinersen, onasemnogene | 3 |
| The Failure Files | aducanumab, the amyloid trials before it, ALS drugs withdrawn after confirmatory trials | 3 |
| Rare Ones | SMA, Duchenne, Rett, Batten, and the advocates behind each | 4 |
| Future Pipeline | gene therapy and antisense in the brain, anti-tau, brain shuttles, neuromodulation | 3 |

Live shows keep their formats. Patient Desk draws only from neurology communities.

## Cast rules (2026-11-19, from the PNN review)

- A cast member says only what a cited item or a fact in the fact library says. Opinion segments carry the Opinion label.
- The cast may disagree about how to read a trial or a decision. They never argue about each other, and nobody leaves the set.
- A recurring bit belongs to a show's format (the Professor's chalkboard, the Skeptic's "what could go wrong" question). It never imitates a real person.
- Continuity lines ("We first covered this trial on 12 November") come from the segments store. No invented memories.
