// Page code for nose-gear.html. K (kit), L (runtime), C (self-check), M (model) and P (parts) are
// inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const LIVE_D = JSON.parse(svg.dataset.lived);
const VM = K.view(specs.main);
const VC = K.view(specs.C);
const VD = K.view(specs.D);
const VE = K.view(specs.E);
const { CH, CT, DX } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;

const el = {
  mv: $("mv-main"),
  mvb: $("mvb-main"),
  links: $("links-main"),
  lb: Object.keys(LIVE).map((n) => [n, $(`lb-${n}`)]),
  lbD: Object.keys(LIVE_D).map((n) => [n, $(`lb-${n}`)]),
  snubs: [...svg.querySelectorAll(".snub")],
  ground: $("ground"),
  air: [$("air-main"), $("air-C")],
  oilA: [$("oil-a-main"), $("oil-a-C")],
  oilB: [$("oil-b-main"), $("oil-b-C")],
  mvC: $("mv-C"),
  flow: $("flow-c"),
  heads: $("flow-heads"),
  mvD: $("mv-D"),
  snubD: $("snub-D"),
  rotE: $("rot-E"),
  linksE: $("links-E"),
  pinE: $("pin-E"),
  oilE: $("oil-E"),
  damperE: $("damper-E"),
  bungeeE: $("bungee-E"),
  dimC: $("dim-c-wrap"),
  dimX: $("dim-x-wrap"),
  fcTrail: $("fc-trail"),
  fcDot: $("fc-dot"),
  ctCursor: $("ct-cursor"),
  ctDot: $("ct-dot"),
  ctPdot: $("ct-pdot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.gear();
let mode = "tour"; // "tour": the tour drives it; "free": the model runs on the user's pedals; "hand": a held stroke
let landing = false; // free mode: sinking onto the runway after Space
let bumpAt = -1; // free mode: when the user's bump began (model time)
let pedalUser = 0;
let pedalNow = 0;
let cTarget = M.C_STATIC;
let dragging = false;
let phase = 0; // oil travelled, for the moving dashes
let clock = 0;
let trail = [];

// on the ground at rest: the static stroke, the tyre squashed by the nose load
function settle() {
  const defl = (M.W_NOSE + M.MU * M.G) / M.K_TYRE;
  s.air = false;
  s.yu = M.TYRE_R / 1000 - defl;
  s.ys = s.yu - M.C_STATIC / 1000;
  s.vs = 0;
  s.vu = 0;
  s.c = M.C_STATIC;
  s.w = 0;
}

function freeStep(h) {
  if (s.air && landing && s.yu - M.TYRE_R / 1000 <= 0.0005) {
    s.air = false;
    landing = false;
  }
  if (s.air) s.vs = landing ? -M.V_SINK : 0;
  const g = bumpAt >= 0 ? M.groundAt(s.t + h - bumpAt + M.BUMP.t) : 0;
  pedalNow = L.follow(pedalNow, pedalUser, 6, h);
  M.stepGear(s, h, { pedal: pedalNow, load: 1, ground: g });
}

function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 2000));
  const h = dt / n;
  if (live.touring && mode !== "tour" && !dragging) {
    // the tour takes over again: a new approach and landing
    mode = "tour";
    s = M.gear();
    pedalUser = 0;
  }
  for (let i = 0; i < n; i++) {
    clock += h;
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.gear();
      pedalNow = s.pedal;
    } else if (mode === "free") freeStep(h);
    else {
      pedalNow = L.follow(pedalNow, pedalUser, 6, h);
      M.holdGear(s, live.reduced ? cTarget : L.follow(s.c, cTarget, 14, h), h, pedalNow);
    }
    phase += Math.abs(s.w) * h * 1000 * 1.4;
    const last = trail[trail.length - 1];
    if (!last || Math.abs(s.c - last[1]) > 0.4 || Math.abs(s.F - last[2]) > 20 || clock - last[0] > 1 / 30) trail.push([clock, s.c, s.F]);
  }
  while (trail.length && clock - trail[0][0] > 2) trail.shift();
  return mode !== "hand" || Math.abs(s.c - cTarget) > 1e-3 || Math.abs(pedalNow - pedalUser) > 1e-3 || Math.abs(s.psi - pedalNow * M.STEER_MAX) > 1e-3;
}

// ---------------------------------------------------------------- drawing helpers
const fx = (c) => K.r2(CH.x0 + (Math.max(0, Math.min(CH.cMax, c)) / CH.cMax) * (CH.x1 - CH.x0));
const fy = (F) => K.r2(CH.y1 - (Math.max(0, Math.min(CH.fMax, F / 1000)) / CH.fMax) * (CH.y1 - CH.y0));
const tx = (t) => K.r2(CT.x0 + (Math.max(0, Math.min(CT.tMax, t)) / CT.tMax) * (CT.x1 - CT.x0));
const cy = (c) => K.r2(CT.y1 - (c / CT.cMax) * (CT.y1 - CT.y0));
const py = (p) => K.r2((CT.y0 + CT.y1) / 2 - (p / CT.psiMax) * ((CT.y1 - CT.y0) / 2));
// stipple density follows pressure: 3.5 bar sparse, 30 bar dense
const tint = (p) => K.r2(0.12 + 0.88 * Math.min(1, Math.max(0, Math.log(p / 3.5) / Math.log(30 / 3.5))));
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
const shown = { c: -1, shut: null, psi: 99, xs: "" };
const SNUB_LIFT = M.SNUB_TOP - M.SNUB_T - M.SNUB_BOT;

function render(live) {
  const c = s.c;
  const w = s.w;
  const psi = s.psi;
  const shut = M.snubberShut(w) && w < -0.003;
  // the piston tube and all it carries, in the main view and in Detail C
  const dyM = K.r2(-c * VM.k);
  el.mv.setAttribute("transform", `translate(0 ${dyM})`);
  el.mvb.setAttribute("transform", `translate(0 ${dyM})`);
  el.mvC.setAttribute("transform", `translate(0 ${K.r2(-c * VC.k)})`);
  if (Math.abs(c - shown.c) > 0.05) {
    el.links.innerHTML = P.links(VM, c);
    el.linksE.innerHTML = P.linksPlan(VE, c);
    el.dimC.innerHTML = c < 2 ? "" : K.dim(VM, [36, M.CROWN_TOP], [36, M.CROWN_TOP + c], { dir: "v", off: DX - VM.p([36, 0])[0], text: `c=${Math.round(c)}`, id: "dim-c" });
    el.dimX.innerHTML = K.dim(VM, [25.4, M.CROWN_TOP + c], [25.4, M.GLAND_BOT], { dir: "v", off: DX + 26 - VM.p([25.4, 0])[0], text: `${Math.round(M.GLAND_BOT - M.CROWN_TOP - c)}`, id: "dim-x" });
    // the torque links' balloons: circles stay, dots ride on the links
    const top = M.LINK_TOP;
    const k = M.knee(c);
    const bot = [M.LINK_BOT0[0], M.LINK_BOT0[1] + c];
    const at = { 19: [(top[0] + k[0]) / 2, (top[1] + k[1]) / 2], 20: [(k[0] + bot[0]) / 2, (k[1] + bot[1]) / 2], 21: k };
    for (const [n, node] of el.lb) node.innerHTML = K.balloon(VM, at[n], LIVE[n].at, n, { target: n });
    // the metering pin where E-E cuts it
    const z = M.PIN_TIP + c - M.HORN_V;
    const r = (z <= M.PIN_LEN ? M.pinD(z) : 8) / 2;
    el.pinE.innerHTML = P.part(11, K.body(VE, K.circle(0, 0, r, 24)));
    shown.c = c;
  }
  if (shut !== shown.shut) {
    for (const g of el.snubs) g.innerHTML = P.snubber(g.closest("#mv-C") ? VC : VM, shut);
    el.snubD.setAttribute("transform", `translate(0 ${K.r2(-(shut ? SNUB_LIFT : 0) * VD.k)})`);
    shown.shut = shut;
  }
  // View D: the moving cam slides round by R·ψ and up by c
  el.mvD.setAttribute("transform", `translate(${K.r2(P.R_CAM * psi * rad * VD.k)} ${K.r2(-c * VD.k)})`);
  for (const [n, node] of el.lbD) {
    const d = LIVE_D[n];
    const lift = n === "7" && shut ? SNUB_LIFT : 0;
    node.innerHTML = K.balloon(VD, [d.s + P.R_CAM * psi * rad, d.v + c + lift], d.at, n, { target: n });
  }
  // E-E: the collar, links, fork and tyre turn by ψ; the damper rod and the bungees follow the horns
  const [ex, ey] = VE.p([0, 0]);
  el.rotE.setAttribute("transform", `rotate(${K.r2(-psi)} ${ex} ${ey})`);
  const xhR = -M.HORN_R * Math.sin(psi * rad);
  const xhL = -xhR;
  const xpL = M.HORN_R * Math.sin(pedalNow * M.STEER_MAX * rad);
  const xs = `${xhR.toFixed(2)} ${xpL.toFixed(2)}`;
  if (xs !== shown.xs) {
    el.damperE.innerHTML = P.damperPlan(VE, xhR);
    el.bungeeE.innerHTML = P.bungeePlan(VE, 1, xhR, -xpL) + P.bungeePlan(VE, -1, xhL, xpL);
    shown.xs = xs;
  }
  // the fluids: air over oil; the oil under the orifice is at the higher pressure in compression
  const pa = M.pAir(c);
  const dp = M.dpOrifice(c, w);
  const pb = Math.max(0.2, w >= 0 ? pa + dp : pa - dp);
  for (const [V, a, oa, ob] of [[VM, el.air[0], el.oilA[0], el.oilB[0]], [VC, el.air[1], el.oilA[1], el.oilB[1]]]) {
    a.setAttribute("d", P.fluidPath(V, P.airShape(c)));
    a.setAttribute("fill-opacity", tint(pa));
    oa.setAttribute("d", P.fluidPath(V, P.oilAbove(c)));
    oa.setAttribute("fill-opacity", tint(pa));
    ob.setAttribute("d", P.fluidPath(V, P.oilBelow(c)));
    ob.setAttribute("fill-opacity", tint(pb));
  }
  el.oilE.setAttribute("fill-opacity", tint(pb));
  // the jet through the orifice, Detail C
  const strength = Math.min(1, Math.abs(w) / 0.25);
  if (Math.abs(w) > 0.004 && c > 0.5) {
    const path = P.flowPath(c, w > 0 ? 1 : -1);
    el.flow.setAttribute("d", K.d(VC, path, false));
    el.flow.setAttribute("stroke-dashoffset", K.r2((w > 0 ? -1 : 1) * (phase % 8.5)));
    el.flow.setAttribute("stroke-opacity", K.r2(0.35 + 0.65 * strength));
    el.heads.setAttribute("d", arrowAt(VC, path));
    el.heads.setAttribute("fill-opacity", K.r2(0.35 + 0.65 * strength));
  } else {
    el.flow.setAttribute("d", "");
    el.heads.setAttribute("d", "");
  }
  // the runway under the wheel, in the airframe's frame (hidden in flight)
  const vg = (s.zg - s.ys) * 1000;
  el.ground.setAttribute("transform", `translate(0 ${K.r2(VM.p([0, vg])[1])})`);
  el.ground.style.display = vg < -260 ? "none" : "";
  // charts
  el.fcTrail.setAttribute("points", trail.map(([, a, b]) => `${fx(a)},${fy(b)}`).join(" "));
  el.fcDot.setAttribute("cx", fx(c));
  el.fcDot.setAttribute("cy", fy(s.F));
  const onTour = mode === "tour";
  for (const node of [el.ctCursor, el.ctDot, el.ctPdot]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    el.ctCursor.setAttribute("d", `M${tx(s.t)} ${CT.y0}V${CT.y1}`);
    el.ctDot.setAttribute("cx", tx(s.t));
    el.ctDot.setAttribute("cy", cy(c));
    el.ctPdot.setAttribute("cx", tx(s.t));
    el.ctPdot.setAttribute("cy", py(psi));
  }
  const side = Math.abs(psi) < 0.05 ? "" : psi > 0 ? " L" : " R";
  const where = mode === "hand" ? (c < M.CAM_DEPTH ? "CAMS ENGAGING" : "HELD") : M.phase(s);
  el.readout.textContent = `c ${Math.round(c)} mm · F ${(s.F / 1000).toFixed(2)} kN · p ${(pa - M.P_ATM).toFixed(1)} bar g · ψ ${Math.abs(psi).toFixed(1)}°${side} · ${where}`;
  say(`Strut compression ${Math.round(c)} millimetres, force ${Math.round(s.F)} newtons, air ${(pa - M.P_ATM).toFixed(1)} bar gauge, wheel ${Math.abs(psi).toFixed(1)} degrees ${psi > 0.05 ? "left" : psi < -0.05 ? "right" : "straight"}, ${where.toLowerCase()}.`, live.clock);
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
  // a still, true moment: on the ground, steering left
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 4.8; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampC = (x) => Math.min(M.STROKE, Math.max(0, x));
function toHand() {
  if (mode !== "hand") {
    mode = "hand";
    cTarget = s.c;
    pedalUser = s.pedal;
  }
}
function toFree() {
  if (mode === "tour") {
    mode = "free";
    pedalUser = s.pedal;
    landing = s.air && s.t < M.T_TD + 0.5;
  } else if (mode === "hand") {
    mode = "free";
    settle();
  }
}
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  let c0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      toHand();
      c0 = s.c;
      cTarget = s.c;
      live.input();
    },
    move: (dy) => {
      cTarget = clampC(c0 - dy / VM.k);
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
  if (k === "ArrowUp" || k === "ArrowDown") {
    toHand();
    cTarget = clampC(cTarget + (k === "ArrowUp" ? 10 : -10));
  } else if (k === "Home" || k === "End") {
    toHand();
    cTarget = k === "End" ? M.STROKE : 0;
  } else if (k === "ArrowLeft" || k === "ArrowRight") {
    if (mode === "tour") toFree();
    pedalUser = Math.max(-1, Math.min(1, pedalUser + (k === "ArrowLeft" ? 0.25 : -0.25)));
  } else if (k === " ") {
    s = M.gear();
    mode = "free";
    landing = true;
    bumpAt = -1;
    trail = [];
  } else if (k === "b" || k === "B") {
    if (mode === "hand" || s.air) settle();
    mode = "free";
    landing = false;
    bumpAt = s.t + 0.3;
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
