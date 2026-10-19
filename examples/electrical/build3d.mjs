// Builds electrical-3d.html: the alternator, the starter at its ring gear, the battery and one panel
// breaker of BP-110 as a live 3D technical illustration, from the 2D sheet's own model (model.mjs,
// unchanged) and profiles (parts.mjs), with kit/solid3d.mjs.
//   node examples/electrical/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = new Set(SC.parts().map((p) => String(p.id).replace(/[a-z]$/, "")).filter((id) => /^\d+$/.test(id)));

const size = writePage3d(join(here, "electrical-3d.html"), {
  title: "28 V Aircraft Electrical System 3D",
  description: "The BP-110 electrical system's alternator, starter, battery and panel breaker as a live isometric half-section: the claw-pole rotor turns, the Bendix pinion screws into the ring gear when the key is held at START, the battery's acid follows its charge and the breaker's button pops when a short heats it, from the sheet's own model.",
  heading: "ELECTRICAL SYSTEM · BP-110 · 3D",
  titleText: "ALTERNATOR, STARTER, BATTERY, BREAKER · HALF-SECTION",
  dwg: "BP-110-3D",
  parts: items.size,
  units: "mm · V · A",
  sheet2d: "electrical.html",
  buttons: `<button type="button" id="start">START</button><button type="button" id="short">SHORT</button>`,
  hint: "DRAG TO ORBIT · K START · B A MASTERS · Z BELT · X SHORT · SPACE TOUR · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-110 · K START · X SHORT",
  aria: "Isometric half-section of a light aircraft's 28 volt electrical system: the alternator cut along its shaft, with its pulley and belt, drive-end and slip-ring-end frames, stator, claw-pole rotor, field winding, slip rings, brushes and bearings; below it the starter cut along its shaft, its Bendix pinion beside an arc of the engine's ring gear; to the right the lead-acid battery cut across its plates, and one push-pull thermal breaker. The tour runs the sheet's model: the master goes on, the key cranks the engine as the pinion screws into the ring gear, the alternator comes on line and turns, its belt breaks, and a short heats the nav light breaker until its button pops out.",
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../fuel-system/model.mjs"), "FS"],
    [join(here, "../wing-flaps/model.mjs"), "WF"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`electrical-3d.html  ${(size / 1024).toFixed(0)} KB  ${items.size} items  (+ three.js from jsDelivr)`);
