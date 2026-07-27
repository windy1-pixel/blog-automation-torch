import { useEffect, useState } from "react";
import { api } from "../api";
import type { SettingView } from "../types";

// Runtime configuration editor. These values live in the database, not in
// deployment env vars, so the model, API keys, and proxy credentials can be
// changed here without a redeploy. Secret values are write-only: the server
// never sends them back, so a blank secret field means "leave unchanged".
export function Settings({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<SettingView[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((e) => setError(String(e.message ?? e)));
  }, []);

  function edit(key: string, value: string) {
    setEdits((e) => ({ ...e, [key]: value }));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const updated = await api.updateSettings(edits);
      setSettings(updated);
      setEdits({});
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setStatus("idle");
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2>Settings</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Stored in the database, applied without a redeploy. Secret values are write-only: leave a field
          blank to keep the current value.
        </p>

        {error && <p className="error">{error}</p>}

        <div className="settings-list">
          {settings.map((s) => (
            <label key={s.key}>
              {s.label}
              {s.secret && (
                <span className={`settings-badge ${s.configured ? "set" : "unset"}`}>
                  {s.configured ? "configured" : "not set"}
                </span>
              )}
              <input
                type={s.secret ? "password" : "text"}
                value={edits[s.key] ?? (s.secret ? "" : s.value)}
                placeholder={s.secret ? (s.configured ? "•••••••• (unchanged)" : "not set") : ""}
                onChange={(e) => edit(s.key, e.target.value)}
                autoComplete="off"
              />
            </label>
          ))}
        </div>

        <div className="actions">
          <button type="button" onClick={save} disabled={status === "saving" || Object.keys(edits).length === 0}>
            {status === "saving" ? "Saving…" : "Save settings"}
          </button>
          {status === "saved" && <span className="saved">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
