// Page code for trim-tab-3d.html (an ES module). Inlined above it: K, L, S (kit), A, N, FC (the
// aircraft's, nose gear's and flight controls' models), X (BP-106's helpers), M (model), P (parts) and
// SC (scene3d). It runs the sheet's model and tour and poses the parts from it: the drum and screw turn,
// the nut slides, the rod follows from the nut's pin to the horn's, the tab, horn and hinge leaf turn.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.25, look: [165, -10, 0], roll: -30 } });
const deg = Math.PI / 180;

let st = M.state();
let dragging = false;
function step(dt, live) {
  if (live.touring && st.mode !== "tour" && !dragging) st = M.state();
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) M.step(st, h);
  return st.mode === "tour" || st.fail || Math.abs(st.v - st.vT) > 0.05 || Math.abs(st.set - st.tabT) > 0.01;
}

function pose(sol) {
  const spin = sol.screw * 2 * Math.PI;
  V.set(8, { rot: [spin, 0, 0] });
  V.set(7, { rot: [spin, 0, 0] });
  V.set(9, { pos: [-sol.nut, 0, 0] });
  const e = P.rodEnds(sol);
  V.set(14, { pos: [e.a[0], e.a[1], 0], rot: [0, 0, Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0])] });
  const r = [0, 0, -sol.tab * deg];
  V.set(15, { rot: r });
  V.set(17, { rot: r });
  V.solid(16, "leaf").rotation.z = r[2];
  V.set(5, { pos: [P.strands(sol.screw).top[0] - SC.REST.strand, 0, 0] });
}
const at = (tab) => () => pose(M.solve({ ...M.state(), set: tab, tab }));
V.frame([at(M.TAB_LIMITS[0]), at(M.TAB_LIMITS[1])]);

const say = L.announcer($("sr"), 2);
function render(live) {
  const sol = M.solve(st);
  pose(sol);
  const F = sol.F;
  const force = Math.abs(F) < 0.5 ? "NO FORCE" : `${F > 0 ? "PULL" : "PUSH"} ${Math.abs(F).toFixed(1)} N`;
  $("readout").textContent = sol.fail
    ? `${M.phase(st)} · ${Math.round(sol.v)} kt · TAB ${sol.tab.toFixed(1)}° · NOTHING HOLDS IT · SHOWN AT ${M.FLUTTER_HZ_SHOWN} Hz`
    : `${M.phase(st)} · ${Math.round(sol.v)} kt · TAB ${sol.tab >= 0 ? "+" : ""}${sol.tab.toFixed(1)}° · ELEV ${sol.de.toFixed(1)}° · ${force} · WHEEL ${sol.turns.toFixed(2)} T · NUT ${sol.nut.toFixed(1)} mm`;
  say(`${M.phase(st).toLowerCase()}, ${Math.round(sol.v)} knots, tab ${sol.tab.toFixed(0)} degrees, ${force.toLowerCase()}.`, live.clock);
}
// the live dimension: the nut's travel from neutral, on the cut
function overlay() {
  const sol = M.solve(st);
  if (V.explode > 0.05 || !V.cut || Math.abs(sol.nut) < 2) return "";
  const c0 = P.nutC(0);
  const c = P.nutC(sol.nut);
  return V.dim([c0, P.AXV + P.NUT.r, 0], [c, P.AXV + P.NUT.r, 0], { text: `NUT ${sol.nut > 0 ? "−" : "+"}${Math.abs(sol.nut).toFixed(1)}` });
}

// ---------------------------------------------------------------- controls, as on the sheet
function toHand() {
  if (st.mode === "tour") {
    st.mode = "hand";
    st.vT = st.v;
    st.tabT = st.set;
    st.fail = false;
  }
}
function trim(dir) {
  toHand();
  const turns = M.trimWheelTurns(st.tabT) + dir * 0.25;
  let lo = M.TAB_LIMITS[0];
  let hi = M.TAB_LIMITS[1];
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (M.trimWheelTurns(m) < turns) lo = m;
    else hi = m;
  }
  st.tabT = (lo + hi) / 2;
}
V.key("t", () => trim(1));
V.key("T", () => trim(1));
V.key("g", () => trim(-1));
V.key("G", () => trim(-1));
V.key("ArrowLeft", () => (toHand(), (st.vT = Math.max(55, st.vT - 5))));
V.key("ArrowRight", () => (toHand(), (st.vT = Math.min(140, st.vT + 5))));
V.key("f", () => (toHand(), (st.fail = !st.fail), (st.amp = 0)));
V.key("F", () => (toHand(), (st.fail = !st.fail), (st.amp = 0)));
V.key(" ", () => (st = M.state()));
$("tour")?.addEventListener("click", () => ((st = M.state()), V.input()));
// drag the tab's trailing edge down for nose-up trim: the wheel follows (the screw is irreversible, so
// in the aeroplane this is the wheel's work; here the drag stands for it)
const span = M.TAB_LIMITS[1] - M.TAB_LIMITS[0];
V.drag([17], {
  axis: [0, -1, 0],
  length: 30,
  start: () => {
    toHand();
    dragging = true;
    return (st.set - M.TAB_LIMITS[0]) / span;
  },
  move: (u) => {
    st.tabT = M.TAB_LIMITS[0] + Math.max(0, Math.min(1, u)) * span;
  },
  end: () => (dragging = false),
});

V.test("T trims nose up: the tab goes down", ({ key }) => {
  st = M.state();
  st.mode = "hand";
  st.tabT = st.set;
  const t0 = st.tabT;
  key("t");
  return { pass: st.tabT > t0 + 1, info: [t0, st.tabT] };
});
V.test("trimmed at 65 kt the stick force is zero", () => {
  const t = M.state();
  for (let i = 0; i < 480 * 13; i++) M.step(t, 1 / 480);
  const s = M.solve(t);
  return { pass: Math.abs(s.F) < 0.2 && Math.abs(s.float - s.de) < 0.05, info: [s.F, s.float, s.de] };
});
V.test("the screw holds: the air load cannot back-drive it", () => {
  const s = M.solve(M.state());
  return { pass: M.SELF_LOCKING && s.tq.back < 0, info: [M.LEAD_ANGLE, M.FRICTION_ANGLE, s.tq.back] };
});
V.test("the nut lands on the stops at the tab's limits", () => {
  const c1 = P.nutC(M.nutFor(M.TAB_LIMITS[1])) - P.NUT.lug;
  const c0 = P.nutC(M.nutFor(M.TAB_LIMITS[0])) + P.NUT.lug;
  return { pass: Math.abs(c1 - P.STOPS.f[1]) < 1e-6 && Math.abs(c0 - P.STOPS.a[0]) < 1e-6, info: [c1, c0] };
});

V.run({ step, render, overlay, still: 13, idleAfter: 8 });
