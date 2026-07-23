import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../lib/db.js";
import { runWriterAgent } from "../agents/writer-agent.js";
import { logger } from "../lib/logger.js";
import type { ContentBrief } from "../agents/schemas.js";

export const articlesRouter = Router();

// Writing an article is many sequential LLM calls (one per section), so like
// brief generation it runs in the background and the client polls.
// Status: pending -> writing -> draft | failed  (matches server/lib/db.ts)
articlesRouter.post("/briefs/:id/article", async (req: Request, res: Response) => {
  const briefRow = await db.query<{ id: number; keyword: string; status: string; brief: ContentBrief | null }>(
    "SELECT id, keyword, status, brief FROM briefs WHERE id = $1",
    [req.params.id],
  );
  if (briefRow.rows.length === 0) {
    res.status(404).json({ error: "brief not found" });
    return;
  }
  const brief = briefRow.rows[0];

  // Only approved briefs get written. The approval step is the human checkpoint
  // the old n8n workflow never actually enforced.
  if (brief.status !== "approved") {
    res.status(409).json({ error: `brief must be approved before writing (currently "${brief.status}")` });
    return;
  }
  if (!brief.brief) {
    res.status(409).json({ error: "brief has no content to write from" });
    return;
  }

  const inserted = await db.query<{ id: number }>(
    "INSERT INTO articles (brief_id, status) VALUES ($1, 'pending') RETURNING id",
    [brief.id],
  );
  const articleId = inserted.rows[0].id;

  processArticle(articleId, brief.brief, brief.keyword).catch((err) => {
    logger.error({ err, articleId }, "article processing failed outside its own error handling");
  });

  res.status(202).json({ id: articleId, status: "pending" });
});

articlesRouter.get("/articles/:id", async (req: Request, res: Response) => {
  const result = await db.query("SELECT * FROM articles WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: "article not found" });
    return;
  }
  res.json(result.rows[0]);
});

articlesRouter.get("/articles", async (_req: Request, res: Response) => {
  const result = await db.query(
    `SELECT a.id, a.brief_id, a.title, a.status, a.created_at, a.updated_at, b.keyword
     FROM articles a JOIN briefs b ON b.id = a.brief_id
     ORDER BY a.created_at DESC LIMIT 50`,
  );
  res.json(result.rows);
});

async function processArticle(id: number, brief: ContentBrief, keyword: string) {
  await db.query("UPDATE articles SET status = 'writing', updated_at = now() WHERE id = $1", [id]);
  logger.info({ id, keyword }, "article: writing started");

  try {
    const result = await runWriterAgent({ brief, keyword });
    await db.query(
      `UPDATE articles
         SET status = 'draft', title = $1, markdown = $2, meta = $3, updated_at = now()
       WHERE id = $4`,
      [
        result.plan.h1,
        result.markdown,
        {
          ...result.meta,
          author: result.plan.author,
          authorRole: result.plan.authorRole,
          subtitle: result.plan.subtitle,
          wordCount: result.wordCount,
          qualityIssues: result.qualityIssues,
        },
        id,
      ],
    );
    logger.info({ id, keyword, words: result.wordCount, issues: result.qualityIssues.length }, "article: draft ready");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.query("UPDATE articles SET status = 'failed', error = $1, updated_at = now() WHERE id = $2", [
      message,
      id,
    ]);
    logger.error({ id, keyword, err }, "article: failed");
  }
}
