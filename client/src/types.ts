// Mirrors the server's brief shapes (server/agents/schemas.ts + db columns).

export interface OutlineItem {
  heading: string;
  notes: string;
}

export interface ContentBrief {
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetAudience: string;
  tone: string;
  outline: OutlineItem[];
  mustCover: string[];
  differentiationOpportunities: string[];
  targetWordCount: number;
}

export interface SerpAnalysis {
  keyword: string;
  sourcesAnalyzed: { url: string; title: string; wordCount: number; headings: string[] }[];
  sourcesFailed: { url: string; reason: string }[];
  consensus: {
    commonTopics: string[];
    gapTopics: string[];
    dominantFormat: string;
    averageWordCount: number;
    searchIntent: string;
  };
}

export type BriefStatus = "pending" | "researching" | "ready" | "approved" | "failed";

// Full brief row (GET /api/briefs/:id)
export interface Brief {
  id: number;
  keyword: string;
  audience: string | null;
  notes: string | null;
  status: BriefStatus;
  serp_analysis: SerpAnalysis | null;
  brief: ContentBrief | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

// List row (GET /api/briefs)
export interface BriefSummary {
  id: number;
  keyword: string;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
}

// --- Articles ---------------------------------------------------------------

export interface QualityIssue {
  severity: "fail" | "warn";
  rule: string;
  detail: string;
}

export interface ArticleMeta {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  author: string;
  authorRole: string;
  subtitle: string;
  wordCount: number;
  qualityIssues: QualityIssue[];
}

export type ArticleStatus = "pending" | "writing" | "draft" | "failed";

export interface Article {
  id: number;
  brief_id: number;
  title: string | null;
  markdown: string | null;
  meta: ArticleMeta | null;
  status: ArticleStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleSummary {
  id: number;
  brief_id: number;
  keyword: string;
  title: string | null;
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}
