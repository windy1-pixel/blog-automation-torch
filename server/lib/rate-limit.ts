// Proactive pacing for free tiers capped by REQUEST COUNT rather than token
// volume. OpenRouter's free models allow 20 requests/minute (50-1000/day) no
// matter how small each request is, so the fix isn't a smaller prompt (that's
// what token-per-minute providers like Groq need) — it's simply not sending
// requests faster than the ceiling allows. A full article makes ~10-12 calls;
// spacing them out keeps the whole run under the per-minute cap with zero
// wasted 429 retries, instead of firing everything back to back and hoping.

const lastCallAt = new Map<string, number>();

/** How long to wait before hitting this base URL again, based on its known free-tier shape. */
export function minIntervalFor(baseUrl: string): number {
  if (baseUrl.includes("openrouter.ai")) {
    // 20 req/min = 3000ms exactly at the boundary; pad it so clock skew
    // between our timer and OpenRouter's window doesn't cause an edge-case 429.
    return Number(process.env.OPENROUTER_MIN_INTERVAL_MS ?? 3200);
  }
  return 0;
}

/** Blocks until at least `minIntervalMs` has passed since the last call to this base URL. */
export async function paceRequest(baseUrl: string, minIntervalMs: number): Promise<void> {
  if (minIntervalMs <= 0) return;
  const last = lastCallAt.get(baseUrl) ?? 0;
  const wait = last + minIntervalMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt.set(baseUrl, Date.now());
}
