import "dotenv/config";
// exercise extractJson indirectly through a real call
process.env.OPENAI_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
const { generateStructured } = await import("./lib/llm.js");
const { z } = await import("zod");
const schema = z.object({ heading: z.string(), markdown: z.string() });
for (let i = 1; i <= 3; i++) {
  const t = Date.now();
  try {
    const r = await generateStructured({
      system: "You write one section of a technical blog article. No em dashes.",
      prompt: "Write a 200-word section titled 'Why ISP proxies hold sessions longer' for developers.",
      schema, schemaName: "ArticleSection",
    });
    console.log(`run${i}: ${Math.round((Date.now()-t)/1000)}s | OK | ${r.markdown.split(/\s+/).length} words`);
  } catch (e) {
    console.log(`run${i}: ${Math.round((Date.now()-t)/1000)}s | FAIL | ${(e as Error).message.slice(0,80)}`);
  }
}
