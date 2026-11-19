# DNBC analysis layer: "so what" segments

v2, 2026-11-19. v1 was reviewed by Fable the same day (verdict: not ready). Section 9 records the review and the decisions it changed. Where section 9 and sections 3 to 8 disagree, section 9 wins. Asked for by Aaron on 2026-11-19.

## 1. The problem

Today a segment restates one source item. For example:

> The Phase 1/2 trial NCT07941362 tests 177Lu-ACT319 in FAP-expressing Solid Tumors and plans to enroll 182 people.

That is a ticker line. It tells a viewer what happened but not why it matters. Aaron's direction:

- Simple statements of fact go to the ticker, not the main screen.
- The main screen carries "so what" analysis: comparative, competitive, and historical context.
- Sources are footnotes, never spoken lines (done 2026-11-19, `Segment.citations`).
- Anchors and panelists get avatars (in progress).

The constraint is unchanged. Every number, date, drug, and outcome on screen must trace to a stored source and pass the rule-based check (`src/lib/pipeline/check.ts`). Analysis cannot become opinion presented as fact.

## 2. What the same story looks like with analysis

These are real counts from the Neon trial snapshot on 2026-11-19, using rough text matching. Section 6 explains why the matching itself is the hardest part.

| Beat | Text on screen | Where the facts come from |
|---|---|---|
| headline | Actithera registers a Phase 1/2 radioligand trial in pancreatic and biliary cancer (not yet recruiting) | the registration |
| anchor | 177Lu-ACT319 carries a radioactive payload to a protein on the tumour's support cells. | registration plus a mechanism lexicon entry |
| race (new beat) | Active trials of lutetium-177 drugs: 21 Phase 1, 13 Phase 1/2, 3 Phase 2, 8 Phase 3 | derived count over the snapshot |
| compare (new beat) | Novartis leads with 11 active lutetium-177 trials. Radiopharm, ITM, and Telix have 3 each | derived count over the snapshot |
| benchmark (new beat) | 182 planned patients against the median for Phase 1/2 oncology trials | derived median over the snapshot |
| panel | Clinician: what the design can and cannot show. Skeptic: radioligands in pancreatic cancer have a hard bar, given how hard these tumours are to reach | lexicon and reference items, checked like any other beat |
| ticker (not main screen) | NCT07941362 registered 17 Nov, primary completion July 2029 | the registration |

The viewer learns the field is crowded early and thin late, who has the most shots on goal, and whether this trial is large or small for its type.

## 3. Design

### 3.1 Derived facts are source items

A new item tier, `derived`, holds facts that DNBC computes from stored primary data. Each derived item stores:

- the question in plain words ("active trials of lutetium-177 drugs, by phase"),
- the exact query and its parameters,
- the snapshot date it ran against,
- the result rows, written out as sentences in `text` so the existing number and date check can read them,
- a link a viewer can follow to reproduce it, usually a ClinicalTrials.gov search URL.

Footnotes show these as "DNBC count of ClinicalTrials.gov, 19 Nov 2026" with the search link. Because a derived item is just another `SourceItem`, the check, citations, and the scheduler need no special path. The check treats `derived` like `primary` for numbers, but never for outcome words (met, approved, and so on).

### 3.2 Analysis types (first set)

| Type | Question | Inputs | Beat |
|---|---|---|---|
| Landscape | How many active trials target this condition or mechanism, by phase? | snapshot | `race` |
| Competitors | Which sponsors have the most active trials in this space, and who is furthest along? | snapshot | `compare` |
| Benchmark | Is this trial large, small, long, or short for its phase and therapy area? | snapshot medians | `benchmark` |
| Approved options | What is already approved for this condition, and when? | Drugs@FDA, labels | `list` or `timeline` |
| Sponsor context | How concentrated is this sponsor's pipeline, and what are its recent approvals and complete response letters? | snapshot, Drugs@FDA, CRLs | `pipeline`, `list` |
| Base rates | How often do drugs in this phase and area reach approval? | reference items (published success-rate studies), not our own computation | `stat`, labelled as a historical average |
| Momentum | Are registrations in this space rising or falling against the same quarter last year? | snapshot first-posted dates | `stat` |
| Readout context | How does this result compare with the approved standard's published result? | press release plus a reference label or paper | `compare`, Clinician line |

Each type is a pure function: `(story, store) => DerivedItem[]`. Each runs only when its inputs resolve cleanly (section 6). A story gets the one to three analyses that fit its kind:

| Story kind | Analyses |
|---|---|
| registration, status change | Landscape, Competitors, Benchmark |
| readout, results | Readout context, Approved options, Base rates |
| approval, CRL | Approved options, Sponsor context, Competitors |
| deal | Sponsor context, Landscape for the licensed asset |
| paper | Approved options, Landscape |

### 3.3 New beat types

| Beat | Shows | Data |
|---|---|---|
| `race` | horizontal lanes by phase, with this story's drug marked | counts by phase, highlighted entry |
| `compare` | a small table of 2 to 5 rows | rows of sponsor or drug, phase, status, date |
| `benchmark` | this value on a range, with the median marked | value, median, quartiles, n |

All three carry `sources` like every beat, so they get footnotes.

### 3.4 Writing

The numbers come from templates. The analysis types return structured rows, and a template turns them into `race`, `compare`, and `benchmark` beats with no model. That part works now, with no AI Gateway credits.

The "so what" sentences (the anchor's framing and the panel lines) need a model. The writer gets the story's primary items plus its derived items and must cite them. The check runs unchanged. Until credits exist, session subagents write these the way the 40 segments on 2026-11-19 were written, through `import-segments`.

### 3.5 Main screen and ticker

- A live segment airs on the main screen only if it has at least one analysis beat (`race`, `compare`, `benchmark`, or a Clinician or Skeptic line that cites a derived or reference item).
- A story with no analysis that passes becomes ticker lines only: headline plus one fact, with a footnote marker on the ticker.
- Library shows are unchanged. They are already explanatory.

This lowers main-screen volume sharply. The scheduler's library and rerun fallbacks cover the gap, and section 7 asks whether that is acceptable.

### 3.6 Precompute

The trial snapshot has 114,576 rows (69 MB) and a full read over Neon's HTTP driver times out. Analyses therefore run as SQL aggregates in Neon, not in Node. A daily job materialises the common aggregates into a `facts` table:

- counts by condition group, mechanism, phase, and status,
- counts by sponsor and phase,
- enrollment and duration quartiles by therapy area and phase.

Per-story queries then read `facts` plus a few targeted lookups. Neon free-plan compute limits are not yet checked against this load.

## 4. Pipeline change

```
ingest -> stories -> ANALYSE (new) -> write -> check -> route (main or ticker) -> schedule
```

`analyse` runs after `stories` in the 15-minute job. It resolves entities, picks analyses by story kind, runs them, and saves derived items with the story's id.

## 5. Guardrails

- Scope every count: "active trials on ClinicalTrials.gov", never "in development". The snapshot holds industry-sponsored interventional trials only, and the copy must say so where it matters.
- No "first", "only", or "leading" unless the query proves it within the stated scope, and the beat states that scope.
- No probability of success for a named drug. Base rates are shown only as historical averages for a phase and area, labelled as such, and cited to the published study.
- No stock prices, market talk, or buy and sell language. A race beat ranks by phase reached, not by likely winner.
- The Professor's opinion segments keep the Opinion label. Analysis segments are not opinion and must not use opinion words ("I think", "should").
- A derived number older than its snapshot by more than 2 days is not aired.

## 6. Entity resolution, the hard part

Analysis is only as good as grouping "the same thing":

- **Abbreviations collide.** In the snapshot, "FAP" matches fibroblast activation protein (the target in the example) and familial adenomatous polyposis (a disease). A text match counted 8 completed Phase 3 "FAP" trials, which are almost certainly polyposis trials.
- **Mechanisms are not in the registry.** CT.gov lists intervention names, not targets. 177Lu-ACT319's target comes only from the press release or the sponsor's site.
- **Sponsors have many spellings.** "Janssen Research & Development, LLC" and "Janssen Pharmaceutica N.V." are one company.
- **Conditions vary.** "PDAC", "Pancreatic Ductal Adenocarcinoma", and "pancreatic cancer" should group together. CT.gov provides MeSH terms that the slim snapshot does not keep.

Options:

1. **MeSH from CT.gov.** Re-seed the snapshot with `conditionBrowseModule` MeSH terms and ancestors, so conditions group by MeSH tree. This is free and deterministic, and the best first step.
2. **Drug to target lexicon.** Seed from ChEMBL (free API, drug synonyms to targets) and INN stems. Add model tagging (Haiku, cached per drug) for code names ChEMBL lacks. Store the tag with its evidence item, and treat a model-tagged target as unverified until a primary item states it.
3. **Sponsor aliases.** A hand-kept alias file for the top 200 sponsors, plus a parent-company map. Small, high value.
4. **Refuse when unsure.** An analysis runs only when every entity it groups on resolves to one canonical id. Otherwise the story falls back to ticker lines. A wrong comparison is worse than none.

## 7. Questions for review

1. Is a `derived` source tier sound, or should derived facts live outside `SourceItem` with their own check rule?
2. Is "main screen needs at least one analysis beat" the right line, given it cuts live volume and raises library repeats?
3. Which three analysis types should ship first by Monday 23 November? Proposal: Landscape, Competitors, and Benchmark, because they need only the snapshot.
4. Are the guardrails in section 5 enough to keep competitive framing from reading as investment advice?
5. Entity resolution: MeSH re-seed plus a sponsor alias file first, with ChEMBL and model tagging after launch. Agree?
6. Should base rates come from one published study (and which), or be left out until the source choice is reviewed?
7. What else would a drug-development viewer expect a "so what" segment to answer?

## 8. Phase plan if approved

| # | Goal | Done when |
|---|---|---|
| A1 | Data | Snapshot re-seeded with MeSH terms, sponsor alias file for the top 200 sponsors, `facts` table built daily |
| A2 | Analyses | Landscape, Competitors, and Benchmark as pure functions with unit tests on fixed rows, saving `derived` items |
| A3 | Beats | `race`, `compare`, and `benchmark` in the player at both sizes, in the headless suite |
| A4 | Routing | Main screen or ticker routing, ticker footnotes, scheduler fill measured again |
| A5 | Writing | Framing and panel lines over derived items, by subagents now and the model writer later, all through the check |

## 9. Fable review, 2026-11-19, and v2 decisions

Verdict on v1: not ready. The direction is sound, but the check cannot hold the claims the design adds, and A1 to A5 do not fit before Monday.

### What the review found

| Finding | Effect |
|---|---|
| 11 planted wrong beats citing a landscape item all passed `checkSegment`: swapped sponsor and count, counts moved between phases, wrong single digits (`numberKeys` skips them, `check.ts:94`), "first and only", a wrong median comparison, an invented mechanism, "177" from lutetium-177 used as a count, invented `pipeline` counts (`beatTexts` omits `phases[].count`, `check.ts:41`), a `list` calling an unapproved drug approved (`check.ts:234`), and "clear winner, takeover targets" | Section 3.1's "no special path" was wrong. A derived fact needs its own rule |
| The reviewer's text match gave 69 active lutetium-177 trials (18 at Phase 3, Novartis 21). Mine gave 45 (8, 11). Both matches catch unrelated trials (an actinium drug whose title names earlier 177Lu therapy, and saruparib) | Counts from our own matcher are not reliable enough to air |
| Trials are not drugs. ITM's two Phase 3 trials are one drug | `race` and "shots on goal" over-read trial counts |
| Sponsors roll up through acquisitions (AAA and Novartis, POINT and Lilly, RayzeBio) | A hand-kept parent map puts wrong rankings on air |
| `Trial.enrollment` mixes planned and final numbers, 4,174 trials have none, and 76,397 of 114,576 trials are completed, back to 1999 | Benchmarks need a defined population and a minimum n |
| A panel line passes the routing gate just by listing a derived id | Routing would favour Phase 1 registrations over approvals and readouts |
| Nothing enforces the 2-day freshness rule. `schedule` reads 7 days of segments and ignores `asOf`. There is no `produce.yml` | Section 5's freshness guardrail has no rule behind it |
| `stories.ts` joins non-social items by `url` and counts them as primary for `airable` | Derived items must stay out of `buildStories` |
| A footnote search link will not reproduce our filtered, grouped number | The link must reproduce the number exactly, or not be offered |
| Neon free-plan limits are still unverified | A MeSH re-seed must wait for that check |

### Decisions for v2

1. **Derived tier with its own rule.** Add `derived` to `Tier`. A derived item stores `meta.rows` (label, value, and scope). The check compares each beat value with its row, and counts single digits. Derived items are excluded from the outcome rule, from `airable`, and from `buildStories`. `catalystItem` and `profileItem` move to `derived`.
2. **Word rules.** "First", "only", "leads", "most", "largest", "crowded", "ahead", and "behind" pass only when a cited derived row carries that claim. "Winner", "bet", "upside", and "takeover" are banned. `race` is renamed `landscape`.
3. **Let ClinicalTrials.gov do the grouping.** For launch, the count is ClinicalTrials.gov's own total for the registration's condition term: "A ClinicalTrials.gov search for X returns N industry trials". That is true by construction, and the footnote link reproduces it. The API parameter for the total (`countTotal`) is from memory and must be checked.
4. **No routing gate at launch.** Analysed segments get a score bonus instead. The gate comes back once approvals and readouts also get analysis.
5. **Cut for launch:** Competitors ranking, Momentum, Readout context, Base rates (one library explainer that names its study instead), and Sponsor context. MeSH, ChEMBL, and the parent map come after launch.
6. **Added:** the drug's own registry path (`meta.priorTrials` and `meta.phaseMove` already exist), what the design can show (add `DesignAllocation` and `PrimaryOutcomeMeasure` to the CT.gov fields), the next dated event, and the share of the group that was terminated or withdrawn.

### Revised first slice (replaces section 8 for launch)

| # | Goal | Done when |
|---|---|---|
| S1 | Check | `derived` tier, the row rule, the word rules, `phases[].count` in `beatTexts`, and the 11 planted beats as unit cases that now fail the check |
| S2 | Landscape | For registration stories only: the ClinicalTrials.gov count for the condition term by phase, plus the drug's own history, saved as derived items. Refuse below a minimum n or on an ambiguous term, and fall back to today's segment |
| S3 | Beats | Existing `pipeline`, `stat`, and `list` beats only. No new beat types |
| S4 | So what lines | Fixed sentences chosen by rule from the rows ("No trial in this search has reached Phase 3"). No model |
| S5 | Fill | Score bonus for analysed segments, fill measured again. The ticker takes the plain fact lines |

Sections 3 to 8 stay as the longer-term design.

## 10. Neurology scope (2026-11-19)

Aaron narrowed DNBC to neurology (`docs/PLAN.md` section 0). This changes the launch slice in section 9:

1. **Condition terms are a fixed list.** S2 searches only the about 40 checked terms in `src/lib/channel/scope.ts`. A registration whose condition is not on the list gets no landscape. This removes the "ambiguous term" case.
2. **Counts can be checked by hand.** One area is small enough to compare each ClinicalTrials.gov count with a manual search before launch, condition by condition.
3. **Drug history is shorter.** Most neurology drugs have few earlier trials, so the history beat often has nothing to say. It is optional.
4. **A sponsor map becomes possible later.** About 30 sponsors run most neurology trials. A hand-kept parent map for them is small enough to review. It stays out of the launch slice.
5. **The example in section 2 is oncology.** A neurology example replaces it when S2 is built.
