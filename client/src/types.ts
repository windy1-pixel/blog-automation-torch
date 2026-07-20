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
