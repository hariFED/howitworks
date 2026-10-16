// Builds debounce-3d.html: the door closer of BP-007 as a live 3D technical illustration, from the
// 2D sheet's own model (model.mjs, unchanged) and profiles (parts.mjs, extra.mjs), with kit/solid3d.mjs.
//   node examples/debounce/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const items = SC.parts().filter((p) => typeof p.id === "number").length;

const size = writePage3d(join(here, "debounce-3d.html"), {
  title: "Door Closer 3D",
  description: "The BP-007 overhead door closer as a live isometric half-section: every push swings the door open and restarts the close, and the oil, its density following its pressure, runs back through the two needle valves.",
  heading: "DOOR CLOSER · BP-007 · 3D",
  titleText: "DOOR CLOSER · ISOMETRIC SECTION A-A",
  dwg: "BP-007-3D",
  parts: items,
  units: "mm · bar · s",
  sheet2d: "debounce.html",
  buttons: `<button type="button" id="push">PUSH</button>`,
  hint: "DRAG TO ORBIT · SPACE PUSHES THE DOOR · DRAG THE DOOR · R SHUTS IT · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS · S SLOW",
  live: "LIVE · SAME MODEL AS BP-007 · SPACE PUSHES · DRAG THE DOOR",
  aria: "Isometric half-section of an overhead hydraulic door closer on a slice of its door, with the arm and forearm to the frame. Each push swings the door open and restarts the closing; the spring drives the piston back and the oil, stippled by its pressure, can only return through the two needle valves, so the door shuts at a set pace and latches only after the pushes stop for long enough. Press Space to push the door, drag the door, R shuts it.",
  css: `#ov .flow{fill:none;stroke:var(--bp-accent-ink);stroke-width:2px;stroke-dasharray:5 3.5;stroke-linejoin:round}#ov .flow-head{fill:var(--bp-accent-ink)}`,
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
console.log(`debounce-3d.html  ${(size / 1024).toFixed(0)} KB  ${items} items  (+ three.js from jsDelivr)`);
