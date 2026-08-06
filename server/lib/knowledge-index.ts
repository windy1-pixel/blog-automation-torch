import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "./db.js";
import { embedTexts, cosineSimilarity } from "./embeddings.js";
import { logger } from "./logger.js";

// Retrieval index for the "flavor" knowledge files: brand voice, the full
// style guide, worked writing examples, and the internal-link map. These are
// too large to resend in full on every one of the ~10 calls a single article
// makes (that's what caused the Groq token-per-minute 429s), but dropping
// them entirely lost real voice/example richness. Embedding them once and
// retrieving only the top-k relevant chunks per section gets both: small
// per-call prompts, and section-specific context instead of none.
//
// writing-method.md and features.md are NOT here — they stay always-included
// in full everywhere (see knowledge.ts). Both are small, and both are
// non-negotiable rules (the fabrication guardrail, the only approved source
// of product facts) that must never depend on a similarity search happening
// to surface the right chunk.
const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR ?? "data/knowledge";
const RAG_FILES = ["brand-voice.md", "style-guide.md", "writing-examples.md", "internal-links-map.md"];

interface Chunk {
  file: string;
  index: number;
  heading: string;
  text: string;
}
interface IndexedChunk extends Chunk {
  embedding: number[];
}

/** Splits a markdown file on its "## " headings, further splitting any chunk over ~1400 chars by paragraph. */
function chunkMarkdown(file: string, content: string): Chunk[] {
  const chunks: Chunk[] = [];
  const parts = content.split(/\n(?=##\s)/);
  let idx = 0;

  for (const part of parts) {
    const body = part.trim();
    if (!body) continue;
    const headingMatch = body.match(/^##\s+(.+)$/m);
    const heading = headingMatch ? headingMatch[1].trim() : file;

    if (body.length <= 1400) {
      chunks.push({ file, index: idx++, heading, text: body });
      continue;
    }
    // Long section: split by paragraph groups, keeping each sub-chunk under ~1200 chars.
    const paragraphs = body.split(/\n\s*\n/);
    let buf = "";
    for (const p of paragraphs) {
      if (buf && (buf + "\n\n" + p).length > 1200) {
        chunks.push({ file, index: idx++, heading, text: buf.trim() });
        buf = p;
      } else {
        buf = buf ? buf + "\n\n" + p : p;
      }
    }
    if (buf.trim()) chunks.push({ file, index: idx++, heading, text: buf.trim() });
  }
  return chunks;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Embeds and stores any RAG file whose content has changed since it was last
 * indexed (tracked by a content hash per file), skipping files that are
 * already up to date. This is the literal fix for "don't reload the mds over
 * and over": a file is only ever re-embedded when its own content changes,
 * not once per article generation.
 *
 * Never throws: a missing API key or a failed embedding call for one file is
 * logged and skipped, so the writer falls back to writing-method + product
 * facts only for that file's territory rather than failing the whole run.
 */
export async function ensureKnowledgeIndex(): Promise<void> {
  for (const file of RAG_FILES) {
    const path = join(KNOWLEDGE_DIR, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf-8").trim();
    if (!content) continue;
    const hash = hashContent(content);

    try {
      const existing = await db.query<{ content_hash: string }>(
        "SELECT content_hash FROM knowledge_chunks WHERE file = $1 LIMIT 1",
        [file],
      );
      if (existing.rows.length > 0 && existing.rows[0].content_hash === hash) continue; // unchanged

      const chunks = chunkMarkdown(file, content);
      if (chunks.length === 0) continue;

      const embeddings = await embedTexts(chunks.map((c) => c.text));
      await db.query("DELETE FROM knowledge_chunks WHERE file = $1", [file]);
      for (let i = 0; i < chunks.length; i++) {
        await db.query(
          `INSERT INTO knowledge_chunks (file, chunk_index, heading, content, embedding, content_hash)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [file, chunks[i].index, chunks[i].heading, chunks[i].text, JSON.stringify(embeddings[i]), hash],
        );
      }
      cache = null; // invalidate so the next retrieval re-reads the fresh rows
      logger.info({ file, chunks: chunks.length }, "knowledge-index: embedded and stored");
    } catch (err) {
      logger.error(
        { file, err },
        "knowledge-index: failed to embed (no API key, or the embedding call failed) — writer continues without retrieved context for this file",
      );
    }
  }
}

let cache: IndexedChunk[] | null = null;

async function loadIndex(): Promise<IndexedChunk[]> {
  if (cache) return cache;

  const count = await db.query<{ n: string }>("SELECT count(*)::text AS n FROM knowledge_chunks");
  if (count.rows[0]?.n === "0") {
    // Self-heal: if the index is empty (fresh deploy, or a key was added
    // after startup already ran), index once now instead of waiting for the
    // next server restart.
    await ensureKnowledgeIndex();
  }

  const res = await db.query<{ file: string; chunk_index: number; heading: string; content: string; embedding: string }>(
    "SELECT file, chunk_index, heading, content, embedding FROM knowledge_chunks",
  );
  cache = res.rows.map((r) => ({
    file: r.file,
    index: r.chunk_index,
    heading: r.heading,
    text: r.content,
    embedding: typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding,
  }));
  return cache;
}

/**
 * Given pre-computed query embeddings (one per section/FAQ/conclusion, embedded
 * in a single batched call by the caller), returns the top-k most relevant
 * stored chunks for each query. Pure in-process cosine similarity: no further
 * API calls, so this scales to any number of queries for free once the index
 * is loaded. Returns an empty result set per query (never throws) if the
 * index has no chunks, e.g. no API key has ever been configured.
 */
export async function retrieveByEmbeddings(queryEmbeddings: number[][], k = 3): Promise<string[][]> {
  const chunks = await loadIndex();
  if (chunks.length === 0) return queryEmbeddings.map(() => []);

  return queryEmbeddings.map((qEmb) => {
    const scored = chunks
      .map((c) => ({ c, score: cosineSimilarity(qEmb, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    return scored.map((s) => `[${s.c.file} — ${s.c.heading}]\n${s.c.text}`);
  });
}
