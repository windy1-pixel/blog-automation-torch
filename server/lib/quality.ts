// Deterministic style checks straight from data/knowledge/style-guide.md
// ("Anti-AI Slop Reference — Quality Gate 1").
//
// These are regex/string checks, not LLM judgement: they're fast, free, and
// give the same answer every time. The writer runs them after each section and
// regenerates anything that fails, so slop never reaches the draft.

export interface QualityIssue {
  severity: "fail" | "warn";
  rule: string;
  detail: string;
}

/**
 * Fixes purely mechanical violations that don't need a rewrite. The style guide
 * says "colons and commas, never em dashes", so an em dash has a deterministic
 * correction: a copy editor would just swap it. Regenerating a whole FAQ over
 * one dash would cost another slow model call for no editorial gain.
 * Anything requiring judgement (banned phrases, weak rhythm) is left for
 * checkStyle to report and the writer to regenerate.
 */
export function sanitizeMechanical(text: string): string {
  return text
    // Comma is the safe universal replacement. A colon reads better for a
    // single sentence-final break, but em dashes most often come in
    // parenthetical pairs ("latency—the real cost—matters"), where colons
    // produce nonsense and commas read correctly.
    .replace(/\s*—\s*/g, ", ")
    // Collapse artefacts from dashes that sat next to existing punctuation.
    .replace(/,\s*([.,;:!?])/g, "$1")
    .replace(/,\s*,/g, ",");
}

// Auto-fail phrases. Matched case-insensitively as whole phrases.
const BANNED_PHRASES = [
  "delve into", "dive into", "it is worth noting", "it's worth noting",
  "it is important to understand", "in this article, we will", "in conclusion",
  "as we have discussed", "as mentioned earlier", "navigating the landscape of",
  "in today's digital age", "this comprehensive guide", "here's the thing",
  "but here's the kicker", "and here's the part most people miss",
  "the best part is", "the real magic happens", "harness the power of",
  "unlock the potential of", "push the boundaries of", "pave the way for",
  "at the forefront of", "bridging the gap between", "drive efficiency",
  "deliver actionable insights", "navigate the complexities",
];

// Auto-fail words (whole-word match).
const BANNED_WORDS = [
  "bustling", "vibrant", "metropolis", "commendable", "noteworthy", "meticulous",
  "palpable", "camaraderie", "intricate", "paramount", "juxtapose", "hitherto",
  "encompass", "galvanize", "scalable", "game-changer", "transformative",
  "cornerstone", "bolster", "cultivate", "optimize", "resonate", "profound",
  "empower",
];

// Adverbs to delete (whole-word match).
const BANNED_ADVERBS = [
  "meticulously", "seamlessly", "arguably", "notably", "significantly",
  "crucially", "importantly", "consequently", "subsequently", "accordingly",
  "consistently", "strategically", "relentlessly", "poignantly",
];

// Connector openers that are banned specifically at the start of a sentence.
const BANNED_CONNECTORS = ["furthermore", "moreover", "additionally"];

// Fabricated first-hand experience. The writer must not invent anecdotes or
// testing it never did — trust comes from real evidence, not staged memories.
// These match first-person, past-tense experience claims ("I once tried…",
// "in my testing…", "we benchmarked this…"), which the brief almost never
// actually supplies, so their appearance is a fabrication signal.
const FABRICATED_EXPERIENCE = [
  /\bi (?:once |personally |recently )?(?:tried|tested|benchmarked|ran|wasted|spent|debugged|scraped|deployed|measured)\b/i,
  /\bin my (?:own )?(?:testing|experience|case|tests)\b/i,
  /\bwhen i (?:tried|tested|ran|built|scraped)\b/i,
  /\bwe (?:tested|benchmarked|ran|measured) (?:this|it|our|the)\b/i,
];

/**
 * Runs the mechanical style gate over a chunk of prose (a section or a whole
 * article). Returns every violation found; empty array means it passed.
 */
export function checkStyle(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lower = text.toLowerCase();

  // Em dashes are banned anywhere in body text.
  const emDashes = (text.match(/—/g) ?? []).length;
  if (emDashes > 0) {
    issues.push({ severity: "fail", rule: "em-dash", detail: `${emDashes} em dash(es); use colons or commas` });
  }

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push({ severity: "fail", rule: "banned-phrase", detail: `"${phrase}"` });
    }
  }

  for (const word of [...BANNED_WORDS, ...BANNED_ADVERBS]) {
    // Whole-word, allowing plurals/inflections like "optimizes", "empowering".
    const re = new RegExp(`\\b${word.replace(/[-]/g, "[- ]?")}\\w*\\b`, "i");
    if (re.test(text)) {
      issues.push({ severity: "fail", rule: "banned-word", detail: `"${word}"` });
    }
  }

  // "Furthermore/Moreover/Additionally" only banned as sentence-opening connectors.
  for (const c of BANNED_CONNECTORS) {
    const re = new RegExp(`(^|[.!?]\\s+|\\n\\s*)${c}\\b`, "i");
    if (re.test(text)) {
      issues.push({ severity: "fail", rule: "banned-connector", detail: `"${c}" as a sentence opener` });
    }
  }

  // Invented first-hand experience is a fail so the section is regenerated.
  for (const re of FABRICATED_EXPERIENCE) {
    if (re.test(text)) {
      issues.push({
        severity: "fail",
        rule: "fabricated-experience",
        detail: "invented first-hand experience; write from knowledge, not a staged anecdote",
      });
      break;
    }
  }

  // Burstiness: the style guide demands wild sentence-length variation and
  // forbids three consecutive sentences of similar length.
  const burst = checkBurstiness(text);
  if (burst) issues.push(burst);

  return issues;
}

/**
 * Sentence-length variance check. Low variance is the strongest statistical
 * tell of machine-written prose, so we measure it rather than eyeball it.
 */
export function checkBurstiness(text: string): QualityIssue | null {
  const lengths = sentences(text).map((s) => s.split(/\s+/).filter(Boolean).length);
  if (lengths.length < 5) return null; // too short to judge

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((a, l) => a + (l - mean) ** 2, 0) / lengths.length);
  // Coefficient of variation. Human technical prose typically lands well above
  // 0.4; uniformly-paced AI prose sits below it.
  const cv = mean > 0 ? sd / mean : 0;
  if (cv < 0.4) {
    return {
      severity: "warn",
      rule: "burstiness",
      detail: `low sentence-length variation (CV ${cv.toFixed(2)}, want >0.40): vary rhythm, add short punches`,
    };
  }

  // Three consecutive sentences within 2 words of each other.
  for (let i = 0; i + 2 < lengths.length; i++) {
    const [a, b, c] = [lengths[i], lengths[i + 1], lengths[i + 2]];
    if (Math.abs(a - b) <= 2 && Math.abs(b - c) <= 2) {
      return {
        severity: "warn",
        rule: "burstiness",
        detail: `three consecutive sentences of similar length (${a}/${b}/${c} words)`,
      };
    }
  }
  return null;
}

/**
 * Whole-article content signals, aligned with the WRITING METHOD.
 *
 * This replaces the old "Layer 3 humanisation" checker, which rewarded the very
 * things the method now bans: staged personal failures, "I haven't tested"
 * hedging, and forced analogies. That heuristic came from the n8n workflow's
 * goal of fooling AI-detectors; the claude-blog method rejects it, because
 * trust comes from real evidence and specifics, not manufactured quirks. So we
 * no longer nag for those. Instead we warn only when the genuinely valuable
 * signals are absent. All warnings, never blockers.
 */
export function checkLayer3Signals(article: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Concrete, checkable specifics (numbers, prices, units) are what actually
  // build authority. An entire article with zero figures is usually vague.
  const hasSpecifics =
    /\b\d+(?:\.\d+)?\s*(?:%|gb|ms|gbps|m\+|k\+|countries|ips?)\b/i.test(article) || /\$\d/.test(article);
  if (!hasSpecifics) {
    issues.push({
      severity: "warn",
      rule: "content-signal",
      detail: "no concrete figures — add sourced specifics from product facts",
    });
  }

  // Honest disqualification ("you don't need this / not the right fit") is a
  // real trust signal and one of the brief's usual differentiation angles.
  const hasBoundary =
    /(you (?:don't|do not) need|not the right (?:fit|choice|proxy)|skip (?:us|this|mobile)|overkill|isn't worth|do not (?:need|use))/i.test(
      article,
    );
  if (!hasBoundary) {
    issues.push({
      severity: "warn",
      rule: "content-signal",
      detail: "no honest 'when NOT to use this' boundary — add one",
    });
  }

  // Internal links are retrieved per-section from internal-links-map.md and
  // the writer is instructed to use them where relevant, but retrieval or
  // the model can both come up empty. A whole article with zero internal
  // links is a real defect (it was shipping silently before this check
  // existed), so surface it rather than let a link-less draft look finished.
  const internalLinkCount = (article.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) ?? []).length;
  if (internalLinkCount === 0) {
    issues.push({
      severity: "warn",
      rule: "content-signal",
      detail: "no internal links found in the article — add 3-10 per the internal-links-map",
    });
  }

  return issues;
}

function sentences(text: string): string[] {
  // Strip markdown noise so headings/lists don't distort sentence stats.
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[#>|\-*].*$/gm, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return prose.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2);
}
