# Teaching notes

## User preferences (stated 2026-10-18)
- **No exercises or homework.** Lectures only. Optional collapsed recall MCQs at the end are OK (not graded, zero effort). Never ask the user to go build or do something.
- **Phase 0 skipped**: networking, OS and DB basics are known at a basic-to-medium level. Only cover them if the user explicitly asks.
- **Sources:** cite the books in `resources/` first (link to `#page=N`). Use web sources only if the books don't cover the topic or explain it poorly.
- **Jargon:** keep it low. Every term gets a hover (`<span class="term" data-tip="...">`). If it's taught later, add `data-later="Phase N · Topic"` so the user knows it's coming and doesn't worry.
- **Glossary workflow:** when the user asks about a term that needs only 1–2 lines, spawn a background subagent that appends it to `glossary.md` (root) and returns nothing. Don't make separate HTML pages for single terms. Only give a term more attention if the user still finds it unclear.
- **Organisation:** `index.html` (root) = TOC for all lessons, so update it with every new lesson. Lessons go in phase subfolders: `lessons/phase-NN-<slug>/NNNN-<slug>.html`. Lesson numbers are global and sequential.
- **Phase plan up front (rule, 2026-10-22):** when starting any phase, list ALL its planned lessons in `index.html` immediately (greyed, `planned` badge), so the user sees how much of the phase remains. Flip each to a link + `new`/`done` as written.
- Writing style: plain words, short sentences, ML-engineer framing ("In your world" callouts).

## Structure
- `BOOK_INDEX.md`: **check this first when preparing any lesson.** Topic → book + PDF page map by phase, full contents of each book, and query commands. Read only the listed page ranges from `resources/_extracted/`.
- `assets/course.css`, `assets/course.js`: shared styles, hover terms, recall MCQs, theme toggle
- `assets/perf-widgets.js`: .pct-explorer (percentile chart), .fanout-calc, .util-curve (reuse in Phase 9 / 15)
- Chart colours: --viz-1 blue, --viz-2 orange (validated with dataviz checker). Text never uses series colours.
- `assets/avail-widgets.js`: .nines-calc, .composite-calc (series/parallel availability)
- `assets/clock-widgets.js`: .lww-sim (last-write-wins + skew), .fencing-sim (lease/fencing step-through)
- `assets/txn-widgets.js`: .isolation-sim (Alice/transfer under RU/RC/SI with MVCC version table)
- `assets/storage-widgets.js`: .composite-index (column order vs entries read), .lsm-sim (WAL + memtable + SSTables, reads w/ Bloom filter, compaction, crash replay, write-amp counter), .btree-lookup (root→leaf path), .btree-calc (branching^levels capacity)
- `assets/sim-session.js`: stateful vs stateless load-balancer simulator (reuse in Phase 8 LB lesson)
- `reference/*.html`: cheat sheets (one per topic cluster)
- `resources/_extracted/*.txt`: text extracts of the PDFs, with `=====PAGE N=====` markers
- Planned phase folders: phase-01-vocabulary, phase-02-databases, phase-03-caching, phase-04-messaging, phase-05-distributed-systems, phase-06-storage, phase-07-service-architecture, phase-08-infrastructure, phase-09-reliability, phase-10-security, phase-11-patterns, phase-12-data-systems, phase-13-ml-systems, phase-14-design-patterns, phase-15-estimation, phase-16-interview-method, phase-17-designs

## Phase 1 plan
0001 scaling (done) → 0002 latency/throughput/percentiles (done) → 0003 availability/SLO/nines (done) → 0004 CAP + PACELC (done; DDIA Ch9 "The Cost of Linearizability", Abadi paper for PACELC) → 0005 distributed fundamentals (done by Codex, reviewed 2026-10-20; DDIA Ch8, Ch7 retries, Ch11 idempotence, Ch12 end-to-end) → 0006 clocks, pauses, failure detection, majority quorums, fencing (done; DDIA Ch8 pp.287–305 / PDF 309–327, Xu gossip). Phase 1 complete → next: Phase 2 Databases

## Phase 2 plan (tentative)
Order: internals first (B-tree/LSM underpin all index talk), then roadmap 2.1 relational topics, then replication/sharding.
0007 storage engines: log, hash index, SSTables/LSM, B-trees, WAL, LSM vs B-tree (done; DDIA Ch3 PDF 92–107, Xu pp.105–106) → 0008 indexes in practice: heap vs clustered, 3-step lookup, composite (leftmost, equality-then-range), covering/INCLUDE, planner + EXPLAIN, buffer pool (done; DDIA PDF 107–111 + Winand + Postgres docs) → 0009 transactions: ACID, multi-object, retries, read committed, snapshot isolation/MVCC, naming mess (done; DDIA PDF 243–264) → 0010 lost updates, write skew, phantoms, serializability: serial execution, 2PL, SSI (DDIA PDF 264–288) → data models/SQL vs NoSQL, normalization → replication → replication lag → leaderless/quorums → sharding → consistent hashing → design a KV store (Xu Ch6)

## External sources used so far (not in local books)
- Markus Winand, Use The Index, Luke (slow indexes, concatenated keys, equality-then-range, function indexes) and PostgreSQL docs (EXPLAIN, planner stats, index-only scans, shared_buffers): lesson 0008
- Google SRE book (sre.google/sre-book): SLI/SLO/SLA, error budgets (lesson 0003)
- AWS S3 durability doc (lesson 0003); Dean & Barroso 'Tail at Scale' (0002); Little's law / M/M/1 Wikipedia (0002)
- AWS Builders' Library 'Timeouts, retries, and backoff with jitter' (jitter, 243x amplification) — added to 0005 in review
- Daniel Abadi, ["Consistency Tradeoffs in Modern Distributed Database System Design"](https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf) (PACELC in lesson 0004; not covered in local books)

## Conventions
- Codex-written lessons (0004, 0005) label sidenote pages as PDF pages; Claude-written ones label printed pages (links always use PDF #page). Either is fine; new lessons use printed page labels.
- Work happens on git `main`; the user may write lessons with other agents on side branches. Review before merging.
