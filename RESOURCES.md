# System Design Resources

Local PDFs are in `resources/`. Plain-text extracts (for searching and citing) are in `resources/_extracted/`, with `=====PAGE N=====` markers that match the PDF page numbers, so lessons can link with `#page=N`. **See `BOOK_INDEX.md` for which pages cover which topic.**

## Knowledge

- **Book: _Designing Data-Intensive Applications_, Martin Kleppmann (1st ed., 2017)**, `resources/Designing Data Intensive Applications by Martin Kleppmann.pdf`
  The backbone text. Use for: scalability and percentiles (Ch. 1), storage engines (Ch. 3), replication (Ch. 5), partitioning (Ch. 6), transactions (Ch. 7), distributed-systems failure (Ch. 8), consistency and consensus (Ch. 9), batch (Ch. 10), streams (Ch. 11). PDF page ≈ printed page + 22.
- **Book: _System Design Interview: An Insider's Guide_ (Vol. 1), Alex Xu**, `resources/System Design Interview by Alex Xu.pdf`
  Turns concepts into interview answers. Use for: the zero-to-millions overview (Ch. 1), estimation (Ch. 2), interview framework (Ch. 3), and worked designs (rate limiter, consistent hashing, KV store, ID gen, URL shortener, crawler, notifications, feed, chat, autocomplete, YouTube, Drive).
- **Book: _Designing Machine Learning Systems_, Chip Huyen (2022)**, `resources/Designing Machine Learning Systems.pdf`
  Use for: Phase 13 (data pipelines, features, deployment, batch vs online prediction, monitoring and drift, MLOps infra).
- **Book: _Systems Engineering Principles and Practice_, Kossiakoff et al.**, `resources/Systems engineering principles and practice.pdf`
  Classical (aerospace/defense) systems engineering, not software system design. Low relevance. Use only for requirements-engineering ideas if ever needed.
- [System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
  Recommended in the roadmap as a checklist/reference, not as a teacher.
- [AWS docs: Regions and Availability Zones](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html)
  Use for: fault domains in real clouds.

## Gaps
- LLM-serving specifics (KV cache, continuous batching, semantic caching, gateways) aren't in any local book. Will need primary web sources (vLLM paper, provider docs) when Phase 13 arrives.
- Modern infra (Kubernetes, service mesh, OpenTelemetry) is thin in the local books.

## Wisdom (Communities)
- Not proposed yet. The user is a self-learner. Ask before recommending any.
