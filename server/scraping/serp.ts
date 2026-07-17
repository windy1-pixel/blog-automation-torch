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

  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    dispatcher: getProxyAgent({ freshSession: true }), // new exit IP per search
    signal: AbortSignal.timeout(30_000),
  });
  const html = await res.text();
  logger.info({ keyword, status: res.status, bytes: html.length, ms: Date.now() - start }, "SERP: response received");

  if (!res.ok) {
    throw new Error(`Bing SERP request failed with status ${res.status}`);
  }

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
  return results;
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
