# Internal Links Map

**Last updated:** 23 July 2026
**Context:** Internal linking is the site's single biggest failure. 26 of 80 published posts have zero Google impressions because they are orphans: articles link heavily to product and geo pages but almost never to each other, and the links that do exist point at a `/blog/blog-[slug]/` convention that 404s. This file is the corrective map.

---

## THE SLUG RULE (read before adding any link)

WordPress publishes at **root-level slugs**: `torchproxies.com/[slug]/`. The `/blog/blog-[slug]/` convention in our draft files was never created in WordPress. Sixteen distinct dead `/blog/*` paths received real visits in 60 days.

Until the team decides otherwise (decision pending before the blog automation build hardcodes it): **all internal links use root-level slugs.** Never link to `/blog/anything/`.

Four Q3 calendar topics will deliberately publish at slugs where dead links already point, converting existing 404s into working links: what-is-ip-rotation, sticky-vs-rotating-proxies-2026, behavioral-bot-detection-session-scoring, avoid-ip-bans-web-scraping.

Known typo to never repeat: `/united-state/` (correct: `/united-states/`).

## Product and money pages (link targets for CTAs)

| Page | Use as target for |
|---|---|
| / (homepage) | Brand mentions |
| /proxy-dashboard/ | "Dashboard" references, trial signups |
| Plan X product page | Scraping, multi-account, AI agent content |
| Premium Residential page | Business, ad verification, price monitoring content |
| Standard Residential page | Budget/entry content, Roblox redirect target |
| ISP Proxies page | Sneaker, ticket, retail, social-account content |
| Mobile Proxies page (from Aug 2026) | All mobile-intent content |

## Hub pages (highest authority, must feed the orphans)

Every ranking page should link contextually to 2-3 same-cluster pages. These are the pages with authority to give:

| Hub page | Impressions (3mo) | Position | Feeds cluster |
|---|---|---|---|
| /roblox-alt-account-detection-in-2026.../ | 32,258 | 5.8 | Gaming/detection cluster. Alone it can feed the whole cluster |
| /instagram-ip-ban-how-to-fix-it-in-2026/ | 26,673 | 5.8 | Social/multi-account |
| /manage-multiple-discord-accounts-without-getting-banned-2026/ | 15,070 | 6.8 | Social/multi-account |
| /datacenter-vs-residential-proxies-2026/ | 7,171 | 6.6 | Comparison/decision cluster |
| /web-scraping-best-practices.../ | 2,947 | 7.8 | Python/scraping cluster hub once that cluster is indexed |
| /unblock-proxy-guide-youtube-2025/ | 63,878 | 11.6 | Top-of-funnel only; do not invest further |

## Pillar structure (link up and sideways)

Content is organized as pillar > cluster > topic (8 pillars, 24 clusters, 69 topics in the current tree). The linking rule: every topic article links UP to its pillar and SIDEWAYS to 2-3 siblings in the same cluster. No article publishes without its links in both directions.

Series status:
- **Bot Detection Decoded** (6 articles): 2, 3, 5 live plus the synthesis (Full Anti-Detection Stack, live but invisible). Pillar (Article 1, "How Bot Detection Actually Works") and Article 4 (behavioral) are in the Q3 calendar. Once the pillar publishes, link every series article to it.
- **Proxy Infrastructure for AI Agents** (6 articles): 4, 5 live plus a bonus (Proxy Authentication). Pillar and Articles 2, 3, 6 in the Q3 calendar.
- **Mobile launch content** (from Aug 2026): all mobile articles link to the mobile pillar and the mobile product page.

## Orphans needing inbound links first (highest-value stranded assets)

The entire June social series (Meta/Instagram detection, TikTok ByteDance, LinkedIn Sales Navigator, X API tiers, Telegram MTProto, YouTube channel management), the Full Anti-Detection Stack, and the whole Python cluster (Amazon scraping, Google Search results, Google Flights, Reddit scraping, Instagram scraping, Cloudflare bypass, web scraping complete guide). Link to these from the hub pages above before publishing anything new in their clusters.

## Do-not-link list

- Any `/blog/*` path (all 404 or unresolved; full dead list in `TorchProxies_Blog_Performance_Audit_July2026.md` appendix)
- `/test/` (being deleted)
- Losing URLs in the duplicate pairs pending 301s: datacenter-vs-residential-proxies (non-2026), tiktok-proxies multi-account variant, one of the two VMs-vs-antidetect pages, the hybrid-proxies `-2` republish
- Old renamed slugs: instagram-scraping-in-2026-scrape-without-getting-blocked (301 pending)

## Anchor text rules

Descriptive, keyword-bearing, natural in the sentence. Not "click here", not the bare URL, not the same exact anchor sitewide for one target (vary it). External links go to named sources only: Proxyway Research, Cloudflare Radar, Mordor Intelligence.
