# System Design Glossary

Short definitions of terms you've asked about, kept here so the lessons stay clean. If an entry still doesn't click, ask and we'll go deeper.

## Terms

**Gossip protocol (Cassandra)**: Cassandra nodes find out who is in the cluster and who is alive by chatting with random peers, the way a rumour spreads. No central server keeps the list. Each node builds its own picture from what it hears.

- **One round:** Every second, each node picks a random other node and swaps what it knows, both about itself and about every other node it has heard of. That includes a heartbeat (a counter that keeps going up while the node is alive) and other facts, such as which slices of data it owns and its schema version. Each fact carries a version stamp: a *generation* (bumped each time the node restarts) plus a *version* (bumped as it runs). When two nodes compare notes, the higher stamp wins, so old news never overwrites new news.
- **Why it spreads fast:** Each round, everyone who already knows a piece of news tells someone else, so the number who know roughly doubles. News reaches all N nodes in about log(N) rounds. If every node instead pinged every other node, you would need about N² messages per round, which gets out of hand as the cluster grows.
- **Seed nodes:** A few well-known addresses listed in each node's config. A new node gossips with a seed first to learn about the rest of the cluster. Seeds are only starting contacts, not leaders. They make no decisions and hold no special data.
- **Failure detection:** Cassandra doesn't use a fixed "silent for X seconds means dead" rule. It uses the *phi accrual failure detector*. Each node learns how regularly another node's heartbeats usually arrive. It then turns "how late is the next one compared with normal" into a suspicion score called *phi* (higher means more suspicious). Once phi crosses `phi_convict_threshold` (default 8), the node is marked down.
- **Down is a local opinion:** "Down" only means "this node stops sending traffic there for now". It isn't gossiped as a fact, and the node isn't removed from the cluster. Removing a node takes an explicit operator action.
- **Trade-off:** Gossip is cheap, has no single point of failure and copes well with failures. But news takes a few seconds to spread (it is eventually consistent), so different nodes can briefly disagree about who is up.

_Sources_: [Apache Cassandra docs: Dynamo architecture (Gossip, Failure Detection)](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html); [cassandra.yaml reference: `phi_convict_threshold`](https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html); Alex Xu, *System Design Interview*, Ch. 6 "Failure detection" (`resources/System Design Interview by Alex Xu.pdf`, PDF pages 99–101); Martin Kleppmann, *DDIA*, Ch. 8 "Timeouts and Unbounded Delays" (`resources/Designing Data Intensive Applications by Martin Kleppmann.pdf`, PDF pages 303–309, mentions Phi Accrual).

Quorums, replication, and how Cassandra uses gossip together with its hash ring come later in Phase 2.
