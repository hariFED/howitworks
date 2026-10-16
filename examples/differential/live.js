// Page code for differential.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VD = K.view(specs.D);
const VP = K.view(specs.P);
const CH = __CHART__;
const PV = __PLAN__;
const $ = (id) => document.getElementById(id);

const el = {
  studsR: $("studs-R-main"),
  studsL: $("studs-L-main"),
  tintMain: $("tint-main"),
  tintD: $("tint-D"),
  spiderTop: $("spider-top"),
  spiderBot: $("spider-bot"),
  sideR: $("side-R"),
  sideL: $("side-L"),
  paths: $("paths"),
  tyres: $("tyres"),
  ice: $("ice"),
  dimR: $("dim-R-wrap"),
  band: $("band"),
  traceL: $("trace-L"),
  traceR: $("trace-R"),
  traceC: $("trace-C"),
  readout: $("readout"),
  b25: $("b25"),
};
const say = L.announcer($("sr"), 2.5);

// ---------------------------------------------------------------- state
const s0 = M.tour(0);
let v = s0.v; // m/s
let kappa = s0.kappa; // 1/m, + to the left
let slip = s0.slip; // rad/s, the right wheel spinning on ice
let thL = 0; // wheel angles, rad, forward roll positive
let thR = 0;
let distL = 0; // ground travelled by each rear wheel, m
let distR = 0;
let iceVis = 0;
let tourT = 0;
let simT = 0;
let sampleT = 0;
let dragging = false;
const user = { v: s0.v, kappa: 0, ice: false };
const hist = [];

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  const driven = live.touring && !dragging;
  for (let i = 0; i < n; i++) {
    let ice;
    if (driven) {
      tourT += h;
      const s = M.tour(tourT);
      v = L.follow(v, s.v, 20, h);
      kappa = L.follow(kappa, s.kappa, 20, h);
      slip = L.follow(slip, s.slip, 20, h);
      ice = s.ice;
    } else {
      v = L.follow(v, user.ice ? 0 : user.v, 2.2, h);
      kappa = L.follow(kappa, user.kappa, 5, h);
      slip = L.follow(slip, user.ice && v < 0.3 ? M.SLIP_ICE : 0, 1.6, h);
      ice = user.ice || slip > 0.5;
    }
    const w = M.wheels(v, kappa, slip);
    thL += w.wL * h;
    thR += w.wR * h;
    distL += v * (1 - (kappa * M.TRACK) / 2) * h;
    distR += v * (1 + (kappa * M.TRACK) / 2) * h;
    iceVis = L.follow(iceVis, ice ? 1 : 0, 5, h);
    simT += h;
    if (simT >= sampleT) {
      sampleT = simT + 0.1;
      hist.push([simT, M.rpm(w.wL), M.rpm(w.wR)]);
      while (hist.length && hist[0][0] < simT - CH.W - 0.5) hist.shift();
    }
  }
  return v > 1e-3 || slip > 1e-3 || Math.abs(kappa - user.kappa) > 1e-5 || (iceVis > 1e-3 && iceVis < 0.999);
}

// ---------------------------------------------------------------- render
const fmt0 = (x) => String(Math.round(x)).replace("-", "−");
const chX = (t) => K.r2(CH.x1 - ((simT - t) / CH.W) * (CH.x1 - CH.x0));
const chY = (n) => K.r2(CH.y1 - (Math.min(CH.nMax, Math.max(0, n)) / CH.nMax) * (CH.y1 - CH.y0));

function planPaths() {
  let out = "";
  for (const [u0, dist] of [[-M.TRACK / 2, distL], [M.TRACK / 2, distR]]) {
    const k = kappa / (1 + kappa * u0); // the wheel's own path curvature, 1/m
    const ahead = [];
    const behind = [];
    for (let s = 0; s <= 9000; s += 150) ahead.push(P.pathPoint(u0 * 1000, k / 1000, s));
    for (let s = 0; s >= -6000; s -= 150) behind.push(P.pathPoint(u0 * 1000, k / 1000, s));
    out += K.line(VP, ahead, "ctr");
    out += `<path class="track" stroke-dashoffset="${K.r2(-dist * 1000 * VP.k)}" d="${K.d(VP, behind, false)}"/>`;
  }
  if (Math.abs(kappa) > 1 / 7) {
    const icr = -1000 / kappa;
    out += K.centerMark(VP, [icr, 0], 600, 3);
    out += K.line(VP, [[icr, 0], [kappa > 0 ? 775 : -775, 0]], "thin");
    // Ackermann: each front wheel square to its own radius from the same centre
    out += K.lines(VP, [[[icr, 0], [-775, P.CAR.base]], [[icr, 0], [775, P.CAR.base]]], "thin");
  }
  return out;
}

function render(live) {
  el.studsR.innerHTML = P.studs(VM, 1, thR);
  el.studsL.innerHTML = P.studs(VM, -1, thL);
  // balloon 25 points at the visible stud nearest the axle's centre line
  let best = null;
  for (let i = 0; i < 5; i++) {
    const a = thR + (i * 2 * Math.PI) / 5;
    if (Math.cos(a) > 0.02) continue;
    const sv = P.FL.pcd * Math.sin(a);
    if (best == null || Math.abs(sv) < Math.abs(best)) best = sv;
  }
  el.b25.innerHTML = K.balloon(VM, [P.FL.tip - 3, best], [548, 380], 25, { target: 25 });
  const w = M.wheels(v, kappa, slip);
  const wC = M.carrier(w.wL, w.wR);
  const wS = M.spider(w.wL, w.wR);
  const nS = M.rpm(wS);
  const op = K.r2(0.1 + 0.9 * Math.min(1, Math.sqrt(Math.abs(nS) / 300)));
  el.tintMain.setAttribute("fill-opacity", op);
  el.tintD.setAttribute("fill-opacity", op);
  // VIEW D rides with the carrier: only the relative motion shows.
  const relR = (thR - thL) / 2;
  const beta = relR * (M.Z_SIDE / M.Z_SPIDER);
  el.spiderTop.innerHTML = P.spiderViewBody(VD, 1) + P.spiderTeeth(VD, 1, beta);
  el.spiderBot.innerHTML = P.spiderViewBody(VD, -1) + P.spiderTeeth(VD, -1, -beta);
  el.sideR.innerHTML = P.sideViewBody(VD, 1) + P.sideTeeth(VD, 1, relR);
  el.sideL.innerHTML = P.sideViewBody(VD, -1) + P.sideTeeth(VD, -1, -relR);
  // PLAN: paths, steer, tyres
  el.paths.innerHTML = planPaths();
  const st = M.steer(kappa);
  const C = P.CAR;
  const rr = M.R_WHEEL * 1000;
  const front = ((distL + distR) / 2) * 1000;
  el.tyres.innerHTML =
    P.tyre(VP, -C.track / 2, 0, 0, thL * rr) +
    P.tyre(VP, C.track / 2, 0, 0, thR * rr) +
    P.tyre(VP, -C.track / 2, C.base, st.left, front) +
    P.tyre(VP, C.track / 2, C.base, st.right, front);
  el.ice.setAttribute("opacity", K.r2(iceVis));
  if (Math.abs(kappa) > 1 / 7) {
    const icr = -1000 / kappa;
    const rL = Math.abs(icr + 775);
    const rR = Math.abs(icr - 775);
    el.dimR.innerHTML =
      K.dim(VP, [icr, 0], [0, 0], { dir: "h", off: 16, text: `R${Math.round(Math.abs(icr))}`, id: "dim-R" }) +
      K.dim(VP, [icr, 0], [-775, 0], { dir: "h", off: kappa > 0 ? -12 : -26, text: `R${Math.round(rL)}` }) +
      K.dim(VP, [icr, 0], [775, 0], { dir: "h", off: kappa > 0 ? -26 : -12, text: `R${Math.round(rR)}` });
  } else el.dimR.innerHTML = "";
  // DIAGRAM 1
  const vis = hist.filter(([t]) => t >= simT - CH.W);
  const ptsL = vis.map(([t, nL]) => `${chX(t)},${chY(nL)}`);
  const ptsR = vis.map(([t, , nR]) => `${chX(t)},${chY(nR)}`);
  el.traceL.setAttribute("points", ptsL.join(" "));
  el.traceR.setAttribute("points", ptsR.join(" "));
  el.traceC.setAttribute("points", vis.map(([t, nL, nR]) => `${chX(t)},${chY((nL + nR) / 2)}`).join(" "));
  el.band.setAttribute("d", vis.length > 1 ? `M${ptsL.join("L")}L${ptsR.reverse().join("L")}Z` : "");
  // readout
  const ice = iceVis > 0.5;
  const tq = M.torques(ice).each;
  let mode = "STRAIGHT";
  if (ice) mode = "R WHEEL ON ICE";
  else if (v < 0.05) mode = "STOPPED";
  else if (Math.abs(kappa) > 0.01) mode = `TURN ${kappa > 0 ? "L" : "R"} ${(1 / Math.abs(kappa)).toFixed(1)} m`;
  el.readout.textContent = `n L ${fmt0(M.rpm(w.wL))} R ${fmt0(M.rpm(w.wR))} C ${fmt0(M.rpm(wC))} · SPIDER ${fmt0(nS)} rpm · T ${fmt0(tq)}+${fmt0(tq)} N·m · ${mode}`;
  say(`${mode.toLowerCase()}: left wheel ${fmt0(M.rpm(w.wL))}, right ${fmt0(M.rpm(w.wR))}, carrier ${fmt0(M.rpm(wC))} rpm; spiders ${fmt0(Math.abs(nS))} rpm.`, live.clock);
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
  // A still, true moment: the tour played into its left turn, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 6; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const KMAX = 1 / 5;
const clampK = (k) => Math.min(KMAX, Math.max(-KMAX, k));
const takeOver = () => {
  if (live.touring) {
    user.v = v > 0.3 ? v : M.V_CRUISE;
    user.kappa = kappa;
    user.ice = false;
  }
};

{
  const hit = svg.querySelector('[data-drag="plan"]');
  let id = null;
  let x0 = 0;
  let k0 = 0;
  const toSheet = (e) => {
    const m = svg.getScreenCTM();
    return m ? (e.clientX - m.e) / m.a : e.clientX;
  };
  hit.addEventListener("pointerdown", (e) => {
    takeOver();
    id = e.pointerId;
    hit.setPointerCapture(id);
    x0 = toSheet(e);
    k0 = user.kappa;
    dragging = true;
    live.input();
    e.preventDefault();
  });
  hit.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    user.kappa = clampK(k0 - ((toSheet(e) - x0) / 150) * KMAX); // drag right: steer right
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
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "i", "I", "s", "S", "Home"].includes(k)) return;
  takeOver();
  if (k === "ArrowLeft") user.kappa = clampK(user.kappa + KMAX / 5);
  else if (k === "ArrowRight") user.kappa = clampK(user.kappa - KMAX / 5);
  else if (k === "ArrowUp") user.v = Math.min(30 / 3.6, user.v + 5 / 3.6);
  else if (k === "ArrowDown") user.v = Math.max(0, user.v - 5 / 3.6);
  else if (k === "Home") user.kappa = 0;
  else if (k === "i" || k === "I") user.ice = !user.ice;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
