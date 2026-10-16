// Page code for gear-pump.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VA = K.view(specs.A);
const VC = K.view(specs.C);
const VB = K.view(specs.B);
const VF = K.view(specs.F);
const CH = __CHART1__;
const C2H = __CHART2__;
const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;

const el = {
  gears: [["A", VA], ["C", VC]].map(([id, V]) => [$(`g1-${id}`), $(`g2-${id}`), V]),
  oil: [["A", VA], ["C", VC]].map(([id, V]) => [Array.from({ length: P.BANDS }, (_, i) => $(`oil-${id}-${i}`)), V]),
  shafts: [$("s1-B"), $("s2-B")],
  key: $("key-B"),
  oilB: ["l", "m", "r"].map((k) => $(`oilB-B-${k}`)),
  contacts: $("contacts-C"),
  shaftF: $("shaft-F"),
  balloonKey: $("balloon-key"),
  qNow: $("q-now"),
  etaNow: $("eta-now"),
  qTheory: $("q-theory"),
  opDot: $("op-dot"),
  opDrop: $("op-drop"),
  pCurve: $("p-curve"),
  pk: Array.from({ length: M.Z }, (_, i) => $(`pk-${i}`)),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2.5);
const [fx, fy] = VF.p([0, 0]);

// ---------------------------------------------------------------- state
let th = 0; // turned angle of the drive gear, rad (clockwise in A-A)
let p = 30; // outlet pressure, bar
let pWant = 30;
let n = M.N_RATED; // speed, rpm
let nWant = M.N_RATED;
let paused = false;
let dragging = false;

// The tour: 20 s, the gears turning at 1500 rpm (shown 1/300), the outlet pressure rising from
// 30 to 250 bar, holding, and falling back. 20 s at 30°/s is twenty tooth pitches, so it loops.
const TOUR = 20;
function tourP(t) {
  const u = t % TOUR;
  if (u < 2) return 30;
  if (u < 8) return 30 + 220 * L.ease((u - 2) / 6);
  if (u < 12) return 250;
  if (u < 17) return 250 - 220 * L.ease((u - 12) / 5);
  return 30;
}
let tourT = 0;

function step(dt, live) {
  const sub = Math.max(1, Math.ceil(dt * 240));
  const h = dt / sub;
  for (let i = 0; i < sub; i++) {
    if (live.touring) {
      tourT += h;
      pWant = tourP(tourT);
      nWant = M.N_RATED;
    }
    p = live.reduced && !live.touring ? pWant : L.follow(p, pWant, live.touring ? 40 : 8, h);
    n = live.reduced && !live.touring ? nWant : L.follow(n, nWant, 8, h);
    if (!dragging && !paused && !(live.reduced && !live.touring)) th += M.degPerSec(n) * rad * h;
  }
  th %= 2 * Math.PI;
  return Math.abs(p - pWant) > 0.05 || Math.abs(n - nWant) > 0.5;
}

// ---------------------------------------------------------------- render
const chX = (pp) => K.r2(CH.x0 + (pp / CH.pMax) * (CH.x1 - CH.x0));
const chY = (qq) => K.r2(CH.y1 - (Math.max(0, qq) / CH.qMax) * (CH.y1 - CH.y0));
const c2X = (deg) => K.r2(C2H.x0 + (deg / C2H.aMax) * (C2H.x1 - C2H.x0));
const c2Y = (pp) => K.r2(C2H.y1 - (pp / M.P_MAX) * (C2H.y1 - C2H.y0));
const ARC = M.SEAL_ARC / rad;
let shownN = -1;

function render(live) {
  for (const [g1, g2, V] of el.gears) {
    g1.innerHTML = P.gearA(V, 1, th);
    g2.innerHTML = P.gearA(V, 2, th);
  }
  for (const [paths, V] of el.oil) {
    const bands = P.oilBands(V, th, p);
    paths.forEach((node, i) => node.setAttribute("d", bands[i]));
  }
  el.shafts[0].innerHTML = P.gearShaftB(VB, 1, th);
  el.shafts[1].innerHTML = P.gearShaftB(VB, 2, th);
  el.key.innerHTML = P.keyB(VB, th);
  const oil = P.oilB(th);
  el.oilB.forEach((node, i) => {
    const o = oil[i];
    if (!o) return node.setAttribute("d", "");
    node.setAttribute("d", K.d(VB, P.uz(o.rect)));
    node.setAttribute("fill-opacity", P.bandOpacity(P.bandOf(M.space(o.a, p))));
  });
  // the gap between the gears at the cut: its oil is either side of the mesh, keep it in step
  el.contacts.innerHTML = P.contacts(th)
    .map((c) => {
      const [x, y] = VC.p(c);
      return `<circle class="dot" cx="${x}" cy="${y}" r="3.2"/>`;
    })
    .join("");
  el.shaftF.setAttribute("transform", `rotate(${K.r2(-th / rad)} ${fx} ${fy})`);
  el.balloonKey.innerHTML = K.balloon(VF, P.keyPointF(th), P.KEY_BALLOON, 11, { target: 11 });

  // DIAGRAM 1: the curve for this speed, the operating point and the leakage it loses
  if (Math.abs(n - shownN) > 0.5) {
    const pts = [];
    for (let pp = 0; pp <= CH.pMax; pp += 10) pts.push(`${chX(pp)},${chY(M.flow(n, pp))}`);
    el.qNow.setAttribute("points", pts.join(" "));
    const ep = [];
    for (let pp = 0; pp <= CH.pMax; pp += 10) ep.push(`${chX(pp)},${K.r2(CH.y1 - ((M.etaV(n, pp) - CH.eMin) / (1 - CH.eMin)) * (CH.y1 - CH.y0))}`);
    el.etaNow.setAttribute("points", ep.join(" "));
    el.qTheory.setAttribute("d", `M${CH.x0} ${chY(M.qTheory(n))}H${CH.x1}`);
    shownN = n;
  }
  const Q = M.flow(n, p);
  el.opDot.setAttribute("cx", chX(p));
  el.opDot.setAttribute("cy", chY(Q));
  el.opDrop.setAttribute("d", `M${chX(p)} ${chY(M.qTheory(n))}V${chY(Q)}`);

  // DIAGRAM 2: the pressure along the sealed arc, and where each of the drive gear's spaces is now
  const curve = [];
  for (let a = 0; a <= 360; a += 6) curve.push(`${c2X(a)},${c2Y(a <= ARC ? M.space(M.IN_EDGE - a * rad, p).p : a < 300 ? p : 0)}`);
  el.pCurve.setAttribute("points", curve.join(" "));
  P.spaces(th, p)
    .filter((s) => s.gear === 1)
    .forEach((s, i) => {
      const g = s.c + M.PITCH / 2;
      const x = ((((M.IN_EDGE - g) / rad) % 360) + 360) % 360;
      el.pk[i].setAttribute("cx", c2X(x));
      el.pk[i].setAttribute("cy", c2Y(s.p));
    });

  const eta = M.etaV(n, p);
  el.readout.textContent =
    `${Math.round(n)} rpm · ${Math.round(p)} bar · Q ${Q.toFixed(1)} L/min · ηv ${eta.toFixed(3)} · ` +
    `T ${M.torque(p).toFixed(1)} N·m · ${M.powerIn(n, p).toFixed(2)} kW`;
  say(`${Math.round(n)} rpm at ${Math.round(p)} bar: flow ${Q.toFixed(1)} litres a minute, volumetric efficiency ${Math.round(eta * 100)} percent, torque ${M.torque(p).toFixed(0)} newton metres.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 6, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to 9 s, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 9; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

// Turn the gears by dragging round the drive gear's centre (in A-A or in Detail C).
for (const hit of svg.querySelectorAll("[data-turn]")) {
  const V = hit.dataset.turn === "A" ? VA : VC;
  let id = null;
  let last = 0;
  const angle = (e) => {
    const m = svg.getScreenCTM();
    const x = (e.clientX - m.e) / m.a;
    const y = (e.clientY - m.f) / m.d;
    const [cx, cy] = V.p(P.C1);
    return Math.atan2(-(y - cy), x - cx);
  };
  hit.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    hit.setPointerCapture(id);
    last = angle(e);
    dragging = true;
    live.input();
    e.preventDefault();
  });
  hit.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const a = angle(e);
    let d = a - last;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    th -= d; // the drive gear turns clockwise for positive th
    last = a;
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
  if (k === "ArrowUp" || k === "ArrowDown") pWant = Math.min(M.P_MAX, Math.max(0, pWant + (k === "ArrowUp" ? 10 : -10)));
  else if (k === "ArrowRight" || k === "ArrowLeft") nWant = Math.min(M.N_MAX, Math.max(M.N_MIN, nWant + (k === "ArrowRight" ? 250 : -250)));
  else if (k === " ") paused = !paused;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
