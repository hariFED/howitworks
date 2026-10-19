// Page code for fuel-system.html. K (kit), L (runtime), C (self-check), M (model) and P (parts) are
// inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const V = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, K.view(v)]));
const { CH, CT, DIM_H_X } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const el = {
  lines: ["pl-L", "pl-R", "pl-C", "pl-C2", "sd-R", "sd-C", "sd-C2"].map((id) => [id, $(id)]),
  tankPlan: { L: $("tank-plan-L"), R: $("tank-plan-R") },
  tankSide: $("tank-side"),
  dimH: $("dim-h-wrap"),
  bFuel: $("b-fuel"),
  bAir: $("b-air"),
  bOut: $("b-out"),
  jFuel: $("j-fuel"),
  jOut: [$("j-out"), $("j-feed")],
  bFeed: $("b-feed"),
  bSender: $("b-sender"),
  bVent: [$("b-vent0"), $("b-vent1"), $("b-check")],
  bBlock: $("b-block"),
  flap: $("flap-B"),
  cRotor: $("c-rotor"),
  cWin: $("c-win"),
  cLine: { L: $("c-line-L"), R: $("c-line-R") },
  cPort: { L: $("sel-port-L"), R: $("sel-port-R") },
  lb10: $("lb-10"),
  gRotor: $("g-rotor"),
  gWin: $("g-win"),
  gHandle: $("g-handle"),
  gFluid: [$("g-centre"), $("g-out"), $("gg-port")],
  dWater: $("d-water"),
  dWaterTop: $("d-water-top"),
  dDrops: $("d-drops"),
  dValve: $("d-valve"),
  dDrain: $("d-drain"),
  dFuel: [$("d-bowl"), $("d-pass0"), $("d-pass1"), $("d-pass2"), $("d-pass3"), $("d-lineL"), $("d-lineR")],
  dPrimer: $("d-pass4"),
  ePlunger: $("e-plunger"),
  eBalls: $("e-balls"),
  eChamber: $("e-pass5"),
  eLines: [$("e-line0"), $("e-line1")],
  lb25: $("lb-25"),
  fNeedles: $("f-needles"),
  hHandle: $("h-handle"),
  hdL: $("hd-L"),
  hdR: $("hd-R"),
  hdPress: $("hd-press"),
  hdSurf: $("hd-surf"),
  ctCursor: $("ct-cursor"),
  ctL: $("ct-l"),
  ctR: $("ct-r"),
  readout: $("readout"),
  readout2: $("readout2"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.tourStart();
let mode = "tour"; // "tour" drives everything; "free": the reader's controls
let ctl = M.tourCtl(0);
let clock = 0;
let primeUntil = -1;
let primeDrag = null;
let drainHeld = false;
let handleDrag = false;
let liftIn = 0;
let liftOut = 0;
let warpNow = 1;

function freeCtl() {
  const c = { ...ctl, vent: { ...ctl.vent } };
  if (primeDrag == null) c.primer = clock < primeUntil ? M.PRIMER.stroke : 0;
  else c.primer = primeDrag;
  c.drain = drainHeld ? 1 : 0;
  return c;
}
function step(dt, live) {
  if (live.touring && mode !== "tour" && !handleDrag && primeDrag == null) {
    mode = "tour";
    s = M.tourStart();
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      warpNow = M.warpAt(s.t + h);
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.tourStart();
    } else {
      warpNow = s.run ? 60 : 1;
      M.stepSystem(s, h, freeCtl(), warpNow);
    }
    liftIn = L.follow(liftIn, s.primerV > 1 ? 1 : 0, 30, h);
    liftOut = L.follow(liftOut, s.primerV < -1 ? 1 : 0, 30, h);
  }
  return true;
}

// ---------------------------------------------------------------- drawing helpers
const LPH = M.LPH;
const flowOp = (qq) => K.r2(0.4 + 0.6 * Math.min(1, Math.abs(qq) / (48 * LPH)));
const hx = (d) => K.r2(CH.x0 + (Math.min(CH.sMax, Math.max(0, d)) / CH.sMax) * (CH.x1 - CH.x0));
const hy = (z) => K.r2(CH.y1 - ((Math.min(CH.zMax, Math.max(CH.zMin, z)) - CH.zMin) / (CH.zMax - CH.zMin)) * (CH.y1 - CH.y0));
const tx = (m) => K.r2(CT.x0 + (Math.min(CT.tMax, Math.max(0, m)) / CT.tMax) * (CT.x1 - CT.x0));
const vy = (v) => K.r2(CT.y1 - ((Math.min(CT.vMax, Math.max(CT.vMin, v)) - CT.vMin) / (CT.vMax - CT.vMin)) * (CT.y1 - CT.y0));
const ANG_E = P.senderAngle(M.levelAt(M.UNUSABLE), 0);
const ANG_F = P.senderAngle(M.levelAt(M.FULL), 0);
const gaugeFrac = (v) => (P.senderAngle(M.levelAt(v), 0) - ANG_E) / (ANG_F - ANG_E);
const shown = { theta: NaN, levelL: NaN, levelR: NaN, primer: NaN, drain: NaN, lift: NaN, gauge: "" };
const kPa = (p) => (p / 1000).toFixed(1);
const signed = (x, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;

function profilePoints(side) {
  const pr = M.profile(s, side);
  const nB = M.ROUTE[side].length;
  const pts = [];
  pr.pts.forEach((p, i) => {
    if (side === "R" && i >= nB) return;
    pts.push([p[0], p[2]]);
    if (p.length > 3) pts.push([p[0], p[3]]);
  });
  return { pts, surf: pr.surf, pr };
}

function render(live) {
  const lvL = M.levelAt(s.tanks.L.v);
  const lvR = M.levelAt(s.tanks.R.v);
  // the schematic's lines: the stipple's strength follows the flow in each
  const flows = { "pl-L": s.qL, "pl-R": s.qR, "pl-C": s.q, "pl-C2": s.q, "sd-R": s.qR, "sd-C": s.q, "sd-C2": s.q };
  for (const [id, node] of el.lines) node.setAttribute("stroke-opacity", flowOp(flows[id]));
  for (const k of ["L", "R"]) el.tankPlan[k].setAttribute("fill-opacity", K.r2(0.15 + 0.85 * (s.tanks[k].v / M.FULL)));
  if (!(Math.abs(lvR - shown.levelR) <= 0.05)) {
    el.tankSide.setAttribute("d", K.d(V.side, P.sv(P.tankSideFuel(lvR))));
    el.dimH.innerHTML = K.dim(V.side, [-M.CARB.fs, M.CARB.wl], [-M.TANK.fs0, lvR], { dir: "v", off: DIM_H_X - V.side.p([-M.CARB.fs, 0])[0], text: `h ${Math.round(lvR - M.CARB.wl)}`, id: "dim-h" });
    shown.levelR = lvR;
  }
  // Section B-B: the port tank's fuel, its ullage (air density from its pressure), the sender
  if (!(Math.abs(lvL - shown.levelL) <= 0.02) || shown.slip !== s.slip) {
    el.bFuel.setAttribute("d", K.d(V.B, P.fuelPoly(lvL, s.slip)));
    el.bAir.setAttribute("d", K.d(V.B, P.ullagePoly(lvL, s.slip)));
    el.bSender.innerHTML = P.sender(V.B, P.senderAngle(lvL, s.slip));
    el.jFuel.setAttribute("d", K.d(V.J, P.fuelPoly(lvL, s.slip)));
    shown.levelL = lvL;
    shown.slip = s.slip;
  }
  const puL = s.tanks.L.pu - M.P_ATM;
  el.bAir.setAttribute("fill-opacity", K.r2(Math.min(1, Math.max(0.12, 0.55 + puL / 18000))));
  el.bOut.setAttribute("fill-opacity", flowOp(s.qL));
  el.bFeed.setAttribute("fill-opacity", flowOp(s.qL));
  for (const node of el.jOut) node.setAttribute("fill-opacity", flowOp(s.qL));
  const ventIn = s.vent.L ? Math.max(0, s.qL) : 0;
  for (const node of el.bVent) node.setAttribute("fill-opacity", K.r2(s.vent.L ? 0.3 + 0.7 * Math.min(1, ventIn / (30 * LPH)) : 0.12));
  if (el.bBlock) el.bBlock.style.display = s.vent.L ? "none" : "";
  const fp = P.flapPivot();
  const fpS = V.B.p([-fp[0], fp[1]]);
  el.flap.setAttribute("transform", `rotate(${K.r2(-28 * Math.min(1, ventIn / (20 * LPH)))} ${fpS[0]} ${fpS[1]})`);
  // Section C-C and G-G: the rotor turns; the ports' fuel shows what flows
  const th = s.theta;
  const c0 = V.C.p([0, 0]);
  el.cRotor.setAttribute("transform", `rotate(${K.r2(th)} ${c0[0]} ${c0[1]})`);
  el.cWin.setAttribute("fill-opacity", flowOp(s.q));
  for (const k of ["L", "R"]) {
    const qk = k === "L" ? s.qL : s.qR;
    el.cLine[k].setAttribute("fill-opacity", flowOp(qk));
    el.cPort[k].setAttribute("fill-opacity", flowOp(qk));
  }
  if (!(Math.abs(th - shown.theta) <= 0.2)) {
    const a = ((th + 180) * Math.PI) / 180;
    el.lb10.innerHTML = K.balloon(V.C, [Math.sin(a) * 12, Math.cos(a) * 12], LIVE[10].at, 10, { target: 10 });
    const ra = P.rotorAxial(V.G, th);
    el.gRotor.innerHTML = P.part(10, ra.svg);
    el.gWin.innerHTML = ra.win.map((w) => `<path class="tint" d="${K.d(V.G, w)}"/>`).join("");
    el.gHandle.innerHTML = P.handlePhantom(V.G, th);
    const h0 = V.H.p([0, 0]);
    el.hHandle.setAttribute("transform", `rotate(${K.r2(th)} ${h0[0]} ${h0[1]})`);
    shown.theta = th;
  }
  for (const node of el.gFluid) node.setAttribute("fill-opacity", flowOp(s.q));
  for (const node of el.gWin.children) node.setAttribute("fill-opacity", flowOp(s.q));
  // Section D-D: the strainer: water on the floor, drops still falling, the drain valve
  const wz = P.BOWL_IN.z0 + s.waterH;
  el.dWater.setAttribute("d", s.waterH > 0.05 ? K.d(V.D, [[-P.BOWL_IN.r, P.BOWL_IN.z0], [P.BOWL_IN.r, P.BOWL_IN.z0], [P.BOWL_IN.r, wz], [-P.BOWL_IN.r, wz]]) : "");
  el.dWaterTop.setAttribute("d", s.waterH > 0.05 ? K.d(V.D, [[-P.BOWL_IN.r, wz], [P.BOWL_IN.r, wz]], false) : "");
  el.dDrops.innerHTML = s.drops
    .map((h, i) => (h == null ? "" : `<circle class="drop" cx="${V.D.p([M.DROPS[i].x, 0])[0]}" cy="${V.D.p([0, P.BOWL_IN.z0 + h])[1]}" r="${K.r2(1.4 + M.DROPS[i].d * 2.4)}"/>`))
    .join("");
  if (!(Math.abs(s.drain - shown.drain) <= 0.01)) {
    el.dValve.innerHTML = P.drainValve(V.D, s.drain);
    shown.drain = s.drain;
  }
  el.dDrain.setAttribute("class", s.drain > 0.05 && s.water > 0 ? "tint water" : "tint");
  el.dDrain.setAttribute("fill-opacity", K.r2(0.25 + 0.75 * s.drain));
  for (const node of el.dFuel) node.setAttribute("fill-opacity", flowOp(s.q));
  el.dPrimer.setAttribute("fill-opacity", K.r2(s.primerV > 1 ? 1 : 0.3));
  // Section E-E: the plunger, the chamber's fuel, the balls
  if (!(Math.abs(s.primer - shown.primer) <= 0.05) || !(Math.abs(liftIn - liftOut - shown.lift) <= 0.01)) {
    el.ePlunger.innerHTML = P.plunger(V.E, s.primer);
    el.eChamber.setAttribute("d", K.d(V.E, P.primerPassages(s.primer)[5]));
    el.eBalls.innerHTML = P.checkBalls(V.E, liftIn, liftOut);
    el.lb25.innerHTML = K.balloon(V.E, [P.PR.knob[0] + s.primer + 16, 7], LIVE[25].at, 25, { target: 25 });
    shown.primer = s.primer;
    shown.lift = liftIn - liftOut;
  }
  el.eLines[0].setAttribute("fill-opacity", K.r2(0.3 + 0.7 * liftOut));
  el.eLines[1].setAttribute("fill-opacity", K.r2(0.3 + 0.7 * liftIn));
  el.eChamber.setAttribute("fill-opacity", K.r2(0.35 + 0.65 * Math.max(liftIn, liftOut)));
  // View F: the gauge reads the senders
  const g = `${K.r2(gaugeFrac(s.tanks.L.v))} ${K.r2(gaugeFrac(s.tanks.R.v))}`;
  if (g !== shown.gauge) {
    el.fNeedles.innerHTML = P.gaugeNeedles(V.F, gaugeFrac(s.tanks.L.v), gaugeFrac(s.tanks.R.v));
    shown.gauge = g;
  }
  // Diagram 1: the grade lines
  const pl = profilePoints("L");
  const pr = profilePoints("R");
  el.hdL.setAttribute("points", pl.pts.filter((p) => isFinite(p[1])).map(([d, z]) => `${hx(d)},${hy(z)}`).join(" "));
  el.hdR.setAttribute("points", pr.pts.filter((p) => isFinite(p[1])).map(([d, z]) => `${hx(d)},${hy(z)}`).join(" "));
  const feeding = M.portOpen(th, "L") > 0.01 ? pl : pr;
  const pipe = feeding.pr.pts.map((p) => [p[0], p[1]]);
  const grade = feeding.pts.filter((p) => isFinite(p[1]));
  el.hdPress.setAttribute("d", `M${grade.map(([d, z]) => `${hx(d)} ${hy(z)}`).join("L")}L${pipe.slice().reverse().map(([d, z]) => `${hx(d)} ${hy(z)}`).join("L")}Z`);
  el.hdSurf.setAttribute("cy", hy(pl.pts[0][1]));
  // Diagram 2: where the tour is
  const onTour = mode === "tour";
  for (const node of [el.ctCursor, el.ctL, el.ctR]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    const m = s.ft / 60;
    el.ctCursor.setAttribute("d", `M${tx(m)} ${CT.y0}V${CT.y1}`);
    el.ctL.setAttribute("cx", tx(m));
    el.ctL.setAttribute("cy", vy(s.tanks.L.v));
    el.ctR.setAttribute("cx", tx(m));
    el.ctR.setAttribute("cy", vy(s.tanks.R.v));
  }
  // readouts
  const pos = M.posName(th);
  const ph = M.phase(s);
  el.readout.textContent = `${pos} · ${Math.round(s.q / LPH)} L/h (L ${Math.round(s.qL / LPH)} · R ${Math.round(s.qR / LPH)}) · OPEN ${Math.round(s.qMax / LPH)} · CARB ${kPa(s.pc)} kPa · ${Math.round(s.rpm)} RPM`;
  el.readout2.textContent = `L ${s.tanks.L.v.toFixed(1)} R ${s.tanks.R.v.toFixed(1)} L · ULLAGE ${signed(puL / 1000)} kPa · ×${Math.round(warpNow)} · ${ph}`;
  say(`Selector ${pos.toLowerCase()}, ${Math.round(s.q / LPH)} litres an hour; left ${Math.round(s.tanks.L.v)}, right ${Math.round(s.tanks.R.v)} litres; ${ph.toLowerCase()}.`, live.clock);
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
  // a still, true moment: the left vent blocked, the flow falling
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 29; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

function toFree() {
  if (mode === "tour") {
    ctl = M.tourCtl(s.t);
    ctl.vent = { ...ctl.vent };
    mode = "free";
  }
}
const svgPt = (e) => {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
};
const POS = M.POS;
const snap = (a) => Object.values(POS).reduce((b, v) => (Math.abs(v - a) < Math.abs(b - a) ? v : b), POS.BOTH);
const handleAngle = (e) => {
  const p = svgPt(e);
  let a = (Math.atan2(p.x - specs.H.x, specs.H.y - p.y) * 180) / Math.PI;
  if (a < -90) a += 360;
  return Math.min(180, Math.max(-90, a));
};
for (const hit of svg.querySelectorAll("[data-drag]")) {
  hit.addEventListener("pointerdown", (e) => {
    toFree();
    hit.setPointerCapture(e.pointerId);
    if (hit.dataset.drag === "handle") {
      handleDrag = true;
      ctl.sel = handleAngle(e);
    } else {
      const x0 = svgPt(e).x;
      const p0 = s.primer;
      primeDrag = p0;
      hit.onpointermove = (ev) => {
        primeDrag = Math.min(M.PRIMER.stroke, Math.max(0, p0 + (svgPt(ev).x - x0) / V.E.k));
        live.input();
      };
    }
    live.input();
  });
  hit.addEventListener("pointermove", (e) => {
    if (handleDrag && hit.dataset.drag === "handle") {
      ctl.sel = handleAngle(e);
      live.input();
    }
  });
  const end = () => {
    if (hit.dataset.drag === "handle" && handleDrag) {
      handleDrag = false;
      ctl.sel = snap(ctl.sel);
    }
    if (hit.dataset.drag === "primer") {
      primeDrag = null;
      hit.onpointermove = null;
    }
    live.input();
  };
  hit.addEventListener("pointerup", end);
  hit.addEventListener("pointercancel", end);
}

const DEMANDS = [0, M.FLOW.idle, M.FLOW.cruise, M.FLOW.takeoff];
svg.addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === " ") {
    mode = "tour";
    s = M.tourStart();
    e.preventDefault();
    live.input();
    live.touring = true;
    return;
  }
  if (k === "s") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else if (k === "l" || k === "b" || k === "r" || k === "o") {
    toFree();
    ctl.sel = { l: POS.LEFT, b: POS.BOTH, r: POS.RIGHT, o: POS.OFF }[k];
  } else if (k === "v") {
    toFree();
    ctl.vent.L = !ctl.vent.L;
  } else if (k === "f") {
    toFree();
    ctl.shut = !ctl.shut;
  } else if (k === "p") {
    toFree();
    primeUntil = clock + 0.5;
  } else if (k === "d") {
    toFree();
    drainHeld = true;
  } else if (k === "w") {
    toFree();
    M.refuel(s);
  } else if (k === "ArrowUp" || k === "ArrowDown") {
    toFree();
    const now = ctl.run ? DEMANDS.indexOf(DEMANDS.reduce((b, v) => (Math.abs(v - ctl.demand) < Math.abs(b - ctl.demand) ? v : b), 0)) : 0;
    const next = Math.min(3, Math.max(0, now + (k === "ArrowUp" ? 1 : -1)));
    ctl.run = next > 0;
    ctl.demand = DEMANDS[next];
    ctl.kt = next >= 2 ? M.V_CRUISE : 0;
  } else return;
  e.preventDefault();
  live.input();
});
svg.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "d") {
    drainHeld = false;
    live.input();
  }
});
svg.addEventListener("blur", () => (drainHeld = false));

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
