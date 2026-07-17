import { z } from "zod";
import { Agent, fetch } from "undici";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger.js";

// Single entry point every agent uses to talk to an LLM. Which model actually
// answers is controlled by LLM_PROVIDER in .env — "ollama" (free, local,
// default) or "claude" (paid, higher quality). Agents never call a provider
// directly, so flipping this one variable when scaling up doesn't touch
// agent code at all.
const PROVIDER = process.env.LLM_PROVIDER ?? "ollama";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";

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

    const raw =
      PROVIDER === "claude"
        ? await callClaude(system, fullPrompt, schema, schemaName)
        : await callOllama(system, fullPrompt, schema, schemaName);

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
      options: { temperature: 0.4 },
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
