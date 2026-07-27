import { Router } from "express";
import type { Request, Response } from "express";
import { settingsForApi, setSettings, SETTINGS_SCHEMA, type SettingKey } from "../lib/settings.js";
import { logger } from "../lib/logger.js";

export const settingsRouter = Router();

// GET current settings. Secret values are never returned — only `configured`
// (whether a usable value exists) — since the app has no auth yet.
settingsRouter.get("/settings", (_req: Request, res: Response) => {
  res.json(settingsForApi());
});

// PATCH updates. Empty fields are ignored (so blanking a secret input doesn't
// wipe the stored key). Unknown keys are dropped.
settingsRouter.patch("/settings", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Partial<Record<SettingKey, string>> = {};
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingKey[]) {
    if (typeof body[key] === "string" && body[key] !== "") {
      updates[key] = body[key] as string;
    }
  }

  await setSettings(updates);
  logger.info({ keys: Object.keys(updates) }, "settings updated via API");
  res.json(settingsForApi());
});
