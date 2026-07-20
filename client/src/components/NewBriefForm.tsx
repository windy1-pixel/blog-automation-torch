import { useState } from "react";
import { api } from "../api";

export function NewBriefForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [keyword, setKeyword] = useState("");
  const [audience, setAudience] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { id } = await api.createBrief({
        keyword: keyword.trim(),
        audience: audience.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setKeyword("");
      setAudience("");
      setNotes("");
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brief");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>New content brief</h2>
      <label>
        Target keyword <span className="req">*</span>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. residential proxies"
          disabled={submitting}
        />
        <small>Use a short noun phrase — question-style queries don't work well.</small>
      </label>
      <label>
        Audience (optional)
        <input
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. developers evaluating proxy providers"
          disabled={submitting}
        />
      </label>
      <label>
        Notes for the brief (optional)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything specific this article should emphasize"
          rows={2}
          disabled={submitting}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting || !keyword.trim()}>
        {submitting ? "Starting research…" : "Generate brief"}
      </button>
    </form>
  );
}
