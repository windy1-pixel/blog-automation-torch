// NOT CURRENTLY USED — kept for a future revisit.
//
// Google SERP scraping attempt (2026-07): Google requires JavaScript for
// search, and when driven via Playwright (headless-shell, system Chrome,
// stealth flags, fresh proxy sessions) it either serves a CAPTCHA (/sorry/,
// 429) or tarpits the connection entirely. Getting past this needs dedicated
// stealth tooling (e.g. rebrowser/camoufox) — deliberately deferred.
// The active provider is Bing (serp.ts), which serves plain HTML and works
// through the Torch proxies.
import { chromium } from "playwright";
import { logger } from "../lib/logger.js";
import type { SerpResult } from "./serp.js";

export async function fetchGoogleSerp(keyword: string, count = 10): Promise<SerpResult[]> {
  const { TORCH_PROXY_HOST, TORCH_PROXY_PORT, TORCH_PROXY_USERNAME, TORCH_PROXY_PASSWORD } =
    process.env;

  const proxy =
    TORCH_PROXY_HOST && TORCH_PROXY_PORT
      ? {
          server: `http://${TORCH_PROXY_HOST}:${TORCH_PROXY_PORT}`,
          username: TORCH_PROXY_USERNAME,
          password: (TORCH_PROXY_PASSWORD ?? "").replace(
            /session-[a-z0-9]+/i,
            `session-${Math.random().toString(36).slice(2, 10)}`,
          ),
        }
      : undefined;

  logger.info({ keyword, viaProxy: Boolean(proxy) }, "SERP(google): launching headless browser");
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    proxy,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  try {
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    const params = new URLSearchParams({ q: keyword, num: String(count + 5), hl: "en", gl: "us" });
    await page.goto(`https://www.google.com/search?${params}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    if (page.url().includes("/sorry/")) {
      throw new Error("Google served a CAPTCHA page");
    }
    await page.waitForSelector("a h3", { timeout: 20_000 });

    const raw = await page.evaluate(() => {
      const out: { title: string; url: string; snippet: string }[] = [];
      for (const h3 of document.querySelectorAll("a h3")) {
        const a = h3.closest("a");
        if (!a?.href || !a.href.startsWith("http")) continue;
        const block = a.closest("[data-hveid]") ?? a.parentElement;
        const blockText = (block as HTMLElement | null)?.innerText ?? "";
        const title = h3.textContent?.trim() ?? "";
        out.push({ title, url: a.href, snippet: blockText.replace(title, "").trim().slice(0, 300) });
      }
      return out;
    });

    const seen = new Set<string>();
    const results: SerpResult[] = [];
    for (const r of raw) {
      if (results.length >= count) break;
      if (!r.title || seen.has(r.url)) continue;
      if (new URL(r.url).hostname.endsWith("google.com")) continue;
      seen.add(r.url);
      results.push({ position: results.length + 1, ...r });
    }
    if (results.length === 0) throw new Error("SERP returned 0 organic results");
    return results;
  } finally {
    await browser.close();
  }
}
