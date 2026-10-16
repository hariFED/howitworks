// node scripts/check-all.mjs [slug...]  - runs the layout check on every example at its meta.json checkTimes
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "examples");
const only = process.argv.slice(2);
let failed = 0;
for (const slug of readdirSync(dir).sort()) {
  if (only.length && !only.includes(slug)) continue;
  const page = join(dir, slug, `${slug}.html`);
  const metaFile = join(dir, slug, "meta.json");
  if (!existsSync(page) || !existsSync(metaFile)) continue;
  const meta = JSON.parse(readFileSync(metaFile, "utf8"));
  const args = [join(root, "scripts", "check.mjs"), page, "--phone"];
  if (meta.checkTimes) args.push("--times", String(meta.checkTimes));
  try {
    execFileSync(process.execPath, args, { stdio: "pipe" });
    console.log(`passed ${slug}`);
  } catch (e) {
    failed++;
    console.log(`FAILED ${slug}\n${String(e.stdout || "").split("\n").slice(-25).join("\n")}`);
  }
}
process.exit(failed ? 1 : 0);
