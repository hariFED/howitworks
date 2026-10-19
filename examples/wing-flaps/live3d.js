// Page code for wing-flaps-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), M (model.mjs, the sheet's model), X (extra.mjs), P (parts.mjs) and SC (scene3d.mjs).
// It runs the sheet's model and tour (the selector leads, the follow-up switches and limit switches
// decide, the motor turns the screw) and poses the parts from it: the nut and actuating tube slide out,
// the actuator swings on its pin, the bellcrank turns, the rod and cables follow, and the flap with its
// bracket, rollers and lug runs along the track.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.5, look: [-1150, -20, -200], el: 40 } });
const deg = Math.PI / 180;

// ---------------------------------------------------------------- state: the sheet's
let st = M.system(0, 0);
st.v = M.TOUR_V;
let mode = "tour";
let tourT = 0;
let vTarget = M.TOUR_V;
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    mode = "tour";
    const f = M.flapOf(M.sOfNut(st.n));
    tourT = f > 25 ? 13.6 : f > 15 ? 9.8 : f > 5 ? 5.8 : 0;
    vTarget = M.TOUR_V;
  }
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      tourT += h;
      if (tourT >= M.TOUR_PERIOD) tourT -= M.TOUR_PERIOD;
      st.sel = M.selAt(tourT);
    }
    st.v = live.reduced ? vTarget : L.follow(st.v, vTarget, 3, h);
    M.step(st, h);
  }
  return mode === "tour" || st.w > 0 || st.down || st.up || Math.abs(st.v - vTarget) > 0.05;
}

// ---------------------------------------------------------------- poses from the model
const A0 = SC.actAim(M.BETA0);
V.set(23, { pos: SC.ACT_PIN, rot: [0, A0.ry, 0] });
function pose(n, spin = 0) {
  const s = M.sOfNut(n);
  const b = M.betaOf(s);
  // the flap and what it carries
  const fp = SC.flapPose(s);
  for (const id of SC.FLAP_PARTS) V.set(id, fp);
  // the bellcrank turns about its bolt
  V.set(10, { rot: [0, b * deg, 0] });
  // the rod, from the bellcrank's hole R to the lug
  const F = SC.hole3(b, "R", M.ROD_Y);
  const lug = M.lugAt(s);
  const Lg = [-lug[0], lug[1], SC.zOf(M.ROD_W)];
  V.set(9, { pos: F, rot: SC.aim([Lg[0] - F[0], Lg[1] - F[1], Lg[2] - F[2]]).rot });
  // the cables, from holes C1 and C2 toward the port bellcrank's C2 and C1
  const cy = M.BC.y + 5;
  for (const [id, k, kp] of [[12, "C1", "C2"], ["12a", "C2", "C1"]]) {
    const a = SC.hole3(b, k, cy);
    const pm = M.mirror(M.holeOf(b, kp));
    const c = [-pm[0], cy, SC.zOf(pm[1])];
    V.set(id, { pos: a, rot: SC.aim([c[0] - a[0], 0, c[2] - a[2]]).rot });
  }
  // the follow-up cable runs inboard from hole F to the slice's end
  const Fh = SC.hole3(b, "F", cy);
  V.set(13, { pos: Fh, rot: [0, Math.PI / 2, 0] });
  V.solid(13, "fu").scale.x = Math.max(0.05, (Fh[2] - SC.zOf(SC.W_IN)) / 400);
  // the actuator swings on its pin; the nut and actuating tube slide out along it
  const A = SC.actAim(b);
  for (const id of SC.ACT_PARTS) V.set(id, { pos: SC.ACT_PIN, rot: [0, A.ry, 0] });
  for (const id of SC.SLIDE_PARTS) V.set(id, { pos: [SC.ACT_PIN[0] + A.u[0] * n, SC.ACT_PIN[1], SC.ACT_PIN[2] + A.u[2] * n], rot: [0, A.ry, 0] });
  V.solid(17, "screw").rotation.x = spin;
}
V.frame([() => pose(0), () => pose(M.NUT_MAX)]);

const say = L.announcer($("sr"), 2);
function render(live) {
  pose(st.n, st.spin);
  const s = M.sOfNut(st.n);
  const g = M.geometry(s);
  const fl = M.flight(st.v, g.flap);
  const run = st.w > 0 ? (st.dir > 0 ? "DOWN" : "UP") : !st.limDown ? "DOWN LIMIT" : !st.limUp ? "UP LIMIT" : "STOPPED";
  $("readout").textContent = `SEL ${st.sel}° · FLAP ${g.flap.toFixed(1)}° · NUT ${st.n.toFixed(1)} mm · MOTOR ${run} · SLOT ${Math.round(g.gap)} mm · ${Math.round(st.v)} kt · α ${fl.alpha.toFixed(1)}° · V_S ${fl.vs.toFixed(1)} kt`;
  say(`Selector ${st.sel} degrees, flaps ${g.flap.toFixed(0)} degrees, motor ${run.toLowerCase()}, slot gap ${Math.round(g.gap)} millimetres.`, live.clock);
}

// the live dimension: the slot's gap, from the shroud's lip to the flap's nearest point, on the cut
function overlay() {
  const s = M.sOfNut(st.n);
  const g = M.geometry(s);
  if (V.explode > 0.05 || !V.cut || g.gap < 4) return "";
  const pts = P.flapOutlineAt(s);
  let best = pts[0];
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const c = pts[(i + 1) % pts.length];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const t = Math.max(0, Math.min(1, ((M.LIP[0] - a[0]) * dx + (M.LIP[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const p = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - M.LIP[0], p[1] - M.LIP[1]);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return V.dim([-M.LIP[0], M.LIP[1], 0], [-best[0], best[1], 0], { text: `GAP ${Math.round(g.gap)}` });
}

// ---------------------------------------------------------------- controls, as on the sheet
const stops = M.FLAP_STOPS;
function select(f) {
  mode = "hand";
  st.sel = f;
}
V.key("ArrowDown", () => select(stops[Math.min(3, stops.indexOf(st.sel) + 1)]));
V.key("ArrowUp", () => select(stops[Math.max(0, stops.indexOf(st.sel) - 1)]));
V.key("ArrowLeft", () => ((mode = "hand"), (vTarget = Math.max(45, vTarget - 5))));
V.key("ArrowRight", () => ((mode = "hand"), (vTarget = Math.min(110, vTarget + 5))));
V.key(" ", () => {
  mode = "tour";
  tourT = 0;
  st = M.system(0, 0);
  st.v = vTarget = M.TOUR_V;
});
for (const f of stops) $(`f${f}`)?.addEventListener("click", () => (select(f), V.input()));
// drag the flap aft and down to select a setting: the nearest stop to where it is let go
V.drag([4], {
  axis: [-0.85, -0.53, 0],
  length: 160,
  start: () => {
    mode = "hand";
    return st.n / M.NUT_MAX;
  },
  move: (u) => {
    const f = M.flapOf(M.sOfNut(Math.max(0, Math.min(1, u)) * M.NUT_MAX));
    st.sel = stops.reduce((a, x) => (Math.abs(x - f) < Math.abs(a - f) ? x : a), 0);
  },
});

// the page's own self-tests (?selftest=1)
V.test("down arrow selects more flap", ({ key }) => {
  st.sel = 0;
  key("ArrowDown");
  return { pass: st.sel === 10 && mode === "hand", info: [st.sel, mode] };
});
V.test("the motor runs the flaps to the selected stop", () => {
  const t = M.system(20, 0);
  t.v = 60;
  for (let i = 0; i < 480 * 8; i++) M.step(t, 1 / 480);
  const f = M.flapOf(M.sOfNut(t.n));
  return { pass: Math.abs(f - 20) < 1 && t.w === 0, info: [f, t.w] };
});
V.test("the limit switch stops it at 30°", () => {
  const t = M.system(30, 0);
  t.v = 60;
  for (let i = 0; i < 480 * 12; i++) M.step(t, 1 / 480);
  return { pass: !t.limDown && t.w === 0 && Math.abs(M.flapOf(M.sOfNut(t.n)) - 30) < 0.5, info: [t.n, t.limDown] };
});
V.test("the rod keeps its length through the travel", () => {
  let worst = 0;
  for (const n of [0, 40, 80, M.NUT_MAX]) {
    const s = M.sOfNut(n);
    const b = M.betaOf(s);
    const F = SC.hole3(b, "R", M.ROD_Y);
    const l = M.lugAt(s);
    worst = Math.max(worst, Math.abs(Math.hypot(-l[0] - F[0], l[1] - F[1], SC.zOf(M.ROD_W) - F[2]) - M.ROD_L));
  }
  return { pass: worst < 0.5, info: [worst] };
});

V.run({ step, render, overlay, still: 12.6, idleAfter: 8 });
