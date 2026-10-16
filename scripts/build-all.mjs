// node scripts/build-all.mjs  - builds every examples/*/build.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "examples");
let failed = 0;
for (const slug of readdirSync(dir).sort()) {
  const build = join(dir, slug, "build.mjs");
  if (!existsSync(build)) continue;
  try {
    execFileSync(process.execPath, [build], { stdio: "pipe" });
    console.log(`built  ${slug}`);
  } catch (e) {
    failed++;
    console.log(`FAILED ${slug}\n${e.stderr || e.message}`);
  }
}
process.exit(failed ? 1 : 0);
