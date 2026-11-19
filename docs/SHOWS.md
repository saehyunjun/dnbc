# DNBC show bible

Tone and beat order per show. The grid and show data are in `src/lib/channel/grid.ts`. The rules for facts and quotes are in `docs/PLAN.md` sections 2 and 5.

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
