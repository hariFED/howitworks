// node scripts/build-all.mjs  - builds every examples/*/build.mjs, and its build3d.mjs where there is one
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "examples");
let failed = 0;
for (const slug of readdirSync(dir).sort()) {
  for (const [file, label] of [["build.mjs", slug], ["build3d.mjs", `${slug} 3d`]]) {
    const build = join(dir, slug, file);
    if (!existsSync(build)) continue;
    try {
      execFileSync(process.execPath, [build], { stdio: "pipe" });
      console.log(`built  ${label}`);
    } catch (e) {
      failed++;
      console.log(`FAILED ${label}\n${e.stderr || e.message}`);
    }
  }
}
process.exit(failed ? 1 : 0);
