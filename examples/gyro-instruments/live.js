// Page code for gyro-instruments.html. K (kit), L (runtime), C (self-check), A (the parent aircraft's
// model), M (model) and P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const FACES = JSON.parse(svg.dataset.faces);
const LIVE = JSON.parse(svg.dataset.live);
const V = Object.fromEntries(Object.entries(specs).map(([k, s]) => [k, K.view(s)]));
const VE = (c) => K.view({ x: c[0], y: c[1], scale: 0.5 });
const { CT, CS, SUC, TUBE } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const rad = Math.PI / 180;

const el = {
  aiGyro: $("ai-gyro"),
  aiAir: [$("ai-air"), $("ai-air-u"), $("ai-air-p")],
  lVane: $("l-vane"),
  lJet: $("l-jet"),
  hiGyro: $("hi-gyro"),
  hiAir: $("hi-air"),
  hiKnob: $("hi-knob"),
  tcGimbal: $("tc-gimbal"),
  tcSprings: $("tc-springs"),
  pumpRotor: $("pump-rotor"),
  pumpVanes: $("pump-vanes"),
  pumpAir: [$("pump-air"), $("pump-air-in"), $("pump-air-out")],
  regPoppet: $("reg-poppet"),
  regSpring: $("reg-spring"),
  regAir: $("reg-air"),
  kBall: $("k-ball"),
  kArrows: $("k-arrows"),
  aiCard: $("ai-card"),
  hiCard: $("hi-card"),
  tcPlane: $("tc-plane"),
  tcBall: $("tc-ball"),
  suc: $("suc-needle"),
  sch: [...svg.querySelectorAll("#sch [data-line]")],
  schIn: $("sch-in"),
  schPump: $("sch-pump"),
  schBleed: $("sch-bleed"),
  schS: $("sch-s"),
  filAir: [$("fil-air"), $("fil-air-o")],
  ctCursor: $("ct-cursor"),
  ctAI: $("ct-ai"),
  ctHI: $("ct-hi"),
  csCursor: $("cs-cursor"),
  csDot: $("cs-dot"),
  readout: $("readout"),
  readout2: $("readout2"),
  lb: (n) => $(`lb-${n}`),
};
const say = L.announcer($("sr"), 2.5);

// ---------------------------------------------------------------- state
let st = M.system();
let mode = "tour"; // "tour": the tour drives; "free": the reader flies
const ctl = { rpm: M.RPM_CRUISE, pumpOk: true, phiT: 0, rud: 0, rudT: 0, warp: 1 };
let pumpShown = 0; // deg, the rotor as drawn: 1/150 of its speed, in tour time
let setting = 0; // seconds left of a heading set (the knob pushed in)
let dragging = false;

function toFree() {
  if (mode === "free") return;
  mode = "free";
  ctl.rpm = st.rpm > 0 ? st.rpm : M.RPM_CRUISE;
  ctl.pumpOk = st.pumpOk;
  ctl.phiT = st.phi;
  ctl.rud = ctl.rudT = st.rud;
  ctl.warp = 1;
}
function restart() {
  st = M.system();
  mode = "tour";
}

function step(dt, live) {
  if (live.touring && mode !== "tour" && !dragging) restart();
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(st, h);
      if (st.t >= M.TOUR) st = M.system();
    } else {
      const phi0 = st.phi;
      const phi = phi0 + Math.max(-12 * h, Math.min(12 * h, ctl.phiT - phi0));
      ctl.rud = L.follow(ctl.rud, ctl.rudT, 6, h);
      const real = h * ctl.warp;
      const m = Math.max(1, Math.ceil(real / 0.004));
      for (let j = 0; j < m; j++) M.step(st, real / m, { rpm: ctl.rpm, master: true, pumpOk: ctl.pumpOk, phi: phi0 + ((phi - phi0) * (j + 1)) / m, dphi: (phi - phi0) / real, rud: ctl.rud });
      st.warp = ctl.warp;
      if (setting > 0) {
        st.hiErr *= Math.exp(-h / 0.05);
        setting -= h;
      }
    }
    if (st.pumpOk && st.rpm > 0) pumpShown += ((st.rpm * M.PUMP.drive) / 60) * 360 * h / 150;
  }
  return true;
}

// ---------------------------------------------------------------- drawing helpers
const tx = (t) => K.r2(CT.x0 + (Math.min(CT.tMax, Math.max(0, t)) / CT.tMax) * (CT.x1 - CT.x0));
const ry = (r) => K.r2(CT.y1 - (Math.min(CT.rMax, Math.max(0, r)) / CT.rMax) * (CT.y1 - CT.y0));
const nx = (n) => K.r2(CS.x0 + (Math.min(CS.nMax, Math.max(0, n)) / CS.nMax) * (CS.x1 - CS.x0));
const sy = (s) => K.r2(CS.y1 - (Math.min(CS.sMax, Math.max(0, s)) / CS.sMax) * (CS.y1 - CS.y0));
// the air's stipple follows the flow through the jets: none with the pump dead, dense at the regulated suction
const flowTint = (s) => K.r2(0.06 + 0.5 * Math.min(1.1, Math.sqrt(Math.max(0, s) / M.S_SET)));
const shown = {};
const changed = (k, v, eps) => {
  if (shown[k] !== undefined && Math.abs(shown[k] - v) < eps) return false;
  shown[k] = v;
  return true;
};
const sucAngle = (x) => SUC.a0 - Math.max(0, Math.min(10.5, x)) * SUC.span;
const ballAt = (b) => [Math.sin(b * rad) * M.TUBE_R, M.TUBE_R - Math.cos(b * rad) * M.TUBE_R];
function arrow(Vw, a, b, cls) {
  const [ax, ay] = Vw.p(a);
  const [bx, by] = Vw.p(b);
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 3) return "";
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const hx = bx - ux * 6.5;
  const hy = by - uy * 6.5;
  return `<path class="${cls}" d="M${K.r2(ax)} ${K.r2(ay)}L${K.r2(hx)} ${K.r2(hy)}"/><path class="head" d="M${K.r2(bx)} ${K.r2(by)}L${K.r2(hx - uy * 2)} ${K.r2(hy + ux * 2)}L${K.r2(hx + uy * 2)} ${K.r2(hy - ux * 2)}Z"/>`;
}

function render(live) {
  const sh = M.shows(st);
  const kin = st.kin ?? M.kinematics(0, 0, M.V_CRUISE, 0);
  const tint = flowTint(st.s);
  // ---- A-A: the gyro assembly turns in the case by its roll from the case's vertical
  const rel = st.tilt[0] - st.phi;
  const VA = V.A;
  el.aiGyro.setAttribute("transform", `rotate(${K.r2(rel)} ${VA.x} ${VA.y})`);
  for (const f of el.aiAir) f?.setAttribute("fill-opacity", tint);
  if (changed("rel", rel, 0.05)) {
    for (const n of ["13", "14", "15", "16"]) {
      const d = LIVE.A[n];
      el.lb(n).innerHTML = K.balloon(VA, P.rotPt(d.at, -rel, [0, 0]), d.b, n, { target: n });
    }
  }
  // ---- Detail L: the aft vane hangs along the apparent vertical; the slot it uncovers jets air
  const va = st.tilt[0] - kin.apparent;
  if (changed("va", va, 0.05)) el.lVane.innerHTML = P.vane(V.L, va);
  const edge = P.slotOpen(va);
  const S_ = P.VANE_SLOT;
  el.lJet.setAttribute("d", edge < S_.half - 0.02 ? K.d(V.L, K.rect(edge, S_.v0, S_.half, S_.v1)) + K.d(V.L, K.rect(edge, S_.v0 - 2.6, S_.half, S_.v0)) : "");
  el.lJet.setAttribute("fill-opacity", tint);
  // ---- C-C: the HI gyro holds its heading in space; the case turns round it
  const hInd = sh.hiHdg;
  const VC = V.C;
  el.hiGyro.setAttribute("transform", `rotate(${K.r2(hInd)} ${VC.x} ${VC.y})`);
  el.hiAir?.setAttribute("fill-opacity", tint);
  if (changed("hInd", hInd, 0.05)) {
    for (const n of ["18", "19", "20"]) {
      const d = LIVE.C[n];
      el.lb(n).innerHTML = K.balloon(VC, P.rotPt(d.at, -hInd, [0, 0]), d.b, n, { target: n });
    }
  }
  const push = (mode === "tour" ? M.tourAt(st.t).knob : setting > 0) ? 1 : 0;
  if (changed("push", push, 0.5)) el.hiKnob.innerHTML = P.hiKnob(VC, push);
  // ---- D-D: the gimbal precesses against its springs
  const dl = st.delta;
  const VD = V.D;
  el.tcGimbal.setAttribute("transform", `rotate(${K.r2(dl)} ${VD.x} ${VD.y})`);
  if (changed("dl", dl, 0.04)) {
    el.tcSprings.innerHTML = P.tcSprings(VD, dl);
    for (const n of ["23", "24"]) {
      const d = LIVE.D[n];
      el.lb(n).innerHTML = K.balloon(VD, P.rotPt(d.at, -dl, [0, 0]), d.b, n, { target: n });
    }
    el.lb("25").innerHTML = K.balloon(VD, P.tcSpringDot(dl), LIVE.D["25"].b, 25, { target: 25 });
  }
  // ---- B-B: the rotor turns (drawn at 1/150 of its speed), the vanes slide out to the bore
  const th = pumpShown % 360;
  const VB = V.B;
  el.pumpRotor.setAttribute("transform", `rotate(${K.r2(-th)} ${VB.x} ${VB.y})`);
  const broken = st.broken ? 2 : -1;
  if (changed("th", th + broken * 1000, 0.2)) {
    el.pumpVanes.innerHTML = P.pumpVanes(VB, th, broken);
    // the balloon rides on whichever vane is passing low on the left
    let best = 0;
    let bd = 1e9;
    for (let k = 0; k < M.PUMP.z; k++) {
      const a = (((th + k * 60 - 215) % 360) + 360) % 360;
      const dd = Math.min(a, 360 - a);
      if (dd < bd && k !== broken) {
        bd = dd;
        best = k;
      }
    }
    const pts = P.vanePts(th + best * 60);
    const c = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2];
    el.lb("4").innerHTML = K.balloon(VB, c, LIVE.B["4"].b, 4, { target: 4 });
  }
  if (!shown.b3) {
    el.lb("3").innerHTML = K.balloon(VB, [7.6 * Math.cos(-40 * rad), 7.6 * Math.sin(-40 * rad)], LIVE.B["3"].b, 3, { target: 3 });
    shown.b3 = true;
  }
  for (const f of el.pumpAir) f?.setAttribute("fill-opacity", tint);
  // ---- F-F: the regulator's poppet lifts off its seat above 5 inHg
  const x = st.lift;
  if (changed("lift", x, 0.004)) {
    el.regPoppet.innerHTML = P.regPoppet(V.F, x);
    el.regSpring.innerHTML = P.regSpring(V.F, x);
    el.regAir.innerHTML = P.regAir(V.F, x);
  }
  for (const f of el.regAir.querySelectorAll("path")) f.setAttribute("fill-opacity", tint);
  // ---- Detail K and the TC face: the ball, and the forces it balances
  const b = st.ball;
  const VK = V.K;
  const p0 = VK.p([0, 0]);
  const pb = VK.p(ballAt(b));
  el.kBall.setAttribute("transform", `translate(${K.r2(pb[0] - p0[0])} ${K.r2(pb[1] - p0[1])})`);
  const Vt = K.view({ x: FACES.tc[0], y: VE(FACES.tc).p([0, -27])[1], scale: 0.5 });
  const q0 = Vt.p([0, 0]);
  const qb = Vt.p(ballAt(b));
  el.tcBall.setAttribute("transform", `translate(${K.r2(qb[0] - q0[0])} ${K.r2(qb[1] - q0[1])})`);
  if (changed("arrows", b * 1000 + st.phi + kin.psiDot * 7, 0.02)) {
    const phi = st.phi * rad;
    const w = kin.psiDot * rad;
    const Vv = (mode === "tour" && M.tourAt(st.t).ground ? 0 : M.V_CRUISE * M.KT);
    const sc = 0.9; // mm of arrow per m/s²
    const c = ballAt(b);
    const gv = [Math.sin(phi) * M.G, -Math.cos(phi) * M.G];
    const cv = [-w * Vv * Math.cos(phi), -w * Vv * Math.sin(phi)];
    const r = [gv[0] + cv[0], gv[1] + cv[1]];
    const at = (v) => [c[0] + v[0] * sc, c[1] + v[1] * sc];
    el.kArrows.innerHTML = arrow(VK, c, at(gv), "thin") + arrow(VK, at(gv), at(r), "thin") + arrow(VK, c, at(r), "vis");
  }
  // ---- VIEW E: the faces
  const fa = FACES.ai;
  const pitch = Math.max(-20, Math.min(20, sh.aiPitch));
  el.aiCard.setAttribute("transform", `rotate(${K.r2(-sh.aiRel)} ${fa[0]} ${fa[1]}) translate(0 ${K.r2(pitch * 1.1 * 0.5 * K.PX_PER_MM)})`);
  el.hiCard.setAttribute("transform", `rotate(${K.r2(-hInd)} ${FACES.hi[0]} ${FACES.hi[1]})`);
  el.tcPlane.setAttribute("transform", `rotate(${K.r2(sh.tcSymbol)} ${FACES.tc[0]} ${FACES.tc[1]})`);
  el.suc.setAttribute("transform", `rotate(${K.r2(90 - sucAngle(sh.suctionInHg))} ${FACES.suc[0]} ${FACES.suc[1]})`);
  // ---- Diagram 3 and H: the air in the lines (by its flow) and in the filter
  const qi = M.instrFlow(st.s);
  const qr = st.pumpOk ? M.regFlow(st.s) : 0;
  const qp = qi + qr;
  const op = (q) => K.r2(0.08 + 0.92 * Math.min(1, q / 110));
  for (const pth of el.sch) {
    const kk = pth.dataset.line;
    pth.setAttribute("stroke-opacity", kk === "bleed" ? op(qr) : kk === "suct" || kk === "exh" ? op(qp) : op(qi * 1.6));
  }
  el.schIn.textContent = `${Math.round(qi)} L/min`;
  el.schPump.textContent = st.pumpOk ? `${Math.round(qp)} L/min` : "SHEARED";
  el.schBleed.textContent = `${Math.round(qr)} L/min`;
  el.schS.textContent = `${sh.suctionInHg.toFixed(1)} inHg`;
  for (const f of el.filAir) f?.setAttribute("fill-opacity", tint);
  // ---- diagrams
  const onTour = mode === "tour";
  for (const node of [el.ctCursor, el.ctAI, el.ctHI]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    el.ctCursor.setAttribute("d", `M${tx(st.t)} ${CT.y0}V${CT.y1}`);
    el.ctAI.setAttribute("cx", tx(st.t));
    el.ctAI.setAttribute("cy", ry(sh.rpm.ai));
    el.ctHI.setAttribute("cx", tx(st.t));
    el.ctHI.setAttribute("cy", ry(sh.rpm.hi));
  }
  el.csCursor.setAttribute("d", `M${nx(st.rpm)} ${CS.y0}V${CS.y1}`);
  el.csDot.setAttribute("cx", nx(st.rpm));
  el.csDot.setAttribute("cy", sy(sh.suctionInHg));
  // ---- readouts
  const k = (r) => (r >= 950 ? `${(r / 1000).toFixed(1)}k` : `${Math.round(r)}`);
  const warp = st.warp > 1.05 ? `TIME ×${Math.round(st.warp)}` : "TIME ×1";
  const phase = mode === "tour" ? M.phaseAt(st.t) : st.pumpOk ? "FREE" : "FREE · PUMP FAILED";
  el.readout.textContent = `${sh.suctionInHg.toFixed(1)} inHg · ${Math.round(st.rpm)} rpm · ROTORS ${k(sh.rpm.ai)} ${k(sh.rpm.hi)} ${k(sh.rpm.tc)} · ${warp}`;
  const ballTxt = Math.abs(sh.ball) < 1.2 ? "BALL MID" : `BALL ${sh.ball > 0 ? "R" : "L"} ${Math.abs(sh.ball).toFixed(0)}°`;
  const fmtH = (h) => String(Math.round(h) % 360).padStart(3, "0");
  el.readout2.textContent = `BANK ${Math.round(st.phi)}° AI ${Math.round(sh.aiRel)}° · ${sh.psiDot.toFixed(1)}°/s · ${ballTxt} · HI ${fmtH(hInd)} MAG ${fmtH(sh.compass)} · ${phase}`;
  say(`Suction ${sh.suctionInHg.toFixed(1)} inches; attitude gyro ${Math.round(sh.rpm.ai)} rpm; bank ${Math.round(st.phi)} degrees, attitude indicator shows ${Math.round(sh.aiRel)}; turn ${sh.psiDot.toFixed(1)} degrees a second; heading indicator ${fmtH(hInd)}, compass ${fmtH(sh.compass)}; ${phase.toLowerCase()}.`, live.clock);
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
  // a still, telling moment: in the standard-rate turn
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 16; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

// drag the heading-set knob (either view of it): it turns the card
for (const hitEl of svg.querySelectorAll('[data-drag="knob"]')) {
  let e0 = 0;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      toFree();
      e0 = st.hiErr;
      live.input();
    },
    move: (dy) => {
      st.hiErr = e0 + dy * 0.8;
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}
// drag across the attitude indicator: bank
{
  const hitEl = svg.querySelector('[data-drag="bank"]');
  let id = null;
  let x0 = 0;
  let p0 = 0;
  const toSheet = (e) => {
    const m = svg.getScreenCTM();
    return m ? (e.clientX - m.e) / m.a : e.clientX;
  };
  hitEl.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    hitEl.setPointerCapture(id);
    x0 = toSheet(e);
    dragging = true;
    toFree();
    p0 = ctl.phiT;
    e.preventDefault();
    live.input();
  });
  hitEl.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    ctl.phiT = Math.max(-60, Math.min(60, p0 + (toSheet(e) - x0) * 0.8));
    live.input();
  });
  const stop = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    dragging = false;
    live.input();
  };
  hitEl.addEventListener("pointerup", stop);
  hitEl.addEventListener("pointercancel", stop);
}

const WARPS = [1, 10, 60];
svg.addEventListener("keydown", (e) => {
  const key = e.key;
  const lk = key.toLowerCase();
  if (key === "ArrowLeft" || key === "ArrowRight") {
    toFree();
    ctl.phiT = Math.max(-60, Math.min(60, ctl.phiT + (key === "ArrowRight" ? 5 : -5)));
  } else if (key === "ArrowUp" || key === "ArrowDown") {
    toFree();
    ctl.rpm = Math.max(0, Math.min(M.RPM_RATED, ctl.rpm + (key === "ArrowUp" ? 100 : -100)));
  } else if (lk === "a" || lk === "d") {
    toFree();
    ctl.rudT = lk === "d" ? 1 : -1;
  } else if (lk === "v") {
    toFree();
    ctl.pumpOk = !ctl.pumpOk;
    if (ctl.pumpOk) st.broken = false;
  } else if (lk === "h") {
    toFree();
    setting = 0.4;
  } else if (lk === "w") {
    toFree();
    ctl.warp = WARPS[(WARPS.indexOf(ctl.warp) + 1) % WARPS.length];
  } else if (key === " ") restart();
  else if (lk === "s") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});
svg.addEventListener("keyup", (e) => {
  const lk = e.key.toLowerCase();
  if (lk === "a" || lk === "d") {
    ctl.rudT = 0;
    live.input();
  }
});
svg.addEventListener("blur", () => (ctl.rudT = 0));

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
