// Page code for main-gear.html. K (kit), L (runtime), C (self-check), M (model) and P (parts) are
// inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const LIVE_D = JSON.parse(svg.dataset.lived);
const VM = K.view(specs.main);
const VA = K.view(specs.A);
const VC = K.view(specs.C);
const VB = K.view(specs.B);
const VD = K.view(specs.D);
const { CH, CT, DX, DIM_Y, DIM_S_Y } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const A0 = M.AXLE_STATIC;

const el = {
  leg: $("leg-main"),
  line: $("line-main"),
  legC: $("leg-C"),
  tip: $("tip-main"),
  mvb: $("mvb-main"),
  planeF: $("plane-f"),
  ground: $("ground"),
  clip: $("clip-tyre-r"),
  dimT: $("dim-t-wrap"),
  dimD: $("dim-d-wrap"),
  lb: Object.keys(LIVE).map((n) => [n, $(`lb-${n}`)]),
  lbD: Object.keys(LIVE_D).map((n) => [n, $(`lb-${n}`)]),
  calMove: [...svg.querySelectorAll(".cal-move")],
  calFluid: [$("cal-main"), $("cal-B")],
  mcHi: $("mc-hi"),
  mcPiston: $("mc-piston"),
  mcSpring: $("mc-spring"),
  mcPedal: $("mc-pedal"),
  dimS: $("dim-s-wrap"),
  schL: $("sch-line-l"),
  schR: $("sch-line-r"),
  schPL: $("sch-p-l"),
  schPR: $("sch-p-r"),
  schYaw: $("sch-yaw"),
  fcTrail: $("fc-trail"),
  fcDot: $("fc-dot"),
  ctCursor: $("ct-cursor"),
  ctL: $("ct-l"),
  ctR: $("ct-r"),
  readout: $("readout"),
  readout2: $("readout2"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.gear();
let mode = "tour"; // "tour": the tour drives; "free": the model runs on the user's toes; "hand": a held load
let toeUser = [0, 0];
let toeNow = [0, 0];
let fTarget = M.F_STATIC;
let dragging = false;
let clock = 0;
let trail = [];
let fDyn = 0;

function freeStep(h) {
  toeNow = toeNow.map((t, i) => L.follow(t, toeUser[i], 8, h));
  const braking = toeUser[0] + toeUser[1] > 0;
  M.stepGear(s, h, { toe: toeNow, thrust: braking ? 150 : M.thrustAt(12, s.V) });
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 2000));
  const h = dt / n;
  if (live.touring && mode !== "tour" && !dragging) {
    // the tour takes over again: a new approach and landing
    mode = "tour";
    s = M.gear();
    toeUser = [0, 0];
  }
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.gear();
      toeNow = s.toe.slice();
    } else if (mode === "free") freeStep(h);
    else {
      toeNow = toeNow.map((t, j) => L.follow(t, toeUser[j], 8, h));
      M.holdGear(s, live.reduced ? fTarget : L.follow(s.F, fTarget, 12, h), h, toeNow);
    }
    fDyn = s.F + M.C_LEG * s.vd;
    const last = trail[trail.length - 1];
    if (!last || Math.abs(s.d * 1000 - last[1]) > 0.3 || Math.abs(fDyn - last[2]) > 30 || clock - last[0] > 1 / 30) trail.push([clock, s.d * 1000, fDyn]);
  }
  while (trail.length && clock - trail[0][0] > 2) trail.shift();
  if (mode === "tour" || mode === "free") return true;
  return Math.abs(s.F - fTarget) > 1 || Math.abs(toeNow[0] - toeUser[0]) > 0.1 || Math.abs(toeNow[1] - toeUser[1]) > 0.1 || Math.abs(s.p[0] - M.pressureFor(toeUser[0])) > 0.01 || Math.abs(s.p[1] - M.pressureFor(toeUser[1])) > 0.01;
}

// ---------------------------------------------------------------- drawing helpers
const fx = (d) => K.r2(CH.x0 + (Math.max(0, Math.min(CH.dMax, d)) / CH.dMax) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - (Math.max(0, Math.min(CH.fMax, F / 1000)) / CH.fMax) * (CH.y1 - CH.y0));
const tx = (t) => K.r2(CT.x0 + (Math.max(0, Math.min(CT.tMax, t)) / CT.tMax) * (CT.x1 - CT.x0));
const py = (p) => K.r2(CT.y1 - (Math.min(CT.pMax, Math.max(0, p)) / CT.pMax) * (CT.y1 - CT.y0));
// stipple density follows the line pressure: 0 bar sparse, 50 bar dense
const tint = (p) => K.r2(0.14 + 0.86 * Math.min(1, Math.max(0, p / 50)));
const shown = { F: Infinity, c: -1, x: -1 };
const deg = (r) => (r * 180) / Math.PI;

function render(live) {
  const F = s.F;
  // the leg bends: redraw it, its line and its cutting plane; the tip assembly rides on its end
  if (Math.abs(F - shown.F) > 4) {
    el.leg.innerHTML = P.legPart(VM, F);
    el.line.innerHTML = P.brakeLine(VM, F);
    el.legC.innerHTML = P.legPart(VC, F);
    el.planeF.innerHTML = P.planeF(VM, F);
    const a = M.axleAt(F);
    const tr = `translate(${K.r2((a[0] - A0[0]) * VM.k)} ${K.r2(-(a[1] - A0[1]) * VM.k)}) rotate(${K.r2(-deg(M.axleTilt(F)))} ${VA.x} ${VA.y})`;
    el.tip.setAttribute("transform", tr);
    el.mvb.setAttribute("transform", tr);
    el.dimD.innerHTML = P.dimDefl(VM, F, DX);
    for (const [n, node] of el.lb) {
      const d = LIVE[n];
      const y = n === "25" ? M.thick(d.x) / 2 + P.LINE_R + 0.3 : d.y;
      const at = P.legAt(F, d.x, y);
      node.innerHTML = K.balloon(VM, [at[0], at[1]], d.at, n, { target: n });
    }
    shown.F = F;
  }
  // the runway in the airframe's frame (hidden high in the approach)
  const vg = -s.z * 1000;
  el.ground.setAttribute("transform", `translate(0 ${K.r2(VM.p([0, vg])[1])})`);
  el.ground.style.display = vg < -150 ? "none" : "";
  el.clip.setAttribute("height", K.r2(Math.max(0, VM.p([0, vg])[1] - 24)));
  el.dimT.innerHTML = P.dimTrack(VM, F, vg < -150 ? Infinity : vg, DIM_Y);
  // the left brake: the caliper's take-up and the fluid, the master cylinder's stroke, the pedal
  const pL = s.p[0];
  const c = K.r2(Math.min(1, pL / 0.4));
  if (c !== shown.c) {
    for (const g of el.calMove) {
      const V = g.closest("#tip-main") ? VA : VB;
      g.innerHTML = P.piston(V, c) + P.pressurePlate(V, c) + P.backPlate(V, c);
    }
    shown.c = c;
  }
  for (const f of el.calFluid) f.setAttribute("fill-opacity", tint(pL));
  const x = K.r2(M.mcStroke(toeNow[0], pL));
  if (Math.abs(x - shown.x) > 0.02) {
    el.mcPiston.innerHTML = P.mcPiston(VD, x);
    el.mcSpring.innerHTML = P.mcSpring(VD, x);
    el.mcPedal.innerHTML = P.pedal(VD, P.pedalTurn(x));
    el.mcHi.setAttribute("d", P.mcFluidHigh(x).map((r) => K.d(VD, r)).join(""));
    el.dimS.innerHTML = x < 1 ? "" : K.dim(VD, [P.rodEnd(0) + 9, -6], [P.rodEnd(x) + 9, -6], { dir: "h", off: VD.p([0, DIM_S_Y])[1] - VD.p([0, -6])[1], text: K.fmt(x, 1), id: "dim-s" });
    const f = P.pistonFront(x);
    const pitch = (f - 0.9 - 1.2) / 7;
    const at = { 27: [P.rodEnd(x) - 6, 0], 28: [1.2 + 2 * pitch, 4.1], 29: (() => { const a = P.pedalTurn(x); const [hx, hy] = P.PEDAL.hinge; const r = 40; return [hx - r * Math.sin(a), hy + r * Math.cos(a)]; })() };
    for (const [n, node] of el.lbD) node.innerHTML = K.balloon(VD, at[n], LIVE_D[n].at, n, { target: n });
    shown.x = x;
  }
  el.mcHi.setAttribute("fill-opacity", tint(pL));
  // the schematic's lines, by pressure
  el.schL.setAttribute("stroke-opacity", K.r2(0.12 + 0.88 * Math.min(1, s.p[0] / 40)));
  el.schR.setAttribute("stroke-opacity", K.r2(0.12 + 0.88 * Math.min(1, s.p[1] / 40)));
  el.schPL.textContent = `${Math.round(s.p[0])} bar`;
  el.schPR.textContent = `${Math.round(s.p[1])} bar`;
  const yawRate = deg(s.r);
  el.schYaw.textContent = Math.abs(yawRate) < 1 ? (s.V < 0.05 ? "STOPPED" : "STRAIGHT") : `TURNING ${yawRate > 0 ? "LEFT" : "RIGHT"} ${Math.round(Math.abs(yawRate))}°/s`;
  // charts
  el.fcTrail.setAttribute("points", trail.map(([, a, b]) => `${fx(a)},${fy(b)}`).join(" "));
  el.fcDot.setAttribute("cx", fx(s.d * 1000));
  el.fcDot.setAttribute("cy", fy(fDyn));
  const onTour = mode === "tour";
  for (const node of [el.ctCursor, el.ctL, el.ctR]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    el.ctCursor.setAttribute("d", `M${tx(s.t)} ${CT.y0}V${CT.y1}`);
    el.ctL.setAttribute("cx", tx(s.t));
    el.ctL.setAttribute("cy", py(s.p[0]));
    el.ctR.setAttribute("cx", tx(s.t));
    el.ctR.setAttribute("cy", py(s.p[1]));
  }
  const cam = M.camber(F);
  const where = mode === "hand" ? "HELD" : M.phase(s);
  el.readout.textContent = `F ${(F / 1000).toFixed(2)} kN · δ ${Math.round(M.deflection(F))} mm · σ ${Math.round(M.sigmaMax(Math.max(0, F)))} MPa · TRACK ${Math.round(2 * M.halfTrack(F))} · CAMBER ${cam >= 0 ? "+" : "−"}${Math.abs(cam).toFixed(1)}°`;
  const kt = s.V / 0.5144;
  el.readout2.textContent = `p ${Math.round(s.p[0])} / ${Math.round(s.p[1])} bar · CLAMP ${(M.clampForce(s.p[0]) / 1000).toFixed(1)} kN · T ${Math.round(M.brakeTorque(s.p[0]))} N·m · ${Math.round(kt)} kt · ${where}`;
  say(`Leg load ${(F / 1000).toFixed(1)} kilonewtons, deflection ${Math.round(M.deflection(F))} millimetres, track ${Math.round(2 * M.halfTrack(F))}; brakes ${Math.round(s.p[0])} and ${Math.round(s.p[1])} bar, ${Math.round(kt)} knots, ${where.toLowerCase()}.`, live.clock);
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
  // a still, true moment: both brakes on during the landing roll
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 6; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampF = (f) => Math.min(16000, Math.max(0, f));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    fTarget = s.F;
  }
}
function toFree() {
  if (mode === "tour") {
    mode = "free";
    toeUser = s.toe.slice();
  } else if (mode === "hand") mode = "free";
}
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  let f0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      toHand();
      f0 = s.F;
      fTarget = s.F;
      live.input();
    },
    move: (dy) => {
      fTarget = clampF(f0 - (dy / VM.k) * M.K_LEG);
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

const TOE = 220; // N, a firm toe
const held = new Set();
function toes() {
  const both = held.has("b");
  toeUser = [held.has("l") || both ? TOE : 0, held.has("r") || both ? TOE : 0];
}
svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" || k === "ArrowDown") {
    toHand();
    fTarget = clampF(fTarget + (k === "ArrowUp" ? 500 : -500));
  } else if (k === "ArrowLeft" || k === "ArrowRight" || k === "b" || k === "B") {
    if (mode === "tour") toFree();
    held.add(k === "ArrowLeft" ? "l" : k === "ArrowRight" ? "r" : "b");
    toes();
  } else if (k === " ") {
    s = M.gear();
    mode = "free";
    held.clear();
    toes();
    trail = [];
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});
svg.addEventListener("keyup", (e) => {
  const k = e.key;
  const id = k === "ArrowLeft" ? "l" : k === "ArrowRight" ? "r" : k === "b" || k === "B" ? "b" : null;
  if (!id) return;
  held.delete(id);
  toes();
  live.input();
});
svg.addEventListener("blur", () => {
  held.clear();
  toes();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
