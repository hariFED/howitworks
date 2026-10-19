// Builds trim-tab-3d.html: the trim tab of BP-112 as a live 3D half-section on the actuator's centre
// plane, from the sheet's own model and profiles, with kit/solid3d.mjs.
//   node examples/trim-tab/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "trim-tab-3d.html"), {
  title: "Elevator Trim Tab 3D",
  description: "The BP-112 elevator trim tab as a live isometric half-section cut on the actuator's axis: the cable drum and Acme screw turn, the bronze nut runs along it, the rod pulls the tab's horn and the tab turns on its piano hinge, from the same model as the sheet.",
  heading: "ELEVATOR TRIM TAB · BP-112 · 3D",
  titleText: "TRIM TAB ACTUATOR · HALF-SECTION ON ITS AXIS",
  dwg: "BP-112-3D",
  parts: parts.length,
  units: "mm · N · kt · °",
  sheet2d: "trim-tab.html",
  buttons: `<button type="button" id="tour" aria-pressed="false">TOUR</button>`,
  hint: "DRAG TO ORBIT · DRAG THE TAB · T G TRIM · ← → AIRSPEED · F ROD OFF · SPACE TOUR · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-112 · T G TRIM · ← → AIRSPEED",
  aria: "Isometric half-section of a light aircraft's elevator trim tab actuator, cut on the screw's axis: a slice of the elevator's skins and spars, the grooved cable drum and the two trim cable strands, the ball bearing, the slotted housing with its stop blocks and aft bush, the Acme jackscrew, the bronze nut and its lug, the push-pull rod, the tab's horn, the piano hinge and the tab. The tour slows the aircraft, trims the tab down, returns to cruise, and shows a disconnected rod letting the tab flutter.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../nose-gear/model.mjs"), "N"],
    [join(here, "../flight-controls/model.mjs"), "FC"],
    [join(here, "../flight-controls/extra.mjs"), "X"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`trim-tab-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  ${parts.reduce((n, p) => n + p.solids.length, 0)} solids`);
