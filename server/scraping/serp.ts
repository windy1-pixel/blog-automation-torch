import * as cheerio from "cheerio";
import { fetch } from "undici";
import { getProxyAgent, BROWSER_HEADERS } from "./proxy.js";
import { logger } from "../lib/logger.js";

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

// SERP provider: Bing.
// Why not Google? Google requires JavaScript for search and aggressively
// tarpits automated browsers (see serp-google.ts for the attempt, kept for a
// future stealth revisit). Bing serves plain HTML, works reliably through the
// Torch proxies, and its top 10 for informational queries overlaps heavily
// with Google's — good enough for content-consensus analysis.
export async function fetchSerp(keyword: string, count = 10): Promise<SerpResult[]> {
  const params = new URLSearchParams({
    q: keyword,
    count: String(count + 5), // extra slots — some results get filtered below
    mkt: "en-US",
  });
  const url = `https://www.bing.com/search?${params}`;

  logger.info({ keyword, provider: "bing" }, "SERP: fetching results");
  const start = Date.now();

  // The Torch proxy intermittently rejects the initial tunnel with a 562, and
  // connections can reset. These are transient, so retry with a FRESH proxy
  // session (new exit IP) before giving up — one bad session shouldn't kill
  // the whole brief.
  const html = await withRetry(3, async () => {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      dispatcher: getProxyAgent({ freshSession: true }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new Error(`Bing SERP request failed with status ${res.status}`);
    }
    return res.text();
  });
  logger.info({ keyword, bytes: html.length, ms: Date.now() - start }, "SERP: response received");

  const $ = cheerio.load(html);
  const results: SerpResult[] = [];
  const seen = new Set<string>();

  // Organic results live in <li class="b_algo"> (ads are li.b_ad — excluded).
  $("#b_results > li.b_algo").each((_i, el) => {
    if (results.length >= count) return;

    const link = $(el).find("h2 a").first();
    const title = link.text().trim();
    const target = resolveBingUrl(link.attr("href") ?? "");
    if (!title || !target) return;
    if (seen.has(target)) return;
    seen.add(target);

    const snippet = $(el).find(".b_caption p, p").first().text().trim().slice(0, 300);
    results.push({ position: results.length + 1, title, url: target, snippet });
  });

  logger.info({ keyword, found: results.length }, "SERP: parsed organic results");
  if (results.length === 0) {
    throw new Error("SERP returned 0 organic results — Bing page layout may have changed");
  }

  if (looksLikeDictionaryOverride(results)) {
    throw new Error(
      `Bing returned dictionary/definition results instead of topical content for "${keyword}". ` +
        "This happens with question-style or common-word-led queries (e.g. \"how do I...\", \"best...\") on " +
        "Bing's non-JS search endpoint. Try a short noun-phrase keyword instead (e.g. \"residential proxies\" " +
        "rather than \"how do residential proxies work\").",
    );
  }

  return results;
}

// Bing's non-JS HTML endpoint sometimes falls back to dictionary-definition
// results for natural-language/question queries or ones led by a common word
// (see server/scraping notes) instead of understanding the query's topic.
// Detect that failure mode instead of silently feeding garbage "competitor"
// data into the brief agent.
const DICTIONARY_DOMAINS = [
  "merriam-webster.com",
  "dictionary.com",
  "cambridge.org",
  "collinsdictionary.com",
  "thefreedictionary.com",
  "wiktionary.org",
  "oed.com",
  "grammareer.com",
];
function looksLikeDictionaryOverride(results: SerpResult[]): boolean {
  const top = results.slice(0, 6);
  const dictionaryHits = top.filter((r) => {
    const host = new URL(r.url).hostname.replace(/^www\./, "");
    return DICTIONARY_DOMAINS.some((d) => host.endsWith(d)) || /definition\s*&?\s*meaning|english meaning/i.test(r.title);
  });
  return dictionaryHits.length >= 3;
}

// Retries a transient operation with a short backoff. Used to ride out the
// Torch proxy's occasional 562 tunnel rejections and connection resets, each
// attempt getting a fresh proxy session from the caller.
async function withRetry<T>(attempts: number, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        logger.warn({ attempt: i, attempts, error: String((err as Error)?.message ?? err) }, "SERP: transient fetch error, retrying with fresh session");
        await new Promise((r) => setTimeout(r, 1000 * i));
      }
    }
  }
  throw lastError;
}

// Bing wraps result links in a redirect: /ck/a?...&u=a1<base64-of-real-url>&...
// Decode that to the real destination; pass through direct links unchanged.
function resolveBingUrl(href: string): string | null {
  try {
    if (href.startsWith("https://www.bing.com/ck/")) {
      const encoded = new URL(href).searchParams.get("u");
      if (!encoded?.startsWith("a1")) return null;
      const decoded = Buffer.from(encoded.slice(2), "base64url").toString("utf-8");
      return decoded.startsWith("http") ? decoded : null;
    }
    return href.startsWith("http") ? href : null;
  } catch {
    return null;
  }
}
