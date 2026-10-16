// Page code for centrifugal-pump.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VB = K.view(specs.B);
const VE = K.view(specs.E);
const { CH, C2 } = __CHARTS__;
const $ = (id) => document.getElementById(id);

const el = {
  rotor: $("rotor-B"),
  mvE: $("mv-E"),
  mvbE: $("mvb-E"),
  liftDim: $("dim-lift-wrap"),
  pc: $("pc-now"),
  sys: $("sys-now"),
  dutyLines: $("duty-lines"),
  dutyDot: $("duty-dot"),
  eta: $("eta-now"),
  pow: $("pow-now"),
  etaDot: $("eta-dot"),
  powDot: $("pow-dot"),
  readout: $("readout"),
};
// water zones: suction, inner impeller, outer impeller, volute and discharge, after the valve
const zones = { s: [], i: [], o: [], d: [], v: [] };
for (const id of ["A", "C", "D"]) for (const z of ["s", "i", "o", "d"]) zones[z].push($(`tint-${id}-${z}`));
for (const z of ["i", "o", "d"]) zones[z].push($(`tint-B-${z}`));
zones.d.push($("tint-E-in"));
zones.v.push($("tint-E-out"));
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let n = 0; // shaft speed, rpm
let lift = M.LIFT_MAX; // valve plug lift, mm
let nTarget = 0;
let liftTarget = M.LIFT_MAX;
let angle = 0; // the impeller as drawn, degrees, at 1/100 of shaft speed
let auto = false;
let dragging = false;

// The tour: start the motor, throttle the valve and open it again, slow down, stop. 26 s a cycle.
const PERIOD = 26;
const KEYS = [
  [0, 0, M.LIFT_MAX],
  [1, 0, M.LIFT_MAX],
  [5, M.N0, M.LIFT_MAX],
  [7, M.N0, M.LIFT_MAX],
  [11, M.N0, 1.5],
  [13, M.N0, 1.5],
  [16, M.N0, M.LIFT_MAX],
  [17, M.N0, M.LIFT_MAX],
  [19.5, 1900, M.LIFT_MAX],
  [21.5, 1900, M.LIFT_MAX],
  [24, 0, M.LIFT_MAX],
  [26, 0, M.LIFT_MAX],
];
let tourT = 0;
function tour(h) {
  tourT = (tourT + h) % PERIOD;
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, n1, l1] = KEYS[i];
    const [t0, n0, l0] = KEYS[i - 1];
    if (tourT <= t1) {
      const e = L.ease((tourT - t0) / (t1 - t0));
      nTarget = n0 + (n1 - n0) * e;
      liftTarget = l0 + (l1 - l0) * e;
      return;
    }
  }
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const steps = Math.max(1, Math.ceil(dt * 240));
  const h = dt / steps;
  const driven = (live.touring || auto) && !dragging;
  for (let i = 0; i < steps; i++) {
    if (driven) tour(h);
    n = live.reduced && !driven ? nTarget : L.follow(n, nTarget, driven ? 12 : 5, h);
    lift = live.reduced && !driven ? liftTarget : L.follow(lift, liftTarget, driven ? 12 : 8, h);
    angle = (angle + (n / 100) * 6 * h) % 360; // n/100 rpm is n/100·6 degrees a second
  }
  return Math.abs(n - nTarget) > 0.5 || Math.abs(lift - liftTarget) > 0.005 || n > 1;
}

const curvePath = (f, x, y, qMax) => {
  let s = "";
  for (let i = 0; i <= 60; i++) {
    const qq = (qMax * i) / 60;
    const v = f(qq);
    if (!Number.isFinite(v) || v < 0) break;
    s += `${i ? "L" : "M"}${x(qq)} ${y(v)}`;
  }
  return s;
};
const qx = (v) => K.r2(CH.x0 + (Math.min(CH.qMax, v) / CH.qMax) * (CH.x1 - CH.x0));
const hy = (v) => K.r2(CH.y1 - (Math.min(CH.hMax, Math.max(0, v)) / CH.hMax) * (CH.y1 - CH.y0));
const qx2 = (v) => K.r2(C2.x0 + (Math.min(C2.qMax, v) / C2.qMax) * (C2.x1 - C2.x0));
const ey2 = (v) => K.r2(C2.y1 - (Math.min(C2.eMax, Math.max(0, v)) / C2.eMax) * (C2.y1 - C2.y0));
const py2 = (v) => K.r2(C2.y1 - (Math.min(C2.pMax, Math.max(0, v)) / C2.pMax) * (C2.y1 - C2.y0));
const tint = (p) => K.r2(0.12 + 0.88 * Math.min(1, Math.max(0, p / 3.8)));
const [cx, cy] = VB.p([0, 0]);

function render(live) {
  const s = M.state(n, lift);
  // the rotor turns counter-clockwise as seen in B-B (negative on the sheet, where y runs down)
  el.rotor.setAttribute("transform", `rotate(${K.r2(-angle)} ${cx} ${cy})`);
  const up = K.r2(-lift * VE.k);
  el.mvE.setAttribute("transform", `translate(0 ${up})`);
  el.mvbE.setAttribute("transform", `translate(0 ${up})`);
  el.liftDim.innerHTML = K.dim(VE, [62, P.RIM.v + P.RIM.w], [62, P.RIM.v + P.RIM.w + lift], { dir: "v", off: 12, text: `h=${lift.toFixed(1)}`, id: "dim-lift" });

  // the water: suction, through the impeller (two thirds of the rise as static pressure), volute, valve
  const rise = s.pDischarge - s.pSuction;
  const levels = {
    s: s.pSuction,
    i: s.pSuction + rise * M.REACTION * 0.45,
    o: s.pSuction + rise * M.REACTION,
    d: s.pDischarge,
    v: s.pAfterValve,
  };
  for (const [z, nodes] of Object.entries(zones)) for (const node of nodes) node.setAttribute("fill-opacity", tint(levels[z]));

  // DIAGRAM 1
  el.pc.setAttribute("d", n > 1 ? curvePath((qq) => M.head(qq, n), qx, hy, CH.qMax) : "");
  el.sys.setAttribute("d", curvePath((qq) => M.systemHead(qq, lift), qx, hy, CH.qMax));
  const dx = qx(s.q);
  const dy = hy(s.h);
  el.dutyDot.setAttribute("cx", dx);
  el.dutyDot.setAttribute("cy", dy);
  el.dutyLines.setAttribute("d", `M${CH.x0} ${dy}H${dx}V${CH.y1}`);

  // DIAGRAM 2
  el.eta.setAttribute("d", n > 1 ? curvePath((qq) => 100 * M.efficiency(qq, n), qx2, ey2, Math.min(C2.qMax, 34.6 * (n / M.N0))) : "");
  el.pow.setAttribute("d", n > 1 ? curvePath((qq) => M.power(qq, n), qx2, py2, Math.min(C2.qMax, 34.6 * (n / M.N0))) : "");
  el.etaDot.setAttribute("cx", qx2(s.q));
  el.etaDot.setAttribute("cy", ey2(100 * s.eta));
  el.powDot.setAttribute("cx", qx2(s.q));
  el.powDot.setAttribute("cy", py2(s.p));

  const text =
    `n ${Math.round(n)} rpm · Q ${s.q.toFixed(1)} m³/h · H ${s.h.toFixed(1)} m · η ${Math.round(100 * s.eta)} % · P ${s.p.toFixed(2)} kW · h ${lift.toFixed(1)} mm`;
  el.readout.textContent = text;
  say(
    s.flowing
      ? `${Math.round(n)} rpm, ${s.q.toFixed(1)} cubic metres an hour at ${s.h.toFixed(1)} metres, efficiency ${Math.round(100 * s.eta)} percent, ${s.p.toFixed(2)} kilowatts.`
      : `${Math.round(n)} rpm, no flow: the pump cannot lift the water ${M.H_STATIC} metres.`,
    live.clock
  );
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
  // A still, true moment: the tour played to 9 s (full speed, valve throttling), drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 9; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampN = (v) => Math.min(M.N_MAX, Math.max(0, v));
const clampL = (v) => Math.min(M.LIFT_MAX, Math.max(0, v));
for (const hit of svg.querySelectorAll("[data-drag]")) {
  const isValve = hit.dataset.drag === "valve";
  let v0 = 0;
  L.dragY(svg, hit, {
    start: () => {
      dragging = true;
      auto = false;
      v0 = isValve ? lift : n;
      if (isValve) liftTarget = lift;
      else nTarget = n;
      live.input();
    },
    move: (dy) => {
      if (isValve) liftTarget = clampL(v0 - dy / VE.k);
      else nTarget = clampN(v0 - dy * 12);
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
  if (k === "ArrowUp" || k === "ArrowDown") nTarget = clampN(nTarget + (k === "ArrowUp" ? 100 : -100));
  else if (k === "ArrowRight" || k === "ArrowLeft") liftTarget = clampL(liftTarget + (k === "ArrowRight" ? 1 : -1));
  else if (k === "Home") nTarget = 0;
  else if (k === "End") nTarget = M.N0;
  else if (k === " ") auto = !auto;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  if (k !== " " && k.length > 1) auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
