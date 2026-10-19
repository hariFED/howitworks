// Page code for wing-flaps.html. K (kit), L (runtime), C (self-check), M (model), X (extra) and P
// (parts) are inlined above this script as namespaces. One state (model.mjs's system) drives every
// view: the selector lever leads, the switches decide, the motor turns the screw, the nut moves the
// bellcranks, the rods and cables move both flaps along their tracks, the follow-up turns the carrier.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const VA = K.view(specs.A);
const VB = K.view(specs.B);
const VC = K.view(specs.C);
const VP = K.view(specs.P);
const VD = K.view(specs.D);
const { CH, CV, CK, EC, DIM_TE_Y, DIM_C_Y, B } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const sec = P.sec;
const act = P.act;
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let st = M.system(0, 0);
st.v = M.TOUR_V;
let mode = "tour"; // "tour": the tour moves the selector; "hand": the reader does
let tourT = 0;
let vTarget = M.TOUR_V;
let dragLever = null; // the lever's angle while the knob is dragged
const shown = { s: -1e9, spin: -1e9, lever: -1e9, carrier: -1e9, v: -1e9, run: "" };

function step(dt, live) {
  if (live.touring && mode !== "tour") {
    // the tour takes over from where the flaps are
    mode = "tour";
    const f = M.flapOf(M.sOfNut(st.n));
    tourT = f > 25 ? 13.6 : f > 15 ? 9.8 : f > 5 ? 5.8 : 0;
    vTarget = M.TOUR_V;
  }
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      tourT += h;
      if (tourT >= M.TOUR_PERIOD) tourT -= M.TOUR_PERIOD;
      st.sel = M.selAt(tourT);
    }
    st.leverAt = dragLever;
    st.v = live.reduced ? vTarget : L.follow(st.v, vTarget, 3, h);
    M.step(st, h);
  }
  return mode === "tour" || st.w > 0 || st.down || st.up || Math.abs(st.v - vTarget) > 0.05 || dragLever != null;
}

// ---------------------------------------------------------------- drawing helpers
const cx = (a) => K.r2(CH.x0 + ((a - CH.a0) / (CH.a1 - CH.a0)) * (CH.x1 - CH.x0));
const cy = (c) => K.r2(CH.y1 - ((Math.max(CH.c0, Math.min(CH.c1, c)) - CH.c0) / (CH.c1 - CH.c0)) * (CH.y1 - CH.y0));
const curvePts = (f) => {
  const out = [];
  for (let a = CH.a0; a <= Math.min(CH.a1, M.alphaPeak(f) + 4.5); a += 0.25) out.push(`${cx(a)},${cy(M.clCurve(a, f))}`);
  return out.join(" ");
};
const vx = (f) => K.r2(CV.x0 + (f / CV.f1) * (CV.x1 - CV.x0));
const vy = (v) => K.r2(CV.y1 - ((Math.max(CV.v0, Math.min(CV.v1, v)) - CV.v0) / (CV.v1 - CV.v0)) * (CV.y1 - CV.y0));
const kx = (n) => K.r2(CK.x0 + (Math.max(0, Math.min(CK.n1, n)) / CK.n1) * (CK.x1 - CK.x0));
const ky = (v) => K.r2(CK.y1 - (Math.max(0, Math.min(CK.y1v, v)) / CK.y1v) * (CK.y1 - CK.y0));

function sectionInto(V, pre, s) {
  $(`${pre}-act`).innerHTML = P.actuatorEnd(V, s);
  $(`${pre}-bc`).innerHTML = P.bellcrankEdge(V, s);
  $(`${pre}-nose`).innerHTML = P.flapNose(V, s);
  $(`${pre}-lug`).innerHTML = P.lug(V, s);
  $(`${pre}-rod`).innerHTML = P.rodSection(V, s);
  $(`${pre}-bracket`).innerHTML = P.bracket(V, s);
  $(`${pre}-aft`).innerHTML = P.flapAft(V, s);
  $(`${pre}-rollers`).innerHTML = P.rollers(V, s);
}
function flowInto(V, id, s) {
  const f = P.slotFlow(s);
  const k = P.flowStrength(f.gap);
  const node = $(id);
  node.innerHTML = k > 0 ? f.lines.map((l) => X.flowLine(V, sec(l))).join("") : "";
  node.setAttribute("opacity", K.r2(0.25 + 0.75 * k));
}
// where the moving balloons' dots go, in the section's world
function dotA(n, s) {
  const Pz = M.poseOfS(s);
  const b = M.betaOf(s);
  if (n === "4") return M.place([1450, M.lo(1450) + 0.6], Pz);
  if (n === "6") return M.place([1292, M.lo(1292) - 6], Pz);
  if (n === "7") return M.place([M.R2_0[0], M.R2_0[1] - 8], Pz);
  if (n === "8") return M.place([M.LUG[0] + 14, M.LUG[1] + 6], Pz);
  if (n === "9") {
    const a = M.lugAt(s);
    const h = M.holeOf(b, "R");
    return [h[0] + (a[0] - h[0]) * 0.55, M.ROD_Y + (a[1] - M.ROD_Y) * 0.55];
  }
  const xs = ["R", "A", "C1", "C2", "F"].map((k) => M.holeOf(b, k)[0]);
  return [Math.min(...xs) - 7, M.BC.y];
}
function dimsA(s) {
  const g = M.geometry(s);
  let out = "";
  const TE0 = M.geometry(0).te;
  if (g.te[0] - TE0[0] >= 1) out += K.dim(VA, sec([TE0])[0], sec([g.te])[0], { dir: "h", off: DIM_TE_Y - VA.p(sec([TE0])[0])[1], text: `${Math.round(g.te[0] - TE0[0])}`, id: "dim-te" });
  if (g.flap >= 12) out += X.angleDim(VA, sec([M.place(M.NOSE_C, g.P)])[0], 84, 180, 180 + g.flap, `${K.fmt(g.flap, 1)}°`, { id: "dim-ang" });
  return out;
}
function dimsB(s) {
  const g = M.geometry(s);
  if (g.gap < 3) return "";
  // the gap: from the lip to the flap's nearest point
  const pts = P.flapOutlineAt(s);
  let best = null;
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const c = pts[(i + 1) % pts.length];
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const t = Math.max(0, Math.min(1, ((M.LIP[0] - a[0]) * dx + (M.LIP[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const p = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - M.LIP[0], p[1] - M.LIP[1]);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return X.alignedDim(VB, sec([best])[0], sec([M.LIP])[0], `${Math.round(g.gap)}`, { id: "dim-gap", textAt: "end" });
}

function render(live) {
  const s = M.sOfNut(st.n);
  const g = M.geometry(s);
  const b = M.betaOf(s);
  const fl = M.flight(st.v, g.flap);
  if (Math.abs(s - shown.s) > 0.02) {
    sectionInto(VA, "a", s);
    $("b-flap").innerHTML = P.flapFull(VB, s);
    flowInto(VA, "a-flow", s);
    flowInto(VB, "b-flow", s);
    $("a-dyn").innerHTML = dimsA(s);
    $("b-dyn").innerHTML = dimsB(s);
    for (const [n, d] of Object.entries(LIVE.A)) $(`lb-${n}`).innerHTML = K.balloon(VA, sec([dotA(n, s)])[0], d.at, n, { target: n });
    // the plan: flaps, rods and lugs, the actuator, both bellcranks, the cables
    $("p-flap").innerHTML = P.planFlap(VP, s, 1) + P.planFlap(VP, s, -1);
    $("p-rods").innerHTML = P.planRod(VP, s, 1) + P.planRod(VP, s, -1) + P.planLug(VP, s, 1) + P.planLug(VP, s, -1);
    $("p-act").innerHTML = P.planActuator(VP, s);
    $("p-bc").innerHTML = P.planBellcrank(VP, b, 1) + P.planBellcrank(VP, b, -1);
    $("p-cables").innerHTML = P.planCables(VP, s) + P.planFollowUp(VP, s);
    // the plan's balloons: on the cables, which move spanwise with the bellcrank
    const F = M.holeOf(b, "F");
    const S2 = M.holeOf(b, "C2");
    const P1 = M.mirror(M.holeOf(b, "C1"));
    const w12 = LIVE.P[12].w;
    const t12 = (S2[1] - w12) / (S2[1] - P1[1]);
    $("lb-12").innerHTML = K.balloon(VP, P.pln([[S2[0] + (P1[0] - S2[0]) * t12, w12]])[0], LIVE.P[12].at, 12, { target: 12 });
    $("lb-13").innerHTML = K.balloon(VP, P.pln([[F[0], LIVE.P[13].w]])[0], LIVE.P[13].at, 13, { target: 13 });
    // the actuator: nut, actuating tube, limit switches, the live stroke
    const n = st.n;
    const len = M.LEN0 + n;
    $("c-nut").innerHTML = P.actNut(VC, n);
    $("c-rod").innerHTML = P.actRod(VC, n, len);
    $("c-sw").innerHTML = P.actSwitches(VC, n);
    $("c-dyn").innerHTML = n >= 2 ? K.dim(VC, act([[M.LEN0, 0]])[0], act([[len, 0]])[0], { dir: "h", off: DIM_C_Y - VC.p(act([[M.LEN0, 0]])[0])[1], text: K.fmt(n, 1), id: "dim-stroke" }) : "";
    $("lb-18").innerHTML = K.balloon(VC, act([[P.nutA(n) + 15, -11]])[0], LIVE.C[18].at, 18, { target: 18 });
    $("lb-19").innerHTML = K.balloon(VC, act([[len - 4, -9]])[0], LIVE.C[19].at, 19, { target: 19 });
    // diagram 3
    $("k-cur").setAttribute("d", `M${kx(n)} ${CK.y0}V${CK.y1}`);
    $("k-dot").setAttribute("cx", kx(n));
    $("k-dot").setAttribute("cy", ky(g.flap));
    // diagram 1's current curve
    $("cl-cur").setAttribute("points", curvePts(g.flap));
    shown.s = s;
  }
  if (Math.abs(st.spin - shown.spin) > 0.01) {
    $("c-screw").innerHTML = P.actScrew(VC, st.spin);
    shown.spin = st.spin;
  }
  // the selector: lever, carrier, cable, spring, switches
  const lv = st.lever;
  const cv = st.carrier;
  if (Math.abs(lv - shown.lever) > 0.02 || Math.abs(cv - shown.carrier) > 0.02) {
    $("d-carrier").innerHTML = P.selCarrier(VD, cv);
    $("d-cable").innerHTML = P.selCable(VD, cv);
    $("d-spring").innerHTML = P.selSpring(VD, cv);
    $("d-sw").innerHTML = P.selSwitches(VD, cv, lv);
    $("d-lever").innerHTML = P.selLever(VD, lv);
    const a = ((P.LEVER0 + lv) * Math.PI) / 180;
    $("lb-24").innerHTML = K.balloon(VD, [80 * Math.cos(a), 80 * Math.sin(a)], LIVE.D[24].at, 24, { target: 24 });
    shown.lever = lv;
    shown.carrier = cv;
  }
  // diagrams 1 and 2: the operating point and the C_L the wing needs at this airspeed
  $("cl-dot").setAttribute("cx", cx(fl.alpha));
  $("cl-dot").setAttribute("cy", cy(fl.stalled ? fl.cl * 0 + M.clmax(g.flap) : fl.cl));
  $("cl-need").setAttribute("d", `M${CH.x0} ${cy(fl.cl)}H${CH.x1}`);
  $("vs-dot").setAttribute("cx", vx(g.flap));
  $("vs-dot").setAttribute("cy", vy(fl.vs));
  $("vs-v").setAttribute("d", `M${CV.x0} ${vy(st.v)}H${CV.x1}`);
  $("vs-vt").setAttribute("y", K.r2(vy(st.v) - 3));
  if (Math.round(st.v) !== shown.v) {
    $("vs-vt").textContent = `${Math.round(st.v)} kt`;
    shown.v = Math.round(st.v);
  }
  // the circuit
  const run = st.w > 0 ? (st.dir > 0 ? "DOWN" : "UP") : "STOPPED";
  const key = `${st.limDown}${st.limUp}${st.down}${st.up}${run}`;
  if (key !== shown.run) {
    $("e-dn").innerHTML = P.circuitBranchH(EC.x + 66, EC.y + 6, 1, st.limDown, st.down);
    $("e-up").innerHTML = P.circuitBranchH(EC.x + 66, EC.y + 54, -1, st.limUp, st.up);
    $("e-run").textContent = run;
    shown.run = key;
  }
  // readouts
  const rpm = Math.round((st.w * 60) / (2 * Math.PI));
  const lim = !st.limDown ? "DOWN LIMIT OPEN" : !st.limUp ? "UP LIMIT OPEN" : "LIMITS CLOSED";
  const motor = st.w > 0 ? `MOTOR ${run} ${rpm} rpm ${st.I.toFixed(1)} A` : `MOTOR OFF · ${lim}`;
  $("readout").textContent = `SEL ${st.leverAt != null ? "…" : st.sel}° · FLAP ${g.flap.toFixed(1)}° · NUT ${st.n.toFixed(1)} mm · ${motor}`;
  $("readout2").textContent = `${Math.round(st.v)} kt · C_L ${fl.cl.toFixed(2)} · α ${fl.alpha.toFixed(1)}° · V_S ${fl.vs.toFixed(1)} kt · SLOT ${Math.round(g.gap)} mm · CHORD +${((100 * (g.chord - M.C)) / M.C).toFixed(1)} %${fl.stalled ? " · STALLED" : ""}${st.v > M.V_FE && g.flap > 0.5 ? " · ABOVE V_FE" : ""}`;
  say(
    `Selector ${st.sel} degrees, flaps ${g.flap.toFixed(0)} degrees, motor ${run.toLowerCase()}. ${Math.round(st.v)} knots, angle of attack ${fl.alpha.toFixed(1)} degrees, stall speed ${fl.vs.toFixed(0)} knots.`,
    live.clock
  );
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 8, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  // a still, true moment: flaps 20° on the way to 30°
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 12.6; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

function toHand() {
  if (mode === "tour") mode = "hand";
}
const stops = M.FLAP_STOPS;
function select(f) {
  toHand();
  dragLever = null;
  st.sel = f;
}
// drag the knob: the lever follows the pointer; on release it drops into the nearest detent
const hitEl = svg.querySelector('[data-drag="knob"]');
let lv0 = 0;
L.dragY(svg, hitEl, {
  start: () => {
    toHand();
    lv0 = st.lever;
    dragLever = lv0;
    live.input();
  },
  move: (dy) => {
    // the knob sits about 146 mm out: a sheet distance down turns the lever by that much over the radius
    const d = (dy / VD.k / 146) * (180 / Math.PI);
    dragLever = Math.max(-M.OVER, Math.min(M.MARKS[30] + M.OVER, lv0 + d));
    live.input();
  },
  end: () => {
    const lvNow = dragLever ?? st.lever;
    const best = stops.reduce((a, f) => (Math.abs(M.leverOf(f) - lvNow) < Math.abs(M.leverOf(a) - lvNow) ? f : a), 0);
    select(best);
    live.input();
  },
});
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  const i = stops.indexOf(st.sel);
  if (k === "ArrowDown") select(stops[Math.min(stops.length - 1, i + 1)]);
  else if (k === "ArrowUp") select(stops[Math.max(0, i - 1)]);
  else if (k >= "0" && k <= "3") select(stops[Number(k)]);
  else if (k === "ArrowLeft" || k === "ArrowRight") {
    toHand();
    vTarget = Math.max(45, Math.min(110, Math.round(vTarget + (k === "ArrowRight" ? 5 : -5))));
  } else if (k === " ") {
    mode = "tour";
    tourT = 0;
    st = M.system(0, 0);
    st.v = vTarget = M.TOUR_V;
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
