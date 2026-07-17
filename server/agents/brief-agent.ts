import { fetchSerp } from "../scraping/serp.js";
import { extractArticle } from "../scraping/extract.js";
import { generateStructured } from "../lib/llm.js";
import { logger } from "../lib/logger.js";
import { ConsensusAnalysisSchema, ContentBriefSchema, type BriefRunResult } from "./schemas.js";

export interface BriefAgentInput {
  keyword: string;
  audience?: string;
  notes?: string;
}

// Content Brief agent: keyword in, structured brief out.
//
// Fixes carried over from the n8n audit: analyzes the top ~10 competitors
// (not just #1), uses their heading structure as evidence for what to COVER
// (never as a source of factual claims — those come only from the future
// Knowledge Library), and keyword targeting is fixed by the caller, never
// inferred from a competitor page.
export async function runBriefAgent(input: BriefAgentInput): Promise<BriefRunResult> {
  const { keyword, audience, notes } = input;

  logger.info({ keyword }, "brief agent: fetching SERP");
  const serp = await fetchSerp(keyword, 10);

  logger.info({ keyword, count: serp.length }, "brief agent: extracting competitor articles");
  const extractions = await Promise.allSettled(serp.map((r) => extractArticle(r.url)));

  const sourcesAnalyzed: { url: string; title: string; wordCount: number; headings: string[] }[] = [];
  const sourcesFailed: { url: string; reason: string }[] = [];

  extractions.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sourcesAnalyzed.push({
        url: result.value.url,
        title: result.value.title,
        wordCount: result.value.wordCount,
        headings: result.value.headings,
      });
    } else {
      sourcesFailed.push({ url: serp[i].url, reason: String(result.reason?.message ?? result.reason) });
    }
  });

  if (sourcesAnalyzed.length === 0) {
    throw new Error("Could not extract content from any competitor result — cannot build a brief");
  }
  logger.info(
    { keyword, analyzed: sourcesAnalyzed.length, failed: sourcesFailed.length },
    "brief agent: extraction complete",
  );

  // Step 1: consensus analysis from heading structure + word counts only —
  // deliberately NOT the full article text, to keep the prompt small (fast
  // on CPU inference) and to structurally prevent the model from lifting
  // specific competitor claims into the brief.
  // Cap headings per source — a page with 50+ "headings" is usually nav/footer
  // noise the extractor picked up, not real content structure, and it bloats
  // the prompt (slow on CPU inference) without adding useful signal.
  const MAX_HEADINGS_PER_SOURCE = 20;
  const evidence = sourcesAnalyzed
    .map((s, i) => {
      const headings = s.headings.slice(0, MAX_HEADINGS_PER_SOURCE);
      const truncatedNote = s.headings.length > MAX_HEADINGS_PER_SOURCE ? ` (+${s.headings.length - MAX_HEADINGS_PER_SOURCE} more, omitted)` : "";
      return `Source ${i + 1}: "${s.title}" (${s.wordCount} words)\nHeadings:\n${headings.join("\n")}${truncatedNote}`;
    })
    .join("\n\n---\n\n");

  const consensus = await generateStructured({
    system:
      "You are an SEO content strategist. Analyze the STRUCTURE of top-ranking competitor articles " +
      "(headings and word counts only) to determine what a new article on this topic needs to cover. " +
      "Do not reference or assume any specific facts, numbers, or claims from the competitors — you only have their outlines, not their content.",
    prompt: `Target keyword: "${keyword}"\n\nCompetitor article structures:\n\n${evidence}`,
    schema: ConsensusAnalysisSchema,
    schemaName: "ConsensusAnalysis",
  });
  logger.info({ keyword }, "brief agent: consensus analysis done");

  // Step 2: turn the consensus analysis into an actionable brief.
  const brief = await generateStructured({
    system:
      "You are a content strategist writing a brief for Torchlabs, a proxy infrastructure company " +
      "(residential, ISP, and mobile proxies, web scraping, anti-bot detection). " +
      "Base the outline on the competitor consensus provided, not on any assumed facts about competitors or Torchlabs. " +
      "Do not name competitor products or invent product specifications — factual product claims are added later " +
      "from Torchlabs' own documentation, not by this brief.",
    prompt: [
      `Target keyword: "${keyword}"`,
      audience ? `Requested audience: ${audience}` : null,
      notes ? `Additional notes from the requester: ${notes}` : null,
      `Search intent: ${consensus.searchIntent}`,
      `Dominant competitor format: ${consensus.dominantFormat}`,
      `Average competitor word count: ${consensus.averageWordCount}`,
      `Topics most competitors cover (likely required): ${consensus.commonTopics.join(", ")}`,
      `Topics competitors rarely cover (differentiation opportunities): ${consensus.gapTopics.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    schema: ContentBriefSchema,
    schemaName: "ContentBrief",
  });
  logger.info({ keyword }, "brief agent: brief generation done");

  return {
    serpAnalysis: { keyword, sourcesAnalyzed, sourcesFailed, consensus },
    brief,
  };
}
