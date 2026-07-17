import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

// One connection pool shared by the whole app. In production (Coolify),
// DATABASE_URL points at the managed Postgres service. Locally, it points at
// the docker-compose Postgres container (see docker-compose.yml).
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

db.on("error", (err) => {
  logger.error({ err }, "unexpected Postgres pool error");
});

export async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS briefs (
      id            SERIAL PRIMARY KEY,
      keyword       TEXT NOT NULL,                     -- the target keyword (decided once, read-only downstream)
      audience      TEXT,                              -- optional: who this article is for
      notes         TEXT,                              -- optional: extra instructions from the user
      status        TEXT NOT NULL DEFAULT 'pending',   -- pending → researching → ready → approved | failed
      serp_analysis JSONB,                              -- top-10 SERP consensus data (evidence)
      brief         JSONB,                              -- the structured content brief
      error         TEXT,                              -- failure reason if status = failed
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS articles (
      id         SERIAL PRIMARY KEY,
      brief_id   INTEGER NOT NULL REFERENCES briefs(id),
      title      TEXT,
      markdown   TEXT,                                 -- the article body
      meta       JSONB,                                 -- meta title, meta description, slug
      status     TEXT NOT NULL DEFAULT 'pending',      -- pending → writing → draft | failed
      error      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  logger.info("database ready (Postgres)");
}
