# Knowledge Library

The curated context that governs what the agents may say and how they say it.
These are TorchProxies' real working documents, synced from the team's context
folder — **edit the source docs, then run `npm run sync:knowledge`**, don't edit
these copies directly (they get overwritten).

| File | Governs | Used by |
|---|---|---|
| `features.md` | Products, prices, pool sizes, ISP country/use-case matrix, approved claims, CTA mapping | Writer (the ONLY source of product claims) |
| `brand-voice.md` | Positioning, author voices, the six required humanisation signals, audience segments | Writer |
| `style-guide.md` | Structure, sentence mechanics, banned phrases/words, Layer 3 signals, meta rules | Writer |
| `writing-examples.md` | Three exemplar articles with "what to copy" notes | Writer |
| `internal-links-map.md` | Slug rule (root-level only), hub pages, do-not-link list, anchor text rules | Writer |
| `target-keywords.md` | Clusters, priorities, intent classification, do-not-write list | Brief / keyword stages |
| `competitor-analysis.md` | Competitive map, content gaps, per-article recon SOP | Brief stage |

## The rule that matters most

Product claims come **only** from `features.md`. The writer never invents a
statistic and never attributes a competitor's spec to TorchProxies. If a fact
isn't in `features.md`, the article doesn't state it.
