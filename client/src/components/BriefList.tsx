import type { BriefSummary } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  researching: "Researching…",
  ready: "Ready to review",
  approved: "Approved",
  failed: "Failed",
};

export function BriefList({
  briefs,
  selectedId,
  onSelect,
}: {
  briefs: BriefSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (briefs.length === 0) {
    return <p className="muted">No briefs yet. Create one above.</p>;
  }

  return (
    <ul className="brief-list">
      {briefs.map((b) => (
        <li key={b.id}>
          <button
            className={`brief-list-item ${b.id === selectedId ? "selected" : ""}`}
            onClick={() => onSelect(b.id)}
          >
            <span className="keyword">{b.keyword}</span>
            <span className={`status status-${b.status}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
