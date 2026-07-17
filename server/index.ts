import "./instrument.js"; // must stay first — loads .env + Sentry
import express from "express";
import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { logger } from "./lib/logger.js";
import { db, initDb } from "./lib/db.js";

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
app.get("/api/health", async (_req: Request, res: Response) => {
  const result = await db.query("SELECT 1 AS ok");
  res.json({ ok: true, db: result.rows.length > 0, time: new Date().toISOString() });
});

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

await initDb();
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
  if (!process.env.SENTRY_DSN) {
    logger.warn("SENTRY_DSN is not set — Sentry disabled, errors will only appear in logs");
  }
});
