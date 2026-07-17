import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { fetch } from "undici";
import { getProxyAgent, BROWSER_HEADERS } from "./proxy.js";
import { logger } from "../lib/logger.js";

export interface ExtractedArticle {
  url: string;
  title: string;
  markdown: string;   // the article body as clean Markdown
  headings: string[]; // the H1/H2/H3 structure — used for consensus analysis
  wordCount: number;
}

const turndown = new TurndownService({ headingStyle: "atx" });

// Fetches a competitor page through the Torch proxy and extracts just the
// article content (no nav, ads, footers) as Markdown + its heading structure.
export async function extractArticle(url: string): Promise<ExtractedArticle> {
  logger.info({ url }, "extract: fetching page");
  const start = Date.now();

  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    dispatcher: getProxyAgent(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Page fetch failed with status ${res.status}: ${url}`);
  }
  const html = await res.text();

  // jsdom parses the HTML; the virtual console silences noisy CSS/JS warnings
  // from pages we only want to read, not execute.
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { url, virtualConsole });

  // Collect the heading structure before Readability rearranges anything.
  const headings = [...dom.window.document.querySelectorAll("h1, h2, h3")]
    .map((h) => `${h.tagName}: ${h.textContent?.trim() ?? ""}`)
    .filter((h) => h.length > 4);

  const article = new Readability(dom.window.document).parse();
  if (!article?.content) {
    throw new Error(`Readability could not find article content on: ${url}`);
  }

  const markdown = turndown.turndown(article.content);
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  logger.info({ url, wordCount, headings: headings.length, ms: Date.now() - start }, "extract: done");

  return { url, title: article.title ?? "", markdown, headings, wordCount };
}
