# Unified Book Index

Which book covers what, and on which page. Built 2026-10-18 from the PDFs' own bookmarks (DDIA, Huyen), section headings found in the text (Xu), and the printed table of contents (Kossiakoff).

**Every page number in this file is a PDF page number** (what the PDF viewer shows, and what `#page=N` links use), not the printed page number.

| Key | Book | File in `resources/` | Printed → PDF page | Relevance |
|---|---|---|---|---|
| **DDIA** | Kleppmann, *Designing Data-Intensive Applications* (1st ed.) | `Designing Data Intensive Applications by Martin Kleppmann.pdf` | PDF = printed + 22 | ★★★★★ backbone |
| **XU** | Alex Xu, *System Design Interview* Vol. 1 | `System Design Interview by Alex Xu.pdf` | no printed numbers; use PDF | ★★★★★ interview framing |
| **DMLS** | Chip Huyen, *Designing Machine Learning Systems* | `Designing Machine Learning Systems.pdf` | PDF = printed + 20 | ★★★★★ for Phase 13 |
| **SEPP** | Kossiakoff et al., *Systems Engineering Principles and Practice* (3rd ed.) | `Systems engineering principles and practice.pdf` | offset varies (+13 to +28) | ★ aerospace-style systems engineering, rarely useful |

---

## How to query (instructions for the teacher agent)

Plain-text copies are in `resources/_extracted/<same name>.txt`. Each page starts with a `=====PAGE N=====` marker, and N matches the PDF page.

1. **Start here.** Look up the topic in the map below to get book + PDF page range.
2. **Read only that range** (don't load whole chapters):
   ```bash
   cd resources/_extracted
   awk -v a=35 -v b=39 '/^=====PAGE/{split($0,x,"PAGE ");p=x[2]+0} p>=a&&p<=b' "Designing Data Intensive Applications by Martin Kleppmann.txt"
   ```
3. **Concept not in the map?** Find the pages where a term appears:
   ```bash
   awk -v pat="[Ff]encing token" '/^=====PAGE/{split($0,x,"PAGE ");p=x[2]+0;next} $0~pat{print p}' "<book>.txt" | sort -nu | head
   ```
   Ignore hits at the end of a book. They're the glossary or index (DDIA ≥ 575, DMLS ≥ 377, SEPP ≥ 650).
4. **Link from a lesson** (lessons live two folders deep):
   `../../resources/Designing%20Data%20Intensive%20Applications%20by%20Martin%20Kleppmann.pdf#page=N`
5. **Gaps:** topics marked ⚠ GAP aren't covered well in any of the books. Use a high-trust web source and add it to `RESOURCES.md`.

---

## Part A: Topic → source map (follows the roadmap phases)

### Phase 1: System-design vocabulary
| Topic | Where | PDF pages |
|---|---|---|
| Scalability, load parameters | DDIA Ch1 "Scalability" / "Describing Load" | 32–35 |
| Scale up vs out, elasticity | DDIA "Approaches for Coping with Load"; DDIA Part II intro "Scaling to Higher Load" (shared-memory/disk/nothing) | 39–40; 168–169 |
| Zero → millions walkthrough | XU Ch1 (whole chapter) | 5–33 |
| Stateless vs stateful web tier | XU Ch1 | 20–22 |
| Latency, throughput, response time, percentiles, tail latency | DDIA Ch1 "Describing Performance" | 35–39 |
| Latency numbers every programmer should know | XU Ch2 | 36–37 |
| Reliability, faults vs failures (hardware, software, human) | DDIA Ch1 "Reliability" | 28–32 |
| Availability numbers / nines / SLA | XU Ch2 "Availability numbers" | 38–39 |
| Requirements: reliability, scalability, maintainability (ML view) | DMLS Ch2 | 49–52 |
| CAP theorem | XU Ch6 "CAP theorem" (interview version); DDIA Ch9 "The Cost of Linearizability" (proper critique) | 90–92; 357–361 |
| Partial failure, unreliable networks, timeouts | DDIA Ch8 | 296–309 |
| Clocks (monotonic vs time-of-day, sync, pauses) | DDIA Ch8 "Unreliable Clocks" | 309–322 |
| Quorums, "truth is defined by the majority", fencing tokens | DDIA Ch8 | 322–326 |
| Byzantine faults, system models | DDIA Ch8 | 326–332 |
| Failure detection, heartbeats, gossip | XU Ch6 "Failure detection" | 99–101 |
| Idempotency, retries | DDIA Ch11 "Fault Tolerance" + Ch12 "End-to-End Argument"; XU Ch10 retry mechanism | 498–501, 538–543; 160–161 |
| Maintainability / operability | DDIA Ch1 | 40–44 |

### Phase 2: Databases
| Topic | Where | PDF pages |
|---|---|---|
| Relational vs document vs graph models; SQL vs NoSQL | DDIA Ch2; XU Ch1 "Which databases to use?"; DMLS Ch3 "Data Models" | 49–85; 8–9; 78–87 |
| Hash indexes, SSTables, LSM-trees, B-trees, compaction | DDIA Ch3 | 92–107 |
| WAL / making B-trees reliable | DDIA Ch3 B-trees | 101–105 |
| B-tree vs LSM, write amplification | DDIA Ch3 "Comparing B-Trees and LSM-Trees" | 105–107 |
| Secondary, covering, multi-column, full-text, in-memory indexes | DDIA Ch3 "Other Indexing Structures" | 107–112 |
| Bloom filters, SSTable read/write path | XU Ch6 "Write path" / "Read path"; DDIA Ch3 | 105–107; 101 |
| Encoding & schema evolution (JSON, Protobuf, Avro) | DDIA Ch4 | 133–150 |
| ACID, isolation levels, lost updates, write skew, serializability (2PL, SSI) | DDIA Ch7 | 243–288 |
| Leader/follower replication, sync vs async, failover, replication logs | DDIA Ch5 "Leaders and Followers"; XU Ch1 "Database replication" | 174–183; 12–15 |
| Replication lag (read-your-writes, monotonic reads, consistent prefix) | DDIA Ch5 | 183–190 |
| Multi-leader, conflict handling | DDIA Ch5 | 190–199 |
| Leaderless, quorums (N/W/R), sloppy quorum, hinted handoff | DDIA Ch5; XU Ch6 "Consistency" / "Handling failures" | 199–214; 95–103 |
| Vector clocks / version vectors | XU Ch6 "Inconsistency resolution"; DDIA Ch5 "Detecting Concurrent Writes" | 96–99; 206–214 |
| Split brain | DDIA Ch5 "Handling Node Outages" | 178–180 |
| Sharding / partitioning: key-range vs hash, hot spots | DDIA Ch6; XU Ch1 "Database scaling" (celebrity problem) | 221–228; 28–31 |
| Secondary indexes on partitioned data | DDIA Ch6 | 228–231 |
| Rebalancing, request routing | DDIA Ch6 | 231–238 |
| Consistent hashing, virtual nodes | XU Ch5 (whole chapter); DDIA Ch6 (side note) | 71–86; 226 |
| Design a key-value store (ties it all together) | XU Ch6 | 87–109 |

### Phase 3: Caching
| Topic | Where | PDF pages |
|---|---|---|
| Cache tier, considerations, eviction, SPOF | XU Ch1 "Cache" | 15–17 |
| CDN basics | XU Ch1 | 17–19 |
| Feed cache architecture (multi-layer cache) | XU Ch11 | 175–176 |
| Caching inside a data structure (trie top-k) | XU Ch13 | 209 |
| Materialized views as caches | DDIA Ch3 | 123–125 |
| ⚠ GAP: cache-aside/write-through/write-behind detail, stampede, penetration, avalanche, Redis Cluster | Use web: Facebook "Scaling Memcache" (NSDI '13), Redis docs | — |

### Phase 4: Messaging & async
| Topic | Where | PDF pages |
|---|---|---|
| Message queue basics, decoupling | XU Ch1 "Message queue" | 25–27 |
| Message-passing dataflow, brokers | DDIA Ch4 | 158–161 |
| Messaging systems: direct vs broker, fan-out vs load balancing, acks & redelivery | DDIA Ch11 "Messaging Systems" | 463–468 |
| Log-based brokers (Kafka model): partitions, offsets, consumer lag, replay | DDIA Ch11 "Partitioned Logs" | 468–473 |
| Delivery guarantees, exactly-once | DDIA Ch11 "Fault Tolerance"; XU Ch10 "exactly once?" | 498–501; 160 |
| Queues in a real design | XU Ch10 notification system | 156–163 |
| Real-time transport for ML | DMLS Ch3 | 94–98 |
| ⚠ GAP: Kafka internals (ISR, producer acks), SQS visibility timeout, RabbitMQ | Use Kafka docs / AWS docs | — |

### Phase 5: Distributed systems
| Topic | Where | PDF pages |
|---|---|---|
| Consistency guarantees overview | DDIA Ch9 | 344–346 |
| Linearizability: definition, uses, cost (CAP) | DDIA Ch9 | 346–361 |
| Ordering, causality, Lamport timestamps, total order broadcast | DDIA Ch9 | 361–374 |
| Consistency models (interview version) | XU Ch6 "Consistency models" | 96 |
| Two-phase commit, distributed transactions in practice, XA | DDIA Ch9 | 374–386 |
| Consensus (Raft/Paxos/Zab family), leader election, epochs | DDIA Ch9 "Fault-Tolerant Consensus" | 386–392 |
| ZooKeeper / etcd, service discovery, membership | DDIA Ch9 "Membership and Coordination Services"; XU Ch12 "Service discovery" | 392–395; 190 |
| Distributed locks & fencing tokens | DDIA Ch8 | 322–326 |
| ⚠ GAP: Saga pattern, transactional outbox (only brief mentions: DDIA 403, 605) | Use web: microservices.io (Chris Richardson), Raft paper/site | — |

### Phase 6: Storage systems
| Topic | Where | PDF pages |
|---|---|---|
| Distributed filesystems (HDFS), erasure coding mention | DDIA Ch10 "MapReduce and Distributed Filesystems" | 419–421 |
| Block servers, chunking, delta sync, dedup, storage saving | XU Ch15 Google Drive | 255–262 |
| Resumable upload, upload flow | XU Ch15; XU Ch14 | 248–249, 257; 223–227, 236 |
| Pre-signed URLs | XU Ch14 "System optimizations" | 238–239 |
| Storage & compute for ML | DMLS Ch10 | 317–322 |
| ⚠ GAP: object-storage internals (S3), IOPS, SSD vs HDD, checksums in depth | Use web: AWS S3 docs | — |

### Phase 7: Service architecture & APIs
| Topic | Where | PDF pages |
|---|---|---|
| REST vs RPC, problems with RPC, versioning APIs | DDIA Ch4 "Dataflow Through Services" | 153–158 |
| Polling, long polling, WebSocket | XU Ch12 | 180–184 |
| Stateless vs stateful services in a real design | XU Ch12 | 184–185 |
| API design examples | XU Ch8 (URL shortener APIs); XU Ch11 (feed APIs); XU Ch15 (Drive APIs) | 121; 168; 248 |
| Unbundling databases, dataflow-centric architecture | DDIA Ch12 | 521–537 |
| ⚠ GAP: monolith vs microservices, gRPC, pagination, idempotency keys | Use web: microservices.io, Stripe API docs (idempotency) | — |

### Phase 8: Infrastructure
| Topic | Where | PDF pages |
|---|---|---|
| Load balancer, private IPs, failover | XU Ch1 | 10–12 |
| Sticky sessions | XU Ch1 | 20 |
| CDN workflow, TTL, invalidation | XU Ch1; XU Ch14 (video CDN cost) | 17–19; 227, 239–240 |
| GeoDNS, multi-data-center | XU Ch1 "Data centers" | 23–25 |
| Containers, schedulers, orchestrators | DMLS Ch10 | 328–339 |
| ⚠ GAP: L4 vs L7, LB algorithms, reverse proxy / API gateway, Envoy/Nginx | Use web: Nginx/Envoy docs, AWS ELB docs | — |

### Phase 9: Reliability engineering
| Topic | Where | PDF pages |
|---|---|---|
| Faults vs failures, fault tolerance | DDIA Ch1 | 28–32 |
| Logging, metrics, automation | XU Ch1 | 26–27 |
| Handling temporary/permanent failures, data-center outage, Merkle trees | XU Ch6 | 99–104 |
| Backpressure / flow control | DDIA Ch8 (TCP), Ch11 (messaging) | 304; 463–465 |
| Monitoring & observability (ML angle) | DMLS Ch8 "Monitoring and Observability" | 270–281 |
| Software system failures in ML systems | DMLS Ch8 | 247–249 |
| ⚠ GAP: circuit breaker, bulkhead, load shedding, RED/USE, OpenTelemetry | Use web: Google SRE book (free online), AWS Builders' Library | — |

### Phase 10: Security
| Topic | Where | PDF pages |
|---|---|---|
| Push-notification security (appKey/appSecret) | XU Ch10 | 161 |
| Systems security engineering (generic, non-web) | SEPP Ch22 | ~624–635 |
| ⚠ GAP: almost everything (JWT, OAuth/OIDC, RBAC, XSS/CSRF, IAM/VPC) | Use web: OWASP, RFC 6749/OIDC specs, cloud IAM docs | — |

### Phase 11: Specialized high-scale patterns
| Topic | Where | PDF pages |
|---|---|---|
| Rate limiting: token bucket, leaky bucket, fixed/sliding window, distributed | XU Ch4 | 51–70 |
| Unique ID generation: UUID, ticket server, Snowflake | XU Ch7 | 110–118 |
| URL shortener (hashing, base62) | XU Ch8 | 119–131 |
| Web crawler (frontier, politeness, dedup) | XU Ch9 | 132–150 |
| Notification system | XU Ch10 | 151–165 |
| News feed: fanout on write/read, celebrity problem | XU Ch11; DDIA Ch1 Twitter example | 166–177; 33–35 |
| Chat system, presence | XU Ch12 | 178–199 |
| Search autocomplete (trie) | XU Ch13 | 200–219 |
| Full-text search, inverted index, partitioned by term | DDIA Ch3 "Full-text search and fuzzy indexes"; DDIA Ch6 | 108–110; 230–231 |
| Video upload/streaming, transcoding DAG | XU Ch14 | 220–243 |
| File sync (Dropbox/Drive) | XU Ch15 | 244–263 |
| Geospatial: multi-dimensional indexes, R-trees (brief) | DDIA Ch3 | 109 |
| ⚠ GAP: geohash, quadtree (proximity service), time-series DBs | Use web, or Alex Xu Vol. 2 if added later | — |

### Phase 12: Data-intensive systems
| Topic | Where | PDF pages |
|---|---|---|
| OLTP vs OLAP, data warehousing, star/snowflake schemas | DDIA Ch3; DMLS Ch3 | 112–117; 87–92 |
| Column-oriented storage, compression, sort order | DDIA Ch3; DMLS Ch3 "Row-Major Versus Column-Major" | 117–125; 74–77 |
| Batch processing: Unix philosophy → MapReduce, joins, shuffle | DDIA Ch10 | 411–441 |
| Beyond MapReduce (Spark-style dataflow engines, graphs, high-level APIs) | DDIA Ch10 | 441–451 |
| Stream processing: event time vs processing time, windows | DDIA Ch11 "Reasoning About Time" | 490–494 |
| Stream joins, stream fault tolerance (microbatching, checkpointing) | DDIA Ch11 | 494–501 |
| Change data capture, event sourcing | DDIA Ch11 | 476–486 |
| Lambda architecture, unifying batch + stream | DDIA Ch12 | 516–521; DMLS Ch7 223–226 |
| ETL / batch vs stream (ML view) | DMLS Ch3 | 90–92, 98–99 |

### Phase 13: ML system design
| Topic | Where | PDF pages |
|---|---|---|
| ML in research vs production; ML vs traditional software | DMLS Ch1 | 32–43 |
| Framing ML problems, objectives | DMLS Ch2 | 45–66 |
| Training data: sampling, labeling, class imbalance | DMLS Ch4 | 101–138 |
| Feature engineering, data leakage | DMLS Ch5 | 139–166 |
| Experiment tracking, distributed training (data/model parallelism), AutoML | DMLS Ch6 | 182–198 |
| Batch vs online prediction, unifying pipelines | DMLS Ch7 | 217–226 |
| Model compression: distillation, pruning, quantization | DMLS Ch7 | 226–232 |
| Cloud vs edge, model compilation | DMLS Ch7 | 232–243 |
| ML failure causes, training-serving skew | DMLS Ch8 | 246–257 (skew: 250) |
| Data distribution shifts: types, detection, handling | DMLS Ch8 | 257–270 |
| ML monitoring metrics & toolbox | DMLS Ch8 | 270–281 |
| Continual learning, retraining cadence | DMLS Ch9 | 284–301 |
| Shadow deployment, A/B testing, canary, interleaving, bandits | DMLS Ch9 | 301–311 |
| Dev environments, containers, orchestrators (Airflow/Argo/Kubeflow/Metaflow) | DMLS Ch10 | 322–339 |
| ML platform: model deployment, model store, feature store; build vs buy | DMLS Ch10 | 339–349 |
| Predictive analytics ethics, responsible AI | DDIA Ch12; DMLS Ch11 | 555–565; 359–373 |
| ⚠ GAP: GPU serving, dynamic batching, LLM serving (KV cache, vLLM), RAG, vector DBs, semantic/prompt caching, LLM gateways, agents | Use web: vLLM paper, Triton docs, provider docs (Anthropic/OpenAI) | — |

### Phase 14: Patterns, consolidated
| Topic | Where | PDF pages |
|---|---|---|
| Event sourcing, CQRS-like derived views, immutability | DDIA Ch11 "Event Sourcing" / "State, Streams, and Immutability" | 479–486 |
| Derived data, unbundled databases | DDIA Ch12 | 512–537 |
| Materialized views | DDIA Ch3; Ch11 | 123–125; 487–490 |
| End-to-end correctness, constraints, timeliness vs integrity | DDIA Ch12 "Aiming for Correctness" | 537–555 |

### Phase 15: Capacity estimation
| Topic | Where | PDF pages |
|---|---|---|
| Powers of two, latency numbers, availability numbers, QPS/storage example | XU Ch2 | 34–41 |
| Worked estimates | XU Ch8 · Ch9 · Ch13 · Ch14 · Ch15 "Back of the envelope estimation" | 120 · 134 · 201 · 221 · 246 |

### Phase 16: Interview methodology
| Topic | Where | PDF pages |
|---|---|---|
| 4-step framework, dos/don'ts, time allocation | XU Ch3 | 42–50 |
| Requirements for ML systems | DMLS Ch2 | 49–52 |
| Trade-off analysis (formal, engineering-wide) | SEPP Ch11.5 | ~318–335 |
| Real-world systems & engineering blogs to study | XU Ch16 | 264–268 |

### Phase 17: Full designs (ready-made in XU)
Rate limiter 51 · Consistent hashing 71 · KV store 87 · ID generator 110 · URL shortener 119 · Web crawler 132 · Notifications 151 · News feed 166 · Chat 178 · Autocomplete 200 · YouTube 220 · Google Drive 244.
⚠ GAP: Uber/Maps, payments, exchange, ad serving, metrics platform, and all ML designs. These need to be synthesized from DMLS + DDIA + web.

---

## Part B: Full contents of each book (PDF pages)

### DDIA: Designing Data-Intensive Applications
- Preface 15
- **Part I. Foundations of Data Systems** 23
  - **Ch1 Reliable, Scalable, and Maintainable Applications** 25: Thinking About Data Systems 26 · Reliability 28 (Hardware Faults 29, Software Errors 30, Human Errors 31, How Important 32) · Scalability 32 (Describing Load 33, Describing Performance 35, Approaches for Coping with Load 39) · Maintainability 40 (Operability 41, Simplicity 42, Evolvability 43) · Summary 44
  - **Ch2 Data Models and Query Languages** 49: Relational vs Document 50 (Birth of NoSQL 51, Object-Relational Mismatch 51, Many-to-One/Many-to-Many 55, Repeating History? 58, Today 60) · Query Languages 64 (Declarative on the Web 66, MapReduce Querying 68) · Graph-Like Models 71 (Property Graphs 72, Cypher 74, Graph Queries in SQL 75, Triple-Stores/SPARQL 77, Datalog 82) · Summary 85
  - **Ch3 Storage and Retrieval** 91: Data Structures That Power Your Database 92 (Hash Indexes 94, SSTables & LSM-Trees 98, B-Trees 101, Comparing B-Trees and LSM-Trees 105, Other Indexing Structures 107) · OLTP or Analytics? 112 (Data Warehousing 113, Stars and Snowflakes 115) · Column-Oriented Storage 117 (Compression 119, Sort Order 121, Writing 123, Data Cubes & Materialized Views 123) · Summary 125
  - **Ch4 Encoding and Evolution** 133: Formats 134 (Language-Specific 135, JSON/XML/Binary 136, Thrift & Protobuf 139, Avro 144, Merits of Schemas 149) · Modes of Dataflow 150 (Through Databases 151, Through Services: REST and RPC 153, Message-Passing 158) · Summary 161
- **Part II. Distributed Data** 167 (Scaling to Higher Load / shared-nothing 168; Replication vs Partitioning 169)
  - **Ch5 Replication** 173: Leaders and Followers 174 (Sync vs Async 175, New Followers 177, Node Outages 178, Replication Logs 180) · Replication Lag 183 (Read Your Own Writes 184, Monotonic Reads 186, Consistent Prefix 187, Solutions 189) · Multi-Leader 190 (Use Cases 190, Write Conflicts 193, Topologies 197) · Leaderless 199 (Writing When a Node Is Down 199, Limits of Quorum Consistency 203, Sloppy Quorums & Hinted Handoff 205, Detecting Concurrent Writes 206) · Summary 214
  - **Ch6 Partitioning** 221: Partitioning and Replication 222 · Key-Value Data 223 (Key Range 224, Hash of Key 225, Skew & Hot Spots 227) · Secondary Indexes 228 (By Document 228, By Term 230) · Rebalancing 231 (Strategies 232, Automatic vs Manual 235) · Request Routing 236 (Parallel Query Execution 238) · Summary 238
  - **Ch7 Transactions** 243: The Slippery Concept 244 (Meaning of ACID 245, Single vs Multi-Object 250) · Weak Isolation 255 (Read Committed 256, Snapshot Isolation & Repeatable Read 259, Preventing Lost Updates 264, Write Skew & Phantoms 268) · Serializability 273 (Actual Serial Execution 274, 2PL 279, SSI 283) · Summary 288
  - **Ch8 The Trouble with Distributed Systems** 295: Faults & Partial Failures 296 (Cloud vs Supercomputing 297) · Unreliable Networks 299 (Faults in Practice 301, Detecting Faults 302, Timeouts & Unbounded Delays 303, Sync vs Async Networks 306) · Unreliable Clocks 309 (Monotonic vs Time-of-Day 310, Sync & Accuracy 311, Relying on Synced Clocks 313, Process Pauses 317) · Knowledge, Truth, and Lies 322 (Truth Is Defined by the Majority 322, Byzantine Faults 326, System Model & Reality 328) · Summary 332
  - **Ch9 Consistency and Consensus** 343: Consistency Guarantees 344 · Linearizability 346 (What Makes It 347, Relying on It 352, Implementing 354, Cost of Linearizability / CAP 357) · Ordering Guarantees 361 (Ordering & Causality 361, Sequence Number Ordering 365, Total Order Broadcast 370) · Distributed Transactions & Consensus 374 (Atomic Commit & 2PC 376, In Practice 382, Fault-Tolerant Consensus 386, Membership & Coordination Services 392) · Summary 395
- **Part III. Derived Data** 407
  - **Ch10 Batch Processing** 411: Unix Tools 413 (Log Analysis 413, Unix Philosophy 416) · MapReduce & Distributed Filesystems 419 (Job Execution 421, Reduce-Side Joins 425, Map-Side Joins 430, Output of Batch Workflows 433, Hadoop vs Distributed DBs 436) · Beyond MapReduce 441 (Materialization of Intermediate State 441, Graphs & Iterative 446, High-Level APIs 448) · Summary 451
  - **Ch11 Stream Processing** 461: Transmitting Event Streams 462 (Messaging Systems 463, Partitioned Logs 468) · Databases and Streams 473 (Keeping Systems in Sync 474, CDC 476, Event Sourcing 479, State/Streams/Immutability 481) · Processing Streams 486 (Uses 487, Reasoning About Time 490, Stream Joins 494, Fault Tolerance 498) · Summary 501
  - **Ch12 The Future of Data Systems** 511: Data Integration 512 (Deriving Data 512, Batch & Stream 516) · Unbundling Databases 521 (Composing Storage 521, Designing Around Dataflow 526, Observing Derived State 531) · Aiming for Correctness 537 (End-to-End Argument 538, Enforcing Constraints 543, Timeliness & Integrity 546, Trust but Verify 550) · Doing the Right Thing 555 (Predictive Analytics 555, Privacy & Tracking 558) · Summary 565
- Glossary 575 · Index 581

### XU: System Design Interview, Vol. 1
- **Ch1 Scale from Zero to Millions of Users** 5: Single server 6 · Database / which DB 8 · Vertical vs horizontal 9 · Load balancer 10 · DB replication 12 · Cache / cache tier / considerations 15 · CDN & considerations 17–18 · Stateless web tier (stateful vs stateless) 20 · Data centers 23 · Message queue 25 · Logging, metrics, automation 26 · Database scaling (vertical, horizontal/sharding) 28 · Millions of users and beyond 32
- **Ch2 Back-of-the-Envelope Estimation** 34: Power of two 35 · Latency numbers 36 · Availability numbers 38 · Example: Twitter QPS & storage ~39 · Tips 40
- **Ch3 A Framework for System Design Interviews** 42: 4-step process 43 · Step 2 high-level design 44 · Step 3 deep dive 46 · Step 4 wrap up 49 · Dos/Don'ts & time allocation 50
- **Ch4 Design a Rate Limiter** 51: Requirements 52 · Where to put it 53 · Algorithms 54 (token bucket 54, leaking bucket 58, fixed window 58, sliding window log 60, sliding window counter 61) · High-level architecture 62 · Rules, headers, exceeding 64 · Detailed design 65 · Distributed environment: race condition, synchronization 66 · Performance optimization 67 · Monitoring 68
- **Ch5 Design Consistent Hashing** 71: Rehashing problem 72 · Hash ring, servers, keys, lookup 75–76 · Add/remove server 77–78 · Two issues 79 · Virtual nodes 80 · Affected keys 82 · Wrap up 85
- **Ch6 Design a Key-Value Store** 87: Scope 88 · Single server 89 · Distributed: CAP 90–91 · System components 92 · Data partition 93 · Replication 94 · Consistency (N/W/R) 95 · Consistency models 96 · Inconsistency resolution: versioning / vector clocks 96–99 · Handling failures: detection/gossip 99, temporary (sloppy quorum, hinted handoff) 101, permanent (Merkle trees) 101–103, data-center outage 103 · Architecture diagram 104 · Write path 105 · Read path 106
- **Ch7 Design a Unique ID Generator** 110: Multi-master replication 112 · UUID 112 · Ticket server 113 · Twitter Snowflake 114 · Deep dive: timestamp 115, sequence number 116
- **Ch8 Design a URL Shortener** 119: Estimation 120 · API endpoints 121 · Redirecting (301 vs 302) 121 · Shortening 122 · Data model 124 · Hash function, length 124 · Hash + collision resolution 125 · Base 62 126 · Comparison 127 · Deep dives 127–129
- **Ch9 Design a Web Crawler** 132: Estimation 134 · Components (seed URLs, frontier, downloader, DNS resolver, parser, content seen, storage, URL extractor/filter/seen) 136–138 · Workflow 138 · DFS vs BFS 140 · URL frontier: politeness 141, priority 142, freshness 144, storage 145 · Downloader & performance 145 · Robustness 146 · Extensibility 147 · Problematic content 147
- **Ch10 Design a Notification System** 151: Notification types (iOS/Android push, SMS, email) 153–154 · Contact info gathering 155 · Sending flow 156 · High-level design (improved) 157 · Reliability: data loss, exactly-once? 160 · Template, settings, rate limiting, retry, security, queue monitoring 160–161 · Events tracking 162 · Updated design 162
- **Ch11 Design a News Feed System** 166: APIs 168 · Feed publishing 168 · Newsfeed building 169 · Publishing deep dive (web servers, fanout service) 171–172 · Retrieval deep dive 174 · Cache architecture 175
- **Ch12 Design a Chat System** 178: Polling 180 · Long polling 181 · WebSocket 182 · High-level design 184 · Stateless/stateful services 184–185 · Third-party integration, scalability 185 · Storage 186 · Data models (1:1, group, message ID) 187–188 · Service discovery 190 · Message flows 190 · Multi-device sync 191 · Small group chat 192 · Online presence (login/logout/disconnect/fanout) 194–196
- **Ch13 Design a Search Autocomplete System** 200: Requirements & estimation 201 · Data gathering & query service 203 · Trie 206 · Limit prefix length, cache top queries 209 · Data gathering service 210 · Query service 213 · Trie operations 215 · Scale the storage 216
- **Ch14 Design YouTube** 220: Estimation 221 · Upload flow 223 · Streaming flow 227 · Transcoding & DAG model 229 · Transcoding architecture (preprocessor, DAG scheduler, resource manager, task workers, temp storage, encoded video) 231–236 · System optimizations (speed, safety/pre-signed URLs) 236–239 · Cost-saving 239 · Error handling 240
- **Ch15 Design Google Drive** 244: Estimation 246 · APIs (incl. resumable upload) 248 · Move away from single server 249 · Sync conflicts 251 · High-level design 252 · Block servers 255 · High consistency requirement 256 · Metadata DB 256 · Upload flow 257 · Download flow 258 · Notification service 259 · Save storage space 260 · Failure handling 260
- **Ch16 The Learning Continues** 264: Real-world systems 265 · Company engineering blogs 267

### DMLS: Designing Machine Learning Systems
- **Ch1 Overview of ML Systems** 21: When to Use ML 23 (Use Cases 29) · Understanding ML Systems 32 (Research vs Production 32, ML vs Traditional Software 42)
- **Ch2 Intro to ML Systems Design** 45: Business & ML Objectives 46 · Requirements 49 (Reliability 49, Scalability 50, Maintainability 51, Adaptability 51) · Iterative Process 52 · Framing ML Problems 55 (Task Types 56, Objective Functions 60) · Mind vs Data 63
- **Ch3 Data Engineering Fundamentals** 69: Data Sources 70 · Formats 73 (JSON 74, Row- vs Column-Major 74, Text vs Binary 77) · Data Models 78 (Relational 79, NoSQL 83, Structured vs Unstructured 86) · Storage Engines & Processing 87 (Transactional vs Analytical 87, ETL 90) · Modes of Dataflow 92 (Databases 92, Services 93, Real-Time Transport 94) · Batch vs Stream 98
- **Ch4 Training Data** 101: Sampling 102 (Nonprobability 103, Random 104, Stratified 104, Weighted 105, Reservoir 106, Importance 107) · Labeling 108 (Hand 108, Natural 111, Lack of Labels 114) · Class Imbalance 122 · Data Augmentation 133
- **Ch5 Feature Engineering** 139: Learned vs Engineered 140 · Common Operations 143 (Missing Values 143, Scaling 146, Discretization 148, Categorical Encoding 149, Feature Crossing 152, Positional Embeddings 153) · Data Leakage 155 (Causes 157, Detection 160) · Good Features 161 (Importance 162, Generalization 164)
- **Ch6 Model Development & Offline Evaluation** 169: Development & Training 170 (Evaluating 170, Ensembles 176, Experiment Tracking & Versioning 182, Distributed Training 188, AutoML 192) · Offline Evaluation 198 (Baselines 199, Methods 201)
- **Ch7 Model Deployment & Prediction Service** 211: Deployment Myths 214 · Batch vs Online Prediction 217 (Batch → Online 221, Unifying Batch & Streaming 223) · Model Compression 226 (Low-Rank 226, Distillation 228, Pruning 228, Quantization 229) · Cloud & Edge 232 (Compiling for Edge 234, ML in Browsers 242)
- **Ch8 Data Distribution Shifts & Monitoring** 245: Causes of Failures 246 (Software 247, ML-Specific 249) · Distribution Shifts 257 (Types 257, General 261, Detecting 262, Addressing 268) · Monitoring & Observability 270 (ML Metrics 271, Toolbox 276, Observability 279)
- **Ch9 Continual Learning & Test in Production** 283: Continual Learning 284 (Stateless Retraining vs Stateful Training 285, Why 288, Challenges 290, Four Stages 294, How Often 299) · Test in Production 301 (Shadow 302, A/B 303, Canary 305, Interleaving 305, Bandits 307)
- **Ch10 Infrastructure & Tooling for MLOps** 313: Storage & Compute 317 (Cloud vs Private DC 320) · Dev Environment 322 (Setup 323, Standardizing 326, Containers 328) · Resource Management 331 (Cron/Schedulers/Orchestrators 331, Workflow Management 334) · ML Platform 339 (Deployment 340, Model Store 341, Feature Store 345) · Build vs Buy 347
- **Ch11 The Human Side of ML** 351: User Experience 351 · Team Structure 354 · Responsible AI 359 (Case Studies 361, Framework 367)
- Epilogue 375 · Index 377

### SEPP: Systems Engineering Principles and Practice (chapter level only)
PDF pages are approximate (search the extract for `^N.1 ` to land exactly). Printed page in brackets.
- **Part I Foundations:** Ch1 Systems Engineering & Modern Systems [3] ~PDF 27 · Ch2 Structure of Complex Systems [33] · Ch3 System Development Process [61] ~89 · Ch4 SE Management [101]
- **Part II Concept Development:** Ch5 Needs Analysis [121] · Ch6 Requirements Analysis [153] · Ch7 Functional Analysis [183] · Ch8 Evaluation & Selection [209] · Ch9 Systems Architecting [235] → PDF 258 · Ch10 MBSE [253] → 276 · Ch11 Decision Analysis (11.5 Trade-off Analysis → 318) [275] → 298 · Ch12 Risk Management [327] ~349
- **Part III Engineering Development:** Ch13 Advanced Development [351] → 370 · Ch14 Software Systems Engineering [393] (14.4 SDLC models → 421) · Ch15 Engineering Design [449] · Ch16 Systems Integration [485] · Ch17 Test & Evaluation [499]
- **Part IV Post-Development:** Ch18 Production [539] · Ch19 Operation & Support [561] · Ch20 System of Systems [583]
- **Part V:** Ch21 Enterprise SE [599] → 613 · Ch22 Systems Security Engineering [611] → 624 · Ch23 Future of SE [627] · Index [639]
