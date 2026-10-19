# Teaching notes

## User preferences (stated 2026-10-18)
- **No exercises or homework.** Lectures only. Optional collapsed recall MCQs at the end are OK (not graded, zero effort). Never ask the user to go build or do something.
- **Phase 0 skipped**: networking, OS and DB basics are known at a basic-to-medium level. Only cover them if the user explicitly asks.
- **Sources:** cite the books in `resources/` first (link to `#page=N`). Use web sources only if the books don't cover the topic or explain it poorly.
- **Jargon:** keep it low. Every term gets a hover (`<span class="term" data-tip="...">`). If it's taught later, add `data-later="Phase N · Topic"` so the user knows it's coming and doesn't worry.
- **Glossary workflow:** when the user asks about a term that needs only 1–2 lines, spawn a background subagent that appends it to `glossary.md` (root) and returns nothing. Don't make separate HTML pages for single terms. Only give a term more attention if the user still finds it unclear.
- **Organisation:** `index.html` (root) = TOC for all lessons, so update it with every new lesson. Lessons go in phase subfolders: `lessons/phase-NN-<slug>/NNNN-<slug>.html`. Lesson numbers are global and sequential.
- Writing style: plain words, short sentences, ML-engineer framing ("In your world" callouts).

## Structure
- `BOOK_INDEX.md`: **check this first when preparing any lesson.** Topic → book + PDF page map by phase, full contents of each book, and query commands. Read only the listed page ranges from `resources/_extracted/`.
- `assets/course.css`, `assets/course.js`: shared styles, hover terms, recall MCQs, theme toggle
- `assets/perf-widgets.js`: .pct-explorer (percentile chart), .fanout-calc, .util-curve (reuse in Phase 9 / 15)
- Chart colours: --viz-1 blue, --viz-2 orange (validated with dataviz checker). Text never uses series colours.
- `assets/avail-widgets.js`: .nines-calc, .composite-calc (series/parallel availability)
- `assets/sim-session.js`: stateful vs stateless load-balancer simulator (reuse in Phase 8 LB lesson)
- `reference/*.html`: cheat sheets (one per topic cluster)
- `resources/_extracted/*.txt`: text extracts of the PDFs, with `=====PAGE N=====` markers
- Planned phase folders: phase-01-vocabulary, phase-02-databases, phase-03-caching, phase-04-messaging, phase-05-distributed-systems, phase-06-storage, phase-07-service-architecture, phase-08-infrastructure, phase-09-reliability, phase-10-security, phase-11-patterns, phase-12-data-systems, phase-13-ml-systems, phase-14-design-patterns, phase-15-estimation, phase-16-interview-method, phase-17-designs

## Phase 1 plan
0001 scaling (done) → 0002 latency/throughput/percentiles (done) → 0003 availability/SLO/nines (done) → 0004 CAP + PACELC (DDIA Ch9 "The Cost of Linearizability") → 0005 distributed fundamentals (DDIA Ch8)

## External sources used so far (not in local books)
- Google SRE book (sre.google/sre-book): SLI/SLO/SLA, error budgets (lesson 0003)
- AWS S3 durability doc (lesson 0003); Dean & Barroso 'Tail at Scale' (0002); Little's law / M/M/1 Wikipedia (0002)
