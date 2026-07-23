// Re-copy the team's context docs into data/knowledge/ so the deployed app has
// them. Run after editing the source files:  npm run sync:knowledge
//
// The source folder is the living copy the team edits; data/knowledge/ is the
// version-controlled snapshot the app (and Coolify) actually reads.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC =
  process.env.KNOWLEDGE_SRC ??
  "C:/Users/amash/OneDrive/Documents/Claude/Projects/Blogs/context";
const DST = process.env.KNOWLEDGE_DIR ?? "data/knowledge";

const FILES = [
  "features.md",
  "brand-voice.md",
  "style-guide.md",
  "writing-examples.md",
  "internal-links-map.md",
  "target-keywords.md",
  "competitor-analysis.md",
];

if (!existsSync(SRC)) {
  console.error(`Source folder not found: ${SRC}`);
  console.error("Set KNOWLEDGE_SRC to the folder holding the context .md files.");
  process.exit(1);
}
mkdirSync(DST, { recursive: true });

let copied = 0;
for (const f of FILES) {
  const from = join(SRC, f);
  if (!existsSync(from)) {
    console.warn(`  skip (not found): ${f}`);
    continue;
  }
  copyFileSync(from, join(DST, f));
  console.log(`  synced: ${f}`);
  copied++;
}
console.log(`\n${copied}/${FILES.length} files synced into ${DST}`);
