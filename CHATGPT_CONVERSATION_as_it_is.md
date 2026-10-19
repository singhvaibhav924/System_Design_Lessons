# System Design Roadmap

_Source: https://chatgpt.com/share/6ad48e72-0d2c-83ee-8fc7-0290eecc2fca · Model: gpt-5-6 · Created: 2026-10-18 14:46_

---

## User

i have been working as an ML Engineer since last 14 months, i am planning to switch, I use ai coding agents like claude code and codex a lot and I feel for me to become a good engineer going forward, I should be well versed in System Design. Now i have never studied this thing, i only know things on hearsay and overall worked with few concepts but like never dedicatedly read this topic. Recently while youtube scrolling shorts i saw few system design questions whose answers were very cool so much so that i didnt even knew they existed and not i feel i know very little and might get fucked in interview. I wont tell you about the concept i saw in that shorts video to avoid biasness. I want you to first create a proper detailed expert level roadmap or you can say list of topics/subtopics to read. You can take reference from some blog or book pdf or anything in your intrinsic knowledge - but overall it should cover if not 100% then atleast 95 percent of the concepts, remaining 5% which might be too rare is something i can gamble on anyways

---

## ChatGPT

Yes. And I think your instinct is correct: **after ~14 months as an ML Engineer, especially if you're using coding agents heavily, system design is probably one of the highest-ROI areas you can add before switching.**

The important thing is that you **shouldn't start with “System Design interview questions.”** Those Shorts are dangerous because they show the *interesting answer* without teaching the underlying machinery. You want to build the machinery first, then learn how interview questions compose it.

I’d structure your preparation into roughly **10 layers**, going from fundamentals → distributed systems → infrastructure → data systems → ML systems → interview design.

## The roadmap I'd use

### Phase 0 — Prerequisite engineering fundamentals

Before “system design,” make sure these are comfortable:

**0.1 Networking**
- OSI vs TCP/IP
- IP addresses, ports, sockets
- TCP vs UDP
- TCP 3-way handshake
- HTTP/1.1
- HTTP/2
- HTTP/3 / QUIC
- TLS / HTTPS
- DNS
- DHCP — basic understanding
- NAT
- Load balancers
- Reverse proxy vs forward proxy
- CDN
- WebSockets
- SSE
- gRPC
- REST
- RPC
- Connection pooling
- Keep-alive
- Timeouts
- Retries

**0.2 Operating systems**
- Processes vs threads
- Context switching
- Concurrency vs parallelism
- CPU vs I/O bound workloads
- Memory / virtual memory
- File descriptors
- Locks
- Mutexes
- Semaphores
- Race conditions
- Deadlocks
- Scheduling
- Disk I/O
- Page cache
- System calls

**0.3 Databases**
- Tables / rows / indexes
- B-tree indexes
- Hash indexes
- Query execution
- Transactions
- ACID
- Isolation levels
- Locks
- MVCC
- SQL vs NoSQL
- Connection pools

You don't need to become an OS or database engineer here. You need enough understanding that when someone says:

> "We'll put a Redis cache in front of PostgreSQL"

you can reason about **why, where, what happens on a cache miss, consistency implications, failure modes, and bottlenecks.**

---

# Phase 1 — The fundamental system-design vocabulary

This is where I'd actually start your dedicated study.

### 1.1 Scalability

Understand:

- Vertical scaling
- Horizontal scaling
- Stateless services
- Stateful services
- Scale-up vs scale-out
- Elasticity
- Bottlenecks
- Single points of failure
- Fault domains
- Capacity planning

### 1.2 Performance

Learn:

- Latency
- Throughput
- QPS/RPS
- Bandwidth
- Concurrency
- Response time
- Tail latency
- p50
- p90
- p95
- p99
- p99.9

And importantly:

**Latency vs throughput**

and

**average latency vs tail latency.**

### 1.3 Availability

- Availability
- Reliability
- Durability
- SLA
- SLO
- SLI
- Error budgets
- Five nines
- Downtime calculations
- Graceful degradation
- Failover

Know why:

> 99.9% availability ≠ 99.9% reliability ≠ 99.9% durability.

### 1.4 CAP theorem

Don't just memorize:

> Consistency, Availability, Partition tolerance.

Understand:

- What a network partition actually means
- Why P is not optional in distributed systems
- CP systems
- AP systems
- What "consistency" means in CAP
- Why CAP doesn't mean "pick two"
- PACELC
- CAP vs ACID

### 1.5 Distributed systems fundamentals

This is a **major section**.

Learn:

- Partial failure
- Network partitions
- Clock problems
- Distributed coordination
- Consensus
- Leader election
- Replication
- Quorums
- Heartbeats
- Failure detection
- Idempotency
- Retries
- Timeouts
- Backoff
- Jitter

These concepts explain a huge fraction of the “cool answers” you see in system-design Shorts.

---

# Phase 2 — Databases deeply

This should be one of your strongest areas.

## 2.1 Relational databases

Learn:

- Schema design
- Normalization
- Denormalization
- Primary keys
- Foreign keys
- Composite indexes
- Covering indexes
- B-tree
- Query planner
- Query optimization
- Joins
- Transactions
- ACID
- Isolation levels

Understand:

```text
Read → Query planner → Index → Disk/Page cache → Result
```

rather than treating SQL as magic.

---

## 2.2 Database internals

This is where you start becoming dangerous in interviews.

Study:

- Pages
- Buffer pool
- WAL
- Redo logs
- Undo logs
- Checkpoints
- LSM trees
- B-trees
- SSTables
- Compaction
- Write amplification
- Read amplification

You don't need to implement PostgreSQL.

But you should understand **why databases are built the way they are.**

---

## 2.3 Replication

Learn:

- Primary-replica
- Leader-follower
- Synchronous replication
- Asynchronous replication
- Semi-synchronous replication
- Replication lag
- Read replicas
- Failover
- Split brain

Then:

### Sharding

- Horizontal partitioning
- Vertical partitioning
- Hash sharding
- Range sharding
- Consistent hashing
- Hot partitions
- Rebalancing
- Shard keys
- Cross-shard queries
- Cross-shard transactions

**Consistent hashing deserves serious attention.**

It's one of those concepts that appears everywhere.

---

# Phase 3 — Caching

A huge interview topic.

Study:

### Cache fundamentals

- Why caching works
- Local cache
- Distributed cache
- Redis
- Memcached
- Cache-aside
- Read-through
- Write-through
- Write-behind

### Cache eviction

- LRU
- LFU
- FIFO
- TTL

### Cache problems

- Cache invalidation
- Cache stampede
- Cache avalanche
- Cache penetration
- Hot keys
- Cold starts
- Thundering herd

### Distributed caching

- Consistent hashing
- Cache replication
- Partitioning
- Redis Cluster
- Failover

You should eventually be able to explain something like:

> "Design a cache for 10M requests/sec"

without immediately saying "Redis."

---

# Phase 4 — Messaging and asynchronous systems

This is **extremely important**.

Study:

### Message queues

- Queue
- Producer
- Consumer
- Broker
- Consumer groups
- Partitions
- Offsets
- Acknowledgements
- Visibility timeout

Understand systems like:

- Kafka
- RabbitMQ
- SQS
- Pub/Sub

You don't need deep knowledge of every product.

Understand the underlying abstractions.

---

### Kafka specifically

I'd give Kafka substantial attention because it teaches distributed systems extremely well.

Learn:

- Topics
- Partitions
- Brokers
- Producers
- Consumers
- Consumer groups
- Offsets
- Replication
- Leader/follower
- ISR
- Ordering
- Retention
- Replay
- Exactly-once semantics
- At-least-once delivery
- At-most-once delivery

And understand:

**Why Kafka is not simply "a queue."**

---

# Phase 5 — Distributed systems

This is probably the largest conceptual block.

## 5.1 Consistency

Learn:

- Strong consistency
- Eventual consistency
- Causal consistency
- Read-your-writes
- Monotonic reads
- Linearizability
- Sequential consistency

You don't need mathematical proofs initially, but you should understand the practical implications.

---

## 5.2 Distributed transactions

Study:

- Two-phase commit
- Three-phase commit
- Distributed locking
- Saga pattern
- Compensating transactions
- Transactional outbox
- CDC

And understand why:

> distributed transactions are expensive and often avoided.

---

## 5.3 Consensus

Study:

- Consensus problem
- Paxos — conceptual understanding
- Raft — much more important practically
- Leader election
- Log replication
- Quorum
- Split brain

You don't need to implement Paxos.

But you should understand **what problem Raft solves.**

---

## 5.4 Distributed coordination

- ZooKeeper
- etcd
- Service discovery
- Leader election
- Distributed locks
- Configuration management

---

# Phase 6 — Storage systems

This is another area people skip.

Study:

### Object storage

- S3-style storage
- Objects
- Buckets
- Metadata
- Multipart uploads
- Presigned URLs
- Versioning
- Lifecycle policies
- Replication

### Block storage

- SSD
- HDD
- IOPS
- Sequential vs random I/O

### File storage

- NFS
- Distributed file systems

### Storage concepts

- Replication
- Erasure coding
- Durability
- Checksums
- Compression
- Deduplication

---

# Phase 7 — Service architecture

Now move toward actual application architecture.

### Monolith

- Modular monolith
- Advantages
- Disadvantages

### Microservices

Learn:

- Service boundaries
- API contracts
- Service discovery
- Load balancing
- Inter-service communication
- Database-per-service
- Distributed transactions
- Failure isolation

### Communication

- REST
- gRPC
- RPC
- Async messaging
- WebSockets

### API design

- REST conventions
- Pagination
- Filtering
- Sorting
- Versioning
- Rate limiting
- Idempotency keys
- Authentication
- Authorization

---

# Phase 8 — Infrastructure and production systems

This is where your engineering maturity will jump.

## Load balancing

Learn:

- L4 vs L7
- Round robin
- Weighted round robin
- Least connections
- IP hashing
- Consistent hashing
- Health checks
- Failover

---

## CDN

Understand:

- Edge locations
- Origin server
- Cache hit/miss
- Cache-control
- TTL
- Purging
- Geographic routing

---

## Reverse proxies

- Nginx
- Envoy
- API gateways

Understand:

```text
Client
  ↓
CDN
  ↓
Load Balancer
  ↓
API Gateway
  ↓
Service
  ↓
Cache / DB
```

and, more importantly, **why each layer exists.**

---

# Phase 9 — Reliability engineering

This is frequently the difference between a mediocre system-design answer and a strong one.

Learn:

### Failure handling

- Retry
- Timeout
- Exponential backoff
- Jitter
- Circuit breaker
- Bulkhead
- Rate limiting
- Load shedding
- Backpressure
- Graceful degradation
- Failover

### Observability

- Logs
- Metrics
- Traces
- Distributed tracing
- Correlation IDs
- OpenTelemetry

### Monitoring

- RED
  - Rate
  - Errors
  - Duration

- USE
  - Utilization
  - Saturation
  - Errors

---

# Phase 10 — Security

Don't become a security specialist, but know the system-design essentials.

### Authentication

- Sessions
- Cookies
- JWT
- OAuth 2.0
- OpenID Connect
- Access tokens
- Refresh tokens

### Authorization

- RBAC
- ABAC
- ACL

### Security fundamentals

- TLS
- Encryption at rest
- Encryption in transit
- Secrets management
- API keys
- Password hashing
- Salt
- Rate limiting
- DDoS
- SQL injection
- XSS
- CSRF

### Infrastructure security

- IAM
- Least privilege
- Network segmentation
- VPC
- Security groups
- Private/public subnets

---

# Phase 11 — Specialized high-scale patterns

This is where the "holy shit, I didn't know this existed" material starts appearing.

Study:

### Rate limiting

Algorithms:

- Fixed window
- Sliding window
- Token bucket
- Leaky bucket

Distributed rate limiting.

---

### ID generation

Understand:

- Auto increment
- UUID
- UUIDv7
- Snowflake IDs
- Distributed ID generation

---

### Search

Learn:

- Inverted index
- Tokenization
- Ranking
- Elasticsearch/OpenSearch
- Sharding
- Replication
- Full-text search

---

### Geospatial systems

- Geohashing
- Quadtrees
- R-trees
- Spatial indexing

Useful for:

> Uber / Google Maps / nearby restaurants

---

### Time-series systems

- Time-series databases
- Retention
- Downsampling
- Aggregation
- High-write workloads

This one is especially relevant to your energy/forecasting background.

---

### Notification systems

- Email
- SMS
- Push notifications
- Fanout
- Retry
- Deduplication
- Preferences
- Rate limits

---

### Feed systems

Understand:

- Fanout-on-write
- Fanout-on-read
- Hybrid fanout
- Celebrity problem
- Ranking
- Caching

---

### File upload systems

- Multipart upload
- Chunking
- Resumable upload
- Presigned URLs
- Object storage
- Virus scanning
- Async processing

---

# Phase 12 — Data-intensive systems

This is where I'd recommend going beyond normal interview prep.

Learn the architecture of:

### Batch processing

- MapReduce
- Spark
- Distributed computation
- Partitioning
- Shuffle
- Data locality

### Streaming

- Kafka
- Stream processing
- Windows
- Watermarks
- Event time
- Processing time
- Late events
- Exactly-once processing

### Data warehouses

- OLTP vs OLAP
- Columnar storage
- Data lakes
- Data warehouses
- Lakehouse
- Partitioning
- Parquet

### ETL/ELT

- Batch pipelines
- Incremental processing
- CDC
- Data quality
- Backfills

---

# Phase 13 — ML System Design

**This should be a major component of your preparation because you're an ML Engineer.**

Generic system-design preparation alone is not enough for your interviews.

Study:

### ML serving

- Offline inference
- Online inference
- Batch inference
- Real-time inference
- Model servers
- Model registry
- Model versioning
- Canary deployment
- Shadow deployment
- A/B testing

### Feature systems

- Feature engineering
- Offline feature store
- Online feature store
- Feature freshness
- Point-in-time correctness
- Training-serving skew

### ML pipelines

```text
Data
 ↓
Validation
 ↓
Feature Engineering
 ↓
Training
 ↓
Evaluation
 ↓
Registry
 ↓
Deployment
 ↓
Monitoring
```

Understand every component.

---

### ML infrastructure

Study:

- Model caching
- GPU serving
- Dynamic batching
- Request batching
- Quantization
- Model parallelism
- Data parallelism
- Distributed training
- GPU scheduling

---

### ML monitoring

- Data drift
- Concept drift
- Feature drift
- Prediction drift
- Model performance
- Training-serving skew
- Data quality
- Feedback loops

---

### LLM system design

Given the current market, I would **definitely** include:

- RAG
- Vector databases
- Embeddings
- Chunking
- Hybrid search
- Reranking
- Semantic caching
- Prompt caching
- LLM gateways
- Model routing
- Token budgets
- Streaming inference
- Guardrails
- Evaluation
- Agent architectures
- Tool calling
- Long-context systems
- Multi-model architectures

But don't let "AI system design" replace classical distributed systems.

---

# Phase 14 — System design patterns

Once you've learned the machinery, explicitly study these patterns.

### Architectural patterns

- Load balancing
- Caching
- Sharding
- Replication
- Partitioning
- Queue-based architecture
- Event-driven architecture
- Pub/sub
- CQRS
- Event sourcing
- Saga
- Outbox
- CDC
- Materialized views
- Leader election
- Consistent hashing

### Reliability patterns

- Retry
- Timeout
- Circuit breaker
- Bulkhead
- Backpressure
- Rate limiting
- Load shedding
- Graceful degradation

### Data patterns

- Read replicas
- Write-through cache
- Write-back cache
- Cache-aside
- Fanout
- Denormalization
- Hot/cold storage
- Tiered storage

---

# Phase 15 — Capacity estimation

**Do not skip this.**

This is one of the easiest ways to distinguish someone who memorized architectures from someone who can actually design systems.

Learn:

### Back-of-the-envelope calculations

- QPS
- Storage
- Bandwidth
- Memory
- Network throughput
- Number of servers
- Replication overhead
- Peak traffic
- Growth projections

Become comfortable doing things like:

> 100M users  
> 10% daily active  
> 20 requests/user/day  
> = 200M requests/day  
> ≈ 2,300 requests/sec average  
> × 10 peak factor  
> ≈ 23K peak QPS

And then determine:

- DB capacity
- cache capacity
- bandwidth
- storage growth
- server count

You should be able to do this **on paper in a few minutes.**

---

# Phase 16 — Actual system-design interview methodology

Only **after** the above.

Learn the canonical flow:

```text
1. Clarify requirements
        ↓
2. Functional requirements
        ↓
3. Non-functional requirements
        ↓
4. Scale estimation
        ↓
5. API design
        ↓
6. Data model
        ↓
7. High-level architecture
        ↓
8. Deep dive into bottleneck
        ↓
9. Scaling
        ↓
10. Reliability
        ↓
11. Consistency
        ↓
12. Failure scenarios
        ↓
13. Trade-offs
```

And practice asking:

### Functional

> What does the system actually need to do?

### Non-functional

> How fast?

> How many users?

> How available?

> How durable?

> What's the consistency requirement?

> What's the latency SLA?

> What's the cost constraint?

### Trade-offs

The strongest candidates don't say:

> "Kafka is better."

They say:

> "Kafka gives us replayability and high throughput, but introduces operational complexity and eventual processing semantics. If our workload is only 500 events/sec and we don't need replay, SQS would probably be simpler."

**That is system design thinking.**

---

# Phase 17 — Systems you should be able to design

Eventually, you should be able to design these from scratch:

### Beginner

1. URL shortener
2. Rate limiter
3. Key-value store
4. Distributed cache
5. File storage
6. Notification service
7. Pastebin
8. Web crawler

### Intermediate

9. Twitter/X timeline
10. Instagram
11. YouTube
12. WhatsApp
13. Uber
14. Google Maps
15. Dropbox
16. Netflix
17. Search engine
18. Distributed job scheduler

### Advanced

19. Kafka-like messaging system
20. Distributed database
21. Distributed cache
22. Metrics/logging platform
23. Real-time analytics platform
24. Ad serving system
25. Recommendation system
26. Payment system
27. Stock/crypto exchange
28. Ride matching system

### ML-specific

29. ML inference platform
30. Feature store
31. Recommendation system
32. Real-time fraud detection
33. Model training platform
34. ML monitoring platform
35. RAG system
36. LLM serving platform
37. AI agent platform

Given your background, **29–37 are particularly valuable for you.**

---

# The actual knowledge hierarchy

If I compress the entire roadmap into a mental model, I'd want you to eventually understand this:

```text
                    SYSTEM DESIGN
                         │
          ┌──────────────┴──────────────┐
          │                             │
      APPLICATION                    DATA
          │                             │
    APIs / Services              Databases
    Microservices                Caches
    RPC                          Queues
    Gateways                     Streams
          │                       Storage
          │                             │
          └──────────────┬──────────────┘
                         │
                 DISTRIBUTED SYSTEMS
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Replication       Partitioning     Consensus
   Consistency       Sharding         Coordination
   Failures          Quorums           Leader election
        │                │                │
        └────────────────┼────────────────┘
                         │
                    INFRASTRUCTURE
                         │
      ┌──────────────────┼─────────────────┐
      │                  │                 │
    Network            Compute          Storage
      │                  │                 │
     DNS               Servers            SSD
     TCP               Containers         Object store
     HTTP              Kubernetes         File systems
     CDN               Autoscaling        Replication
      │                  │                 │
      └──────────────────┼─────────────────┘
                         │
                   RELIABILITY
                         │
      Observability / Monitoring / Failure handling
                         │
                         ▼
                    SECURITY
                         │
                         ▼
                   ML SYSTEMS
                         │
       Features / Training / Serving / Monitoring
                         │
                         ▼
                  SYSTEM DESIGN
                   INTERVIEWS
```

That's the map I would use.

---

## But there is one important caveat

**Don't try to study this as a 200-topic checklist.**

That's how people spend 3 months watching System Design videos and still can't design anything.

Your goal should be:

> **Learn a concept → understand the problem it solves → understand its failure modes → use it in a system.**

For example, don't study "consistent hashing" as a definition.

Instead:

> I have 100 Redis nodes.  
> I add node 101.  
> How do I redistribute keys without destroying my cache?

Then consistent hashing becomes memorable.

Same with Kafka:

> I have 50K events/sec.  
> Consumers can process only 20K/sec.  
> What happens?

Then you naturally discover partitions, consumer groups, offsets, backpressure, lag, retention, etc.

---

# The resources I'd prioritize

I wouldn't use 15 different YouTube playlists.

I'd build your preparation around **three primary resources**:

### 1. Designing Data-Intensive Applications — Martin Kleppmann

This is the **book I'd consider the backbone**.

It covers the conceptual foundation behind:

- databases
- replication
- partitioning
- transactions
- distributed systems
- batch processing
- streaming
- consistency

It's substantially more valuable than memorizing "Design Instagram" answers.

_[Image carousel in original chat: Designing Data-Intensive Applications Martin Kleppmann book; System Design Interview An Insider's Guide Alex Xu book; Fundamentals of Software Architecture book]_

### 2. System Design Interview — Alex Xu

Use this **after learning the fundamentals**.

It's useful for learning how to translate concepts into interview problems.

### 3. System Design Primer

Use it as a **reference/checklist**, not as your primary teacher.

---

# And for you specifically

Because you're an ML Engineer rather than a backend SWE, I'd make your eventual preparation approximately:

| Area | Priority |
|---|---:|
| Distributed systems | ⭐⭐⭐⭐⭐ |
| Databases | ⭐⭐⭐⭐⭐ |
| Caching | ⭐⭐⭐⭐⭐ |
| Networking | ⭐⭐⭐⭐ |
| Messaging/streaming | ⭐⭐⭐⭐⭐ |
| Scalability | ⭐⭐⭐⭐⭐ |
| Reliability | ⭐⭐⭐⭐⭐ |
| API/service architecture | ⭐⭐⭐⭐ |
| Storage | ⭐⭐⭐⭐ |
| Security | ⭐⭐⭐ |
| Cloud/infrastructure | ⭐⭐⭐⭐ |
| Data systems | ⭐⭐⭐⭐ |
| ML system design | ⭐⭐⭐⭐⭐ |
| LLM systems | ⭐⭐⭐⭐ |
| Interview-specific problems | ⭐⭐⭐⭐ |

And there's a particularly important reason I wouldn't recommend studying this like a generic fresher:

**You already have ~14 months of production ML engineering experience.**

You've probably encountered things like databases, APIs, queues, cloud infrastructure, pipelines, model serving, monitoring, distributed processing, etc. The problem is likely not that you've never seen these things. It's that you don't yet have a **unified mental model connecting them**.

That's exactly what system design study can fix.

And your heavy use of Claude Code/Codex makes this even more important: **you don't need to become the person who manually writes every line of infrastructure code. You need to become the person who can look at the generated system and reason about whether the architecture is correct, scalable, reliable, secure, and economically sensible.**

That's a very good direction for your next career step.

---

If you want, I can:

- Explain how to start learning system design fundamentals
- Provide detailed study plan for ML system design topics
- Suggest how to apply system design concepts in interviews
