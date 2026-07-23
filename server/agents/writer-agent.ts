import { generateStructured } from "../lib/llm.js";
import { knowledgeForWriter, knowledgeForSection } from "../lib/knowledge.js";
import { checkStyle, checkLayer3Signals, sanitizeMechanical, type QualityIssue } from "../lib/quality.js";
import { logger } from "../lib/logger.js";
import {
  ArticlePlanSchema,
  ArticleSectionSchema,
  type ArticlePlan,
  type ContentBrief,
  type ArticleRunResult,
} from "./schemas.js";

// Content Writer agent: approved brief -> full article draft.
//
// Two rules from the knowledge library drive the whole design:
//  1. "Body: 5-8 H2 sections, generated and reviewed one at a time, never in
//     one pass" (style-guide.md). So we plan first, then write each section in
//     its own call. This also sidesteps the truncation bug that cut articles
//     off mid-sentence in the old n8n workflow.
//  2. Product claims come ONLY from features.md. Never invent a statistic,
//     never attribute a competitor's spec to TorchProxies.
//
// After each section we run the mechanical style gate (banned phrases, em
// dashes, burstiness). A failing section is regenerated once with the specific
// violations quoted back, so slop is fixed at the source rather than left for
// a human to catch.

const MAX_SECTION_RETRIES = 1;

export interface WriterInput {
  brief: ContentBrief;
  keyword: string;
}

export async function runWriterAgent(input: WriterInput): Promise<ArticleRunResult> {
  const { brief, keyword } = input;
  const planKnowledge = knowledgeForWriter();
  const knowledge = knowledgeForSection(); // trimmed: sent once per section

  // --- 1. Plan the article (front matter + section list) --------------------
  logger.info({ keyword }, "writer: planning article");
  const plan = await generateStructured({
    system:
      "You are a senior content writer for TorchProxies. Plan a blog article that follows the " +
      "style guide and brand voice EXACTLY. Choose the author whose specialism matches the article " +
      "type from the approved author table. The H1 must contain the primary keyword and '2026'. " +
      "Never use em dashes. Never use any banned phrase or word.\n\n" +
      "SECTION RULES: return between 5 and 8 BODY sections. Every heading must be distinct: never " +
      "repeat or near-duplicate a heading. Do NOT include TL;DR, FAQ, FAQs, Q&A, Conclusion, Summary, " +
      "or Wrap-up as body sections; those are generated separately and appended, so including them " +
      "produces duplicates." +
      planKnowledge,
    prompt: [
      `Primary keyword: "${keyword}"`,
      `Working title from the brief: ${brief.title}`,
      `Target audience: ${brief.targetAudience}`,
      `Tone: ${brief.tone}`,
      `Target word count: ${brief.targetWordCount}`,
      `Topics the article MUST cover: ${brief.mustCover.join("; ")}`,
      `Differentiation opportunities (things competitors miss): ${brief.differentiationOpportunities.join("; ")}`,
      `Proposed outline from the brief (refine into 5-8 H2 sections):`,
      ...brief.outline.map((s) => `  - ${s.heading}: ${s.notes}`),
    ].join("\n"),
    schema: ArticlePlanSchema,
    schemaName: "ArticlePlan",
  });
  // Enforce the section rules in code, not just in the prompt: models
  // reliably drift into duplicate headings and into re-adding the FAQ or
  // conclusion we append ourselves, which shipped a doubled section and two
  // FAQ blocks in the first real run.
  plan.sections = dedupeSections(plan.sections);
  logger.info(
    { keyword, sections: plan.sections.length, author: plan.author },
    "writer: plan ready",
  );

  // --- 2. Write each section on its own -------------------------------------
  const written: { heading: string; markdown: string }[] = [];
  for (const [i, section] of plan.sections.entries()) {
    const md = await writeSection({ plan, section, index: i, brief, keyword, knowledge, written });
    written.push({ heading: section.heading, markdown: md });
    logger.info(
      { keyword, section: i + 1, of: plan.sections.length, words: md.split(/\s+/).length },
      "writer: section done",
    );
  }

  // --- 3. FAQ and conclusion ------------------------------------------------
  const faqBlock = await writeFaq({ plan, keyword, knowledge });
  const conclusion = await writeConclusion({ plan, keyword, knowledge, written });

  // --- 4. Assemble ----------------------------------------------------------
  const markdown = sanitizeMechanical(assemble(plan, written, faqBlock, conclusion));
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Whole-article checks: the Layer 3 signals can only be judged across the
  // finished piece, not per section.
  const qualityIssues: QualityIssue[] = [...checkStyle(markdown), ...checkLayer3Signals(markdown)];
  logger.info({ keyword, wordCount, issues: qualityIssues.length }, "writer: article assembled");

  return {
    plan,
    markdown,
    meta: {
      metaTitle: plan.metaTitle,
      metaDescription: plan.metaDescription,
      slug: slugify(plan.h1),
    },
    wordCount,
    qualityIssues,
  };
}

async function writeSection(args: {
  plan: ArticlePlan;
  section: ArticlePlan["sections"][number];
  index: number;
  brief: ContentBrief;
  keyword: string;
  knowledge: string;
  written: { heading: string; markdown: string }[];
}): Promise<string> {
  const { plan, section, index, brief, keyword, knowledge, written } = args;

  // Only pass the headings already written, not their full text: the model
  // needs to know what's been covered to avoid repeating itself, but sending
  // every prior section would blow up the prompt on later sections.
  const covered = written.map((w) => w.heading).join("; ") || "(none yet)";

  let feedback = "";
  for (let attempt = 0; attempt <= MAX_SECTION_RETRIES; attempt++) {
    const result = await generateStructured({
      system:
        "You are writing ONE section of a TorchProxies blog article. Follow the style guide and brand " +
        "voice exactly. Vary sentence length wildly, including short punches. No em dashes. No banned " +
        "phrases, words, or adverbs. State TorchProxies product facts ONLY if they appear in the " +
        "product facts document; never invent a number and never attribute a competitor's spec to us. " +
        "Write only this section's body: no H2 heading line, no preamble, no meta commentary." +
        knowledge,
      prompt: [
        `Article H1: ${plan.h1}`,
        `Article subtitle: ${plan.subtitle}`,
        `Author voice: ${plan.author}, ${plan.authorRole}`,
        `Primary keyword: "${keyword}"`,
        `Audience: ${brief.targetAudience}`,
        "",
        `Write section ${index + 1} of ${plan.sections.length}.`,
        `Heading: ${section.heading}`,
        `This section must establish: ${section.purpose}`,
        section.includeTable ? "Include a Markdown comparison table in this section." : "",
        `Sections already written (do not repeat them): ${covered}`,
        `Aim for roughly ${Math.round(brief.targetWordCount / plan.sections.length)} words.`,
        feedback,
      ]
        .filter(Boolean)
        .join("\n"),
      schema: ArticleSectionSchema,
      schemaName: "ArticleSection",
    });

    const issues = checkStyle(result.markdown).filter((i) => i.severity === "fail");
    if (issues.length === 0) return result.markdown;

    if (attempt < MAX_SECTION_RETRIES) {
      const list = issues.map((i) => `${i.rule}: ${i.detail}`).join("; ");
      logger.warn({ keyword, section: index + 1, of: plan.sections.length, issues: list }, "writer: section failed style gate, regenerating");
      feedback =
        `\nYour previous draft of this section violated the style guide: ${list}. ` +
        "Rewrite it without those. Do not simply swap synonyms; rework the sentences.";
    } else {
      logger.warn({ keyword, section: index + 1, of: plan.sections.length }, "writer: section still has style issues after retry, keeping best effort");
      return result.markdown;
    }
  }
  return "";
}

async function writeFaq(args: { plan: ArticlePlan; keyword: string; knowledge: string }): Promise<string> {
  const { plan, keyword, knowledge } = args;
  const result = await generateStructured({
    system:
      "Write the FAQ section of a TorchProxies article. Each answer is 1-3 sentences, direct, no filler. " +
      "Product facts only from the product facts document. No em dashes, no banned phrases." +
      knowledge,
    prompt: [
      `Article: ${plan.h1}`,
      `Primary keyword: "${keyword}"`,
      "Answer these questions, formatted as Markdown with each question as a bold line followed by its answer:",
      ...plan.faq.map((q) => `  - ${q}`),
    ].join("\n"),
    schema: ArticleSectionSchema,
    schemaName: "ArticleSection",
  });
  return result.markdown;
}

async function writeConclusion(args: {
  plan: ArticlePlan;
  keyword: string;
  knowledge: string;
  written: { heading: string; markdown: string }[];
}): Promise<string> {
  const { plan, keyword, knowledge, written } = args;
  const result = await generateStructured({
    system:
      "Write the conclusion of a TorchProxies article. It must answer the title question directly and " +
      "end decisively. No summary recap of what the article covered. No 'In conclusion'. No em dashes." +
      knowledge,
    prompt: [
      `Article: ${plan.h1}`,
      `Primary keyword: "${keyword}"`,
      `Sections covered: ${written.map((w) => w.heading).join("; ")}`,
      "End on the actual final point, not a recap. Include the closing CTA naturally.",
    ].join("\n"),
    schema: ArticleSectionSchema,
    schemaName: "ArticleSection",
  });
  return result.markdown;
}

function assemble(
  plan: ArticlePlan,
  sections: { heading: string; markdown: string }[],
  faq: string,
  conclusion: string,
): string {
  const today = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const words = sections.reduce((n, s) => n + s.markdown.split(/\s+/).length, 0);
  const readTime = Math.max(1, Math.round(words / 225));

  const parts = [
    `# ${plan.h1}`,
    ``,
    `_${plan.subtitle}_`,
    ``,
    `**${plan.author}**, ${plan.authorRole} · ${today} · ${readTime} min read`,
    ``,
    `## TL;DR`,
    ``,
    plan.tldr,
    ``,
    ...sections.flatMap((s) => [`## ${s.heading}`, ``, s.markdown, ``]),
    `## FAQ`,
    ``,
    faq,
    ``,
    `## Conclusion`,
    ``,
    conclusion,
    ``,
  ];
  return parts.join("\n");
}

/**
 * Drops duplicate/near-duplicate headings, strips structural sections the
 * assembler adds itself (TL;DR, FAQ, conclusion), and caps the body at the
 * style guide's 8-section maximum.
 */
function dedupeSections(sections: ArticlePlan["sections"]): ArticlePlan["sections"] {
  const STRUCTURAL = /^(tl;?dr|faqs?|q&a|questions?|conclusion|summary|wrap[- ]?up|final thoughts)\b/i;
  const seen = new Set<string>();
  const kept: ArticlePlan["sections"] = [];

  for (const s of sections) {
    const heading = s.heading.trim();
    if (STRUCTURAL.test(heading)) continue;
    // Normalise for comparison so "Use Cases Where ISP Proxies Shine" and
    // "Use cases where ISP proxies shine." collapse to one.
    const key = heading.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push({ ...s, heading });
    if (kept.length === 8) break;
  }
  return kept;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
