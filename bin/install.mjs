#!/usr/bin/env node
// npx @harifed/blueprint [--project] [--dir <path>] [--force] [--no-examples]
// Copies the Blueprint skill into ~/.claude/skills/blueprint-drawings (or ./.claude/skills/blueprint-drawings).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

if (has("--help") || has("-h")) {
  console.log(`Blueprint, a skill for Claude Code

Usage: npx @harifed/blueprint [options]

  (no options)     install into ~/.claude/skills/blueprint-drawings
  --project        install into ./.claude/skills/blueprint-drawings (this project only)
  --dir <path>     install into <path>/blueprint-drawings
  --force          replace an existing install
  --no-examples    skip the example sheets (smaller install)

Then, in Claude Code:  /blueprint-drawings explain how a bicycle floor pump works`);
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const base = val("--dir") ? resolve(val("--dir"))
  : has("--project") ? resolve(".claude", "skills")
  : join(homedir(), ".claude", "skills");
const dest = join(base, "blueprint-drawings");

if (existsSync(dest)) {
  if (!has("--force")) {
    console.error(`${dest} already exists. Run again with --force to replace it.`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });

const skip = (src) => {
  const rel = relative(root, src).replace(/\\/g, "/");
  if (/(^|\/)(node_modules|shots|\.git)(\/|$)/.test(rel)) return false;
  if (rel.endsWith(".png")) return false;
  if (has("--no-examples") && rel.startsWith("examples/") && rel !== "examples/floor-pump" && !rel.startsWith("examples/floor-pump/")) return false;
  return true;
};
for (const item of ["SKILL.md", "README.md", "LICENSE", "kit", "scripts", "references", "examples"]) {
  const src = join(root, item);
  if (existsSync(src)) cpSync(src, join(dest, item), { recursive: true, filter: skip });
}

const count = (dir) => readdirSync(dir).reduce((n, f) => {
  const p = join(dir, f);
  return n + (statSync(p).isDirectory() ? count(p) : 1);
}, 0);
const examples = existsSync(join(dest, "examples")) ? readdirSync(join(dest, "examples")).length : 0;
console.log(`Blueprint ${pkg.version} installed in ${dest}
  ${count(dest)} files, ${examples} example sheet${examples === 1 ? "" : "s"}

Restart Claude Code, then try:
  /blueprint-drawings explain how a pin tumbler lock opens
  /blueprint-drawings draw a rate limiter as a real mechanism`);
