// Page code for airframe.html. K (kit), L (runtime), C (self-check), M (the aircraft's model), X and P
// (its helpers and parts) and ST (the structural model) are inlined above this script as namespaces.
// One number drives every view: the load factor n. The lift above the wing, the shear and moment
// diagrams, the front spar's stress colour (front view and cutaway), the strut's force and the readouts
// all scale from ST's 1 g distributions.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VB = K.view(specs.B);
const VF = K.view(specs.F);
const D = __DATA__;
const CH = D.CH;
const $ = (id) => document.getElementById(id);
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let n = 1;
let nT = 1;
let mode = "tour";
let tourT = 0;
let phase = ST.phaseAt(0);
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    mode = "tour";
    tourT = 0;
  }
  const k = Math.max(1, Math.ceil(dt * 240));
  const h = dt / k;
  for (let i = 0; i < k; i++) {
    if (mode === "tour") {
      tourT = (tourT + h) % ST.TOUR_PERIOD;
      const s = ST.tourAt(tourT);
      nT = s.n;
      phase = s.phase;
      n = nT; // the tour is the load factor itself (a gust is fast)
    } else n = live.reduced ? nT : L.follow(n, nT, 6, h);
  }
  return mode === "tour" || Math.abs(n - nT) > 0.002;
}

// ---------------------------------------------------------------- drawing helpers
const wx = (ws) => K.r2(VB.p([ws, 0])[0]);
const sy = (v) => K.r2(CH.sY1 - ((Math.max(CH.v0, Math.min(CH.v1, v)) - CH.v0) / (CH.v1 - CH.v0)) * (CH.sY1 - CH.sY0));
const my = (m) => K.r2(CH.mY1 - ((Math.max(CH.m0, Math.min(CH.m1, m)) - CH.m0) / (CH.m1 - CH.m0)) * (CH.mY1 - CH.mY0));
// the shear diagram steps at the strut: draw it as a polyline that jumps there
function curve(arr, scale, fy) {
  return ST.YS_GRID.map((y, i) => `${wx(y)},${fy((arr[i] * scale) / 1000)}`).join(" ");
}
const cells = Array.from({ length: D.cells }, (_, i) => $(`fsb-${i}`));
const bays = D.bays.map(([i, a, b]) => ({ el: $(`isb-${i}`), a, b }));
function liftPoly(nn) {
  // the lift per mm above the wing's top line, at 30 mm clear of it, every 122.75 mm of span
  const top = [];
  const base = [];
  for (let ws = 0; ws <= M.TIP_WS + 1e-6; ws += 122.75) {
    const y0 = VB.p([ws, P.wingTopAt(Math.max(ws, M.CABIN.half)) + 40])[1];
    const w = (ST.W / 2) * ST.schrenk(ws) * nn;
    base.push([wx(ws), K.r2(y0)]);
    top.push([wx(ws), K.r2(y0 - Math.max(-30, Math.min(70, w * D.LIFT_K)))]);
  }
  const d = `M${[...top, ...base.reverse()].map((p) => p.join(" ")).join("L")}Z`;
  // arrows every 1000 mm, pointing up from the base line (down when n < 0)
  let arrows = "";
  for (let ws = 500; ws <= 5000; ws += 750) {
    const y0 = VB.p([ws, P.wingTopAt(Math.max(ws, M.CABIN.half)) + 40])[1];
    const len = (ST.W / 2) * ST.schrenk(ws) * nn * D.LIFT_K;
    if (Math.abs(len) < 6) continue;
    const s = Math.sign(len);
    const tip = y0 - Math.max(-30, Math.min(70, len));
    arrows += `<path class="accent" d="M${wx(ws)} ${K.r2(y0)}V${K.r2(tip + s * 4)}"/><path class="head-a" d="M${wx(ws)} ${K.r2(tip)}l-2.4 ${K.r2(s * 5.5)}h4.8z"/>`;
  }
  return `<path class="lift" d="${d}"/>${arrows}`;
}
// an accent arrow along a sheet line, with its head at b
function arrow(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const hx = b[0] - ux * 6;
  const hy = b[1] - uy * 6;
  return `<path class="accent" d="M${K.r2(a[0])} ${K.r2(a[1])}L${K.r2(hx)} ${K.r2(hy)}"/><path class="head-a" d="M${K.r2(b[0])} ${K.r2(b[1])}L${K.r2(hx - uy * 2.6)} ${K.r2(hy + ux * 2.6)}L${K.r2(hx + uy * 2.6)} ${K.r2(hy - ux * 2.6)}Z"/>`;
}

const shown = { n: -1e9 };
function render(live) {
  if (Math.abs(n - shown.n) > 0.004) {
    const L1 = ST.loads(n);
    $("b-lift").innerHTML = liftPoly(n);
    $("s-cur").setAttribute("points", curve(ST.V1, n, sy));
    $("s-free").setAttribute("points", curve(ST.V1_FREE, n, sy));
    $("m-cur").setAttribute("points", curve(ST.M1, n / 1000, my));
    $("m-free").setAttribute("points", curve(ST.M1_FREE, n / 1000, my));
    $("m-dot").setAttribute("cx", wx(L1.sigmaAt));
    $("m-dot").setAttribute("cy", my(L1.mMax / 1e6));
    $("m-peak").textContent = `${K.fmt(L1.mMax / 1e6, 1)} kN·m AT THE STRUT`;
    $("m-freet").textContent = `UNBRACED ROOT ${K.fmt(L1.mFree / 1e6, 1)}`;
    // the stress colour: each cell's |σ| against F_ty
    for (let i = 0; i < cells.length; i++) if (cells[i]) cells[i].setAttribute("fill-opacity", K.r2(Math.min(1, ST.usage(n, i)) * 0.9));
    for (const b of bays) {
      let u = 0;
      for (let i = b.a; i < b.b; i++) u = Math.max(u, ST.usage(n, i));
      b.el?.setAttribute("fill-opacity", K.r2(Math.min(1, u) * 0.9));
    }
    // the strut's force: an arrow along it in the front view (tension pulls the fittings together)
    const A = VB.p(D.strutA);
    const B = VB.p(D.strutB);
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const t = L1.T >= 0;
    const ux = (B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]);
    const uy = (B[1] - A[1]) / Math.hypot(B[0] - A[0], B[1] - A[1]);
    const off = [mid[0] + uy * 9, mid[1] - ux * 9];
    const lenA = 26;
    const p0 = [off[0] + ux * lenA, off[1] + uy * lenA];
    const p1 = [off[0] - ux * lenA, off[1] - uy * lenA];
    $("b-strut").innerHTML = `<g data-role="fluid">${t ? arrow(p0, p1) + arrow(p1, p0) : arrow(p0, [off[0] + ux * 3, off[1] + uy * 3]) + arrow(p1, [off[0] - ux * 3, off[1] - uy * 3])}</g>` +
      `<g data-role="label"><text class="t t-sm t-accent" x="${K.r2(mid[0] + 26)}" y="${K.r2(mid[1] + 26)}">T ${K.fmt(L1.T / 1000, 1)} kN ${t ? "TENSION" : "COMPRESSION"}</text></g>`;
    // detail F: the strut's pull on the bolt
    const bolt = VF.p(D.fBolt);
    const far = VF.p([D.fBolt[0] + D.fDir[0] * 150, D.fBolt[1] + D.fDir[1] * 150]);
    const near = VF.p([D.fBolt[0] + D.fDir[0] * 40, D.fBolt[1] + D.fDir[1] * 40]);
    $("f-arrow").innerHTML = t ? arrow(near, far) : arrow(far, near);
    void bolt;
    $("f-t").textContent = `T ${K.fmt(L1.T / 1000, 1)} kN · BOLT RF ${K.fmt(ST.BOLT_ULT / (1.5 * Math.max(1, Math.abs(L1.T))), 2)}`;
    // readouts
    const over = Math.abs(n) > ST.N_LIMIT + 0.01 ? (Math.abs(n) > ST.N_ULT ? " · ABOVE ULTIMATE" : " · ABOVE LIMIT") : "";
    $("readout").textContent = `n ${K.fmt(n, 2)} g · ${mode === "tour" ? phase : "BY HAND"} · STRUT T ${K.fmt(L1.T / 1000, 1)} kN${over}`;
    $("readout2").textContent = `σ CAP ${Math.round(L1.sigma)} MPa AT WS ${Math.round(L1.sigmaAt)} · ×1.5 ${Math.round(1.5 * L1.sigma)} / F_tu ${ST.F_TU} · RF ${L1.rfUlt > 99 ? "—" : K.fmt(L1.rfUlt, 2)}`;
    say(`Load factor ${n.toFixed(1)} g. Strut ${t ? "tension" : "compression"} ${Math.abs(L1.T / 1000).toFixed(1)} kilonewtons. Spar cap stress ${Math.round(Math.abs(L1.sigma))} megapascals, reserve factor ${L1.rfUlt > 99 ? "large" : L1.rfUlt.toFixed(2)}.`, live.clock);
    shown.n = n;
  }
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 8, onFrozen: () => q.check && C.selfCheck(svg) });
if (live.reduced && !live.frozen) {
  // a still, true moment: the limit pull-up
  n = nT = ST.N_LIMIT;
  phase = ST.phaseAt(13);
  render(live);
}
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") {
    if (mode === "tour") nT = Math.round(n * 5) / 5;
    mode = "hand";
    nT = Math.max(ST.N_NEG, Math.min(ST.N_ULT, Math.round((nT + (k === "ArrowUp" ? 0.2 : -0.2)) * 100) / 100));
  } else if (k === " ") {
    mode = "tour";
    tourT = 0;
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});
if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
