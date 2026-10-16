// Page code for bottle-jack-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the 2D sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// The kit draws, frames, explodes and labels; this file runs the model exactly as the sheet's live.js
// does (same tour, same 480 Hz substeps, same valve lifts) and poses the parts from it.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene() });

// ---------------------------------------------------------------- state: the 2D sheet's
let loadIx = 0;
const jack = M.jack(M.LOADS[loadIx]);
let x = 0; // plunger stroke: 0 handle up, 1 handle down
let target = 0;
let e = 0; // release needle off its seat, mm
let eWant = 0;
const lifts = { s: 0, d: 0, r: 0 };
let auto = false;
let dragging = false;
let releaseOpen = false;
const E_OPEN = 0.1; // mm: about 36° of the M12×1 release screw

// The tour, as on the sheet: pump twenty strokes, hold, crack the release screw, let the load down.
const PERIOD = 0.9;
const DOWN = 0.5;
const STROKES = 20;
const tour = { t: 0, mode: "pump", modeT: 0 };
const wave = (t) => {
  const phase = (t % PERIOD) / PERIOD;
  return phase < DOWN ? L.ease(phase / DOWN) : 1 - L.ease((phase - DOWN) / (1 - DOWN));
};
function tourStep(h) {
  tour.modeT += h;
  if (tour.mode === "pump") {
    tour.t += h;
    if (tour.t >= STROKES * PERIOD) {
      tour.mode = "hold";
      tour.modeT = 0;
      return 0;
    }
    return wave(tour.t);
  }
  if (tour.mode === "hold" && tour.modeT > 0.8) {
    tour.mode = "lower";
    tour.modeT = 0;
    releaseOpen = true;
  }
  if (tour.mode === "lower" && jack.h <= 0 && tour.modeT > 0.5) {
    tour.mode = "close";
    tour.modeT = 0;
    releaseOpen = false;
  }
  if (tour.mode === "close" && tour.modeT > 0.9) {
    tour.mode = "pump";
    tour.modeT = 0;
    tour.t = 0;
    jack.travel = 0;
  }
  return 0;
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < n; i++) {
    if (driven) {
      if (live.touring) target = tourStep(h);
      else target = wave((tour.t += h));
    }
    x = live.reduced && !driven ? target : L.follow(x, target, driven ? 40 : 18, h);
    x = Math.min(1, Math.max(0, x));
    eWant = releaseOpen ? E_OPEN : 0;
    e = live.reduced ? eWant : L.follow(e, eWant, 10, h);
    jack.e = e < 0.002 ? 0 : e;
    M.advance(jack, x, h);
    lifts.s = L.follow(lifts.s, jack.suction ? M.BALL_LIFT : 0, jack.suction ? 50 : 25, h);
    lifts.d = L.follow(lifts.d, jack.delivering ? M.BALL_LIFT : 0, jack.delivering ? 50 : 25, h);
    lifts.r = L.follow(lifts.r, jack.relief ? 0.6 : 0, 40, h);
  }
  return Math.abs(x - target) > 1e-4 || Math.abs(e - eWant) > 1e-4 || jack.lowering || lifts.s + lifts.d + lifts.r > 1e-3;
}

// ---------------------------------------------------------------- poses from the model
const RAM = [5, 6, 8, 9];
const [P0x, P0y] = SC.REST.P0;
const [F0x, F0y] = SC.REST.F0;
const [BU, BV] = M.LINK_B;
const pins = V.part(19).holders;
const oil13 = V.part(13).holders;
for (const hd of oil13) hd.mesh.frustumCulled = false;
// the oil is seen through the cut against the tubes round it: its balloon's leader counts them as its own
for (const id of [2, 3]) for (const ed of V.part(id).edges) V.part(13).edges.add(ed);
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

function pose(xs, hh, ex = 0) {
  for (const id of RAM) V.set(id, { pos: [0, hh, 0] });
  V.set(14, { pos: [0, -M.PUMP_STROKE * xs, 0] });
  const { P: Pp, F, angle } = M.socketPose(xs);
  const sp = [Pp[0] - P0x, Pp[1] - P0y, 0];
  const rot = ((angle * Math.PI) / 180) * (1 - ex); // exploded, the socket comes off level
  V.set(17, { pos: sp, rot: [0, 0, rot] });
  V.set(18, { pos: sp, rot: [0, 0, rot] });
  V.set(16, { rot: [0, 0, -Math.atan2(F[0] - BU, F[1] - BV)] });
  // the fulcrum and plunger pins ride with the socket, exploded or not (part 19 adds JOG·ex itself)
  const pos = mix(sp, SC.SOCKET_TO, ex);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const fx = P0x + pos[0] + (F0x - P0x) * c - (F0y - P0y) * s;
  const fy = P0y + pos[1] + (F0x - P0x) * s + (F0y - P0y) * c;
  pins[1].inner.position.set(fx - F0x - SC.JOG * ex, fy - F0y, 0);
  pins[2].inner.position.set(pos[0] - SC.JOG * ex, pos[1], 0);
}
V.frame([() => pose(0, 0), () => pose(1, M.LIFT_MAX)]); // the whole stroke and the whole lift

const tint = (bar) => 0.15 + 0.85 * Math.min(1, Math.max(0, bar / M.P_RELIEF));
function render(live) {
  const hh = jack.h;
  const ex = V.explode;
  pose(x, hh, ex);
  V.set(20, { pos: [0, lifts.s, 0] });
  V.set(21, { pos: [-lifts.d, 0, 0] });
  V.set(24, { pos: [0, lifts.r, 0] });
  V.set(27, { pos: [-e, 0, 0] });
  V.set(28, { pos: [-e, 0, 0] });
  V.solid(23, "spring").scale.x = (SC.SPRING_D0 - lifts.d) / SC.SPRING_D0;
  V.solid(25, "spring").scale.y = (SC.SPRING_R0 - lifts.r) / SC.SPRING_R0;
  // the oil: the accent is pressure. Ram side at p, pump side at pp, the reservoir faint.
  const tr = tint(jack.p);
  const tp = tint(jack.pp);
  for (const f of SC.RAM_SIDE) V.fluid(f, { density: tr, wash: 0.04 + 0.16 * tr });
  for (const f of SC.PUMP_SIDE) V.fluid(f, { density: tp, wash: 0.04 + 0.16 * tp });
  V.fluid("ram", { stretch: hh });
  V.fluid("chamber", { stretch: -M.PUMP_STROKE * x });
  const show = ex < 0.01;
  oil13.forEach((hd, k) => {
    hd.holder.visible = show;
    const u = hd.mesh.material.uniforms;
    // while the load comes down, the oil leaving through the release seat is still under pressure
    const hot = SC.OIL13[k] === "relbore" && jack.lowering;
    u.uDensity.value = hot ? tr : 0.13;
    u.uWash.value = hot ? 0.04 + 0.16 * tr : 0.03;
  });
  oil13[0].mesh.material.uniforms.uLift.value = M.levelAt(hh) - M.OIL_LEVEL;

  const N = M.strokes(jack);
  const need = M.pressureFor(jack.load);
  const state = jack.lowering ? "LOWERING" : jack.relief ? "RELIEF OPEN" : jack.delivering ? "LIFTING" : releaseOpen ? "RELEASE OPEN" : "HOLDING";
  const hand = Math.round(M.handleForce(Math.min(need, M.P_RELIEF)));
  const kN = ((jack.load * M.G) / 1000).toFixed(1);
  $("readout").textContent = `h ${hh.toFixed(1)} mm · N ${N.toFixed(1)} · p ${Math.round(jack.p)} bar · ${hand} N → ${kN} kN · ${state}`;
  say(`Ram lift ${hh.toFixed(0)} millimetres after ${N.toFixed(0)} strokes, ${Math.round(jack.p)} bar, ${hand} newtons on the handle hold ${jack.load} kilograms. ${state.toLowerCase()}.`, live.clock);
  $("pump")?.setAttribute("aria-pressed", String(auto));
  $("release")?.setAttribute("aria-pressed", String(releaseOpen));
}
const say = L.announcer($("sr"), 2);

// the live lift, beside the saddle, while assembled (as on the sheet)
function overlay() {
  if (V.explode > 0.05 || jack.h < 0.5) return "";
  return V.dim([17, M.CLOSED_H, 0], [17, M.CLOSED_H + jack.h, 0], { text: `h=${jack.h.toFixed(1)}`, off: 30 });
}

// ---------------------------------------------------------------- the jack's controls
// drag the handle down: the value is the stroke, the grip travels GRIP_TRAVEL mm over it
V.drag([17, 18], {
  axis: [0, -1, 0],
  length: SC.GRIP_TRAVEL,
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
V.key("ArrowDown", stroke(0.25));
V.key("ArrowUp", stroke(-0.25));
V.key("Home", () => ((target = 0), (auto = false)));
V.key("End", () => ((target = 1), (auto = false)));
V.key(" ", () => (auto = !auto));
V.key("o", () => (releaseOpen = !releaseOpen));
V.key("l", () => (jack.load = M.LOADS[(loadIx = (loadIx + 1) % M.LOADS.length)]));
$("pump")?.addEventListener("click", () => {
  auto = !auto;
  V.input();
});
$("release")?.addEventListener("click", () => {
  releaseOpen = !releaseOpen;
  V.input();
});

// the jack's own self-tests (?selftest=1)
V.test("handle drag pumps", ({ ptr, project }) => {
  const g = project([...P.onSocket(x, SC.GRIP), 0]);
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
V.test("O opens the release valve", ({ key }) => {
  const a = releaseOpen;
  key("o");
  const b = releaseOpen;
  key("o");
  return { pass: a !== b && releaseOpen === a, info: [a, b] };
});

V.run({ step, render, overlay, still: 9.45 });
