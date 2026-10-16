// Page code for relief-valve.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// G (charts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const V = { main: K.view(specs.main), B: K.view(specs.B), C: K.view(specs.C) };
const BAL = __BALLOONS__;
const $ = (id) => document.getElementById(id);
const views = ["main", "B", "C"];

const el = {
  mv: views.map((id) => [$(`mv-${id}`), V[id]]),
  set: views.map((id) => [$(`set-${id}`), V[id]]),
  spring: views.map((id) => [$(`spring-${id}`), V[id]]),
  gasIn: views.map((id) => [$(`gas-in-${id}`), V[id]]),
  gasHud: views.map((id) => [$(`gas-hud-${id}`), V[id]]),
  gasOut: views.map((id) => $(`gas-out-${id}`)),
  dimSpring: $("dim-spring-wrap"),
  dimLift: $("dim-lift-wrap"),
  balloons: Object.keys(BAL).map((n) => [n, $(`bal-${n}`)]),
  d1: { trace: $("d1-trace"), dot: $("d1-dot"), stable: $("d1-stable"), unstable: $("d1-unstable"), jumps: $("d1-jumps"), marks: $("d1-marks") },
  d2: { trace: $("d2-trace"), dot: $("d2-dot"), set: $("d2-set"), reseat: $("d2-reseat") },
  d3: { now: $("d3-now"), dot: $("d3-dot"), set: $("d3-set") },
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const s = M.valve();
let F0 = M.F0_NOM; // spring preload, follows the adjusting screw
let F0want = M.F0_NOM;
let ch = M.characteristic(F0);
let chF0 = F0;
let dragging = false;
let holdWant = s.p;
let hist1 = []; // [p, h] at 30 Hz, the last 11 s
let hist2 = []; // [t, p] at 10 Hz, the last 30 s
let acc1 = 0;
let acc2 = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 960));
  const h = dt / n;
  if (live.touring && !dragging) {
    s.comp = true;
    F0want = M.F0_NOM;
  }
  for (let i = 0; i < n; i++) {
    F0 = L.follow(F0, F0want, 6, h);
    s.F0 = F0;
    const hold = dragging ? L.follow(s.p, holdWant, 10, h) : null;
    M.advance(s, h, { hold });
    acc1 += h;
    acc2 += h;
    if (acc1 >= 1 / 30) {
      acc1 = 0;
      hist1.push([s.p, s.h]);
      if (hist1.length > 330) hist1.shift();
    }
    if (acc2 >= 0.1) {
      acc2 = 0;
      hist2.push([s.t, s.p]);
      if (hist2.length > 301) hist2.shift();
    }
  }
  if (Math.abs(F0 - chF0) > 0.05) {
    ch = M.characteristic(F0);
    chF0 = F0;
  }
  return dragging || (s.comp && !live.reduced) || Math.abs(s.v) > 0.01 || Math.abs(F0 - F0want) > 0.05;
}

// ---------------------------------------------------------------- render
let shown = { h: -1, F0: -1, p: -1, ch: -1 };

function render(live) {
  const h = s.h;
  const dz = P.screwOffset(F0);
  for (const [node, Vw] of el.mv) node.setAttribute("transform", `translate(0 ${K.r2(-h * Vw.k)})`);
  for (const [node, Vw] of el.set) node.setAttribute("transform", `translate(0 ${K.r2(-dz * Vw.k)})`);
  if (Math.abs(h - shown.h) > 0.002 || Math.abs(F0 - shown.F0) > 0.05) {
    for (const [node, Vw] of el.spring) node.innerHTML = P.spring(Vw, h, F0);
    for (const [node, Vw] of el.gasIn) node.setAttribute("d", P.gasPath(Vw, P.inletGas(h)));
    for (const [node, Vw] of el.gasHud) node.setAttribute("d", P.gasPath(Vw, P.huddleGas(h)));
    el.dimSpring.innerHTML = K.dim(V.main, [-27, P.PLATE_V + h], [-27, P.PLATE_V + h + M.springLength(F0, h)], {
      dir: "v",
      off: V.main.p([-50, 0])[0] - V.main.p([-27, 0])[0],
      text: `L=${M.springLength(F0, h).toFixed(1)}`,
      id: "dim-spring",
    });
    el.dimLift.innerHTML = K.dim(V.B, [-11.5, P.SEAT_V], [-11.5, P.SEAT_V + h], { dir: "v", off: V.B.p([-5, 0])[0] - V.B.p([-11.5, 0])[0], text: `h=${h.toFixed(2)}`, id: "dim-lift" });
    const dots = P.movingDots(h, F0);
    for (const [n, node] of el.balloons) node.innerHTML = K.balloon(V[BAL[n].view], dots[n], BAL[n].b, n, { target: n });
    shown.h = h;
    shown.F0 = F0;
  }
  // the gas: inlet density follows vessel pressure, the discharge side follows the flow
  const out = 0.08 + 0.72 * clamp(s.m / 0.6, 0, 1);
  const inl = 0.2 + 0.7 * clamp(s.p / 10.5, 0, 1);
  const hud = out + (inl - out) * M.ETA_H * 2.4 * M.psi(h) + (h > 0.004 && h < M.H_A ? 0.25 : 0);
  for (const node of el.gasOut) node.setAttribute("fill-opacity", K.r2(out));
  for (const [node] of el.gasIn) node.setAttribute("fill-opacity", K.r2(inl));
  for (const [node] of el.gasHud) node.setAttribute("fill-opacity", K.r2(Math.min(inl, hud)));

  // Diagram 1
  if (chF0 !== shown.ch) {
    const lp = G.loopPaths(F0);
    el.d1.stable.setAttribute("d", lp.stable);
    el.d1.unstable.setAttribute("d", lp.unstable);
    el.d1.jumps.setAttribute("d", lp.jumps);
    el.d1.marks.innerHTML = G.d1Marks(lp.ch);
    el.d2.set.setAttribute("d", `M${G.D2.x0} ${G.y2(ch.set)}H${G.D2.x1}`);
    el.d2.reseat.setAttribute("d", `M${G.D2.x0} ${G.y2(ch.reseat)}H${G.D2.x1}`);
    el.d3.set.setAttribute("points", G.flowPath(ch.set));
    shown.ch = chF0;
  }
  el.d1.trace.setAttribute("points", hist1.map(([p, hh]) => `${G.x1(p)},${G.y1(hh)}`).join(" "));
  el.d1.dot.setAttribute("cx", G.x1(s.p));
  el.d1.dot.setAttribute("cy", G.y1(h));
  // Diagram 2
  el.d2.trace.setAttribute("points", hist2.filter(([t]) => s.t - t <= G.D2.span).map(([t, p]) => `${G.x2(s.t - t)},${G.y2(p)}`).join(" "));
  el.d2.dot.setAttribute("cy", G.y2(s.p));
  // Diagram 3
  if (Math.abs(s.p - shown.p) > 0.005) {
    el.d3.now.setAttribute("points", G.flowPath(s.p));
    shown.p = s.p;
  }
  el.d3.dot.setAttribute("cx", G.x3(h));
  el.d3.dot.setAttribute("cy", G.y3(s.m * 3600));

  const st = M.state(s);
  const kgh = Math.round(s.m * 3600);
  el.readout.textContent = `p ${s.p.toFixed(2)} bar · SET ${ch.set.toFixed(1)} · h ${h.toFixed(2)} mm · ${kgh} kg/h · ${st}`;
  say(`Vessel ${s.p.toFixed(1)} bar, set ${ch.set.toFixed(1)}, lift ${h.toFixed(1)} millimetres, discharge ${kgh} kilograms per hour, ${st.toLowerCase()}.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 6,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 7 s, the valve relieving, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 7; t += 1 / 240) step(1 / 240, fake);
  s.comp = false;
  render(live);
}

for (const hit of svg.querySelectorAll("[data-drag]")) {
  let p0 = 0;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      p0 = s.p;
      holdWant = s.p;
      live.input();
    },
    move: (dy) => {
      holdWant = clamp(p0 - dy / 40, 7.5, 11);
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  const setNow = M.characteristic(F0want).set;
  if (k === "ArrowUp" || k === "ArrowDown") s.p = clamp(s.p + (k === "ArrowUp" ? 0.1 : -0.1), 7.5, 11);
  else if (k === "ArrowLeft" || k === "ArrowRight") F0want = M.preloadFor(clamp(setNow + (k === "ArrowRight" ? 0.25 : -0.25), 8.5, 11.5));
  else if (k === " ") s.comp = !s.comp;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
