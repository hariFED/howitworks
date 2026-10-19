// Builds propeller-3d.html: the propeller of BP-104 as a live 3D technical illustration, from the 2D
// sheet's own model (model.mjs, unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/propeller/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = SC.parts().length;

const size = writePage3d(join(here, "propeller-3d.html"), {
  title: "Fixed-Pitch Propeller 3D",
  description: "The BP-104 light-aircraft propeller as a live isometric half-section: the lofted, twisted blades, hub, spinner and bolting turn with the crankshaft from the sheet's blade-element model, the inflow the blades add is stippled, and the velocity triangle rides on the 75 % station through a run-up, climb, cruise and windmilling glide.",
  heading: "PROPELLER · BP-104 · 3D",
  titleText: "FIXED-PITCH PROPELLER · HALF-SECTION",
  dwg: "BP-104-3D",
  parts: items,
  units: "mm · N · kW",
  sheet2d: "propeller.html",
  buttons: `<button type="button" id="turn">STOP / TURN</button><button type="button" id="tour">TOUR</button>`,
  hint: "DRAG TO ORBIT · DRAG A BLADE OR ↑ ↓ AIRSPEED · ← → THROTTLE · T TURNS THE BLADES (1/150 SPEED) OR PARKS THEM ON THE CUT · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-104 · ↑ ↓ AIRSPEED · ← → THROTTLE · T STOP",
  aria: "Isometric half-section of a light aircraft's fixed-pitch two-blade propeller, its spinner and its bolting to the crankshaft flange, cut on the plane of both blades. The whole assembly turns with the crankshaft, slowed down; the air the blades draw through the disc is stippled, densest in the static run-up and gone when the propeller windmills in a glide; the velocity triangle of blade speed and inflow is drawn at the three-quarter-radius station. Up and down arrows change the airspeed, left and right the throttle, T stops the blades on the cut.",
  css: `#ov .wv{fill:none;stroke:var(--bp-accent);stroke-width:2.2px;stroke-linecap:round}#ov .wv-head{fill:var(--bp-accent)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`propeller-3d.html  ${(size / 1024).toFixed(0)} KB  ${items} parts  (+ three.js from jsDelivr)`);
