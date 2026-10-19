// Builds light-aircraft-3d.html: the BP-022 light aircraft as a live 3D cutaway, cut on the fuselage
// centreline with the starboard half removed, from the sheet's own model (model.mjs, unchanged) and
// geometry (parts.mjs), with kit/solid3d.mjs.
//   node examples/light-aircraft/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "light-aircraft-3d.html"), {
  title: "Light Aircraft 3D",
  description: "The BP-022 four-seat high-wing light aircraft as a live cutaway: cut on the centreline, starboard half removed, the engine bay, cabin, port wing structure and fuel tank open; the control surfaces and the lift follow the sheet's flight model, and every system is a doorway to its own drawing.",
  heading: "LIGHT AIRCRAFT · BP-022 · 3D",
  titleText: "LIGHT AIRCRAFT · CUTAWAY ON CENTRELINE",
  dwg: "BP-022-3D",
  parts: parts.length,
  units: "kt · kN · deg",
  sheet2d: "light-aircraft.html",
  buttons: `<button type="button" id="tour" aria-pressed="false">TOUR</button>`,
  hint: "DRAG TO ORBIT · DRAG THE ELEVATOR FOR AIRSPEED · DRAG A FLAP · ↑↓ SPEED · ←→ BANK · F FLAPS · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-022 · ↑↓ AIRSPEED · ←→ BANK · F FLAPS",
  aria: "Cutaway of a four-seat high-wing light aircraft, cut on the fuselage centreline with the starboard half removed. Drag to orbit; drag the elevator or press the arrow keys to change airspeed and bank, F steps the flaps; the control surfaces and the lift arrows follow the same model as the 2D sheet.",
  css: `#ov .lift{stroke:var(--bp-accent);stroke-width:2.2px;fill:none}#ov .lift-h{fill:var(--bp-accent)}#ov .load{stroke:var(--bp-ink);stroke-width:1.2px;fill:none;stroke-dasharray:5 3}#ov .load-h{fill:var(--bp-ink)}`,
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
console.log(`light-aircraft-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  ${parts.reduce((n, p) => n + p.solids.length, 0)} solids  (+ three.js r170 from jsDelivr)`);
