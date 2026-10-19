// Page code for propeller.html. K (kit), L (runtime), C (self-check), M (model), X (extra) and
// P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VS = M.LETTERS.map((k) => K.view(specs[k]));
const { C1, C2, C3, KV, KL, BOXES } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;

const el = {
  vt: M.LETTERS.map((k) => $(`vt-${k}`)),
  flow: M.LETTERS.map((k) => $(`flow-${k}`)),
  st: M.LETTERS.map((k) => $(`st-${k}`)),
  jCursor: $("j-cursor"),
  jCt: $("j-ct"),
  jCp: $("j-cp"),
  jEta: $("j-eta"),
  spanPhi: $("span-phi"),
  spanAlpha: $("span-alpha"),
  tCursor: $("t-cursor"),
  tRpm: $("t-rpm"),
  tThr: $("t-thr"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// the stations' fixed geometry: leading edge and quarter chord on the sheet, the chord in m
const GEO = M.STATIONS.map((x, i) => {
  const r = x * M.R;
  const pts = P.sectionPoints(r);
  return { r, c: pts.c / 1000, le: VS[i].p(pts.le), qc: VS[i].p(pts.qc), o: VS[i].p([0, 0]) };
});

// ---------------------------------------------------------------- state
let s = M.shaft();
let mode = "tour"; // "tour": the tour drives it; "free": airspeed and throttle are the reader's
let vNow = 0; // kt
let vWant = 0;
let thrNow = M.THR_IDLE;
let thrWant = M.THR_IDLE;
const flowPhase = [0, 0, 0, 0];

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  if (live.touring && mode !== "tour") {
    // the tour takes over again from the start: idle on the ground
    mode = "tour";
    s = M.shaft();
  }
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s.t -= M.TOUR; // the shaft keeps its speed into the next lap
      vNow = M.speedAt(s.t);
      thrNow = M.throttleAt(s.t);
    } else {
      vNow = live.reduced ? vWant : L.follow(vNow, vWant, 1.6, h);
      thrNow = live.reduced ? thrWant : L.follow(thrNow, thrWant, 5, h);
      M.stepShaft(s, h, vNow * M.KT, thrNow);
    }
  }
  for (let k = 0; k < 4; k++) {
    const st = s.st[k];
    const w = 2 * Math.PI * s.n * (GEO[k].r / 1000) * Math.hypot(st.ua, st.ut);
    flowPhase[k] = (flowPhase[k] + w * dt * 0.22) % 1200;
  }
  if (mode === "tour") return true;
  const settling = Math.abs(vNow - vWant) > 0.05 || Math.abs(thrNow - thrWant) > 1e-3;
  const spinning = Math.abs(M.engineTorque(s.rpm, thrNow) - s.Q) > 0.5;
  return settling || spinning;
}

// ---------------------------------------------------------------- drawing helpers
const jx = (J) => K.r2(C1.x0 + (Math.min(C1.jMax, Math.max(0, J)) / C1.jMax) * (C1.x1 - C1.x0));
const cy1 = (c) => K.r2(C1.y1 - ((Math.min(C1.cMax, Math.max(C1.cMin, c)) - C1.cMin) / (C1.cMax - C1.cMin)) * (C1.y1 - C1.y0));
const ax2 = (x) => K.r2(C2.x0 + ((x - C2.xMin) / (C2.xMax - C2.xMin)) * (C2.x1 - C2.x0));
const ay2 = (a) => K.r2(C2.y1 - ((Math.min(C2.aMax, Math.max(C2.aMin, a)) - C2.aMin) / (C2.aMax - C2.aMin)) * (C2.y1 - C2.y0));
const tx3 = (t) => K.r2(C3.x0 + (Math.min(C3.tMax, Math.max(0, t)) / C3.tMax) * (C3.x1 - C3.x0));
const ry3 = (rpm) => K.r2(C3.y1 - (Math.min(C3.rpmMax, Math.max(0, rpm)) / C3.rpmMax) * (C3.y1 - C3.y0));
const ty3 = (T) => K.r2(C3.y1 - (Math.min(C3.tkMax, Math.max(0, T / 1000)) / C3.tkMax) * (C3.y1 - C3.y0));

// parallel lines across a box along the relative wind, sheet direction (dx, dy)
function flowLines(b, dx, dy) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const nx = -dy;
  const ny = dx;
  const half = Math.hypot(b.w, b.h) / 2;
  let d = "";
  for (let o = -half; o <= half; o += 13) {
    const px = cx + nx * o;
    const py = cy + ny * o;
    d += `M${K.r2(px - dx * half)} ${K.r2(py - dy * half)}L${K.r2(px + dx * half)} ${K.r2(py + dy * half)}`;
  }
  return d;
}
const shown = { phi: [99, 99, 99, 99] };

function render(live) {
  const nRev = s.n; // rev/s
  // ---- the velocity triangles at the four stations
  for (let k = 0; k < 4; k++) {
    const st = s.st[k];
    const g = GEO[k];
    const wr = 2 * Math.PI * nRev * (g.r / 1000); // the blade's own speed, m/s
    const Ut = st.ut * wr; // tangential: ωr less the swirl
    const Ua = st.ua * wr; // axial: V plus the inflow
    const W = Math.hypot(Ut, Ua);
    const [lx, ly] = g.le;
    const ex = Ut * KV;
    const ey = Ua * KV;
    const corner = [lx, ly - ey];
    const tail = [lx - ex, ly - ey];
    let out = "";
    out += X.vec(tail[0], tail[1], corner[0], corner[1], "thin", "head", 5);
    out += X.vec(corner[0], corner[1], lx, ly, "thin", "head", 5);
    out += X.vec(tail[0], tail[1], lx, ly, "vis accent", "head accent-fill", 6.5);
    // lift per metre of blade: perpendicular to W, toward the cambered back while c_l > 0
    const lift = 0.5 * M.RHO * W * W * g.c * st.cl;
    const len = lift * KL;
    const ph = Math.atan2(Ua, Ut);
    const [qx, qy] = g.qc;
    out += X.vec(qx, qy, qx + Math.sin(ph) * len, qy - Math.cos(ph) * len, "thin", "head", 5);
    el.vt[k].innerHTML = out;
    if (Math.abs(st.phi - shown.phi[k]) > 0.15) {
      el.flow[k].setAttribute("d", flowLines(BOXES[k], Ut / (W || 1), Ua / (W || 1)));
      shown.phi[k] = st.phi;
    }
    el.flow[k].setAttribute("stroke-dashoffset", K.r2(-flowPhase[k]));
    el.st[k].textContent = `φ ${st.phi.toFixed(1)}° · α ${st.alpha.toFixed(1)}°${st.stalled ? " STALLED" : ""} · W ${Math.round(W)} m/s`;
  }
  // ---- diagram 1: the operating point on the J curves
  const J = s.J;
  el.jCursor.setAttribute("d", `M${jx(J)} ${C1.y0}V${C1.y1}`);
  el.jCt.setAttribute("cx", jx(J));
  el.jCt.setAttribute("cy", cy1(s.CT));
  el.jCp.setAttribute("cx", jx(J));
  el.jCp.setAttribute("cy", cy1(s.CP));
  const etaOn = s.CT > 0 && s.CP > 0 && J <= C1.jMax;
  el.jEta.style.display = etaOn ? "" : "none";
  el.jEta.setAttribute("cx", jx(J));
  el.jEta.setAttribute("cy", cy1(s.eta * C1.cMax));
  // ---- diagram 2: the helix angle along the blade, and the gap to β that is α
  let dPhi = "";
  let up = "";
  let down = "";
  M.SPAN_X.forEach((x, i) => {
    const p = s.span[i].phi;
    const b = M.beta(x * M.R);
    dPhi += `${i ? "L" : "M"}${ax2(x)} ${ay2(p)}`;
    up += `${i ? "L" : "M"}${ax2(x)} ${ay2(b)}`;
    down = `L${ax2(x)} ${ay2(p)}` + down;
  });
  el.spanPhi.setAttribute("d", dPhi);
  el.spanAlpha.setAttribute("d", up + down + "Z");
  // ---- diagram 3: the tour cursor
  const onTour = mode === "tour";
  for (const node of [el.tCursor, el.tRpm, el.tThr]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    el.tCursor.setAttribute("d", `M${tx3(s.t)} ${C3.y0}V${C3.y1}`);
    el.tRpm.setAttribute("cx", tx3(s.t));
    el.tRpm.setAttribute("cy", ry3(s.rpm));
    el.tThr.setAttribute("cx", tx3(s.t));
    el.tThr.setAttribute("cy", ty3(s.T));
  }
  // ---- the readout
  const where = onTour ? M.phaseName(s.t) : s.Q < 0 ? "WINDMILLING" : `THR ${Math.round(thrNow * 100)} %`;
  const eta = s.CT > 0 && s.CP > 0 ? s.eta.toFixed(2) : "—";
  el.readout.textContent = `${Math.round(s.rpm)} rpm · ${Math.round(vNow)} kt · J ${J.toFixed(2)} · T ${(s.T / 1000).toFixed(2)} kN · ${(s.P / 1000).toFixed(0)} kW · η ${eta} · ${where}`;
  const a75 = s.st[2].alpha;
  say(`${Math.round(s.rpm)} rpm at ${Math.round(vNow)} knots, advance ratio ${J.toFixed(2)}, thrust ${Math.round(s.T)} newtons, ${(s.P / 1000).toFixed(0)} kilowatts, angle of attack at three quarters radius ${a75.toFixed(1)} degrees, ${where.toLowerCase()}.`, live.clock);
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
  // a still, true moment: the static run-up, the root sections stalled
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 4.6; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

function toFree() {
  if (mode === "tour") {
    mode = "free";
    vWant = vNow;
    thrWant = thrNow;
  }
}
const clampV = (v) => Math.min(150, Math.max(0, v));
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  let v0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      toFree();
      v0 = vWant;
      live.input();
    },
    move: (dy) => {
      vWant = clampV(v0 - dy * 0.5);
      live.input();
    },
    end: () => live.input(),
  });
}
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") {
    toFree();
    vWant = clampV(vWant + (k === "ArrowUp" ? 5 : -5));
  } else if (k === "ArrowLeft" || k === "ArrowRight") {
    toFree();
    thrWant = Math.min(1, Math.max(M.THR_IDLE, thrWant + (k === "ArrowRight" ? 0.1 : -0.1)));
  } else if (k === " ") {
    mode = "tour";
    s = M.shaft();
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
  if (k === " ") live.lastInput = -Infinity;
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
