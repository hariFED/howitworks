// Builds flight-controls-3d.html: the flight controls of BP-106 as a live 3D cutaway in a ghosted airframe,
// from the sheet's own model and routes (model.mjs), with kit/solid3d.mjs.
//   node examples/flight-controls/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();
const items = new Set(parts.filter((p) => p.anchor || /^\d+$/.test(String(p.id))).map((p) => String(p.id).replace(/b$/, "")).filter((id) => /^\d+$/.test(id)));

const size = writePage3d(join(here, "flight-controls-3d.html"), {
  title: "Flight Controls 3D",
  description: "The BP-106 light-aircraft flight controls as a live 3D cutaway in a ghosted airframe: the wheels, columns, chain, cable loops, pulleys, bellcranks, rods, surfaces and the trim tab move from the sheet's model, through a pre-flight control check, a slow-down, the trim and a coordinated turn.",
  heading: "FLIGHT CONTROLS · BP-106 · 3D",
  titleText: "PRIMARY FLIGHT CONTROLS · GHOSTED AIRFRAME",
  dwg: "BP-106-3D",
  parts: items.size,
  units: "mm · N · ° · kt",
  sheet2d: "flight-controls.html",
  buttons: `<button type="button" id="tour" aria-pressed="false">TOUR</button>`,
  hint: "DRAG TO ORBIT · DRAG AN AILERON OR THE ELEVATOR · ←→ WHEEL · ↑↓ COLUMN · Z X PEDALS · T G TRIM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-106 · ←→ WHEEL · ↑↓ COLUMN · Z X PEDALS · T G TRIM",
  aria: "The cable-and-pushrod flight controls of a four-seat high-wing light aircraft inside a ghosted airframe, cut on the centre line with the starboard half removed. The tour checks the controls on the ground, then slows down, trims and turns: the wheel, columns, chain, cables, pulleys, bellcranks, rods, ailerons, elevator, trim tab, rudder and pedals move from the same model as the 2D sheet. Drag an aileron or the elevator, or use the keys.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../nose-gear/model.mjs"), "N"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "details.mjs"), "D"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`flight-controls-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  ${parts.reduce((n, p) => n + p.solids.length, 0)} solids  ${items.size} items`);
