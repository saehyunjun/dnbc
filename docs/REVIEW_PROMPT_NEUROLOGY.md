# Review prompt: neurology focus

Paste everything below the line into a fresh session (Claude, Codex, or a person) started in `~/drug-channel`. It reads the repo itself and changes nothing.

---

You are reviewing a scope change to DNBC, a 24/7 text-only "CNBC for drug development" channel built from FDA, ClinicalTrials.gov, SEC filings, press wires, papers, and patient posts. Public launch is planned for Monday 23 November 2026. On 2026-11-19 the owner narrowed it to neurological conditions only, to get the format right before expanding.

Read, in this order:
1. `docs/PLAN.md` section 0 (the scope, its numbers, and phases N1 to N5), then sections 2, 3, 6, and 7.
2. `docs/PLAN.md` section 12 (what we take from PNN, another 24/7 AI channel, and what we do not), and `docs/SHOWS.md`, the "Neurology library" and "Cast rules" sections.
3. `docs/ANALYSIS.md` sections 9 and 10 (the "so what" analysis layer and its launch slice).
4. `src/lib/channel/grid.ts`, `src/lib/pipeline/schedule.ts`, `src/lib/pipeline/stories.ts`, and `src/lib/pipeline/check.ts`, to judge whether the phases fit the code.

You may query the data read-only: `npx tsx` with `process.loadEnvFile('.env.local')` and the Neon client, tables `trials`, `items`, `stories`, `segments`, `playlists`. Never print `.env.local` or any secret. Do not edit, commit, or push.

Answer these:
1. **Is neurology the right first area?** Compare it with one or two other candidates (for example rare disease, or oncology narrowed to one tumour type) on daily news volume, how well the sources cover it, how risky errors are on air, and how much "so what" analysis the data can support. Use the store's numbers, not general knowledge.
2. **Is the scope list right?** Name conditions that should be added or dropped, and the hardest edge cases for a keyword or MeSH match (for example neuropathy as a side effect, nerve blocks, glioma, psychiatric overlap). Say whether psychiatry and brain cancers belong in or out, and why.
3. **Can the channel fill 24 hours?** With about 3 neurology stories a day and the library counts in `docs/SHOWS.md`, work out how often a viewer sees the same segment during a day and a week, and whether three live wheels are enough or too many.
4. **Do phases N1 to N4 fit before Monday?** Name the riskiest step, what to cut, and anything missing (for example what happens to the 168 out-of-scope segments, or to the ticker).
5. **Does the scope change the analysis plan enough?** Check whether the fixed condition list removes the problems in `docs/ANALYSIS.md` section 9, and which remain.
6. **What would make a neurology viewer stop watching?** Name the two most likely failures on screen.
7. **Is the fact library (phase N3a) the right size and design?** Say whether about 300 checked facts can feed the library shows and the analysis lines, and what a fact record must hold so the check can tie a number to its label.

Report:
- A verdict first: ready, ready with changes, or not ready.
- Then numbered findings, each with file and line or a query result as evidence, ranked by how much each would hurt the launch.
- Then the changes you would make to section 0, as replacement text.
- Mark anything said from memory rather than checked as "from memory".
Plain sentences, no em dashes, under 900 words.
