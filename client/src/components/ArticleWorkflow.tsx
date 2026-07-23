import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { ArticleSummary } from "../types";
import { ArticleView } from "./ArticleView";

/**
 * The writing half of a brief: lists any drafts already written from it, and
 * offers to write a new one. Only rendered for approved briefs.
 */
export function ArticleWorkflow({ briefId }: { briefId: number }) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await api.listArticles();
      const mine = all.filter((a) => a.brief_id === briefId);
      setArticles(mine);
      // Auto-open the newest draft so the result isn't hidden behind a click.
      setSelectedId((cur) => cur ?? mine[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    }
  }, [briefId]);

  useEffect(() => {
    setSelectedId(null);
    refresh();
  }, [refresh]);

  async function generate() {
    setStarting(true);
    setError(null);
    try {
      const { id } = await api.generateArticle(briefId);
      setSelectedId(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start writing");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="article-workflow">
      <div className="workflow-header">
        <h3>Article</h3>
        <button type="button" onClick={generate} disabled={starting}>
          {starting ? "Starting…" : articles.length ? "Write another draft" : "Write article"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {articles.length > 1 && (
        <div className="draft-tabs">
          {articles.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`draft-tab ${a.id === selectedId ? "selected" : ""}`}
              onClick={() => setSelectedId(a.id)}
            >
              Draft #{a.id} <span className={`status status-${a.status}`}>{a.status}</span>
            </button>
          ))}
        </div>
      )}

      {selectedId ? (
        <ArticleView articleId={selectedId} />
      ) : (
        <p className="muted">No draft yet. Write one from this approved brief.</p>
      )}
    </div>
  );
}
