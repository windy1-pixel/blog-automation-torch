# TorchProxies Brand Voice

**Last updated:** 23 July 2026 | **Owner:** Amasha
**Sources:** Content OS author patterns, blog writing style profile, Reddit community research (12,593 docs), Blog Automation OS (ClickUp)

---

## Who we are

TorchProxies is a proxy reseller sitting between the enterprise giants (Bright Data, Oxylabs) and low-quality budget providers. We serve individuals, small teams, and growth-stage businesses who need enterprise-grade residential, ISP, and (from August 2026) mobile proxies at a price that makes sense for their scale.

We are not the cheapest and we are not the biggest. We are the provider that tells you the truth about what you actually need, including when that answer is "not us."

## Positioning pillars

1. **Honest by default.** The Reddit proxy community's deepest sentiment is distrust of promotion ("Is anyone here actually real and not a paid shill?"). Every piece of content acknowledges real limitations and includes at least one case where TorchProxies is not the right answer. This is a conversion strategy, not a nicety: our only blog posts with proven purchase paths are the honest technical comparisons.
2. **Priced against the overpriced benchmark.** Bright Data is the most name-dropped provider in the community, consistently framed as the overpriced default. We price against that flank without trashing them. Comparisons acknowledge where they win.
3. **Specific over generic.** Real carrier names, real pool names, real numbers, real Trustpilot reviewer names. Specificity is our authority signal and our strongest anti-slop technique.
4. **Mobile launch messaging (Aug 2026):** "real carrier IPs" and transparent per-GB pricing vs per-modem competitors. The two things the community says nobody credible offers are verifiably real carrier IPs and transparent pricing. That is the wedge.

## Voice register

Casual-intellectual. A smart person talking to another smart person. Not corporate, not academic, not hype. Takes clear positions ("I think", "my guess") without formulaic hedging. Willing to say something is wrong or overrated. Contractions used naturally.

Emotional range is allowed and expected: frustration, skepticism, delight, conviction. Not relentless optimism.

## Author voices

Each article publishes under a real named author with a consistent bio (this builds the author entity for AEO). Match author to article type:

| Author | Role | Article types | Voice notes |
|---|---|---|---|
| Sachin Supunthaka | Senior Software Engineer | Technical tutorials, developer guides, code examples, detection deep-dives | Precise, code-first, states exact signatures and thresholds |
| Amasha Vidumini | Operational Analyst | Market data, industry analysis, stats-heavy explainers, honest comparisons | Analytical, evidence-led, willing to call things overrated |
| Akila Kavinda | Operations Manager | Decision guides, "how to choose" articles, no-code pieces | Practical, framework-driven, buyer-side perspective |
| Hirusha / Devinda / Pubudu | Developers | Beginner tutorials, step-by-step coding | Patient, assumes less, still specific |

Author signature phrases should appear 3-4 times per article, naturally.

## The six required humanisation signals (Layer 3)

Every article must contain all six:

1. A personal failure or mistake moment, specific to the author and topic
2. A "you don't need this" section: one honest case where TorchProxies is not the right answer
3. One specific expressed uncertainty ("I haven't personally tested X on this target")
4. Authority through detail: an obscure fact, exact stat, or named Trustpilot reviewer
5. One deliberate coverage gap, explicitly noted as outside scope
6. One idiosyncratic analogy, slightly imperfect, the one the author would naturally reach for

## What we never sound like

No corporate jargon. No hype. No "game-changer", "seamless", "unlock the potential", "harness the power". No em dashes anywhere. No "delve into", "it is worth noting", "Furthermore/Moreover" connectors. No throat-clearing intros ("In today's digital age..."), no summary conclusions ("In conclusion..."). The full banned list lives in `style-guide.md`.

## Audience segments and how we talk to them

| Segment | What they care about | Tone adjustment |
|---|---|---|
| Sneaker/retail botters | Pool quality per site, ban rates, drop-day reliability | Community-fluent, name the sites and bots |
| Developers/scrapers | Success rates, fraud scores, code that works, TLS/fingerprint detail | Technical, exact, code samples that run |
| Social media/multi-account managers | Account safety, platform detection, session control | Practical, risk-aware, platform-specific |
| Business/non-technical buyers | Reliability, pricing clarity, support | Plain language, no assumed knowledge, still no fluff |

The buyer conversation professionalized in 2026: success rate mentions grew 3.8x, fraud score 2.8x, sticky sessions 2.5x on Reddit year over year. Write to benchmarks and IP-quality evidence, not feature lists.

## Value propositions by segment

**Sneaker/retail botters:** "Pre-tested, site-specific ISP pools (Nike, Supreme, Footsites, Popmart) at $2.30/IP/month, without enterprise minimums."
**Developers/scrapers:** "Enterprise-grade pools at $5/GB with no rate limits, no contracts, and a free trial that doesn't ask for a card."
**Social/multi-account managers:** "Session control and pool quality that keeps accounts alive, priced for people running 10 accounts, not 10,000."
**Business buyers:** "Bright Data-class infrastructure without Bright Data pricing or onboarding friction."

## Voice example: right vs wrong

**Right:**
> Rotating residential inherits shared risk. Each rotation cycles to an IP used by previous users. You get their score, not a clean one. I haven't tested this against Akamai's newest model, but on Cloudflare-protected targets the pattern is consistent: fresh sessions on recycled IPs start life at a 40+ risk score. If you're running fewer than five accounts, honestly, you don't need us for this. A single clean ISP IP does the job.

Why it works: exact mechanism, exact numbers, stated uncertainty, an honest "you don't need this", no hype vocabulary.

**Wrong:**
> In today's digital age, proxies are a game-changer for businesses looking to unlock the potential of web data. TorchProxies offers a comprehensive, scalable solution that seamlessly empowers your automation journey. Furthermore, our cutting-edge infrastructure delivers actionable insights.

Why it fails: five banned words in two sentences, zero facts, no position taken, could describe any provider on earth.
