// Page code for flight-controls.html. K (kit), L (runtime), C (self-check), A (the aircraft's model),
// N (the nose gear's model), M (model), X (helpers), P (pictorial parts) and D (details) are inlined
// above this script as namespaces. One state, one model: the tour (or the reader) sets the wheel, the
// column, the pedals and the trim; M.solve gives every angle, force and tension; the pictorial views,
// the sections, the diagrams and the readout all draw from it.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const $ = (id) => document.getElementById(id);
const say = L.announcer($("sr"), 2);
const V = D.V;
const planes = P.pulleyPlanes();

// ---------------------------------------------------------------- state
let s = M.state();
let auto = false; // Space: the tour runs from its start until the reader touches a control
let free = false; // the reader holds the controls
const want = { wheel: 0, x: 0, y: 0, tab: s.tab };

function freeStep(h, reduced) {
  const k = reduced ? 1 : Math.min(1, 9 * h);
  s.wheel += (want.wheel - s.wheel) * k;
  s.x += (want.x - s.x) * k;
  s.y += (want.y - s.y) * k;
  // the trim wheel is turned slowly: the screw runs the tab at about 4° a second
  const dt = want.tab - s.tab;
  s.tab += Math.sign(dt) * Math.min(Math.abs(dt), reduced ? 99 : 4 * h);
  if (s.air) {
    // the aeroplane answers the ailerons as the aircraft's model says (roll mode, 0.25 s)
    const r = M.roll(s.wheel);
    const da = s.wheel >= 0 ? r.right : -r.left;
    s.da = da;
    s.p += (A.rollRate(da, s.v) - s.p) * Math.min(1, 4 * h);
    s.phi = Math.max(-60, Math.min(60, s.phi + s.p * h));
  }
}
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  if ((live.touring || auto) && free) {
    free = false;
    s = M.state();
  }
  for (let i = 0; i < n; i++) {
    if (free) freeStep(h, live.reduced);
    else M.tourStep(s, h);
  }
  return true;
}

// ---------------------------------------------------------------- render
const el = {
  mvParts: $("mv-parts"), mvTb: $("mv-tb"), eMv: $("e-mv"), aaMv: $("aa-mv"), dMv: $("d-mv"), bRot: $("b-rot"),
  cT: $("c-t"), dT: $("d-t"), c1r: $("c1-r"), c1l: $("c1-l"), c2now: $("c2-now"), c2dot: $("c2-dot"), readout: $("readout"),
};
const cabs = [...svg.querySelectorAll("path.cable[id]")].map((p) => [p.id, p]);
const livePict = D.PICT.filter((b) => b.live).map((b) => [b, $(`pb-${b.n}`)]);
const liveFlat = Object.keys(D.LIVE).map((n) => [n, $(`lb-${n}`)]);
let shownKey = "";
let shownTab = null;
const f1 = (v) => (Math.abs(v) < 0.05 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`);

function render(live) {
  const sol = M.solve(s);
  const ps = M.pose(sol);
  const key = [s.wheel, s.x, s.y, s.tab, s.v, s.phi].map((v) => v.toFixed(2)).join(" ");
  if (key !== shownKey) {
    shownKey = key;
    const runs = M.cables(ps, sol);
    const byName = Object.fromEntries(runs.map(([n, r]) => [n, r]));
    el.mvParts.innerHTML = P.controls(V.main, sol, ps).sort((a, b) => b.d - a.d).map((p) => P.part(p.id, p.svg)).join("");
    el.eMv.innerHTML = D.eMoving(P.controls(V.E, sol, ps).sort((a, b) => b.d - a.d));
    for (const [id, path] of cabs) {
      const ve = id.startsWith("ecab-") ? V.E : V.main;
      const name = id.replace(/^e?cab-/, "");
      if (byName[name]) path.setAttribute("d", K.d(ve, P.toV(byName[name].pts, ve), false));
    }
    el.mvTb.innerHTML = P.turnbuckles(V.main, runs);
    el.aaMv.innerHTML = D.aaMoving(sol);
    el.dMv.innerHTML = D.dMoving(sol);
    el.bRot.innerHTML = D.bRotor(sol.pt.s);
    el.cT.innerHTML = D.cLabel(sol);
    el.dT.innerHTML = D.dLabel(sol);
    for (const [b, node] of livePict) node.innerHTML = D.pictBalloon(b, sol);
    for (const [n, node] of liveFlat) node.innerHTML = D.liveBalloon(n, sol);
    // Diagram 1: the two ailerons at this wheel angle
    el.c1r.setAttribute("cx", D.c1x(sol.r.theta));
    el.c1r.setAttribute("cy", D.c1y(sol.r.right));
    el.c1l.setAttribute("cx", D.c1x(sol.r.theta));
    el.c1l.setAttribute("cy", D.c1y(sol.r.left));
    // Diagram 2: the force curve for the tab as it is now, and where the aeroplane is on it
    if (shownTab === null || Math.abs(shownTab - s.tab) > 0.05) {
      el.c2now.setAttribute("points", D.forceCurve(s.tab));
      shownTab = s.tab;
    }
    el.c2dot.style.display = s.air ? "" : "none";
    el.c2dot.setAttribute("cx", D.c2x(s.v));
    el.c2dot.setAttribute("cy", D.c2y(sol.F));
  }
  const r = sol.r;
  const ail = `R${r.right >= 0 ? "↑" : "↓"}${Math.abs(r.right).toFixed(1)} L${r.left >= 0 ? "↑" : "↓"}${Math.abs(r.left).toFixed(1)}`;
  const pull = sol.F >= 0 ? "PULL" : "PUSH";
  el.readout.textContent = s.air
    ? `${Math.round(s.v)} kt ${Math.abs(s.phi) < 0.5 ? "" : `φ${Math.round(Math.abs(s.phi))}${s.phi > 0 ? "R" : "L"} `}· δe ${f1(sol.pt.de)} · ${ail} · δr ${f1(sol.yw.dr)} · TAB ${f1(s.tab)} · ${pull} ${Math.abs(sol.F).toFixed(0)} N`
    : `GROUND · θ ${f1(r.theta)} · ${ail} · δe ${f1(sol.pt.de)} · δr ${f1(sol.yw.dr)} · NOSE ${f1(sol.nose.psi)}°`;
  const where = free ? "held" : M.phase(s).toLowerCase();
  say(
    s.air
      ? `${Math.round(s.v)} knots, elevator ${sol.pt.de.toFixed(1)} degrees, right aileron ${r.right.toFixed(1)}, left ${r.left.toFixed(1)}, rudder ${sol.yw.dr.toFixed(1)}, tab ${s.tab.toFixed(1)} degrees, stick force ${Math.round(sol.F)} newtons, ${where}.`
      : `On the ground: wheel ${Math.round(r.theta)} degrees, right aileron ${r.right.toFixed(1)}, left ${r.left.toFixed(1)}, elevator ${sol.pt.de.toFixed(1)}, rudder ${sol.yw.dr.toFixed(1)} degrees.`,
    live.clock,
  );
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 8, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // a still, true moment: slow flight before the trim, the pull at its largest
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 19.2; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

function hold() {
  auto = false;
  if (!free) {
    free = true;
    Object.assign(want, { wheel: s.wheel, x: s.x, y: s.y, tab: s.tab });
  }
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nudge = {
  ArrowLeft: () => (want.wheel = clamp(want.wheel - 10, -M.WHEEL_MAX, M.WHEEL_MAX)),
  ArrowRight: () => (want.wheel = clamp(want.wheel + 10, -M.WHEEL_MAX, M.WHEEL_MAX)),
  ArrowUp: () => (want.x = clamp(want.x - 15, M.X_PUSH, M.X_PULL)),
  ArrowDown: () => (want.x = clamp(want.x + 15, M.X_PUSH, M.X_PULL)),
  z: () => (want.y = clamp(want.y - 15, -M.PED_MAX, M.PED_MAX)),
  x: () => (want.y = clamp(want.y + 15, -M.PED_MAX, M.PED_MAX)),
  t: () => (want.tab = clamp(want.tab + 1, M.TAB_LIMITS[0], M.TAB_LIMITS[1])),
  g: () => (want.tab = clamp(want.tab - 1, M.TAB_LIMITS[0], M.TAB_LIMITS[1])),
};
svg.addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (nudge[k]) {
    hold();
    nudge[k]();
  } else if (k === " ") {
    free = false;
    auto = true;
    s = M.state();
  } else if (k === "s") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

// drag in Detail E: across turns the wheel, up and down pushes and pulls the column
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let start = null;
  const toSheet = (ev) => {
    const p = svg.createSVGPoint();
    p.x = ev.clientX;
    p.y = ev.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  hit.addEventListener("pointerdown", (ev) => {
    hold();
    start = { p: toSheet(ev), wheel: want.wheel, x: want.x };
    hit.setPointerCapture(ev.pointerId);
    live.input();
  });
  hit.addEventListener("pointermove", (ev) => {
    if (!start) return;
    const p = toSheet(ev);
    want.wheel = clamp(start.wheel + (p.x - start.p.x) * 1.2, -M.WHEEL_MAX, M.WHEEL_MAX);
    want.x = clamp(start.x + (p.y - start.p.y) * 1.5, M.X_PUSH, M.X_PULL);
    live.input();
  });
  const end = () => {
    start = null;
    live.input();
  };
  hit.addEventListener("pointerup", end);
  hit.addEventListener("pointercancel", end);
}

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
