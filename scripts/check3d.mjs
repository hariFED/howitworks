// Headless sanity check of a 3D page (kit/solid3d.mjs), with software WebGL (SwiftShader):
//   1. renders a deterministic frame (?t, cut open) and reads it back in the page (?check=1):
//      WebGL initialised, the fallback did not show, the canvas covers part of the window and is not
//      flat (pixel variance);
//   2. drives the controls (?selftest=1): the kit's tests (views, keys, wheel, orbit) and the page's own
//      (V.test: dragging a part drives the model, …). Every test must pass.
//
//   node scripts/check3d.mjs examples/floor-pump/floor-pump-3d.html [--t 1] [--gpu]
//   node scripts/check3d.mjs --all          every examples/<slug>/<slug>-3d.html
//
// Prints each result and "check3d passed", or "check3d failed: n problems" and exits 1.
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chrome, pageUrl } from "./chrome.mjs";

const args = process.argv.slice(2);
const val = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const gpu = args.includes("--gpu");
const FLAGS = gpu ? ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pages = args.filter((a, i) => !a.startsWith("--") && !["--t"].includes(args[i - 1]));
if (args.includes("--all")) {
  const dir = join(root, "examples");
  pages = readdirSync(dir)
    .map((s) => join(dir, s, `${s}-3d.html`))
    .filter(existsSync);
}
if (!pages.length) {
  console.log("usage: node scripts/check3d.mjs page-3d.html [--t 1] [--gpu] | --all");
  process.exit(1);
}

const read = (dom, id) => {
  const m = dom.match(new RegExp(`<pre id="${id}"[^>]*>([^<]*)</pre>`));
  return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")) : null;
};
const load = (page, params) => chrome([...FLAGS, "--window-size=1400,900", "--virtual-time-budget=20000", "--dump-dom", pageUrl(page, params)]);

let problems = 0;
const fail = (msg) => {
  problems++;
  console.log(`  FAIL ${msg}`);
};
for (const page of pages) {
  console.log(page);
  const dom = load(page, { t: val("--t", 1), cut: 1, check: 1 });
  if (/id="v3-fallback"/.test(dom)) fail("the WebGL/CDN fallback showed (three.js did not load, or the page threw)");
  const r = read(dom, "check3d");
  if (!r) fail("no render report: the page did not finish its frame (did it throw?)");
  else {
    console.log(`  webgl${r.webgl}  ${r.gpu}`);
    console.log(`  parts ${r.parts}  fluids ${r.fluids}  cover ${(r.cover * 100).toFixed(1)}%  variance ${r.variance}`);
    if (r.cover < 0.005) fail(`canvas nearly empty (${(r.cover * 100).toFixed(2)}% drawn)`);
    if (r.variance < 20) fail(`canvas is flat (variance ${r.variance})`);
    if (!r.parts) fail("no parts");
  }
  // frozen (?t): no live loop, so each synthetic input re-renders once, synchronously
  const st = read(load(page, { t: 0.2, selftest: 1, view: "iso" }), "selftest");
  if (!st) fail("no selftest report");
  else
    for (const t of st) {
      console.log(`  ${t.pass ? "ok  " : "FAIL"} ${t.name}${t.info !== undefined ? "  " + JSON.stringify(t.info) : ""}`);
      if (!t.pass) problems++;
    }
}
console.log(problems ? `check3d failed: ${problems} problem${problems > 1 ? "s" : ""}` : "check3d passed");
process.exit(problems ? 1 : 0);
