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

    -- Runtime configuration editable from the Settings UI (LLM provider, API
    -- keys, proxy credentials). Resolves DB > env var > default, so DATABASE_URL
    -- is the only value that must be a deployment env var.
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Embedded chunks of the "flavor" knowledge files (brand voice, style
    -- guide, writing examples, internal-link map), keyed by a content hash so
    -- a file is only re-embedded when it actually changes. Lives in Postgres
    -- rather than a local file because the app container is rebuilt from
    -- the Docker image on every Coolify deploy, so anything on local disk
    -- would be lost and re-embedded on every single deploy otherwise.
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id           SERIAL PRIMARY KEY,
      file         TEXT NOT NULL,
      chunk_index  INTEGER NOT NULL,
      heading      TEXT,
      content      TEXT NOT NULL,
      embedding    JSONB NOT NULL,
      content_hash TEXT NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (file, chunk_index)
    );
  `);

  logger.info("database ready (Postgres)");
}
