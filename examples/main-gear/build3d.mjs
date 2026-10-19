// Builds main-gear-3d.html: the main gear of BP-103 as a live 3D technical illustration, from the 2D
// sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/main-gear/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[ab]$/, "")));

const size = writePage3d(join(here, "main-gear-3d.html"), {
  title: "Main Landing Gear 3D",
  description: "The BP-103 light-aircraft main gear as a live isometric half-section: the tapered spring-steel leg bends from beam theory as the tour lands, the track widens and the wheel leans, the wheel turns, and the toe brakes' line pressure clamps the single-piston caliper on the disc.",
  heading: "MAIN GEAR · BP-103 · 3D",
  titleText: "SPRING-STEEL MAIN GEAR · HALF-SECTION",
  dwg: "BP-103-3D",
  parts: items.size,
  units: "mm · N · bar",
  sheet2d: "main-gear.html",
  buttons: `<button type="button" id="land">LAND</button><button type="button" id="brake">BRAKE</button>`,
  hint: "DRAG TO ORBIT · DRAG THE WHEEL OR ↑ ↓ TO LOAD THE LEG · ← → TOE BRAKES · B BOTH · SPACE LANDS · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-103 · DRAG THE WHEEL · ← → BRAKES · SPACE LANDS",
  aria: "Isometric half-section of the spring-steel main landing gear of a light aircraft: the tapered leg clamped in the fuselage's gear box between a bolt and a saddle, the axle bolted to its tip, the 6.00-6 wheel on its bearings, and the single-disc brake with its floating caliper. The tour lands on it: the leg bends, the track widens and the wheel leans in; then the brakes clamp the disc as the aeroplane slows and turns. Drag the wheel or use the arrow keys.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`main-gear-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
