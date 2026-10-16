// Screenshots and checks for floor-pump-3d.html in headless Chrome with software WebGL (SwiftShader),
// so they work on machines without a GPU. Uses scripts/chrome.mjs to find Chrome and build URLs.
//
//   node examples/floor-pump-3d/shoot.mjs                 the representative set into shots/
//   node examples/floor-pump-3d/shoot.mjs --only iso-cut  one of them
//   node examples/floor-pump-3d/shoot.mjs --log "t=1&cut=1"   print the page's console (debugging)
//   node examples/floor-pump-3d/shoot.mjs --bench         time a frame (three passes), print JSON
//   node examples/floor-pump-3d/shoot.mjs --gpu ...       use the machine's GPU instead of SwiftShader
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromePath, pageUrl } from "../../scripts/chrome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, "floor-pump-3d.html");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const gpu = flag("--gpu");

// Each shot: name, URL parameters, window size. t = 1.0 is mid-downstroke with the valve open.
export const SHOTS = [
  ["iso-cut", { t: 1.0, view: "iso", cut: 1 }, [1600, 1000]],
  ["dbg", { t: 1.0, view: "front", cut: 1, zoom: 5.2, look: "28,48,0", balloons: 0, dbg: 1 }, [1600, 1000]],
  ["iso-cut-base", { t: 1.0, view: "iso", cut: 1, zoom: 5.2, look: "28,48,0", balloons: 0 }, [1600, 1000]],
  ["iso-exploded", { t: 1.0, view: "iso", cut: 1, explode: 1 }, [1600, 1000]],
  ["front-cut", { t: 1.0, view: "front", cut: 1 }, [1600, 1000]],
  ["paper-iso-cut-piston", { t: 1.0, view: "iso", cut: 1, theme: "paper", zoom: 4.2, look: "0,560,0", balloons: 0 }, [1600, 1000]],
  ["dark-iso-uncut", { t: 1.0, view: "iso", cut: 0, theme: "dark" }, [1600, 1000]],
];

function run(extra, { timeout = 180000 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "bp3-chrome-"));
  try {
    const r = spawnSync(
      chromePath(),
      [
        "--headless=new",
        ...(gpu ? ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        "--allow-file-access-from-files",
        "--enable-logging=stderr",
        "--v=0",
        `--user-data-dir=${profile}`,
        ...extra,
      ],
      { encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 }
    );
    return r;
  } finally {
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}
const consoleLines = (r) => (r.stderr || "").split("\n").filter((l) => /CONSOLE|Uncaught|ERROR:.*(gl|GL|shader)/.test(l)).slice(0, 40);
const params = (s) => Object.fromEntries(new URLSearchParams(s));

if (val("--log") !== null) {
  const r = run(["--window-size=1600,1000", "--virtual-time-budget=15000", "--dump-dom", pageUrl(page, params(val("--log")))]);
  console.log(consoleLines(r).join("\n") || "(no console output)");
  console.log("ready:", /data-ready="1"/.test(r.stdout), " ok:", /id="v3-fallback"/.test(r.stdout) ? "FAILED (fallback shown)" : "no fallback");
} else if (flag("--bench")) {
  for (const size of [[1600, 1000], [1440, 900]]) {
    const r = run([`--window-size=${size.join(",")}`, "--virtual-time-budget=60000", "--dump-dom", pageUrl(page, { bench: 1, cut: 1, view: "iso" })]);
    const m = r.stdout.match(/<pre id="bench"[^>]*>([^<]*)<\/pre>/);
    console.log(size.join("x"), m ? m[1].replace(/&quot;/g, '"') : "no result\n" + consoleLines(r).join("\n"));
  }
} else {
  const dir = join(here, "shots");
  mkdirSync(dir, { recursive: true });
  const only = val("--only");
  for (const [name, p, [w, h]] of SHOTS) {
    if (only && !only.split(",").includes(name)) continue;
    const out = join(dir, `${name}.png`);
    const r = run([`--window-size=${w},${h}`, "--virtual-time-budget=20000", `--screenshot=${out}`, pageUrl(page, p)]);
    const errs = consoleLines(r);
    console.log(`${name}.png${errs.length ? "\n  " + errs.join("\n  ") : ""}`);
  }
}
