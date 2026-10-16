// Screenshot a sheet with headless Chrome.
//
//   node scripts/shot.mjs page.html [--out shot.png] [--width 1600] [--height 1180] [--scale 1]
//                                   [--t 6.5] [--theme paper] [--zoom x,y,w,h] [--times 0,0.9,4]
//
// --t renders the tour at that time (deterministic). --times takes several shots, name-<t>.png.
// --zoom shows only that sheet region, filling the window: use it for 4x close-ups, e.g.
// --zoom 400,470,320,320 --width 1280 --height 1280.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chrome, pageUrl } from "./chrome.mjs";

const args = process.argv.slice(2);
const opt = { out: "shot.png", width: 1600, height: 1180, scale: 1, wait: 3000 };
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => args[++i];
  if (a === "--out") opt.out = next();
  else if (a === "--width") opt.width = Number(next());
  else if (a === "--height") opt.height = Number(next());
  else if (a === "--scale") opt.scale = Number(next());
  else if (a === "--t") opt.t = next();
  else if (a === "--times") opt.times = next().split(",");
  else if (a === "--theme") opt.theme = next();
  else if (a === "--zoom") opt.zoom = next();
  else if (a === "--wait") opt.wait = Number(next());
  else rest.push(a);
}
if (!rest[0]) {
  console.log("usage: node scripts/shot.mjs page.html [--out shot.png] [--t 6] [--theme paper] [--zoom x,y,w,h] [--times 0,2,4]");
  process.exit(1);
}

const shots = opt.times ? opt.times.map((t) => [t, opt.out.replace(/\.png$/, `-${t}.png`)]) : [[opt.t ?? 6, opt.out]];
for (const [t, out] of shots) {
  const file = resolve(out);
  mkdirSync(dirname(file), { recursive: true });
  chrome([
    `--window-size=${opt.width},${opt.height}`,
    `--force-device-scale-factor=${opt.scale}`,
    `--virtual-time-budget=${opt.wait}`,
    `--screenshot=${file}`,
    pageUrl(rest[0], { t, theme: opt.theme, zoom: opt.zoom }),
  ]);
  console.log(out);
}
