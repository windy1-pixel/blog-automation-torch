import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger.js";

// The Knowledge Library is the curated context that governs what the agents may
// say and how they must say it. These are TorchProxies' real working documents
// (synced from the team's context folder — see `npm run sync:knowledge`), not
// generated content.
//
// The rule that matters most: product claims come ONLY from features.md. The
// writer must never invent a statistic or attribute a competitor's spec to
// TorchProxies — the core fix from the n8n workflow audit.

const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR ?? "data/knowledge";

/** Filenames we expect. Missing files degrade gracefully to an empty string. */
const FILES = {
  productFacts: "features.md",
  brandVoice: "brand-voice.md",
  styleGuide: "style-guide.md",
  writingExamples: "writing-examples.md",
  internalLinks: "internal-links-map.md",
  targetKeywords: "target-keywords.md",
  competitorAnalysis: "competitor-analysis.md",
} as const;

export type KnowledgeKey = keyof typeof FILES;
export type Knowledge = Record<KnowledgeKey, string> & { loaded: string[]; missing: string[] };

let cached: Knowledge | null = null;

export function loadKnowledge(force = false): Knowledge {
  if (cached && !force) return cached;

  const loaded: string[] = [];
  const missing: string[] = [];
  const out = {} as Record<KnowledgeKey, string>;

  for (const [key, filename] of Object.entries(FILES) as [KnowledgeKey, string][]) {
    const path = join(KNOWLEDGE_DIR, filename);
    if (existsSync(path)) {
      out[key] = readFileSync(path, "utf-8").trim();
      loaded.push(filename);
    } else {
      out[key] = "";
      missing.push(filename);
    }
  }

  if (missing.length) {
    logger.warn({ missing, dir: KNOWLEDGE_DIR }, "knowledge: some context files are missing");
  }
  logger.info({ loaded, chars: Object.values(out).join("").length }, "knowledge: loaded");

  cached = { ...out, loaded, missing };
  return cached;
}

/**
 * Everything the Content Writer needs: how to write (voice, style, examples),
 * what it may claim (product facts), and how to link.
 * Deliberately excludes keyword/competitor strategy — that shapes the brief,
 * not the prose, and would just burn context.
 */
export function knowledgeForWriter(): string {
  const k = loadKnowledge();
  return section("PRODUCT FACTS (the ONLY approved source for product claims)", k.productFacts)
    + section("BRAND VOICE", k.brandVoice)
    + section("STYLE GUIDE (mechanical rules, banned phrases, required signals)", k.styleGuide)
    + section("WRITING EXAMPLES (match these)", k.writingExamples)
    + section("INTERNAL LINKING RULES", k.internalLinks);
}

/** Strategy context for the brief/research stages. */
export function knowledgeForBrief(): string {
  const k = loadKnowledge();
  return section("TARGET KEYWORDS & CLUSTER STRATEGY", k.targetKeywords)
    + section("COMPETITOR ANALYSIS", k.competitorAnalysis)
    + section("BRAND VOICE (positioning)", k.brandVoice);
}

function section(heading: string, body: string): string {
  if (!body) return "";
  return `\n\n===== ${heading} =====\n${body}`;
}

/** Lists any .md files present, for diagnostics. */
export function knowledgeFiles(): string[] {
  if (!existsSync(KNOWLEDGE_DIR)) return [];
  return readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md")).sort();
}
