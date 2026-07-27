import { db } from "./db.js";
import { logger } from "./logger.js";

// Runtime configuration. Instead of baking every value into deployment env
// vars, the configurable ones live in a `settings` table and are edited from
// the Settings page. Only DATABASE_URL must be an env var — the app needs it to
// reach the DB where these settings live.
//
// Resolution order for every key: DB override > environment variable > default.
// That keeps env-var deployments working (env acts as the seed/fallback) while
// letting the UI override without a redeploy.

export const SETTINGS_SCHEMA = {
  LLM_PROVIDER: { secret: false, default: "openai", label: "LLM provider (openai | ollama | claude)" },
  OPENAI_BASE_URL: { secret: false, default: "https://openrouter.ai/api/v1", label: "OpenAI-compatible base URL" },
  OPENAI_API_KEY: { secret: true, default: "", label: "OpenAI-compatible API key (e.g. OpenRouter)" },
  OPENAI_MODEL: { secret: false, default: "nvidia/nemotron-3-super-120b-a12b:free", label: "Model id" },
  CLAUDE_MODEL: { secret: false, default: "claude-sonnet-5", label: "Claude model (if provider=claude)" },
  ANTHROPIC_API_KEY: { secret: true, default: "", label: "Anthropic API key (if provider=claude)" },
  TORCH_PROXY_HOST: { secret: false, default: "", label: "Torch proxy host" },
  TORCH_PROXY_PORT: { secret: false, default: "", label: "Torch proxy port" },
  TORCH_PROXY_USERNAME: { secret: false, default: "", label: "Torch proxy username" },
  TORCH_PROXY_PASSWORD: { secret: true, default: "", label: "Torch proxy password" },
} as const;

export type SettingKey = keyof typeof SETTINGS_SCHEMA;

// DB-stored overrides, loaded into memory at startup and refreshed on write.
let cache: Record<string, string> = {};

export async function loadSettings(): Promise<void> {
  try {
    const res = await db.query<{ key: string; value: string }>("SELECT key, value FROM settings");
    cache = {};
    for (const row of res.rows) cache[row.key] = row.value;
    logger.info({ count: res.rows.length }, "settings loaded from DB");
  } catch (err) {
    // If the DB is briefly unreachable, keep whatever we had and fall back to
    // env vars — the app shouldn't refuse to start over settings.
    logger.error({ err }, "settings: failed to load from DB, using env/defaults");
  }
}

/** DB override > env var > built-in default. Empty strings count as unset. */
export function getSetting(key: SettingKey): string {
  const fromDb = cache[key];
  if (fromDb) return fromDb;
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  return SETTINGS_SCHEMA[key].default;
}

/** Persist changes. Empty values are ignored so a blank secret field doesn't wipe an existing key. */
export async function setSettings(updates: Partial<Record<SettingKey, string>>): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in SETTINGS_SCHEMA)) continue;
    if (value === undefined || value === "") continue;
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value],
    );
  }
  await loadSettings();
}

// Shape returned to the Settings UI. Secret values are NEVER returned — only
// whether they're configured — because the app has no auth yet and an exposed
// settings page must not leak keys. Non-secrets return their resolved value.
export interface SettingView {
  key: string;
  label: string;
  secret: boolean;
  value: string; // resolved value for non-secrets; "" for secrets
  configured: boolean; // whether a usable value is set (from DB or env)
}

export function settingsForApi(): SettingView[] {
  return (Object.keys(SETTINGS_SCHEMA) as SettingKey[]).map((key) => {
    const meta = SETTINGS_SCHEMA[key];
    const resolved = getSetting(key);
    return {
      key,
      label: meta.label,
      secret: meta.secret,
      value: meta.secret ? "" : resolved,
      configured: resolved !== "" && resolved !== undefined,
    };
  });
}
