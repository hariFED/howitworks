// Page code for shock-absorber.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VC = K.view(specs.C);
const { CH, CT } = __CHARTS__;
const $ = (id) => document.getElementById(id);

const el = {
  mvMain: $("mv-main"),
  mvbMain: $("mvb-main"),
  fp: $("fp-main"),
  mvbFp: $("mvb-fp"),
  mvC: $("mv-C"),
  gas: $("gas-main"),
  oilB: [$("oil-b-main"), $("oil-b-B")],
  oilA: [$("oil-a-main"), $("oil-a-B"), $("oil-a-C")],
  oilBMain: $("oil-b-main"),
  oilAMain: $("oil-a-main"),
  shimC: $("shim-c-B"),
  shimR: $("shim-r-B"),
  flowC: $("flow-c"),
  flowR: $("flow-r"),
  heads: $("flow-heads"),
  dimL: $("dim-L-wrap"),
  dimC: $("dim-c-wrap"),
  fvTrail: $("fv-trail"),
  fvDot: $("fv-dot"),
  ztNow: $("zt-now"),
  ztPrev: $("zt-prev"),
  ztRoad: $("zt-road"),
  ztDot: $("zt-dot"),
  qc: $("qc"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const car = M.car();
let mode = "car"; // "car": the quarter car drives the damper; "hand": it is stroked by hand
let c = M.C0; // compression, mm
let v = 0; // damper velocity, m/s, rebound +
let target = M.C0;
let dragging = false;
let userOn = true;
let liftC = 0;
let liftR = 0;
let phase = 0; // oil travelled, for the moving dashes
let passT = 99; // time since the current pass began
let now = [];
let prev = [];
let roadNow = [];
let trail = [];
let clock = 0;

// The tour, a 12 s loop: a hump with the damping on, a hump with the valves bypassed, then settle.
const tour = { t: 0 };
function startPass(delay) {
  car.humps = [...car.humps.filter((x0) => x0 > car.X - 2), car.X + M.SPEED * delay];
  if (now.length > 10) prev = now;
  now = [];
  roadNow = [];
  passT = 0;
}
function tourStep(h) {
  const t0 = tour.t;
  tour.t = (tour.t + h) % M.CYCLE;
  const crossed = (at) => (t0 < at && tour.t >= at) || (t0 > tour.t && at === 0);
  if (t0 === 0 || crossed(0)) {
    car.on = true;
    startPass(0.6);
  }
  if (crossed(5)) {
    car.on = false;
    startPass(0.6);
  }
  if (crossed(10)) car.on = true;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 1000));
  const h = dt / n;
  if (live.touring && mode === "hand" && !dragging) {
    // the tour takes over again: let the held suspension go and settle before the next hump
    M.placeCar(car, c);
    mode = "car";
    tour.t = 10;
  }
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "car") {
      if (live.touring) tourStep(h);
      else car.on = userOn;
      M.stepCar(car, h);
      c = Math.min(M.STROKE, Math.max(0, car.c));
      v = car.v;
      passT += h;
      if (passT <= CT.tMax && (now.length === 0 || passT - now[now.length - 1][0] >= 1 / 60)) {
        now.push([passT, car.zs * 1000]);
        roadNow.push([passT, car.zr * 1000]);
      }
    } else {
      const c0 = c;
      c = live.reduced ? target : L.follow(c, target, 14, h);
      v = -(c - c0) / h / 1000;
      car.on = userOn;
    }
    const lt = M.shimLift(v, car.on);
    liftC = L.follow(liftC, v < 0 ? lt : 0, 40, h);
    liftR = L.follow(liftR, v > 0 ? lt : 0, 40, h);
    phase += Math.abs(v) * h * 1000 * 0.9;
    const lastT = trail[trail.length - 1];
    if (!lastT || Math.abs(v - lastT[1]) > 0.006 || clock - lastT[0] > 1 / 50) trail.push([clock, v, M.damperForce(v, car.on)]);
  }
  while (trail.length && clock - trail[0][0] > 1.0) trail.shift();
  return mode === "car" || Math.abs(c - target) > 1e-3 || liftC > 1e-3 || liftR > 1e-3;
}

const fx = (vv) => K.r2(CH.x0 + ((Math.max(-CH.vMax, Math.min(CH.vMax, vv)) + CH.vMax) / (2 * CH.vMax)) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - ((Math.max(CH.fMin, Math.min(CH.fMax, F / 1000)) - CH.fMin) / (CH.fMax - CH.fMin)) * (CH.y1 - CH.y0));
const tx = (t) => K.r2(CT.x0 + (t / CT.tMax) * (CT.x1 - CT.x0));
const zy = (z) => K.r2(CT.y1 - ((Math.max(CT.zMin, Math.min(CT.zMax, z)) - CT.zMin) / (CT.zMax - CT.zMin)) * (CT.y1 - CT.y0));
const pts = (list) => list.map(([t, z]) => `${tx(t)},${zy(z)}`).join(" ");
const tint = (p) => K.r2(0.12 + 0.88 * Math.min(1, Math.max(0, (p - 17) / (40 - 17))));
const shown = { liftC: -1, liftR: -1 };

function arrowAt(V, pts) {
  const [x1, y1] = V.p(pts[pts.length - 1]);
  const [x0, y0] = V.p(pts[pts.length - 2]);
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const bx = x1 - ux * 7;
  const by = y1 - uy * 7;
  return `M${K.r2(x1)} ${K.r2(y1)}L${K.r2(bx - uy * 2.6)} ${K.r2(by + ux * 2.6)}L${K.r2(bx + uy * 2.6)} ${K.r2(by - ux * 2.6)}Z`;
}

function render(live) {
  const nut = M.NUT0;
  el.mvMain.setAttribute("transform", `translate(0 ${K.r2(c * VM.k)})`);
  el.mvbMain.setAttribute("transform", `translate(0 ${K.r2(c * VM.k)})`);
  el.mvC.setAttribute("transform", `translate(0 ${K.r2(c * VC.k)})`);
  const dfp = c * M.FP_RATIO * VM.k;
  el.fp.setAttribute("transform", `translate(0 ${K.r2(dfp)})`);
  el.mvbFp.setAttribute("transform", `translate(0 ${K.r2(dfp)})`);
  el.gas.setAttribute("d", P.fluidPath(VM, P.gas(c)));
  el.oilBMain.setAttribute("d", P.fluidPath(VM, P.oilBelow(c)));
  el.oilAMain.setAttribute("d", P.fluidPath(VM, P.oilAbove(c)));
  const p = M.pressures(c, v, car.on);
  for (const node of el.oilB) node.setAttribute("fill-opacity", tint(p.below));
  for (const node of el.oilA) node.setAttribute("fill-opacity", tint(p.above));
  if (Math.abs(liftC - shown.liftC) > 0.002) {
    el.shimC.innerHTML = P.shims(VB, nut, 1, liftC);
    shown.liftC = liftC;
  }
  if (Math.abs(liftR - shown.liftR) > 0.002) {
    el.shimR.innerHTML = P.shims(VB, nut, -1, liftR);
    shown.liftR = liftR;
  }
  // the oil through the open port: compression up the right-hand port, rebound down the left
  const strength = Math.min(1, Math.abs(v) / 0.12);
  const heads = [];
  for (const [node, dir, lift] of [[el.flowC, 1, liftC], [el.flowR, -1, liftR]]) {
    const active = (dir > 0 ? v < -0.003 : v > 0.003) && strength > 0.02;
    if (!active) {
      node.setAttribute("d", "");
      continue;
    }
    const path = P.flowPath(VB, nut, dir, lift);
    node.setAttribute("d", K.d(VB, path, false));
    node.setAttribute("stroke-dashoffset", K.r2(-phase % 8.5));
    node.setAttribute("stroke-opacity", K.r2(0.35 + 0.65 * strength));
    heads.push(arrowAt(VB, path));
  }
  el.heads.setAttribute("d", heads.join(""));
  el.heads.setAttribute("fill-opacity", K.r2(0.35 + 0.65 * strength));
  el.dimL.innerHTML = K.dim(VM, [20, 0], [20, M.eyeV(c)], { dir: "v", off: 218 - VM.p([20, 0])[0], text: `${Math.round(M.length(c))}`, id: "dim-L" });
  el.dimC.innerHTML = K.dim(VM, [20, M.EYE_TOP0], [20, M.eyeV(c)], { dir: "v", off: 240 - VM.p([20, 0])[0], text: `c=${Math.round(c)}`, id: "dim-c" });
  // charts
  const F = M.damperForce(v, car.on);
  el.fvTrail.setAttribute("points", trail.map(([, a, b]) => `${fx(a)},${fy(b)}`).join(" "));
  el.fvDot.setAttribute("cx", fx(v));
  el.fvDot.setAttribute("cy", fy(F));
  el.ztNow.setAttribute("points", pts(now));
  el.ztPrev.setAttribute("points", pts(prev));
  el.ztRoad.setAttribute("points", pts(roadNow));
  const last = now[now.length - 1];
  el.ztDot.setAttribute("cx", last ? tx(last[0]) : CT.x0);
  el.ztDot.setAttribute("cy", last ? zy(last[1]) : zy(0));
  el.qc.innerHTML = P.quarterCar(car);
  const dir = Math.abs(v) < 0.005 ? "" : v > 0 ? " REB" : " COMP";
  const sgn = (x, d) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d);
  el.readout.textContent = `c ${Math.round(c)} mm · v ${sgn(v, 2)} m/s${dir} · F ${sgn(F / 1000, 2)} kN · GAS ${p.gas.toFixed(1)} bar · ${car.on ? "DAMPING" : "BYPASSED"}`;
  say(`Compression ${Math.round(c)} millimetres, damper speed ${v.toFixed(2)} metres per second, force ${Math.round(F)} newtons, gas ${p.gas.toFixed(1)} bar, damping ${car.on ? "on" : "off"}.`, live.clock);
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
  // A still, true moment: the tour played to just after the hump, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 0.86; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampC = (x) => Math.min(M.STROKE, Math.max(0, x));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    target = c;
  }
}
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  const V = hitEl.dataset.drag === "C" ? VC : VM;
  let c0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      toHand();
      c0 = c;
      target = c;
      live.input();
    },
    move: (dy) => {
      target = clampC(c0 + dy / V.k);
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
  if (k === "ArrowDown" || k === "ArrowUp") {
    toHand();
    target = clampC(target + (k === "ArrowDown" ? 10 : -10));
  } else if (k === "End" || k === "Home") {
    toHand();
    target = k === "End" ? M.STROKE : 0;
  } else if (k === " ") {
    if (mode === "hand") M.placeCar(car, c);
    mode = "car";
    startPass(0.5);
  } else if (k === "d" || k === "D") userOn = !car.on;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
