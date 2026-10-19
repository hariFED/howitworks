// Builds wing-flaps-3d.html: the flaps of BP-107 as a live 3D technical illustration, from the sheet's
// own model (model.mjs) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/wing-flaps/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[ab]$/, "")));

const size = writePage3d(join(here, "wing-flaps-3d.html"), {
  title: "Wing Flaps 3D",
  description: "The BP-107 light-aircraft flaps as a live isometric half-section cut through the inboard flap track: the actuator's nut runs out along its jackscrew, the bellcrank swings, the push-pull rod drives the flap, and the flap's two rollers carry it aft and then down along the track's curved slot, opening the slot behind the shroud.",
  heading: "WING FLAPS · BP-107 · 3D",
  titleText: "WING FLAPS AND DRIVE · HALF-SECTION AT THE TRACK",
  dwg: "BP-107-3D",
  parts: items.size,
  units: "mm · kt · °",
  sheet2d: "wing-flaps.html",
  buttons: [0, 10, 20, 30].map((f) => `<button type="button" id="f${f}">${f}°</button>`).join(""),
  hint: "DRAG TO ORBIT · ↑ ↓ OR THE 0–30° BUTTONS: SELECTOR · DRAG THE FLAP · ← → AIRSPEED · SPACE TOUR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-107 · ↑ ↓ SELECTOR · SPACE TOUR",
  aria: "Isometric half-section of a light aircraft's electric flap drive, cut through the inboard flap track: the rear spar, shroud and cove, the flap with its roller bracket and two rollers in the track's curved slot, the push-pull rod, the bellcrank on its bolt, the crossed cables and follow-up cable, and the actuator with its motor, gearbox, slotted housing tube, jackscrew, nut and limit switches. The tour selects 10, 20 and 30 degrees, then retracts.",
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
console.log(`wing-flaps-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
