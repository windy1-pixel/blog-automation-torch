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
 * Checks the six required Layer 3 humanisation signals across a FULL article.
 * These are heuristic: they can't prove a signal is good, only flag when one
 * appears to be missing so the writer (or a human) can look.
 */
export function checkLayer3Signals(article: string): QualityIssue[] {
  const lower = article.toLowerCase();
  const signals: { name: string; patterns: RegExp[] }[] = [
    { name: "personal failure/mistake", patterns: [/\bi (?:got|was|had|missed|broke|assumed|screwed|wasted|burned)\b/i, /\bmy mistake\b/i, /\bwe learned the hard way\b/i, /\bi lost\b/i] },
    { name: '"you don\'t need this"', patterns: [/you (?:don't|do not) need (?:this|us)\b/i, /\bwe(?:'re| are) not the right\b/i, /\bskip (?:us|this)\b/i, /\bhonestly, you don't\b/i] },
    { name: "expressed uncertainty", patterns: [/\bi haven't (?:personally )?tested\b/i, /\bi'm not sure\b/i, /\bmy guess\b/i, /\bi don't know\b/i, /\bunclear (?:to me|whether)\b/i] },
    { name: "authority through detail", patterns: [/\b\d+(?:\.\d+)?\s*(?:%|gb|ms|gbps|m\+|k\+)\b/i, /\btrustpilot\b/i, /\$\d/] },
    { name: "coverage gap noted", patterns: [/\bdeserves its own (?:guide|article|post)\b/i, /\bout(?:side)? (?:of )?scope\b/i, /\bnot covering\b/i, /\banother article\b/i] },
    { name: "idiosyncratic analogy", patterns: [/\blike (?:a|an|the)\b/i, /\bthink of it as\b/i, /\bimagine\b/i] },
  ];

  return signals
    .filter((s) => !s.patterns.some((p) => p.test(lower)))
    .map((s) => ({ severity: "warn" as const, rule: "layer3-signal", detail: `missing: ${s.name}` }));
}

function sentences(text: string): string[] {
  // Strip markdown noise so headings/lists don't distort sentence stats.
  const prose = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[#>|\-*].*$/gm, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return prose.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2);
}
