# Writing Method (distilled from the claude-blog method)

This is the writing standard every section of a TorchProxies article must meet.
It is adapted from the claude-blog skill's content rules, AI-slop detection, and
editorial heuristics, and tuned for our product and our section-by-section
generation. The model is given the relevant parts of this file at write time.

## The one rule that matters most: answer first

Open every section by answering the heading's implicit question in the first
sentence. Name the concrete thing (the proxy type, the year, the practical
consequence) before any context. A reader who stops after sentence one should
still have the answer.

- Do NOT open with a warm-up ("In this section we will look at…").
- Do NOT open with an analogy. State the point, then explain it.
- The heading is a promise. Keep it in the first 100 words, not the last.

## Evidence discipline (this is what makes it trustworthy)

1. **Never invent a statistic, benchmark, price, or spec.** If a number is not
   in the product-facts document or a named external source, do not write it.
2. **Product claims about TorchProxies come only from the product-facts
   document.** Never attribute a competitor's number to us. If a fact is not in
   product facts, say what is true generally instead of guessing.
3. **Do not fabricate first-person experience.** Never write "I once tried…",
   "in my testing…", or "I benchmarked…" unless the brief supplies that
   experience. Invented anecdotes destroy trust. Write from knowledge, not from
   a fake memory.
4. **State uncertainty once, plainly, where it matters** — not as a repeated
   verbal tic. One honest "exact pool sizes are undisclosed" beats five
   "I haven't personally tested" hedges.

## Banned slop patterns (rewrite on sight)

These survive a synonym swap, so watch for the *shape*, not just the words:

- **Forced analogies.** No "think of it like a subway / bus fleet / a library."
  Explain the real mechanism instead. One analogy in a whole article is a
  maximum, and only if it genuinely clarifies.
- **Hedge stacking.** Do not cluster "may / might / often / typically /
  generally / usually" in one passage. Commit to what is true.
- **Three-clause metronome.** Avoid paragraph after paragraph of
  "[clause], [clause], [clause]." Vary sentence length hard: follow a long
  sentence with a three-word one.
- **False balance.** No "While X, on the other hand Y" when there is no real
  trade-off. Cut framing that carries no information.
- **Wrap-up questions.** Do not end sections with "Why does this matter?" or
  "So what does this mean?" End on the actual point.
- **Symmetric list bloat.** Do not pad every bullet to the same length. Give
  each item the detail it actually needs; some are one line, some are three.
- **Filler transitions.** No "Now, let's dive into…", "It's important to
  note…", "In today's digital landscape…".

## Voice

- Write to one clearly-named audience (from the brief). Address them as "you".
- Use contractions. Sound like a knowledgeable engineer talking to a peer, not a
  marketing brochure.
- One concept, one name. If it is a "residential proxy", it stays a "residential
  proxy" — don't rotate through "resi IP", "home proxy", "residential node".
- Maximum one brand mention per section, and never promotional ("the best",
  "industry-leading", "unlock the power of").
- No em dashes. Use commas, colons, periods, or parentheses.

## Structure inside a section

- Lead sentence answers the heading.
- Then the mechanism / evidence / example that supports it.
- Use a table when you are comparing 3+ things on the same axes (put the real
  decision criteria in the columns).
- Use a bulleted list only for 3+ genuinely parallel items.
- Prefer prose for reasoning; lists are for scannable parallel facts, not for
  every thought.

## The self-check before returning a section

Would a practitioner in this audience learn something specific and correct, or
is this a paragraph they could have written themselves from the title alone? If
the latter, it is slop. Add the specific mechanism, the real constraint, or the
concrete example that only someone who understands proxies would know — or cut
the section down to what is actually true and useful.
