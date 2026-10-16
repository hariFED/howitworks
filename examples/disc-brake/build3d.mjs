// Builds disc-brake-3d.html: the hydraulic disc brake of BP-021 as a live 3D technical illustration, the
// lever's master cylinder and the caliper in one half-section, from the 2D sheet's own model (model.mjs,
// unchanged) and profile numbers (parts.mjs), with kit/solid3d.mjs.
//   node examples/disc-brake/build3d.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kitPath, writePage3d } from "../../kit/page.mjs";
import * as SC from "./scene3d.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const parts = SC.parts();

const size = writePage3d(join(here, "disc-brake-3d.html"), {
  title: "Disc Brake 3D",
  description: "The BP-021 bicycle hydraulic disc brake as a live isometric half-section: the lever's master cylinder cut in the plane of the lever, the hose, and the two-piston caliper cut through its pistons with the drilled Ø160 rotor passing whole between the pads; the oil's stipple follows the pressure from the 2D sheet's model.",
  heading: "DISC BRAKE · BP-021 · 3D",
  titleText: "HYDRAULIC DISC BRAKE · HALF-SECTION",
  dwg: "BP-021-3D",
  parts: parts.length,
  units: "mm · bar · N",
  sheet2d: "disc-brake.html",
  buttons: `<button type="button" id="squeeze" aria-pressed="false">SQUEEZE</button>`,
  hint: "DRAG TO ORBIT · DRAG THE LEVER OR SPACE TO SQUEEZE · ↑ ↓ PULL · WHEEL ZOOM · SHIFT-DRAG PAN · E EXPLODE · C CUT · 1–4 VIEWS",
  live: "LIVE · SAME MODEL AS BP-021 · s, FINGER F, OIL p, CLAMP, TORQUE, DECEL",
  aria: "Isometric half-section of a bicycle hydraulic disc brake: the lever and master cylinder cut in the plane of the lever, the hose, and the two-piston caliper cut through its pistons with the rotor between the pads. Drag to orbit, drag the lever or press Space to squeeze; the master piston, the caliper pistons, the pads, the square seals and the oil pressure follow the same model as the 2D sheet.",
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
console.log(`disc-brake-3d.html  ${(size / 1024).toFixed(0)} KB  ${parts.length} parts  (+ three.js r170 from jsDelivr)`);
