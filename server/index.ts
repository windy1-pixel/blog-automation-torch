import "./instrument.js"; // must stay first — loads .env + Sentry
import express from "express";
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "./lib/logger.js";
import { db, initDb } from "./lib/db.js";
import { scrapeRouter } from "./routes/scrape.js";
import { briefsRouter } from "./routes/briefs.js";

const app = express();
app.use(express.json());

// Log every request: method, path, status code, and how long it took.
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start },
      "request handled",
    );
  });
  next();
});

// Health check — used to confirm the app is alive (Coolify will poll this in production).
// Reports db status live rather than assuming it's up, since the app itself
// stays available even when the database is briefly unreachable.
app.get("/api/health", async (_req: Request, res: Response) => {
  const dbOk = await db
    .query("SELECT 1 AS ok")
    .then((r) => r.rows.length > 0)
    .catch(() => false);
  res.json({ ok: true, db: dbOk, time: new Date().toISOString() });
});

app.use("/api", scrapeRouter);
app.use("/api", briefsRouter);

// Deliberate test error — visit this once Sentry is configured to confirm errors reach it.
app.get("/api/debug-error", () => {
  throw new Error("Test error: if you can see this in Sentry, error tracking works!");
});

// Sentry error handler — reports any unhandled route error to Sentry.
Sentry.setupExpressErrorHandler(app);

// Final safety net: log the error and return a clean JSON response instead of crashing.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, path: req.path }, "unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 3000);

// The database schema is created on startup, but a database outage
// shouldn't take the whole app down — routes that don't need the database
// (like the scraper) should keep working, and /api/health reports db status
// live so the outage is visible rather than silently masked.
try {
  await initDb();
} catch (err) {
  logger.error({ err }, "database unavailable at startup — continuing without it");
}

app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
  if (!process.env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN is not set — Sentry disabled, errors will only appear in logs");
  }
});
