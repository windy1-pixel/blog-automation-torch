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
