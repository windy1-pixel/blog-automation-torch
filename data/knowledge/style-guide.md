# TorchProxies Style Guide

**Last updated:** 23 July 2026
**Scope:** Every blog article, no exceptions. Voice and positioning live in `brand-voice.md`; this file is the mechanical rulebook.

---

## Article structure

- **Word count:** 1,800-3,000
- **H1:** includes primary keyword + "2026"
- **Subtitle:** one-liner under the H1 that names the reader's actual situation. Punchy, never generic
- **Byline:** real author name, role, month/year, read time
- **TL;DR block** after the byline: substantive claims, not teasers. 3-part intro structure: value statement, scope declaration, invitation
- **Body:** 5-8 H2 sections, generated and reviewed one at a time, never in one pass
- **Comparison table** wherever the topic allows (LLMs cite structured tables heavily)
- **FAQ:** 5+ questions phrased exactly as someone would type into Google or ChatGPT; answers 1-3 sentences, direct
- **Conclusion:** answers the title question directly, ends decisively. No summary recap
- **CTA placement:** sidebar always on, mid-article after section 3, conclusion, subtle TL;DR mention

## Sentence and paragraph mechanics

- Wild sentence length variation. 3-4 word punches after long complex sentences. Never three consecutive sentences of similar length
- Paragraph lengths vary; single-sentence paragraphs are allowed and encouraged
- Lists vary in length: 2, 4, 5, 6, 7 items. Never every list at exactly 3
- Some section transitions should be abrupt. Smooth transitions everywhere is an AI tell
- Colons and commas, never em dashes
- Every bold = critical information, not decoration
- Keep verbs as verbs ("we implemented", not "the implementation of")
- Repeat words naturally; don't cycle synonyms. If the word is "developers", say "developers" again
- Use "is" and "has"; don't substitute "serves as", "boasts", "features", "marks the"
- Mix human subjects into consecutive sentences; don't stack inanimate agents ("The framework reveals... The data demonstrates...")
- Present participial clauses ("...leaning on his agility, dances...") used sparingly

## Anti-AI Slop Reference (Quality Gate 1)

These are high-confidence AI detection markers. If any appears, regenerate the affected paragraph, not just the offending word.

### Banned outright (auto-fail)

**Punctuation:** em dashes (—) anywhere in body text.

**Phrases:** "delve into", "dive into", "it is worth noting", "it is important to understand", "Furthermore"/"Moreover"/"Additionally" as connectors, "In this article, we will", "In conclusion", "As we have discussed", "As mentioned earlier", "Navigating the landscape of", "In today's digital age", "In today's..." openers of any kind, "This comprehensive guide", "Here's the thing", "But here's the kicker", "And here's the part most people miss", "The best part is", "The real magic happens", "Harness the power of", "Unlock the potential of", "Push the boundaries of", "Pave the way for", "At the forefront of", "Bridging the gap between", "Drive efficiency", "Deliver actionable insights", "Navigate the complexities", "It's not X, it's Y", "Not just X".

**Words:** bustling, vibrant, metropolis, commendable, noteworthy, meticulous, palpable, camaraderie, intricate, paramount, juxtapose, hitherto, encompass, galvanize, scalable, game-changer, transformative, cornerstone, bolster, cultivate, optimize, resonate, profound, empower.

**Adverbs (delete most):** meticulously, seamlessly, arguably, notably, significantly, crucially, importantly, consequently, subsequently, accordingly, consistently, strategically, relentlessly, poignantly.

### Structural AI tells (regenerate the section)

- **Present participial clause overuse:** constructions like "Bryan, leaning on his agility, dances around the ring." AI uses these at 5x the human rate. One per section at most
- **Nominalization:** "the implementation of the solution" instead of "we implemented the solution." Keep verbs as verbs
- **Synonym cycling:** rotating synonyms to avoid repetition. If the word is "developers", say "developers" again. Humans repeat words
- **Copula substitution:** replacing "is" and "has" with "serves as", "features", "boasts", "presents", "marks the". Use the simple verb
- **Inanimate agency stacking:** consecutive sentences where objects act as subjects ("The framework reveals... The data demonstrates... The analysis confirms..."). Mix in human subjects
- **Binary contrast overuse:** building whole arguments on clean good/bad, old/new, simple/complex framing. Real analysis has contradictions and complications
- **Uniform everything:** every section the same length, every list exactly 3 bullets, smooth transitions between every section, no moment where the author admits uncertainty or a mistake
- **Scene-setting openings and summary closings:** no throat-clearing intro, no recap conclusion. Start at the point, end on the actual final point
- **Rhetorical questions as a structural device:** once per article is fine, once per section is a tell
- **Sycophantic openers** and relentless optimism with no emotional variation

### Positive counters (what to add instead)

- **Lived specificity:** particular details, real names, real numbers. "Goat cheese and handmade pottery sell out by noon" beats "a vibrant testament to regional culture." Specificity is the single strongest anti-slop technique
- **Natural imperfection:** contractions, intentional fragments, self-correction mid-thought, willingness to be wrong
- **Genuine point of view:** get heated, be sarcastic, pick favorites, contradict yourself, leave an open loop unwrapped
- **Emotional range:** frustration, skepticism, boredom, delight alongside conviction
- **Conversational texture:** address the reader directly, parenthetical asides, sentences starting with "And" or "But"

### Detection sweep before Gate 2

Read the draft once looking only for the patterns above, not for content. The Layer 3 signals (next section) are the required positive proof; this sweep is the required negative check. Both must pass.

## Required in every article (Layer 3 signals, all six)

1. Personal failure or mistake moment, specific to author and topic
2. "You don't need this" section: one honest case where TorchProxies is the wrong answer
3. One specific expressed uncertainty (a genuine knowledge limit, not a disclaimer)
4. Authority through detail: obscure fact, exact stat, or named Trustpilot reviewer
5. One deliberate coverage gap explicitly noted as outside scope ("deserves its own guide")
6. One idiosyncratic analogy, slightly imperfect, concrete and unexpected. Never generic metaphors

## Facts and claims

- Product claims only from `features.md`. Never invent statistics
- External stats sourced from named references: Proxyway Research, Cloudflare Radar, Mordor Intelligence
- Amasha spot-checks 3-4 stats before publish

## Meta and naming

- Meta title: 55-60 chars, keyword near start
- Meta description: 150-160 chars, keyword + hook. Never placeholder text (a live article shipped with "Complete Guide 2026" as its entire meta; that is what Google displays)
- Draft file names: prefixed `blog-` before the title slug (e.g. `blog-tiktok-proxy-setup-2026.html`)
- Published URL slugs: root-level in WordPress; see `internal-links-map.md` for the slug convention rule

## Visual identity

- Hero image: dark background #111111, orange accent #E8500A, Urbanist font for text overlays, 1200x630, topic-specific (never generic stock)
- Supporting infographics for comparisons and technical flows
- All images: descriptive alt text including the keyword
