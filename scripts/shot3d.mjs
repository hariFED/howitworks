// Screenshot a 3D page (kit/solid3d.mjs) with headless Chrome and software WebGL (SwiftShader), so it
// works on machines without a GPU.
//
//   node scripts/shot3d.mjs page-3d.html [--out shot.png] [--width 1600] [--height 1000] [--scale 1]
//        [--t 1] [--theme white] [--view iso|front|side|top] [--cut 0|1] [--offset mm] [--explode 0..1]
//        [--zoom k] [--look x,y,z] [--balloons 0] [--embed] [--times 0,1,2] [--gpu] [--wait ms]
//
// --t renders the tour at that time (deterministic, default 1). --look centres the view on a world
// point in mm and --zoom magnifies it, for close-ups (e.g. --zoom 5 --look 28,48,0). --gpu uses the
// machine's GPU instead of SwiftShader. --times takes several shots, name-<t>.png.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chrome, pageUrl } from "./chrome.mjs";

export const GL_FLAGS = (gpu) => (gpu ? ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]);

const args = process.argv.slice(2);
const opt = { out: "shot3d.png", width: 1600, height: 1000, scale: 1, wait: 20000 };
const pass = {};
const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const next = () => args[++i];
  if (a === "--out") opt.out = next();
  else if (a === "--width") opt.width = Number(next());
  else if (a === "--height") opt.height = Number(next());
  else if (a === "--scale") opt.scale = Number(next());
  else if (a === "--wait") opt.wait = Number(next());
  else if (a === "--times") opt.times = next().split(",");
  else if (a === "--gpu") opt.gpu = true;
  else if (a === "--embed") pass.embed = 1;
  else if (["--t", "--theme", "--view", "--cut", "--offset", "--explode", "--zoom", "--look", "--balloons"].includes(a)) pass[a.slice(2)] = next();
  else rest.push(a);
}
if (!rest[0]) {
  console.log("usage: node scripts/shot3d.mjs page-3d.html [--out shot.png] [--t 1] [--view iso] [--cut 1] [--explode 0] [--theme white] [--zoom k --look x,y,z]");
  process.exit(1);
}
const shots = opt.times ? opt.times.map((t) => [t, opt.out.replace(/\.png$/, `-${t}.png`)]) : [[pass.t ?? 1, opt.out]];
for (const [t, out] of shots) {
  const file = resolve(out);
  mkdirSync(dirname(file), { recursive: true });
  chrome([
    ...GL_FLAGS(opt.gpu),
    `--window-size=${opt.width},${opt.height}`,
    `--force-device-scale-factor=${opt.scale}`,
    `--virtual-time-budget=${opt.wait}`,
    `--screenshot=${file}`,
    pageUrl(rest[0], { ...pass, t }),
  ]);
  console.log(out);
}
