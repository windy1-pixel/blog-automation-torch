import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../lib/db.js";
import { runBriefAgent } from "../agents/brief-agent.js";
import { logger } from "../lib/logger.js";

export const briefsRouter = Router();

// Brief generation takes minutes on CPU inference (multiple LLM calls +
// scraping 10 pages) — far too long for a single HTTP request. So creation
// returns immediately with status "pending" and processing continues in the
// background; the client polls GET /api/briefs/:id until status is
// "ready" or "failed". Status values match server/lib/db.ts's schema.
briefsRouter.post("/briefs", async (req: Request, res: Response) => {
  const keyword = String(req.body?.keyword ?? "").trim();
  const audience = req.body?.audience ? String(req.body.audience).trim() : null;
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  if (!keyword) {
    res.status(400).json({ error: "keyword is required" });
    return;
  }

  const result = await db.query<{ id: number }>(
    "INSERT INTO briefs (keyword, audience, notes, status) VALUES ($1, $2, $3, 'pending') RETURNING id",
    [keyword, audience, notes],
  );
  const id = result.rows[0].id;

  processBrief(id, { keyword, audience: audience ?? undefined, notes: notes ?? undefined }).catch((err) => {
    logger.error({ err, id }, "brief processing failed outside its own error handling");
  });

  res.status(202).json({ id, status: "pending" });
});

briefsRouter.get("/briefs/:id", async (req: Request, res: Response) => {
  const result = await db.query("SELECT * FROM briefs WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: "brief not found" });
    return;
  }
  res.json(result.rows[0]);
});

briefsRouter.get("/briefs", async (_req: Request, res: Response) => {
  const result = await db.query(
    "SELECT id, keyword, status, created_at, updated_at FROM briefs ORDER BY created_at DESC LIMIT 50",
  );
  res.json(result.rows);
});

async function processBrief(id: number, input: { keyword: string; audience?: string; notes?: string }) {
  await db.query("UPDATE briefs SET status = 'researching', updated_at = now() WHERE id = $1", [id]);
  logger.info({ id, keyword: input.keyword }, "brief: processing started");

  try {
    const { serpAnalysis, brief } = await runBriefAgent(input);
    await db.query(
      "UPDATE briefs SET status = 'ready', serp_analysis = $1, brief = $2, updated_at = now() WHERE id = $3",
      [serpAnalysis, brief, id],
    );
    logger.info({ id, keyword: input.keyword }, "brief: ready");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.query("UPDATE briefs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2", [
      message,
      id,
    ]);
    logger.error({ id, keyword: input.keyword, err }, "brief: failed");
  }
}
