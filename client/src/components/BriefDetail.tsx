import { useEffect, useState } from "react";
import { api } from "../api";
import type { Brief, ContentBrief } from "../types";
import { ArticleWorkflow } from "./ArticleWorkflow";

// Poll while a brief is still being generated; stop once it reaches a terminal
// state. CPU inference is slow, so this can legitimately run for minutes.
const POLL_MS = 4000;

export function BriefDetail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const b = await api.getBrief(id);
        if (!active) return;
        setBrief(b);
        setError(null);
        if (b.status === "pending" || b.status === "researching") {
          timer = setTimeout(poll, POLL_MS);
        } else {
          onChanged(); // refresh the list's status once terminal
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load brief");
      }
    }

    setBrief(null);
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, onChanged]);

  if (error) return <p className="error">{error}</p>;
  if (!brief) return <p className="muted">Loading…</p>;

  if (brief.status === "pending" || brief.status === "researching") {
    return (
      <div className="card">
        <h2>{brief.keyword}</h2>
        <p className="working">
          <span className="spinner" /> Researching competitors and generating the brief… This can take a
          few minutes on local inference.
        </p>
      </div>
    );
  }

  if (brief.status === "failed") {
    return (
      <div className="card">
        <h2>{brief.keyword}</h2>
        <p className="error">Brief generation failed:</p>
        <pre className="error-detail">{brief.error}</pre>
      </div>
    );
  }

  return <BriefEditor brief={brief} onChanged={onChanged} />;
}

function BriefEditor({ brief, onChanged }: { brief: Brief; onChanged: () => void }) {
  const [draft, setDraft] = useState<ContentBrief>(brief.brief!);
  const [status, setStatus] = useState(brief.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approved = status === "approved";

  function update<K extends keyof ContentBrief>(key: K, value: ContentBrief[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function save(approve: boolean) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateBrief(brief.id, { brief: draft, approve });
      setStatus(updated.status);
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="detail-header">
        <h2>{brief.keyword}</h2>
        <span className={`status status-${status}`}>{approved ? "Approved" : "Ready to review"}</span>
      </div>

      <label>
        Title
        <input value={draft.title} onChange={(e) => update("title", e.target.value)} />
      </label>

      <div className="row">
        <label>
          Meta title
          <input value={draft.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} />
        </label>
        <label>
          Target word count
          <input
            type="number"
            value={draft.targetWordCount}
            onChange={(e) => update("targetWordCount", Number(e.target.value))}
          />
        </label>
      </div>

      <label>
        Meta description
        <textarea
          value={draft.metaDescription}
          onChange={(e) => update("metaDescription", e.target.value)}
          rows={2}
        />
      </label>

      <div className="row">
        <label>
          Target audience
          <input value={draft.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} />
        </label>
        <label>
          Tone
          <input value={draft.tone} onChange={(e) => update("tone", e.target.value)} />
        </label>
      </div>

      <h3>Outline</h3>
      <div className="outline">
        {draft.outline.map((section, i) => (
          <div key={i} className="outline-item">
            <input
              className="outline-heading"
              value={section.heading}
              onChange={(e) => {
                const outline = [...draft.outline];
                outline[i] = { ...outline[i], heading: e.target.value };
                update("outline", outline);
              }}
            />
            <textarea
              className="outline-notes"
              value={section.notes}
              rows={2}
              onChange={(e) => {
                const outline = [...draft.outline];
                outline[i] = { ...outline[i], notes: e.target.value };
                update("outline", outline);
              }}
            />
            <button
              type="button"
              className="remove"
              onClick={() => update("outline", draft.outline.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => update("outline", [...draft.outline, { heading: "", notes: "" }])}
        >
          + Add section
        </button>
      </div>

      <ListEditor
        label="Must cover"
        items={draft.mustCover}
        onChange={(items) => update("mustCover", items)}
      />
      <ListEditor
        label="Differentiation opportunities"
        items={draft.differentiationOpportunities}
        onChange={(items) => update("differentiationOpportunities", items)}
      />

      {error && <p className="error">{error}</p>}
      {saved && !error && <p className="saved">Saved.</p>}

      <div className="actions">
        <button type="button" className="secondary" onClick={() => save(false)} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => save(true)} disabled={saving}>
          {approved ? "Save & keep approved" : "Approve for writing"}
        </button>
      </div>

      {/* Writing is only offered once a human has approved the brief. */}
      {approved && <ArticleWorkflow briefId={brief.id} />}
    </div>
  );
}

function ListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="list-editor">
      <h3>{label}</h3>
      {items.map((item, i) => (
        <div key={i} className="list-row">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button type="button" className="remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange([...items, ""])}>
        + Add
      </button>
    </div>
  );
}
