// Node-only: assemble a standalone HTML page from a built sheet and the modules the page runs.
// Modules are inlined as namespaces (const K = (() => { ...; return { ... } })()), so a module
// written as `import * as K from "../../kit/draft.mjs"` works unchanged once inlined, as long as
// the page inlines its dependencies under the same names, in dependency order.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const kitPath = (name) => join(here, name);

export function inlineModule(file, name) {
  const src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  const body = src
    .replace(/^import\s[^;]*?from\s+["'][^"']+["'];?\s*$/gms, "")
    .replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm, "");
  return `const ${name} = (() => {\n${body}\nreturn { ${names.join(", ")} };\n})();\n`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function writePage(out, { title, description = "", svg, bar = "", css = "", modules = [], main = "" }) {
  const sheetCss = readFileSync(kitPath("sheet.css"), "utf8");
  const scripts = modules.map(([file, name]) => inlineModule(file, name)).join("\n");
  const html = `<!doctype html>
<html lang="en" data-theme="blueprint">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<style>
${sheetCss}
${css}
</style>
</head>
<body>
<main class="bp-page">
<figure class="bp-figure">
${svg}
<figcaption class="bp-bar">${bar}</figcaption>
</figure>
</main>
<script>
"use strict";
${scripts}
${main}
</script>
</body>
</html>
`;
  writeFileSync(out, html);
  return html.length;
}
