# Writing Examples

**Last updated:** 23 July 2026
**Selection logic:** These are not the highest-traffic posts. They are the posts with proven buyer behavior. PostHog (30-day window, July 2026) shows only three blog posts on the entire site produced purchase-page reaches, and the first two examples below are among them. Match new content to these, not to the traffic-magnet consumer posts (YouTube unblock, Roblox), which convert nobody.

---

## Example 1: IP Reputation and ASN Scoring (Akila Kavinda)

**Live URL:** torchproxies.com/proxy-ip-reputation-asn-scoring-2026/ (root slug; see internal-links-map.md on the /blog/ prefix issue)
**Why exemplary:** 18 sessions in 30 days, 2 dashboard reaches, 1 purchase reach. Best conversion ratio on the site. Local draft: `proxy-ip-reputation-asn-scoring-2026.html`

**Title:** IP Reputation and ASN Scoring: Why Your Proxy Gets Flagged Before You Do Anything
**Meta:** "Platforms score your proxy before your first request. ASN type, subnet history, and score thresholds determine whether you get through. Explained for 2026."

Opening excerpt:

> Platforms score your proxy before your first request lands. Understanding what feeds that score is the difference between getting through and getting blocked before the session starts.
>
> Most detection guides focus on what happens during a session. This one covers what happens before your request even reaches the platform's application layer. Platforms assign a 0-100 risk score to your IP before processing any session logic. The score pulls from ASN type, blacklist status, subnet history, and behavioral signals from prior users.
>
> ASN type is the first filter. Consumer ISP ASNs (Comcast, BT, Vodafone) score 0-20 by default. Datacenter and hosting ASNs (AWS, OVH, Hetzner) start at 50-85 even with a perfectly clean IP.

What to copy: exact numbers and thresholds (0-100 score, 21-60 CAPTCHA band, 85+ auto-block), named entities (Comcast, AWS, OVH), the reframe in sentence two that tells the reader why this article is different from the ones they already read, a TL;DR that actually summarizes rather than teases.

---

## Example 2: The Full Anti-Detection Stack (Sachin Supunthaka)

**Live URL:** torchproxies.com/the-full-anti-detection-stack... (live but zero impressions; indexation fix in progress)
**Why exemplary:** The synthesis piece of the Bot Detection Decoded series. The four-layer framework is the kind of structured, table-friendly content LLMs cite. Local draft: `blog-anti-detection-stack-2026.html`

**Title:** The Full Anti-Detection Stack: Proxy + Browser + Behavior for 2026
**Subtitle:** "Your proxy is one layer. Anti-bot systems run four. Here is what each layer checks, what tool addresses it, and how they have to work together to actually pass."

Opening excerpt:

> Modern anti-bot systems run four independent detection layers. Each layer has to be addressed separately. Failing one means you fail the session, regardless of how well you handled the other three.
>
> Layer 2 is TLS fingerprinting, and it fires before any HTTP header is read. Python's requests module has a known JA4 signature that DataDome and Cloudflare flag before your user-agent, cookies, or headers even matter. Fix: curl_cffi or real Chromium.
>
> Layer 3 is the browser JS environment. navigator.webdriver, canvas fingerprint, WebGL renderer, AudioContext, screen geometry. playwright-stealth patches 12 of the 40+ signals checked.

What to copy: honest tool assessments including partial fixes ("patches 12 of the 40+ signals"), a problem/fix rhythm per layer, technical specificity that names the exact API surfaces detection reads.

---

## Example 3: Proxy Setup for LangChain, CrewAI and Claude Agents (Sachin Supunthaka)

**Why exemplary:** The AI agent cluster is our lowest-KD differentiator territory (KD 5-10, no mid-market competitor covers it), and the sibling post "Residential vs ISP for AI agents" produced a purchase reach. Local draft: `blog-proxy-setup-langchain-crewai-claude-agents-2026.html`

**Title:** Proxy Setup for LangChain, CrewAI and Claude Agents: A Developer's Guide (2026)
**Subtitle:** "Most agent tutorials skip the proxy part entirely. Then your WebBaseLoader hits a 403 on the first production run, and you're debugging it with no documentation in sight."

Opening excerpt:

> Proxy setup for AI agents splits into two completely separate problems. One is routing your LLM API calls through a proxy. The other is routing the web requests your agent's tools make. Most guides cover neither clearly. Here's what actually works.
>
> CrewAI proxy setup: env vars work for most tool requests. Per-agent proxy assignment requires setting proxy env vars inside custom tool functions. CrewAI uses httpx internally for MCP connections, so SOCKS5 requires pip install socksio.

What to copy: the subtitle names the exact failure moment the reader has lived through, the opening splits a confused topic into its real component problems, implementation gotchas competitors don't know (the httpx/socksio detail).

---

## Shared patterns across all three

1. Subtitle does real work: names the reader's actual situation, never generic
2. TL;DR block up top with substantive claims, not teasers
3. Byline with real author name, role, date, read time
4. Numbers everywhere: thresholds, counts, versions, prices
5. Honest limitations stated inline, not buried
6. No em dashes, no AI filler phrases, varied sentence length
7. 1,800-3,000 words, section-by-section structure with comparison tables where the topic allows
