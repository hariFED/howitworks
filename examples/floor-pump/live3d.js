// Page code for floor-pump-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit does the drawing, the camera, explode, balloons and the controls; this file runs the
// model, poses the moving parts from it, and adds the pump's own controls.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's, from the same model
const air = M.pump();
let x = 0; // stroke: 0 handle up, 1 at the bottom
let target = 0;
let fold = 0; // the cup lip folding in on the upstroke, mm
let lift = 0; // the ball off its seat, mm
let needle = M.START_GAUGE;
let auto = false;
let dragging = false;

// The tour, as on the sheet: pump at a steady rate, let the tyre down when it is hard, start again.
const PERIOD = 1.8;
const DOWN = 0.56;
const tour = { t: 0, cycle: 0, mode: "pump", modeT: 0, from: 0 };
function tourTarget(h) {
  tour.modeT += h;
  if (tour.mode === "pump") {
    tour.t += h;
    const cycle = Math.floor(tour.t / PERIOD);
    if (cycle !== tour.cycle) {
      tour.cycle = cycle;
      if (M.gauge(air.pt) >= M.RESET_GAUGE) {
        tour.mode = "hold";
        tour.modeT = 0;
        return 0;
      }
    }
    const phase = (tour.t % PERIOD) / PERIOD;
    return phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
  }
  if (tour.mode === "hold" && tour.modeT > 1.4) {
    tour.mode = "deflate";
    tour.modeT = 0;
    tour.from = M.gauge(air.pt);
  }
  if (tour.mode === "deflate") {
    const k = Math.min(1, tour.modeT / 1.8);
    M.setTyre(air, tour.from + (M.START_GAUGE - tour.from) * L.ease(k));
    if (k >= 1) {
      air.strokes = 0;
      tour.mode = "pump";
      tour.modeT = 0;
      tour.t = 0;
      tour.cycle = 0;
    }
  }
  return 0;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) target = tourTarget(h);
    x = live.reduced && !driven ? target : L.follow(x, target, driven ? 30 : 18, h);
    x = Math.min(1, Math.max(0, x));
    M.advance(air, x);
    lift = L.follow(lift, air.open ? M.BALL_LIFT : 0, air.open ? 60 : 22, h);
    fold = L.follow(fold, air.intake ? 1.2 : 0, 26, h);
    needle = L.follow(needle, M.gauge(air.pt), 10, h);
  }
  return Math.abs(x - target) > 1e-4 || lift > 1e-3 || fold > 1e-3 || Math.abs(needle - M.gauge(air.pt)) > 1e-3;
}

// ---------------------------------------------------------------- poses from the model
const MOVING = [8, 9, 10, 11, 12, 13, 14, 15, 16];
function pose(xs) {
  const up = M.STROKE * (1 - xs); // parts are built at the bottom of the stroke
  for (const id of MOVING) V.set(id, { pos: [0, up, 0] });
}
V.frame([() => pose(0), () => pose(1)]); // frame the whole stroke, so the zoom never pumps

let shownFold = 0;
const tint = (p) => 0.18 + 0.82 * Math.min(1, Math.max(0, M.gauge(p) / 7));
function render(live) {
  pose(x);
  V.set(17, { pos: [P.ballU(lift) - P.ballU(0), 0, 0] });
  V.solid(18, "spring").scale.x = (66 - (P.ballU(lift) + M.BALL_D / 2)) / SC.SPRING_LEN;
  V.solid(21, "needle").rotation.y = (P.needleAngle(needle) * Math.PI) / 180;
  if (Math.abs(fold - shownFold) > 0.01) {
    V.reshape(10, "cup", { loop: P.cupLoop(SC.REST.VP, fold) });
    shownFold = fold;
  }
  for (const f of SC.CHAMBER) V.fluid(f, { density: tint(air.p), wash: 0.05 + 0.1 * tint(air.p) });
  for (const f of SC.TYRE) V.fluid(f, { density: tint(air.pt), wash: 0.05 + 0.1 * tint(air.pt) });
  V.fluid("chamber", { stretch: M.STROKE * (1 - x) });
  const travel = M.STROKE * x;
  const g = M.gauge(air.p);
  $("readout").textContent = `s ${Math.round(travel)} mm · CHAMBER ${g.toFixed(2)} bar · TYRE ${M.gauge(air.pt).toFixed(2)} bar · F ${Math.round(M.force(air.p))} N · VALVE ${air.open ? "OPEN" : "SHUT"}`;
  say(`Travel ${Math.round(travel)} millimetres, chamber ${g.toFixed(1)} bar, tyre ${M.gauge(air.pt).toFixed(1)} bar, handle force ${Math.round(M.force(air.p))} newtons.`, live.clock);
  $("pump")?.setAttribute("aria-pressed", String(auto));
}
const say = L.announcer($("sr"), 2);

// the live stroke dimension beside the handle's right end, while assembled (as on the sheet)
function overlay() {
  if (V.explode > 0.05) return "";
  const top = P.handleCentre(M.pistonV(0));
  const travel = M.STROKE * x;
  return V.dim([140, top, 0], [140, top - travel, 0], { text: `s=${Math.round(travel)}` });
}

// ---------------------------------------------------------------- the pump's controls
// drag the handle: the value is the stroke, which grows as the handle moves down (-y) 350 mm
V.drag([13, 14, 15, 16], {
  axis: [0, -1, 0],
  length: M.STROKE,
  start: () => {
    dragging = true;
    auto = false;
    target = x;
    return x;
  },
  move: (v) => (target = Math.min(1, Math.max(0, v))),
  end: () => (dragging = false),
});
const stroke = (d) => () => {
  target = Math.min(1, Math.max(0, target + d));
  auto = false;
};
V.key("ArrowDown", stroke(0.1));
V.key("ArrowUp", stroke(-0.1));
V.key("Home", () => ((target = 0), (auto = false)));
V.key("End", () => ((target = 1), (auto = false)));
V.key(" ", () => (auto = !auto));
V.key("r", () => {
  M.setTyre(air, M.START_GAUGE);
  air.strokes = 0;
});
$("pump")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});

// the pump's own self-tests (?selftest=1): grab the right grip and pull it down; Space pumps
V.test("handle drag pumps", ({ ptr, project }) => {
  const g = project([80, P.handleCentre(M.pistonV(x)), 0]);
  const t0 = target;
  ptr("pointerdown", g[0], g[1]);
  ptr("pointermove", g[0], g[1] + 120);
  const t1 = target;
  ptr("pointerup", g[0], g[1] + 120);
  return { pass: t1 > t0 + 0.1, info: [t0, t1] };
});
V.test("space toggles pumping", ({ key }) => {
  const a = auto;
  key(" ");
  const b = auto;
  key(" ");
  return { pass: a !== b, info: [a, b] };
});

V.run({ step, render, overlay, still: 9 });
