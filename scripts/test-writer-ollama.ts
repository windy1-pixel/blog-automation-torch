// Standalone local test of the Content Writer against local Ollama.
//
// Does NOT need Postgres, the frontend, or the full server: it forces the
// provider to ollama via env (getSetting falls back to env when the DB
// settings cache is empty) and runs the writer on a fixed brief, then writes
// the resulting draft + quality issues to a file so we can eyeball the prose.
//
// Run:  npx tsx scripts/test-writer-ollama.ts
import "dotenv/config"; // load .env so provider/base-url/model/key come from it
import { writeFileSync } from "node:fs";
import { runWriterAgent } from "../server/agents/writer-agent.js";
import type { ContentBrief } from "../server/agents/schemas.js";

// Provider, base URL, model, and API key are read from .env (currently Groq).
// Override on the command line if you want a one-off, e.g. LLM_PROVIDER=ollama.

// A hand-written brief for the same keyword as the weak draft, so the output
// is directly comparable. In production this comes from the brief agent.
const brief: ContentBrief = {
  title: "Mobile Proxies: How They Work and When to Use Them",
  metaTitle: "Mobile Proxies 2026: How They Work & When to Use",
  metaDescription:
    "How mobile proxies work, what they cost, and when they beat residential or datacenter IPs for scraping and ad verification.",
  targetAudience: "Developers and data engineers choosing a proxy type for scraping and automation",
  tone: "Direct, technical, peer-to-peer. No marketing fluff.",
  outline: [
    { heading: "How Mobile Proxies Work", notes: "Carrier IPs, CGNAT, rotation mechanics" },
    { heading: "Mobile vs Residential vs Datacenter", notes: "Concrete trade-offs on cost, trust, speed" },
    { heading: "When Mobile Proxies Are Worth It", notes: "The specific cases that justify the cost" },
    { heading: "Pricing and Cost Factors", notes: "Per-GB model, what drives cost" },
    { heading: "Setup and Integration", notes: "How a developer actually wires one in" },
  ],
  mustCover: ["carrier-grade NAT", "IP rotation", "per-GB pricing", "use cases", "residential comparison"],
  differentiationOpportunities: [
    "Say plainly when NOT to use mobile proxies",
    "Real cost math instead of vague 'it depends'",
  ],
  targetWordCount: 1400,
};

const provider = process.env.LLM_PROVIDER ?? "openai";
const model = provider === "ollama" ? process.env.OLLAMA_MODEL : process.env.OPENAI_MODEL;
const started = Date.now();
console.log(`[test] running writer on "mobile proxies" via ${provider}/${model}…`);

const result = await runWriterAgent({ brief, keyword: "mobile proxies" });

const mins = ((Date.now() - started) / 60000).toFixed(1);
const out = [
  `<!-- generated in ${mins} min via ${provider}/${model} -->`,
  `<!-- word count: ${result.wordCount} -->`,
  `<!-- quality issues: ${result.qualityIssues.length} -->`,
  ...result.qualityIssues.map((q) => `<!-- [${q.severity}] ${q.rule}: ${q.detail} -->`),
  ``,
  result.markdown,
].join("\n");

const path = "scripts/out-mobile-proxies.md";
writeFileSync(path, out, "utf-8");
console.log(`[test] done in ${mins} min · ${result.wordCount} words · ${result.qualityIssues.length} quality issues`);
console.log(`[test] wrote ${path}`);
for (const q of result.qualityIssues) console.log(`   [${q.severity}] ${q.rule}: ${q.detail}`);
