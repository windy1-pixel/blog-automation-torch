import { Router } from "express";
import type { Request, Response } from "express";
import { fetchSerp } from "../scraping/serp.js";
import { extractArticle } from "../scraping/extract.js";
import { logger } from "../lib/logger.js";

export const scrapeRouter = Router();

// Temporary endpoint for the bare-bones UI shell: given a keyword, fetch the
// SERP and extract the top result. This is a preview of milestone 3's
// scraper, not the real Content Brief agent (milestone 4) — that will
// extract ALL results and run consensus analysis through the LLM layer.
scrapeRouter.post("/scrape/preview", async (req: Request, res: Response) => {
  const keyword = String(req.body?.keyword ?? "").trim();
  if (!keyword) {
    res.status(400).json({ error: "keyword is required" });
    return;
  }

  logger.info({ keyword }, "scrape preview: starting");
  const serp = await fetchSerp(keyword, 10);

  let topArticle = null;
  try {
    topArticle = await extractArticle(serp[0].url);
  } catch (err) {
    logger.warn({ err, url: serp[0].url }, "scrape preview: extraction failed, returning SERP only");
  }

  res.json({ keyword, serp, topArticle });
});
