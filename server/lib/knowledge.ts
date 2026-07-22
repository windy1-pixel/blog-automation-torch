import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "./logger.js";

// The Knowledge Library is the ONLY approved source of factual claims about
// Torchlabs products (pool sizes, locations, protocols, pricing, features) and
// the only source of internal-link URLs. The Content Writer is instructed to
// state product facts ONLY from this text and to never invent specs or lift
// claims from competitor pages — the core fix from the n8n workflow audit,
// where the writer was told to swap competitor claims onto Torchlabs.
//
// It's a folder of curated Markdown files (data/knowledge/), human-maintained.
// A vector store is overkill at this size; concatenating the files gives the
// writer the whole, authoritative picture in one pass.

const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR ?? "data/knowledge";

export interface KnowledgeLibrary {
  /** All knowledge files concatenated, ready to drop into a prompt. */
  content: string;
  /** Which files were loaded (for logging / debugging). */
  files: string[];
}

export function loadKnowledge(): KnowledgeLibrary {
  if (!existsSync(KNOWLEDGE_DIR)) {
    logger.warn({ dir: KNOWLEDGE_DIR }, "knowledge: directory not found — writer will have no product facts");
    return { content: "", files: [] };
  }

  const files = readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md") // README is a maintainer guide, not product facts
    .sort(); // 00-brand.md first, then product files alphabetically

  const sections = files.map((f) => {
    const body = readFileSync(join(KNOWLEDGE_DIR, f), "utf-8").trim();
    return `<<< SOURCE: ${f} >>>\n${body}`;
  });

  const content = sections.join("\n\n");
  logger.info({ files, chars: content.length }, "knowledge: loaded");
  return { content, files };
}
