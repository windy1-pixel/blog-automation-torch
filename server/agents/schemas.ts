import { z } from "zod";

// Step 1 output: what the top-ranking competitors have in common, derived
// from their heading structures — not their specific claims. This is
// evidence for the brief, never a source of facts about Torchlabs products.
export const ConsensusAnalysisSchema = z.object({
  commonTopics: z
    .array(z.string())
    .describe("Subtopics/sections that most of the top-ranking articles cover — likely required for this query"),
  gapTopics: z
    .array(z.string())
    .describe("Subtopics rarely or never covered by competitors — differentiation opportunities"),
  dominantFormat: z
    .enum(["guide", "listicle", "comparison", "how-to", "review", "other"])
    .describe("The content format most competitors use"),
  averageWordCount: z.number().describe("Rough average word count across the analyzed articles"),
  searchIntent: z
    .enum(["informational", "commercial", "transactional", "navigational"])
    .describe("What searchers using this keyword are most likely trying to accomplish"),
});
export type ConsensusAnalysis = z.infer<typeof ConsensusAnalysisSchema>;

// Step 2 output: the actual brief a human reviews and a writer works from.
export const ContentBriefSchema = z.object({
  title: z.string().describe("Working title for the article"),
  metaTitle: z.string().describe("SEO meta title, under 60 characters"),
  metaDescription: z.string().describe("SEO meta description, under 160 characters"),
  targetAudience: z.string().describe("Short persona description of who this article is for"),
  tone: z.string().describe("Tone and style guidance for the writer"),
  outline: z
    .array(
      z.object({
        heading: z.string(),
        notes: z.string().describe("What this section should cover and why"),
      }),
    )
    .describe("Proposed H2/H3 structure for the article"),
  mustCover: z.array(z.string()).describe("Topics that must be included based on competitor consensus"),
  differentiationOpportunities: z
    .array(z.string())
    .describe("Gaps in competitor coverage this article should exploit"),
  targetWordCount: z.number(),
});
export type ContentBrief = z.infer<typeof ContentBriefSchema>;

export interface BriefRunResult {
  serpAnalysis: {
    keyword: string;
    sourcesAnalyzed: { url: string; title: string; wordCount: number; headings: string[] }[];
    sourcesFailed: { url: string; reason: string }[];
    consensus: ConsensusAnalysis;
  };
  brief: ContentBrief;
}

// ---------------------------------------------------------------------------
// Content Writer
// ---------------------------------------------------------------------------

// Article front matter, generated before any body prose. Structure and rules
// come from data/knowledge/style-guide.md.
export const ArticlePlanSchema = z.object({
  h1: z.string().describe("H1 title; includes the primary keyword and the year 2026"),
  subtitle: z
    .string()
    .describe("One line under the H1 naming the reader's actual situation. Punchy, never generic"),
  author: z
    .string()
    .describe("Author full name, chosen from the approved author list to match the article type"),
  authorRole: z.string().describe("That author's role, exactly as listed"),
  metaTitle: z.string().describe("55-60 characters, keyword near the start"),
  metaDescription: z.string().describe("150-160 characters, keyword plus a hook. Never placeholder text"),
  tldr: z
    .string()
    .describe(
      "TL;DR block with substantive claims, not teasers. Three parts: value statement, scope declaration, invitation",
    ),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("H2 heading"),
        purpose: z.string().describe("What this section must establish"),
        includeTable: z.boolean().describe("Whether this section should contain a comparison table"),
      }),
    )
    .describe("5-8 H2 sections in order"),
  faq: z
    .array(z.string())
    .describe("5+ questions phrased exactly as a user would type them into Google or ChatGPT"),
});
export type ArticlePlan = z.infer<typeof ArticlePlanSchema>;

// One generated body section.
export const ArticleSectionSchema = z.object({
  heading: z.string(),
  markdown: z.string().describe("The section body in Markdown, excluding the H2 heading line"),
});
export type ArticleSection = z.infer<typeof ArticleSectionSchema>;

export interface ArticleRunResult {
  plan: ArticlePlan;
  markdown: string;
  meta: { metaTitle: string; metaDescription: string; slug: string };
  wordCount: number;
  qualityIssues: { severity: string; rule: string; detail: string }[];
}
