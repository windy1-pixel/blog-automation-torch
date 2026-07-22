# Knowledge Library — maintainer guide

These Markdown files are the **single source of truth** for every factual claim
the Content Writer is allowed to make about Torch Proxies — product specs, IP
pool sizes, locations, protocols, pricing, and internal-link URLs.

## Why this exists

The writer is instructed to state Torch Proxies product facts **only** from
these files, and to never invent specs or copy claims from competitor pages.
If a fact isn't written here, the article won't state it. This is the fix for
the old workflow, which told the model to swap competitor claims onto our brand
(producing false specs about our own product).

## How to edit

- One file per topic. `00-brand.md` loads first (company voice + link rules),
  then product files alphabetically.
- **State only confirmed facts.** If you're unsure of a number, leave it out —
  an omitted fact is safe; a wrong one ships in published articles.
- Lines beginning `> **TODO (maintainer):**` mark gaps to fill in. The writer is
  told to ignore TODO lines, so they're safe to leave, but every filled-in TODO
  makes articles richer and more specific.
- Keep internal-link URLs current — the writer uses these verbatim for links.

Files are plain Markdown; edit them in any text editor and save.
