import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";
import type { Article } from "../types";

// Writing runs one model call per section, so a draft can take many minutes.
const POLL_MS = 5000;

export function ArticleView({ articleId }: { articleId: number }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const a = await api.getArticle(articleId);
        if (!active) return;
        setArticle(a);
        setError(null);
        if (a.status === "pending" || a.status === "writing") {
          timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load article");
      }
    }

    setArticle(null);
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [articleId]);

  if (error) return <p className="error">{error}</p>;
  if (!article) return <p className="muted">Loading draft…</p>;

  if (article.status === "pending" || article.status === "writing") {
    return (
      <div className="card">
        <p className="working">
          <span className="spinner" /> Writing the article, one section at a time. This takes several
          minutes.
        </p>
      </div>
    );
  }

  if (article.status === "failed") {
    return (
      <div className="card">
        <p className="error">Writing failed:</p>
        <pre className="error-detail">{article.error}</pre>
      </div>
    );
  }

  const meta = article.meta;
  const fails = meta?.qualityIssues.filter((i) => i.severity === "fail") ?? [];
  const warns = meta?.qualityIssues.filter((i) => i.severity === "warn") ?? [];

  async function copyMarkdown() {
    if (!article?.markdown) return;
    await navigator.clipboard.writeText(article.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card">
      <div className="detail-header">
        <h2>{article.title}</h2>
        <span className="status status-approved">Draft</span>
      </div>

      {meta && (
        <>
          <p className="article-byline">
            {meta.author}, {meta.authorRole} · {meta.wordCount} words
          </p>

          <div className="meta-grid">
            <div>
              <span className="meta-label">Meta title ({meta.metaTitle.length} chars)</span>
              <p>{meta.metaTitle}</p>
            </div>
            <div>
              <span className="meta-label">Meta description ({meta.metaDescription.length} chars)</span>
              <p>{meta.metaDescription}</p>
            </div>
            <div>
              <span className="meta-label">Slug</span>
              <p className="mono">/{meta.slug}/</p>
            </div>
          </div>

          {/* The style gate's verdict, surfaced rather than buried in logs. */}
          {meta.qualityIssues.length > 0 ? (
            <div className={`quality ${fails.length ? "quality-fail" : "quality-warn"}`}>
              <strong>
                Quality gate: {fails.length} to fix, {warns.length} to review
              </strong>
              <ul>
                {meta.qualityIssues.map((i, n) => (
                  <li key={n}>
                    <span className={`badge badge-${i.severity}`}>{i.severity}</span> {i.rule}: {i.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="quality quality-pass">
              <strong>Quality gate: clean</strong>
            </div>
          )}
        </>
      )}

      <div className="actions">
        <button type="button" className="secondary" onClick={copyMarkdown}>
          {copied ? "Copied" : "Copy Markdown"}
        </button>
      </div>

      <article className="draft">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.markdown ?? ""}</ReactMarkdown>
      </article>
    </div>
  );
}
