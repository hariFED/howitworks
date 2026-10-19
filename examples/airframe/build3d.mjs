// Builds airframe-3d.html: the airframe of BP-111 as a live 3D cutaway, from the sheet's own model
// (model.mjs) and geometry (geom.mjs), on the aircraft's lofts (light-aircraft scene3d.mjs).
//   node examples/airframe/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LA = join(here, "..", "light-aircraft");
const parts = SC.parts();
const solids = parts.reduce((s, p) => s + p.solids.length, 0);

const size = writePage3d(join(here, "airframe-3d.html"), {
  title: "Airframe 3D",
  description: "The BP-111 light-aircraft airframe as a live isometric cutaway: the port wing's spars, rows of ribs and strut, the fuselage's frames, longerons and stringers, and the tail, with the lift along the wing, the front spar's stress and the strut's force following the load factor from 1 g to the 3.8 g limit and a gust.",
  heading: "AIRFRAME · BP-111 · 3D",
  titleText: "AIRFRAME STRUCTURE · CUTAWAY ON THE CENTRELINE",
  dwg: "BP-111-3D",
  parts: parts.length,
  units: "mm · kN · MPa",
  sheet2d: "airframe.html",
  buttons: `<button type="button" id="n1">1 g</button><button type="button" id="n2">2 g</button><button type="button" id="n38">3.8 g</button>`,
  hint: "DRAG TO ORBIT · ↑ ↓ LOAD FACTOR · SPACE TOUR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-111 · ↑ ↓ LOAD FACTOR · SPACE TOUR",
  aria: "Isometric cutaway of a light aircraft's airframe, cut on the fuselage centreline: the port wing with its front and rear spars, two rows of ribs, the lower skin and leading edge, the strut and its fittings; the cabin's frames, roof fittings, firewall, door frame and belly skin; the tail cone's frames, longerons and stringers; the tailplane's spars and ribs and the fin. Arrows show the lift along the wing and the strut's force, and the front spar's top is shaded by its stress, all following the load factor through the tour.",
  css: `#ov .lift{stroke:var(--bp-accent);stroke-width:2px;fill:none}#ov .lift-h{fill:var(--bp-accent)}#ov .sig{stroke:var(--bp-accent);stroke-width:5px;stroke-linecap:round;fill:none}#ov .ft{fill:var(--bp-accent-ink)}`,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(LA, "model.mjs"), "M"],
    [join(LA, "extra.mjs"), "X"],
    [join(LA, "parts.mjs"), "P"],
    [join(LA, "scene3d.mjs"), "LA"],
    [join(here, "model.mjs"), "ST"],
    [join(here, "geom.mjs"), "GE"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`airframe-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  ${solids} solids  (+ three.js from jsDelivr)`);
