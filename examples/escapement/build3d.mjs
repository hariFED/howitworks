// Builds escapement-3d.html: the Swiss lever escapement of BP-004 as a live 3D technical illustration,
// from the 2D sheet's own model (model.mjs, unchanged) and geometry (parts.mjs), with kit/solid3d.mjs.
//   node examples/escapement/build3d.mjs   (after build.mjs, which writes tables.js)
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "escapement-3d.html"), {
  title: "Lever Escapement 3D",
  description: "The BP-004 Swiss lever escapement as a live isometric view of a watch movement: plate, cock, jewel bearings, staff and pallet arbor cut on the line of centres, the escape wheel, pallet fork, balance and hairspring whole, beating from the 2D sheet's own escapement model.",
  heading: "LEVER ESCAPEMENT · BP-004 · 3D",
  titleText: "SWISS LEVER ESCAPEMENT · SECTION ON THE LINE OF CENTRES",
  dwg: "BP-004-3D",
  parts: parts.length,
  units: "mm · deg · ms",
  sheet2d: "escapement.html",
  buttons: `<button type="button" id="pause" aria-pressed="false">PAUSE</button><button type="button" id="restart">RESTART</button>`,
  hint: "DRAG TO ORBIT · DRAG THE BALANCE TO WIND IT, LET GO · ← → KICK · SPACE PAUSE · R RESTART · S SLOWER · WHEEL ZOOM · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-004 · DRAG THE BALANCE",
  aria: "Isometric view of a Swiss lever escapement in a watch movement, the mainplate, balance cock, jewel bearings, balance staff and pallet arbor cut on the line of centres. The balance swings, the fork unlocks a pallet stone, the escape wheel's club tooth gives impulse and drops onto the other stone, from the same model as the 2D sheet. Drag to orbit, drag the balance to wind it up and let go, arrow keys kick it.",
  modules: [
    [join(here, "tables.js"), "T"],
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("solid3d.mjs"), "S"],
    [join(here, "model.mjs"), "M"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "scene3d.mjs"), "SC"],
  ],
  main: readFileSync(join(here, "live3d.js"), "utf8"),
});
console.log(`escapement-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
