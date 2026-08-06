import { fetch } from "undici";
import { getSetting } from "./settings.js";
import { paceRequest, minIntervalFor } from "./rate-limit.js";
import { logger } from "./logger.js";

// Batched embeddings via OpenRouter's OpenAI-compatible /embeddings endpoint,
// using the free NVIDIA Nemotron 3 Embed 1B model. Always rides the same
// OPENAI_* provider settings as chat (same OpenRouter account/key) — this is
// deliberately narrow, not a generic multi-provider embedding client, because
// the free embedding model is an OpenRouter-specific offering.
//
// Always batch multiple texts into ONE call (the `input` array below) rather
// than looping per-text: on a request-count-limited free tier, one request
// embedding 10 things is worth infinitely more than 10 requests embedding one
// thing each.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const baseUrl = getSetting("OPENAI_BASE_URL");
  const apiKey = getSetting("OPENAI_API_KEY");
  const model = getSetting("EMBEDDING_MODEL");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set — cannot compute embeddings");
  }

  await paceRequest(baseUrl, minIntervalFor(baseUrl));
  const start = Date.now();
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Embeddings request failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { embedding: number[]; index: number }[] };
  if (!data.data || data.data.length === 0) {
    throw new Error(`Embeddings response had no data: ${JSON.stringify(data).slice(0, 300)}`);
  }
  logger.info({ model, count: texts.length, ms: Date.now() - start }, "embeddings: batch computed");

  // The API is not guaranteed to return items in request order; each item
  // carries its own `index` back, so sort by that rather than assume order.
  return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
