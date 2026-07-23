import { z } from "zod";
import { Agent, fetch } from "undici";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger.js";

// Single entry point every agent uses to talk to an LLM. Which model actually
// answers is controlled by LLM_PROVIDER in .env:
//   - "openai"  → any OpenAI-compatible hosted API (OpenRouter, Groq, Cerebras,
//                 Together…) running an open-source model. Free tiers, fast,
//                 no local hardware needed. This is the recommended default.
//   - "ollama"  → fully local/offline (slow on CPU-only machines).
//   - "claude"  → Anthropic (paid, highest quality) for scaling up.
// Agents never call a provider directly, so switching is one env var.
const PROVIDER = process.env.LLM_PROVIDER ?? "openai";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";

// OpenAI-compatible provider config. Defaults target OpenRouter's free tier;
// point OPENAI_BASE_URL elsewhere (e.g. Groq) to switch providers.
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// undici's default fetch() client has its OWN internal headersTimeout
// (5 minutes) independent of any AbortSignal passed to fetch — CPU-only
// Ollama inference on larger prompts can take longer than that to even start
// streaming a response, so the default silently kills the request before our
// own timeout ever gets a chance to. This agent raises both timeouts to
// match what we actually expect from local inference.
const ollamaAgent = new Agent({
  headersTimeout: 900_000,
  bodyTimeout: 900_000,
});

interface StructuredOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  maxRetries?: number;
}

// Asks the LLM for a response matching `schema`. Validates the parsed JSON
// against the Zod schema; if it doesn't match, retries with the validation
// error appended to the prompt (instead of passing malformed data downstream —
// this is the fix for the n8n workflow's silent JSON-parse failures).
export async function generateStructured<T>(opts: StructuredOptions<T>): Promise<T> {
  const { system, prompt, schema, schemaName, maxRetries = 2 } = opts;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const fullPrompt = lastError
      ? `${prompt}\n\nYour previous response was invalid: ${lastError}\nReturn ONLY valid JSON matching the schema, with all required fields.`
      : prompt;

    let raw: unknown;
    try {
      if (PROVIDER === "claude") raw = await callClaude(system, fullPrompt, schema, schemaName);
      else if (PROVIDER === "ollama") raw = await callOllama(system, fullPrompt, schema, schemaName);
      else raw = await callOpenAICompatible(system, fullPrompt, schema, schemaName);
    } catch (err) {
      // Connection errors (e.g. Ollama's model runner crashing under memory
      // pressure on this hardware) are transient — retry after a short pause
      // rather than failing the whole brief. This is separate from the
      // validation retry below.
      lastError = String((err as Error)?.message ?? err);
      logger.warn({ provider: PROVIDER, schemaName, attempt, error: lastError }, "LLM call failed, retrying");
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      continue;
    }

    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;

    lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    logger.warn({ provider: PROVIDER, schemaName, attempt, error: lastError }, "LLM output failed validation, retrying");
  }

  throw new Error(`LLM failed to produce valid ${schemaName} after ${maxRetries + 1} attempts: ${lastError}`);
}

async function callOllama(system: string, prompt: string, schema: z.ZodType<unknown>, schemaName: string) {
  const jsonSchema = z.toJSONSchema(schema);
  const start = Date.now();
  logger.info({ provider: "ollama", model: OLLAMA_MODEL, schemaName }, "LLM: requesting structured output");

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      format: jsonSchema,
      stream: false,
      options: {
        temperature: 0.4,
        // Cap the context window. The model defaults to a large context (32k),
        // whose KV cache is a big chunk of memory and a likely cause of the
        // runner crashing under memory pressure on this hardware. Our prompts
        // are only a few thousand tokens, so 8192 is plenty.
        num_ctx: Number(process.env.OLLAMA_NUM_CTX ?? 8192),
      },
    }),
    dispatcher: ollamaAgent,
    signal: AbortSignal.timeout(900_000), // CPU inference on a full 7B model can genuinely take many minutes on larger prompts
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { message: { content: string } };
  logger.info({ provider: "ollama", schemaName, ms: Date.now() - start }, "LLM: response received");
  return JSON.parse(data.message.content);
}

async function callClaude(system: string, prompt: string, schema: z.ZodType<unknown>, schemaName: string) {
  const jsonSchema = z.toJSONSchema(schema);
  const start = Date.now();
  logger.info({ provider: "claude", model: CLAUDE_MODEL, schemaName }, "LLM: requesting structured output");

  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    temperature: 0.4,
    system,
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        name: "emit_result",
        description: `Emit the ${schemaName} result matching the schema exactly.`,
        input_schema: jsonSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "emit_result" },
  });

  const toolUse = res.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude response did not include the expected tool_use block");
  }
  logger.info({ provider: "claude", schemaName, ms: Date.now() - start }, "LLM: response received");
  return toolUse.input;
}

// Works with any OpenAI-compatible chat API (OpenRouter, Groq, Cerebras,
// Together…). We ask for JSON via response_format and embed the exact schema
// in the system prompt — the widest-compatible approach across free models,
// since not all of them support strict json_schema mode. The caller
// (generateStructured) validates the result and retries on bad output.
async function callOpenAICompatible(
  system: string,
  prompt: string,
  schema: z.ZodType<unknown>,
  schemaName: string,
) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set — get a free key from your provider (e.g. openrouter.ai)");
  }
  const jsonSchema = z.toJSONSchema(schema);
  const start = Date.now();
  logger.info({ provider: "openai", model: OPENAI_MODEL, schemaName }, "LLM: requesting structured output");

  const systemWithSchema =
    `${system}\n\nRespond with ONLY a single JSON object matching this exact JSON schema ` +
    `(no markdown, no code fences, no commentary):\n${JSON.stringify(jsonSchema)}`;

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemWithSchema },
        { role: "user", content: prompt },
      ],
    }),
    // Free-tier hosted models are queued and slow: successful calls have been
    // observed taking up to ~110s, so a 2-minute ceiling was cutting off
    // responses that were about to arrive.
    signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS ?? 300_000)),
  });

  if (!res.ok) {
    throw new Error(`OpenAI-compatible request failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenAI-compatible response had no content: ${JSON.stringify(data).slice(0, 300)}`);
  }
  logger.info({ provider: "openai", schemaName, ms: Date.now() - start }, "LLM: response received");
  // Some models wrap JSON in ```json fences despite instructions — strip them.
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}
