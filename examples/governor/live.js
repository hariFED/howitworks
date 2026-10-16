// Page code for governor.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// X (sheet plan) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VC = K.view(specs.C);
const VD = K.view(specs.D);
const $ = (id) => document.getElementById(id);

const el = {
  mv: [["main", VM], ["B", VB], ["C", VC]].map(([id, V]) => [$(`mv-${id}`), V]),
  mvbMain: $("mvb-main"),
  mvbC: $("mvb-C"),
  plan: $("plan"),
  orbit: $("orbit"),
  dimH: $("dim-h-wrap"),
  dimX: $("dim-x-wrap"),
  c1Load: $("c1-load"),
  c1Trail: $("c1-trail"),
  c1Dot: $("c1-dot"),
  c2n: $("c2-n"),
  c2f: $("c2-f"),
  c2load: $("c2-load"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const eng = M.engine(M.LOAD_LIGHT);
let load = M.LOAD_LIGHT; // what the shaft is asked to carry now
let userLoad = M.LOAD_LIGHT;
let theta = 0.4; // spindle angle, for VIEW D (shown at 1/20 speed)
let dragging = false;
const SAMPLE = 0.05;
let sinceSample = 0;
const hist = []; // [n, f, load], oldest first, one every SAMPLE s
for (let i = 0; i < X.CH2.span / SAMPLE; i++) hist.push([M.toRpm(eng.omega), eng.f, load]);
const trail = [];
let steadyFor = -1;
let steadyAt = null;

// The tour: light load, a step to heavy at 2 s, back to light at 10 s, every 16 s.
const PERIOD = 16;
const tourLoad = (t) => {
  const p = t % PERIOD;
  return p >= 2 && p < 10 ? M.LOAD_HEAVY : M.LOAD_LIGHT;
};

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    load = live.touring && !dragging ? tourLoad(live.clock) : userLoad;
    M.step(eng, h, load);
    theta += (M.RATIO * eng.omega * h) / 20;
    sinceSample += h;
    if (sinceSample >= SAMPLE) {
      sinceSample -= SAMPLE;
      hist.push([M.toRpm(eng.omega), eng.f, load]);
      if (hist.length > X.CH2.span / SAMPLE) hist.shift();
      trail.push([M.toRpm(eng.omega), M.sleeveLift(eng.alpha)]);
      if (trail.length > 80) trail.shift();
    }
  }
  if (!live.touring) userLoad = load;
  if (load !== steadyFor) {
    steadyFor = load;
    steadyAt = M.steady(load);
  }
  const s = steadyAt;
  return Math.abs(eng.omega - s.omega) > 1e-4 || Math.abs(eng.alpha - s.alpha) > 1e-4;
}

let shownA = -1;
let shownLoad = -1;

function render(live) {
  const Q = P.pose(eng.alpha);
  if (Math.abs(eng.alpha - shownA) > 0.004) {
    for (const [node, V] of el.mv) node.innerHTML = X.moving(V, Q);
    el.mvbMain.innerHTML = X.balloonsMainMoving(VM, Q);
    el.mvbC.innerHTML = X.balloonsC(VC, Q);
    el.dimH.innerHTML = X.dimH(VM, Q);
    el.dimX.innerHTML = X.dimX(VM, Q);
    el.orbit.innerHTML = K.line(VD, K.circle(0, 0, Q.ball[0], 96), "ctr", true);
    shownA = eng.alpha;
  }
  el.plan.innerHTML = P.planView(VD, Q, theta);
  if (load !== shownLoad) {
    el.c1Load.setAttribute("points", X.engineLine(load));
    shownLoad = load;
  }
  const n = M.toRpm(eng.omega);
  const x = M.sleeveLift(eng.alpha);
  el.c1Dot.setAttribute("cx", X.c1x(Math.min(X.CH1.n1, Math.max(X.CH1.n0, n))));
  el.c1Dot.setAttribute("cy", X.c1y(x));
  el.c1Trail.setAttribute("points", trail.map(([tn, tx]) => `${X.c1x(Math.min(X.CH1.n1, Math.max(X.CH1.n0, tn)))},${X.c1y(tx)}`).join(" "));
  const last = hist.length - 1;
  const at = (i) => X.c2x((last - i) * SAMPLE);
  el.c2n.setAttribute("points", hist.map(([hn], i) => `${at(i)},${X.c2n(hn)}`).join(" "));
  el.c2f.setAttribute("points", hist.map(([, hf], i) => `${at(i)},${X.c2f(hf)}`).join(" "));
  el.c2load.setAttribute("points", hist.map(([, , hl], i) => `${at(i)},${X.c2f(hl / X.CH2.l1)}`).join(" "));
  const lift = M.valveLift(eng.alpha);
  el.readout.textContent = `n ${n.toFixed(1)} rpm · x ${x.toFixed(1)} mm · VALVE ${lift.toFixed(1)} mm (${Math.round(eng.f * 100)} %) · LOAD ${Math.round(load)} N·m`;
  say(`Engine ${n.toFixed(1)} rpm, sleeve lift ${x.toFixed(0)} millimetres, valve ${Math.round(eng.f * 100)} percent open, load ${Math.round(load)} newton metres.`, live.clock);
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
  // A still, true moment: the tour played to 9 s (heavy load, settled), drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 9; t += 1 / 240) {
    fake.clock = t;
    step(1 / 240, fake);
  }
  render(live);
}

const clampLoad = (v) => Math.min(M.LOAD_MAX, Math.max(M.LOAD_MIN, v));
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let l0 = 0;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      l0 = load;
      userLoad = load;
      live.input();
    },
    move: (dy) => {
      userLoad = clampLoad(l0 - dy * 5);
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
  if (k === "ArrowUp" || k === "ArrowDown") userLoad = clampLoad(load + (k === "ArrowUp" ? 100 : -100));
  else if (k === " ") userLoad = load > (M.LOAD_LIGHT + M.LOAD_HEAVY) / 2 ? M.LOAD_LIGHT : M.LOAD_HEAVY;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
