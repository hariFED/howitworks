// Builds flight-controls.html: a live A2 drawing of the cable-and-pushrod primary flight controls of the
// four-seat high-wing light aircraft (BP-022): a pictorial of every control run inside the airframe and
// the cockpit enlarged (Detail E), the right aileron's differential horn in Section A-A, a pulley and its
// cable guard, a turnbuckle, the elevator, its trim tab and the jackscrew actuator in Section D-D, the
// ailerons against the wheel and the stick force against airspeed. Everything moves from model.mjs, which
// takes the surfaces' limits, the trimmed elevator and the roll from the aircraft's own model.
//   node examples/flight-controls/build.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "../../kit/draft.mjs";
import { kitPath, writePage } from "../../kit/page.mjs";
import * as M from "./model.mjs";
import * as P from "./parts.mjs";
import * as D from "./details.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T0 = Number(process.env.FC_T ?? 0); // the moment the static drawing shows (the page redraws it)

// ---------------------------------------------------------------- the state drawn at build time
const st = M.state();
for (let t = 0; t < T0; t += 1 / 240) M.tourStep(st, 1 / 240);
const sol = M.solve(st);
const ps = M.pose(sol);
const planes = P.pulleyPlanes();

// ---------------------------------------------------------------- the sheet
const defs = `<defs>${K.hatchDefs()}<pattern id="grid" patternUnits="userSpaceOnUse" width="10" height="10"><path class="grid" d="M10 0H0V10"/></pattern>${D.defs()}</defs>`;
const E = D.BOX.E;
const hit = `<rect class="hit" data-drag="wheel" x="${E.x + 60}" y="${E.y + 40}" width="${E.w - 120}" height="${E.h - 80}"/>`;
const svg =
  `<svg class="bp-sheet" viewBox="0 0 ${K.SHEET.w} ${K.SHEET.h}" role="img" tabindex="0" ` +
  `aria-label="Engineering drawing of the cable-and-pushrod primary flight controls of a four-seat high-wing light aircraft: a pictorial of every control run inside the airframe drawn in phantom, the cockpit enlarged, the right aileron's differential horn in section, a pulley with its cable guard, a turnbuckle, and the elevator with its trim tab and jackscrew actuator in section. The tour checks the controls on the ground, full travel each way, then flies: it slows down and the pull builds, the trim tab winds down until the pull is gone, a turn with coordinated rudder, and back to cruise. The left and right arrows turn the wheel, up and down push and pull the column, Z and X work the pedals, T and G trim nose up and down." ` +
  `data-views='${JSON.stringify(D.VIEWS)}'>` +
  defs +
  `<rect class="sheet-bg" width="${K.SHEET.w}" height="${K.SHEET.h}"/><rect fill="url(#grid)" width="${K.SHEET.w}" height="${K.SHEET.h}"/>` +
  K.frame() +
  D.sheet(sol, ps, planes) +
  hit +
  `</svg>`;

const bar =
  `<span><kbd>←</kbd> <kbd>→</kbd> wheel · <kbd>↑</kbd> <kbd>↓</kbd> column · <kbd>Z</kbd> <kbd>X</kbd> pedals · <kbd>T</kbd> <kbd>G</kbd> trim · drag the cockpit · <kbd>Space</kbd> tour · <kbd>S</kbd> slow</span>` +
  `<span class="bp-themes" role="group" aria-label="Theme"><button type="button" data-theme-pick="blueprint">blueprint</button><button type="button" data-theme-pick="paper">paper</button><button type="button" data-theme-pick="dark">dark</button></span>` +
  `<span id="sr" class="bp-sr" aria-live="polite"></span>`;
const css =
  `.bp-sheet .cable{fill:none;stroke:var(--bp-accent);stroke-width:1.15px;stroke-linejoin:round;stroke-linecap:round}` +
  `.bp-sheet .grid-line{stroke:var(--bp-grid);stroke-width:.6px}.bp-sheet .hit{fill:transparent}.bp-sheet [data-drag]{cursor:grab}`;
const size = writePage(join(here, "flight-controls.html"), {
  title: "Primary Flight Controls",
  description: "A live engineering drawing of a light aircraft's cable-and-pushrod flight controls: the wheel, column, chain, cables, pulleys, bellcranks, rods and surfaces move from one model, with the differential aileron horn, the pulley guard, a turnbuckle and the trim tab's jackscrew in section, and the stick force falling to zero as the tab is trimmed.",
  svg,
  bar,
  css,
  modules: [
    [kitPath("draft.mjs"), "K"],
    [kitPath("live.mjs"), "L"],
    [kitPath("selfcheck.mjs"), "C"],
    [join(here, "../light-aircraft/model.mjs"), "A"],
    [join(here, "../nose-gear/model.mjs"), "N"],
    [join(here, "model.mjs"), "M"],
    [join(here, "extra.mjs"), "X"],
    [join(here, "parts.mjs"), "P"],
    [join(here, "details.mjs"), "D"],
  ],
  main: readFileSync(join(here, "live.js"), "utf8"),
});
console.log(`flight-controls.html  ${(size / 1024).toFixed(0)} KB  ψ0 ${M.PSI0.toFixed(2)}°  wheel ±${M.WHEEL_MAX.toFixed(1)}°  column +${M.X_PULL.toFixed(0)}/${M.X_PUSH.toFixed(0)}  trim ${M.trimmed(110).tab.toFixed(1)}° at 110 kt, ${M.trimmed(65).tab.toFixed(1)}° at 65 kt`);
