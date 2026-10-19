// Page code for flight-controls-3d.html (an ES module). Inlined above it: K (kit/draft.mjs), L (kit/live.mjs),
// S (kit/solid3d.mjs), A (the aircraft's model), N (the nose gear's), M (model.mjs, the sheet's model),
// X, P, D (the sheet's drawing modules, for the shared geometry) and SC (scene3d.mjs). It runs the sheet's
// tour and controls on the same state, then poses every part from M.solve and M.pose: the wheels turn and
// slide, the sprockets turn, the idler and the bellcranks swing, the rods follow their ends, the surfaces
// and the tab turn on their hinges, the pedals rock and the turnbuckles ride the cables.

const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;
const U = SC.UNIT;
// the page opens on the half the cut leaves standing: from aft of the starboard beam, through the cut
const V = S.create({ scene: SC.scene(), start: { az: -40, el: 28, zoom: 1.6, look: SC.sp3([2700, -1900, 1500]) } });
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state: the sheet's, from the same model
let s = M.state();
let auto = false;
let free = false;
let dragging = false;
const want = { wheel: 0, x: 0, y: 0, tab: s.tab };
function freeStep(h, reduced) {
  const k = reduced ? 1 : Math.min(1, 9 * h);
  s.wheel += (want.wheel - s.wheel) * k;
  s.x += (want.x - s.x) * k;
  s.y += (want.y - s.y) * k;
  const dt = want.tab - s.tab;
  s.tab += Math.sign(dt) * Math.min(Math.abs(dt), reduced ? 99 : 4 * h);
  if (s.air) {
    const r = M.roll(s.wheel);
    const da = s.wheel >= 0 ? r.right : -r.left;
    s.p += (A.rollRate(da, s.v) - s.p) * Math.min(1, 4 * h);
    s.phi = Math.max(-60, Math.min(60, s.phi + s.p * h));
  }
}
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  if ((live.touring || auto) && free && !dragging) {
    free = false;
    s = M.state();
  }
  for (let i = 0; i < n; i++) {
    if (free) freeStep(h, live.reduced);
    else M.tourStep(s, h);
  }
  return true;
}

// ---------------------------------------------------------------- poses from the model
const v3 = (p) => SC.sp3(p); // an (FS, BL, WL) point in scene units
const dv = (a, b) => [b[0] - a[0], b[1] - b[1] + (b[1] - a[1]), b[2] - a[2]];
// the Euler turn (about y, then z) that carries a rod's rest direction d0 onto d1, both scene vectors
function turnOf(d0, d1) {
  const ang = (d) => {
    const l = Math.hypot(...d);
    return [Math.atan2(d[2], -d[0]), -Math.asin(d[1] / l)];
  };
  const [y0, z0] = ang(d0);
  const [y1, z1] = ang(d1);
  return [0, y1 - y0, z1 - z0];
}
// pose a rigid rod part whose ends are now a, b (aircraft frame), built from a0 to b0
function poseRod(id, a0, b0, a, b) {
  const A0 = v3(a0);
  const A1 = v3(a);
  V.set(id, { pos: [A1[0] - A0[0], A1[1] - A0[1], A1[2] - A0[2]], rot: turnOf(dv(A0, v3(b0)), dv(A1, v3(b))) });
}
const TPL = A.TAILPLANE;
const EH = [TPL.hinge, 0, TPL.wl];
const elv = (p, de) => M.rotAbout(p, EH, [0, 1, 0], de);
function pose(st) {
  const sol = M.solve(st);
  const ps = M.pose(sol);
  const { r, pt, yw } = sol;
  // wheels and columns slide by x and the wheels turn (about the column: scene +x)
  V.set(1, { pos: [-pt.x * U, 0, 0] });
  V.set(2, { pos: [-pt.x * U, 0, 0] });
  for (const k of ["wL", "wR"]) V.solid(1, k).rotation.x = r.theta * rad;
  for (const k of ["sL", "sR"]) V.solid(4, k).rotation.x = r.theta * rad;
  // push tubes: from the collar's lug to the idler's arm
  poseRod(14, [M.COLUMN.collar, -M.COLUMN.lug, M.WHEEL.wl], [M.IDLER.fs, -M.COLUMN.lug, M.WHEEL.wl], [M.COLUMN.collar + pt.x, -M.COLUMN.lug, M.WHEEL.wl], ps.idler.rodL);
  V.set(15, { rot: [0, 0, pt.phi * rad] });
  // wing bellcranks, rods, ailerons (TE up is a negative turn about +z here)
  for (const k of ["bL", "bR"]) V.solid(11, k).rotation.y = r.beta * rad;
  const rodL = SC.SURF["rod-1"];
  const rodR = SC.SURF.rod1;
  poseRod(12, rodL.a, rodL.b, ps.bcL.rod, P.hornTip(-1, r.left).t);
  poseRod("12b", rodR.a, rodR.b, ps.bcR.rod, P.hornTip(1, r.right).t);
  V.set(13, { rot: [0, 0, -r.left * rad] });
  V.set("13b", { rot: [0, 0, -r.right * rad] });
  // elevator, its bellcrank and the actuator turn on the hinge; the tab on its own hinge besides
  for (const id of [17, 19, 27]) V.set(id, { rot: [0, 0, pt.de * rad] });
  const tabH = [M.TAB.fs, 0, TPL.wl];
  const t1 = v3(elv(tabH, pt.de));
  const t0 = v3(tabH);
  V.set(29, { pos: [t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2]], rot: [0, 0, (pt.de + sol.tab) * rad] });
  const nut = elv([TPL.hinge + M.ACT.u + M.ACT.len - M.nutFor(sol.tab), M.ACT.bl, TPL.wl + M.ACT.v], pt.de);
  const horn = elv(M.rotAbout([M.TAB.fs, M.ACT.bl, TPL.wl - M.TAB_HORN], [M.TAB.fs, M.ACT.bl, TPL.wl], [0, 1, 0], sol.tab), pt.de);
  poseRod(28, SC.SURF.trimRod.a, SC.SURF.trimRod.b, nut, horn);
  // rudder and its horn (TE to starboard: a positive turn about +y)
  V.set(22, { rot: [0, yw.dr * rad, 0] });
  V.set(23, { rot: [0, yw.dr * rad, 0] });
  // pedals: the right ones forward (a negative turn about +z), the left ones back
  const g = Math.asin(yw.y / M.PED_PAD);
  for (const k of ["pLR", "pRR", "aR"]) V.solid(20, k).rotation.z = -g;
  for (const k of ["pLL", "pRL", "aL"]) V.solid(20, k).rotation.z = g;
  // trim wheel: nose up rolls its top aft
  V.solid(25, "wheel").rotation.z = sol.trimTurns * 2 * Math.PI;
  // turnbuckles ride the elevator cables
  for (const [j, id] of [[0, 10], [1, "10b"]]) {
    const tb = SC.SURF["tb" + j];
    const t = j ? -pt.s : pt.s;
    const d = v3(M.V3.mul(tb.dir, -t));
    V.set(id, { pos: d });
  }
  return sol;
}
V.frame([() => pose(M.state())]);

function render(live) {
  const sol = pose(s);
  const r = sol.r;
  const f1 = (v) => (Math.abs(v) < 0.05 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`);
  const ail = `R${r.right >= 0 ? "↑" : "↓"}${Math.abs(r.right).toFixed(1)} L${r.left >= 0 ? "↑" : "↓"}${Math.abs(r.left).toFixed(1)}`;
  $("readout").textContent = s.air
    ? `${Math.round(s.v)} kt · δe ${f1(sol.pt.de)} · ${ail} · δr ${f1(sol.yw.dr)} · TAB ${f1(s.tab)} · ${sol.F >= 0 ? "PULL" : "PUSH"} ${Math.abs(sol.F).toFixed(0)} N`
    : `GROUND · θ ${f1(r.theta)} · ${ail} · δe ${f1(sol.pt.de)} · δr ${f1(sol.yw.dr)}`;
  say(
    s.air
      ? `${Math.round(s.v)} knots, elevator ${sol.pt.de.toFixed(1)} degrees, ailerons right ${r.right.toFixed(1)} left ${r.left.toFixed(1)}, rudder ${sol.yw.dr.toFixed(1)}, tab ${s.tab.toFixed(1)}, stick force ${Math.round(sol.F)} newtons.`
      : `On the ground: wheel ${Math.round(r.theta)} degrees, ailerons right ${r.right.toFixed(1)} left ${r.left.toFixed(1)}, elevator ${sol.pt.de.toFixed(1)}, rudder ${sol.yw.dr.toFixed(1)} degrees.`,
    live.clock,
  );
  $("tour")?.setAttribute("aria-pressed", String(auto));
}

// ---------------------------------------------------------------- the controls, as on the sheet
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function hold() {
  auto = false;
  if (!free) {
    free = true;
    Object.assign(want, { wheel: s.wheel, x: s.x, y: s.y, tab: s.tab });
  }
}
const act = (f) => () => (hold(), f());
V.key("ArrowLeft", act(() => (want.wheel = clamp(want.wheel - 10, -M.WHEEL_MAX, M.WHEEL_MAX))));
V.key("ArrowRight", act(() => (want.wheel = clamp(want.wheel + 10, -M.WHEEL_MAX, M.WHEEL_MAX))));
V.key("ArrowUp", act(() => (want.x = clamp(want.x - 15, M.X_PUSH, M.X_PULL))));
V.key("ArrowDown", act(() => (want.x = clamp(want.x + 15, M.X_PUSH, M.X_PULL))));
V.key("z", act(() => (want.y = clamp(want.y - 15, -M.PED_MAX, M.PED_MAX))));
V.key("x", act(() => (want.y = clamp(want.y + 15, -M.PED_MAX, M.PED_MAX))));
V.key("t", act(() => (want.tab = clamp(want.tab + 1, M.TAB_LIMITS[0], M.TAB_LIMITS[1]))));
V.key("g", act(() => (want.tab = clamp(want.tab - 1, M.TAB_LIMITS[0], M.TAB_LIMITS[1]))));
const tour = () => {
  free = false;
  auto = true;
  s = M.state();
};
V.key(" ", tour);
$("tour")?.addEventListener("click", () => (tour(), V.input()));
// drag the port aileron up or down: the wheel; drag the elevator: the column
V.drag([13], {
  axis: [0, 1, 0],
  length: 120,
  start: () => {
    dragging = true;
    hold();
    return 0.5 + want.wheel / (2 * M.WHEEL_MAX);
  },
  move: (u) => (want.wheel = clamp((u - 0.5) * 2 * M.WHEEL_MAX, -M.WHEEL_MAX, M.WHEEL_MAX)),
  end: () => (dragging = false),
});
V.drag([19], {
  axis: [0, 1, 0],
  length: 120,
  start: () => {
    dragging = true;
    hold();
    return (want.x - M.X_PUSH) / (M.X_PULL - M.X_PUSH);
  },
  move: (u) => (want.x = clamp(M.X_PUSH + u * (M.X_PULL - M.X_PUSH), M.X_PUSH, M.X_PULL)),
  end: () => (dragging = false),
});

// the page's own self-tests (?selftest=1)
V.test("arrows turn the wheel and the ailerons follow", ({ key }) => {
  key("ArrowRight");
  key("ArrowRight");
  const w = want.wheel;
  for (let i = 0; i < 200; i++) freeStep(0.01, false);
  const r = M.roll(s.wheel);
  key("ArrowLeft");
  key("ArrowLeft");
  return { pass: w > 0 && r.right > 0 && r.left < 0 && r.right > -r.left, info: [w, +r.right.toFixed(2), +r.left.toFixed(2)] };
});
V.test("elevator drag pulls the column", ({ ptr, project }) => {
  const p = project(v3([TPL.hinge + 200, -1200, TPL.wl]));
  const x0 = want.x;
  ptr("pointerdown", p[0], p[1]);
  ptr("pointermove", p[0], p[1] - 60);
  const x1 = want.x;
  ptr("pointerup", p[0], p[1] - 60);
  return { pass: Math.abs(x1 - x0) > 5, info: [Math.round(x0), Math.round(x1)] };
});
V.test("pedals and trim keys", ({ key }) => {
  const y0 = want.y;
  const t0 = want.tab;
  key("x");
  key("t");
  const ok = want.y > y0 && want.tab > t0;
  key("z");
  key("g");
  return { pass: ok, info: [y0, want.y, t0, want.tab] };
});
V.test("trimmed means no stick force", () => {
  const t = M.trimmed(80);
  const F = M.stickForce(80, t.x, t.tab, t.alpha);
  return { pass: Math.abs(F) < 0.5, info: +F.toFixed(3) };
});
V.test("space runs the tour", ({ key }) => {
  key(" ");
  return { pass: auto && !free, info: [auto, free] };
});

V.run({ step, render, overlay: () => "", still: 19, idleAfter: 8 });
