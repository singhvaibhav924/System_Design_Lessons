# Phase 2 (databases) complete: single-node internals through distributed key-value stores

Lessons 0007–0018 covered storage engines (LSM vs B-tree), indexes and the query planner, transactions and isolation (read committed, snapshot isolation/MVCC, lost updates, write skew, serializability via serial execution/2PL/SSI), data models, encoding and schema evolution, single-leader replication and failover, replication lag guarantees, multi-leader and leaderless replication (quorums, sloppy quorums, version vectors), sharding, and consistent hashing, closed by a walk-through of Xu's key-value store design and a data-layer review checklist.

Recurring insight surfaced to the user: the interview books (Xu) sometimes overstate guarantees (W + R > N = "strong consistency", `user_id % 4`, consistent hashing "mitigates hot keys"); DDIA's caveats were flagged explicitly each time. This supports the mission goal of judging agent-produced architectures critically.

**Implications:** Phase 3 (caching) can build directly on: read-your-writes and staleness (0014), hot keys (0016), consistent hashing for cache sharding (0017), and the "cache-miss storm" framing. Reuse the reviewer-checklist format at the end of later phases.
