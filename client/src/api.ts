import type { Article, ArticleSummary, Brief, BriefSummary, ContentBrief, SettingView } from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  listBriefs: () => jsonFetch<BriefSummary[]>("/api/briefs"),

  getBrief: (id: number) => jsonFetch<Brief>(`/api/briefs/${id}`),

  createBrief: (input: { keyword: string; audience?: string; notes?: string }) =>
    jsonFetch<{ id: number; status: string }>("/api/briefs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateBrief: (id: number, input: { brief?: ContentBrief; approve?: boolean }) =>
    jsonFetch<Brief>(`/api/briefs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  retryBrief: (id: number) =>
    jsonFetch<{ id: number; status: string }>(`/api/briefs/${id}/retry`, { method: "POST" }),
  listArticles: () => jsonFetch<ArticleSummary[]>("/api/articles"),

  getArticle: (id: number) => jsonFetch<Article>(`/api/articles/${id}`),

  generateArticle: (briefId: number) =>
    jsonFetch<{ id: number; status: string }>(`/api/briefs/${briefId}/article`, { method: "POST" }),

  getSettings: () => jsonFetch<SettingView[]>("/api/settings"),

  updateSettings: (updates: Record<string, string>) =>
    jsonFetch<SettingView[]>("/api/settings", { method: "PATCH", body: JSON.stringify(updates) }),
};
