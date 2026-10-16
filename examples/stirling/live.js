// Page code for stirling.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VD = K.view(specs.D);
const VE = K.view(specs.E);
const VB = K.view(specs.B);
const CH = __CHART__;
const RIDE = [
  __RIDE__,
];
const $ = (id) => document.getElementById(id);
const deg = (r) => (r * 180) / Math.PI;

const el = {
  gearL: $("gear-l-main"),
  gearR: $("gear-r-main"),
  disp: [["main", VM], ["D", VD]].map(([id, V]) => [$(`disp-${id}`), V]),
  dispE: $("disp-E"),
  linerE: $("liner-E"),
  drodE: $("drod-E"),
  gasE: $("gas-c-E"),
  dlow: $("dlow-main"),
  pist: $("pist-main"),
  link: $("link-main"),
  ride: $("mvb-main"),
  markE: $("mark-E"),
  flame: $("flame-main"),
  gasH: [["main", VM], ["D", VD]].map(([id, V]) => [$(`gas-h-${id}`), V]),
  gasC: [["main", VM], ["D", VD]].map(([id, V]) => [$(`gas-c-${id}`), V]),
  gap: [["main", VM], ["D", VD]].map(([id, V]) => [$(`gap-${id}`), V, [...Array(P.GAP_BANDS).keys()].map((i) => $(`gap-${id}-${i}`))]),
  dimHot: $("dim-hot-wrap"),
  fly: $("fly-B"),
  traceNow: $("trace-now"),
  tracePrev: $("trace-prev"),
  dot: $("chart-dot"),
  area: $("loop-area"),
  readout: $("readout"),
  q1: $("q-1"),
  q2: $("q-2"),
};
const say = L.announcer($("sr"), 2.5);

// ---------------------------------------------------------------- state
const TH0 = M.TH_MAX;
let phi = 0.6; // drive angle, rad (the left gear's)
let omega = M.steadyOmega(TH0); // engine speed, rad/s
let th = TH0; // hot cap, K
let burner = 1; // burner setting 0..1
let flame = true;
let dragging = false;
let simT = 0;
let now = [];
let prev = [];
let turned = 0;

// Work per cycle is a 720-step loop integral: cache it against the hot temperature.
let wAt = -1;
let cyc = { w: 0, qh: 0, qc: 0 };
const cycleAt = (t) => {
  if (Math.abs(t - wAt) > 0.25) {
    wAt = t;
    cyc = M.cycle(t, M.TC);
  }
  return cyc;
};
const workAt = (t) => cycleAt(t).w;

// The tour: run steady at full flame, turn the burner down, watch it slow, turn it up again.
const PERIOD = 24;
const tour = { t: 0 };
function tourBurner(t) {
  const s = t % PERIOD;
  if (s < 7) return 1;
  if (s < 9) return 1 - 0.78 * L.ease((s - 7) / 2);
  if (s < 15) return 0.22;
  if (s < 17) return 0.22 + 0.78 * L.ease((s - 15) / 2);
  return 1;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const still = live.reduced && !live.frozen;
  for (let i = 0; i < n; i++) {
    simT += h;
    if (live.touring) {
      tour.t += h;
      burner = tourBurner(tour.t);
      flame = true;
    }
    const want = flame ? M.burnerTh(burner) : M.TC;
    th = still ? want : L.follow(th, want, M.HEAT_RATE, h);
    if (dragging) omega = 0;
    else {
      const drive = workAt(th) / (2 * Math.PI);
      const drag = (omega > 0.01 ? M.T_FRICTION : Math.min(M.T_FRICTION, Math.abs(drive))) + M.B_FRICTION * omega;
      omega = Math.max(0, omega + ((drive - drag) / M.INERTIA) * h);
      if (!still) advance(M.DIR * omega * M.MOTION * h);
    }
  }
  return !live.reduced || dragging;
}

// Move the drive and trace the P–V loop; one trace per turn.
function advance(dphi) {
  phi += dphi;
  turned += Math.abs(dphi);
  if (turned >= 2 * Math.PI) {
    turned -= 2 * Math.PI;
    prev = now;
    now = [];
  }
  if (now.length < 720 && (now.length === 0 || Math.abs(dphi) > 0 || dragging)) now.push([M.vTotal(phi), M.pressure(phi, th, M.TC)]);
}

const cx = (v) => K.r2(CH.x0 + ((Math.min(CH.vMax, Math.max(CH.vMin, v)) - CH.vMin) / (CH.vMax - CH.vMin)) * (CH.x1 - CH.x0));
const cy = (p) => K.r2(CH.y1 - ((Math.min(CH.pMax, Math.max(CH.pMin, p)) - CH.pMin) / (CH.pMax - CH.pMin)) * (CH.y1 - CH.y0));
const pts = (list) => list.map(([v, p]) => `${cx(v)},${cy(p)}`).join(" ");
const tempOp = (t) => K.r2(0.2 + 0.8 * Math.min(1, Math.max(0, (t - 293) / (M.TH_MAX - 293))));
let shownTh = -1;

function render(live) {
  const dd = M.dispBottom(phi) - P.DB0;
  const dp = M.pistonTop(phi) - P.PT0;
  const dy = M.yokeD(phi) - P.YD0;
  const [gl, gr] = [VM.p([-M.E, 0]), VM.p([M.E, 0])];
  el.gearL.setAttribute("transform", `rotate(${K.r2(-deg(phi))} ${gl[0]} ${gl[1]})`);
  el.gearR.setAttribute("transform", `rotate(${K.r2(deg(phi))} ${gr[0]} ${gr[1]})`);
  for (const [node, V] of el.disp) node.setAttribute("transform", `translate(0 ${K.r2(-dd * V.k)})`);
  el.dlow.setAttribute("transform", `translate(0 ${K.r2(-dy * VM.k)})`);
  el.pist.setAttribute("transform", `translate(0 ${K.r2(-dp * VM.k)})`);
  el.markE.setAttribute("transform", `translate(0 ${K.r2(-dp * VM.k)})`);
  // DETAIL E is drawn in the piston's frame: the liner and the displacer move past it
  el.linerE.setAttribute("transform", `translate(0 ${K.r2(dp * VE.k)})`);
  el.dispE.setAttribute("transform", `translate(0 ${K.r2(-(dd - dp) * VE.k)})`);
  el.drodE.setAttribute("transform", `translate(0 ${K.r2(-(dd - dp) * VE.k)})`);
  el.gasE.setAttribute("d", P.shapes(VE, [K.rect(-20, P.PT0, 20, P.PT0 + M.dispBottom(phi) - M.pistonTop(phi))]));
  el.link.innerHTML = P.linkage(VM, phi);
  el.ride.innerHTML = RIDE.map(([n, at, f]) => K.balloon(VM, f(phi), at, n, { target: n })).join("");
  el.flame.innerHTML = P.flames(VM, flame ? Math.min(1, (th - M.TC) / (M.TH_MAX - M.TC) * 0.6 + burner * 0.4) : 0, simT);

  // the gas, shaded by the temperature of the space it is in
  const opHot = tempOp(th);
  const opCold = tempOp(M.TC);
  for (const [node, V] of el.gasH) {
    node.setAttribute("d", P.shapes(V, P.hotGas(phi)));
    node.setAttribute("fill-opacity", opHot);
  }
  for (const [node, V] of el.gasC) {
    node.setAttribute("d", P.shapes(V, P.coldGas(phi)));
    node.setAttribute("fill-opacity", opCold);
  }
  for (const [group, V, bands] of el.gap) {
    group.setAttribute("transform", `translate(0 ${K.r2(-dd * V.k)})`);
    bands.forEach((b, i) => b.setAttribute("fill-opacity", tempOp(M.TC + ((th - M.TC) * (i + 0.5)) / P.GAP_BANDS)));
  }
  el.gasE.setAttribute("fill-opacity", opCold);

  const top = M.dispTop(phi);
  el.dimHot.innerHTML = K.dim(VM, [-20, M.CAP_TOP], [-20, top], { dir: "v", off: VM.p([-47, 0])[0] - VM.p([-20, 0])[0], text: `e=${K.fmt(M.CAP_TOP - top, 1)}`, id: "dim-hot" });

  const [fx, fy] = VB.p([-M.E, 0]);
  el.fly.setAttribute("transform", `rotate(${K.r2(-deg(phi))} ${fx} ${fy})`);

  // the chart
  if (Math.abs(th - shownTh) > 0.5) {
    const loop = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * 2 * Math.PI;
      loop.push([M.vTotal(a), M.pressure(a, th, M.TC)]);
    }
    el.area.setAttribute("points", pts(loop));
    shownTh = th;
  }
  el.traceNow.setAttribute("points", pts(now));
  el.tracePrev.setAttribute("points", pts(prev));
  const p = M.pressure(phi, th, M.TC);
  el.dot.setAttribute("cx", cx(M.vTotal(phi)));
  el.dot.setAttribute("cy", cy(p));

  const c = cycleAt(th);
  const w = c.w;
  el.q1.textContent = `Qh ${c.qh.toFixed(2)} J → W ${w.toFixed(2)} J + Qc ${c.qc.toFixed(2)} J`;
  el.q2.textContent = `W/Qh ${Math.round((100 * w) / Math.max(1e-6, c.qh))} % = 1 − Tc/Th`;
  const rpm = M.rpm(omega);
  const text = `Th ${Math.round(th)} K · Tc ${M.TC} K · p ${p.toFixed(2)} bar · ${Math.round(rpm)} rpm · W ${w.toFixed(2)} J · P ${((w * rpm) / 60).toFixed(1)} W`;
  el.readout.textContent = text;
  say(`Hot cap ${Math.round(th)} kelvin, cooler ${M.TC} kelvin, ${Math.round(rpm)} revolutions per minute, ${w.toFixed(2)} joules per cycle.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 8,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 5 s, drawn once.
  const fake = { touring: true, reduced: false, frozen: false, clock: 0 };
  for (let t = 0; t < 5; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

// Turn the engine by hand: the drive angle follows the pointer's angle about a gear or the flywheel.
function toSheet(e) {
  const m = svg.getScreenCTM();
  return m ? [(e.clientX - m.e) / m.a, (e.clientY - m.f) / m.d] : [e.clientX, e.clientY];
}
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let id = null;
  let centre = [0, 0];
  let sign = 1;
  let last = 0;
  const angle = ([x, y]) => Math.atan2(-(y - centre[1]), x - centre[0]);
  hit.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    hit.setPointerCapture(id);
    const pt = toSheet(e);
    if (hit.dataset.drag === "B") {
      centre = VB.p([-M.E, 0]);
      sign = 1;
    } else if (pt[0] < VM.p([0, 0])[0]) {
      centre = VM.p([-M.E, 0]);
      sign = 1;
    } else {
      centre = VM.p([M.E, 0]);
      sign = -1;
    }
    last = angle(pt);
    dragging = true;
    live.input();
    e.preventDefault();
  });
  hit.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const a = angle(toSheet(e));
    let d = a - last;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    last = a;
    advance(sign * d);
    live.input();
  });
  const stop = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    dragging = false;
    live.input();
  };
  hit.addEventListener("pointerup", stop);
  hit.addEventListener("pointercancel", stop);
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") {
    burner = Math.min(1, Math.max(0, burner + (k === "ArrowUp" ? 0.1 : -0.1)));
    flame = true;
  } else if (k === "ArrowLeft" || k === "ArrowRight") advance((k === "ArrowRight" ? 1 : -1) * M.DIR * (Math.PI / 12));
  else if (k === " ") flame = !flame;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
