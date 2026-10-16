// Builds solenoid-valve-3d.html: the pilot-operated solenoid valve of BP-019 as a live 3D technical
// illustration, from the 2D sheet's own model (model.mjs, unchanged) and profile numbers (parts.mjs),
// with kit/solid3d.mjs.
//   node examples/solenoid-valve/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "solenoid-valve-3d.html"), {
  title: "Solenoid Valve 3D",
  description: "The BP-019 pilot-operated solenoid valve as a live isometric half-section: hatched cut faces, an exploded view with balloons, and the plunger, pilot, diaphragm and water driven by the 2D sheet's coil-and-servo model.",
  heading: "SOLENOID VALVE · BP-019 · 3D",
  titleText: "SOLENOID VALVE 2/2 NC · HALF-SECTION",
  dwg: "BP-019-3D",
  parts: parts.length,
  units: "mm · bar (gauge)",
  sheet2d: "solenoid-valve.html",
  buttons: `<button type="button" id="coil" aria-pressed="false">COIL</button>`,
  hint: "DRAG TO ORBIT · SPACE OR TAP THE COIL SWITCHES IT · DRAG THE BODY OR ↑ ↓ SUPPLY · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE, 10× SLOWER · SAME MODEL AS BP-019 · COIL · LIFT x/z · p IN/CHAMBER/OUT · FLOW",
  aria: "Isometric half-section of a pilot-operated solenoid valve. Drag to orbit; press Space or tap the coil to switch it, drag the body or use the arrow keys to set the supply pressure. The plunger opens the pilot, the chamber above the diaphragm loses pressure, the diaphragm lifts and water flows, from the same model as the 2D sheet.",
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
console.log(`solenoid-valve-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
