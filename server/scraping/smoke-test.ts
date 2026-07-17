// One-off test: run with  npx tsx server/scraping/smoke-test.ts "your keyword"
import "dotenv/config";
import { fetchSerp } from "./serp.js";
import { extractArticle } from "./extract.js";
import { logger } from "../lib/logger.js";

const keyword = process.argv[2] ?? "residential proxies";

try {
  const serp = await fetchSerp(keyword, 10);
  console.log("\n=== SERP RESULTS ===");
  for (const r of serp) console.log(`${r.position}. ${r.title}\n   ${r.url}`);

  console.log("\n=== EXTRACTING #1 RESULT ===");
  const article = await extractArticle(serp[0].url);
  console.log(`Title: ${article.title}`);
  console.log(`Words: ${article.wordCount}`);
  console.log(`Headings (${article.headings.length}):`);
  for (const h of article.headings.slice(0, 12)) console.log(`  ${h}`);
  console.log(`\nFirst 500 chars of content:\n${article.markdown.slice(0, 500)}`);
} catch (err) {
  logger.error({ err }, "smoke test failed");
  process.exit(1);
}
