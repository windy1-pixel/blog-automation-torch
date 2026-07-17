import { useState } from "react";
import "./App.css";

interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

interface ExtractedArticle {
  url: string;
  title: string;
  markdown: string;
  headings: string[];
  wordCount: number;
}

interface ScrapeResult {
  keyword: string;
  serp: SerpResult[];
  topArticle: ExtractedArticle | null;
}

export default function App() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function runScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Torch Blog Automation</h1>
      <p className="subtitle">
        Preview shell — this only runs the SERP scraper (milestone 3). The real Content Brief
        agent (with consensus analysis) is next.
      </p>

      <form onSubmit={runScrape} className="search-form">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. residential proxies"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !keyword.trim()}>
          {loading ? "Scraping..." : "Scrape"}
        </button>
      </form>

      {loading && <p className="status">Fetching SERP results and extracting the top article...</p>}
      {error && <p className="status error">Error: {error}</p>}

      {result && (
        <div className="results">
          <section>
            <h2>SERP results for "{result.keyword}"</h2>
            <ol>
              {result.serp.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                  <p className="snippet">{r.snippet}</p>
                </li>
              ))}
            </ol>
          </section>

          {result.topArticle && (
            <section>
              <h2>Top result extracted</h2>
              <p>
                <strong>{result.topArticle.title}</strong> — {result.topArticle.wordCount} words,{" "}
                {result.topArticle.headings.length} headings
              </p>
              <details>
                <summary>Headings</summary>
                <ul>
                  {result.topArticle.headings.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
              <details>
                <summary>Content preview</summary>
                <pre className="preview">{result.topArticle.markdown.slice(0, 1000)}</pre>
              </details>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
