// Run the sheet's layout self-check (kit/selfcheck.mjs) headlessly at several moments of the tour.
//
//   node scripts/check.mjs page.html [--times 0,0.5,1,2,4,8] [--width 1600] [--phone]
//
// Prints each category's count per moment and every failure; exits 1 unless all are zero.
// --phone also checks a 390 px wide window for sideways scrolling.
import { chrome, pageUrl } from "./chrome.mjs";

const args = process.argv.slice(2);
let times = ["0", "0.45", "0.9", "1.3", "2.7", "6.2", "11"];
let width = 1600;
let phone = false;
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--times") times = args[++i].split(",");
  else if (args[i] === "--width") width = Number(args[++i]);
  else if (args[i] === "--phone") phone = true;
  else rest.push(args[i]);
}
if (!rest[0]) {
  console.log("usage: node scripts/check.mjs page.html [--times 0,1,2] [--phone]");
  process.exit(1);
}

let total = 0;
const runs = times.map((t) => [t, width]);
if (phone) runs.push([times[0], 390]);
for (const [t, w] of runs) {
  const dom = chrome([`--window-size=${w},${Math.round(w * 0.75)}`, "--virtual-time-budget=3000", "--dump-dom", pageUrl(rest[0], { t, check: 1 })]);
  const m = [...dom.matchAll(/<pre id="bp-check"[^>]*>(\{[\s\S]*?)<\/pre>/g)].pop();
  if (!m) {
    console.log(`t=${t} w=${w}: no report (did the page throw?)`);
    total++;
    continue;
  }
  const report = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
  if (w < 600) {
    // At phone width the lettering is too small to measure; only sideways scrolling counts.
    report.fails = report.fails.filter((f) => f.kind === "sideways-scroll");
    report.counts = { "sideways-scroll": report.fails.length };
  }
  const line = Object.entries(report.counts).map(([k, v]) => `${k} ${v}`).join("  ");
  console.log(`t=${t} w=${w}  ${line}  (${report.texts} texts, ${report.parts} parts)`);
  const seen = new Set();
  for (const f of report.fails) {
    const key = `${f.kind}|${f.what}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`   ${f.kind}: ${f.what}`);
  }
  total += report.fails.length;
}
console.log(total ? `check failed: ${total}` : "check passed");
process.exit(total ? 1 : 0);
