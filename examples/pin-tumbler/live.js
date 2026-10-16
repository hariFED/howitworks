// Page code for pin-tumbler.html. K (kit), L (runtime), C (self-check), M (model), P (parts) and
// X (extra) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const CH = JSON.parse(svg.dataset.ch);
const MOVING = JSON.parse(svg.dataset.moving);
const VM = K.view(specs.main);
const VB = K.view(specs.B);
const VC = K.view(specs.C);
const VD = K.view(specs.D);
const $ = (id) => document.getElementById(id);

const el = {
  drv: $("m-drv"),
  dDrv: $("d-drv"),
  dPlug: $("d-plug"),
  dKey: $("d-key"),
  dKp: $("d-kp"),
  dGaps: $("d-gaps"),
  spr: $("m-spr"),
  plug: $("m-plug"),
  cam: $("m-cam"),
  key: $("m-key"),
  kp: $("m-kp"),
  gaps: $("m-gaps"),
  mvb: $("mvb"),
  dimIn: $("dim-in-wrap"),
  vbRot: $("vb-rot"),
  vbKey: $("vb-key"),
  vbCamH: $("vb-cam-h"),
  vbCamV: $("vb-cam-v"),
  torque: $("torque"),
  ccRot: $("cc-rot"),
  ccKey: $("cc-key"),
  ccPin: $("cc-pin"),
  ccStack: $("cc-stack"),
  ccGap: $("cc-gap"),
  ccb: $("ccb"),
  bars: [0, 1, 2, 3, 4].map((i) => $(`bar-${i}`)),
  vals: [0, 1, 2, 3, 4].map((i) => $(`cv-${i}`)),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);
const E = M.BLADE_LEN;

// ---------------------------------------------------------------- state
let wrong = true; // the tour starts with the wrong key
let e = 0; // insertion, mm (E = home)
let phi = 0; // plug angle, degrees clockwise seen from the front
let fade = 1; // key opacity while keys are swapped
let torque = false; // someone is trying to turn the key
let eTarget = 0;
let phiTarget = 0;
let pendingSwap = false;
let auto = false;
let dragging = false;
let st = M.stacks(M.WRONG, 0);
const bitting = () => (wrong ? M.WRONG : M.RIGHT);

// The tour: the wrong key goes in and will not turn; out; the right key goes in and turns.
const SEG = [
  ["hold", 0.8],
  ["in", 2.4],
  ["try", 1.6],
  ["out", 2.0],
  ["swap", 0.8],
  ["in", 2.4],
  ["turn", 1.4],
  ["dwell", 1.2],
  ["back", 1.4],
  ["out", 2.0],
  ["swap", 0.8],
];
const PERIOD = SEG.reduce((s, [, d]) => s + d, 0);
let tourT = 0;

function tourPose(t) {
  t %= PERIOD;
  let w = true;
  for (const [name, d] of SEG) {
    if (t < d) {
      const f = t / d;
      const pose = { wrong: w, e: E, phi: 0, torque: false, fade: 1 };
      if (name === "hold") pose.e = 0;
      if (name === "in") pose.e = E * L.ease(f);
      if (name === "try") {
        pose.torque = f > 0.12 && f < 0.88;
        pose.phi = pose.torque ? M.CAM_TURN : 0;
      }
      if (name === "out") pose.e = E * (1 - L.ease(f));
      if (name === "swap") {
        pose.e = 0;
        pose.fade = Math.abs(1 - 2 * f);
        if (f >= 0.5) pose.wrong = !w;
      }
      if (name === "turn") {
        pose.phi = M.CAM_TURN * L.ease(f);
        pose.torque = true;
      }
      if (name === "dwell") pose.phi = M.CAM_TURN;
      if (name === "back") {
        pose.phi = M.CAM_TURN * (1 - L.ease(f));
        pose.torque = true;
      }
      return pose;
    }
    t -= d;
    if (name === "swap") w = !w;
  }
  return { wrong: true, e: 0, phi: 0, torque: false, fade: 1 };
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const driven = (live.touring || auto) && !dragging;
  if (driven) {
    tourT += dt;
    const p = tourPose(tourT);
    wrong = p.wrong;
    e = p.e;
    fade = p.fade;
    torque = p.torque;
    st = M.stacks(bitting(), e);
    phi = M.free(st) ? p.phi : 0;
    eTarget = e;
    phiTarget = phi;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (phi < 0.5) e = live.reduced ? eTarget : L.follow(e, eTarget, 14, h);
    if (pendingSwap && e < 0.05) {
      wrong = !wrong;
      pendingSwap = false;
      eTarget = 0;
    }
    st = M.stacks(bitting(), e);
    const want = M.free(st) ? phiTarget : 0;
    phi = live.reduced ? want : L.follow(phi, want, 12, h);
    if (!M.free(st)) phi = 0;
  }
  torque = phiTarget > 0.5 && !M.free(st);
  fade = 1;
  return Math.abs(e - eTarget) > 1e-3 || Math.abs(phi - (M.free(st) ? phiTarget : 0)) > 1e-2;
}

let shown = { phi: -1, e: -1, wrong: null };
const sign = (v) => (v > 0.049 ? "+" : v < -0.049 ? "−" : "±") + Math.abs(v).toFixed(1);

function render(live) {
  const b = bitting();
  const keyMoved = e !== shown.e || wrong !== shown.wrong;
  if (phi !== shown.phi) {
    el.plug.innerHTML = P.plug(VM, phi);
    el.cam.innerHTML = P.cam(VM, phi);
    el.dPlug.innerHTML = P.plug(VD, phi);
    const [cx, cy] = VB.p([0, 0]);
    el.vbCamH.setAttribute("transform", `rotate(${K.r2(phi)} ${cx} ${cy})`);
    el.vbCamV.setAttribute("transform", `rotate(${K.r2(phi)} ${cx} ${cy})`);
  }
  if (keyMoved || phi !== shown.phi) {
    el.key.innerHTML = P.key(VM, b, e, phi);
    el.dKey.innerHTML = P.key(VD, b, e, phi);
  }
  // The plug's end views are re-drawn turned (not transformed), so its hatching keeps its angle.
  const VBr = { ...VB, p: (pt) => VB.p(M.rot(pt, phi)) };
  const VCr = { ...VC, p: (pt) => VC.p(M.rot(pt, phi)) };
  if (keyMoved || phi !== shown.phi) {
    el.vbRot.innerHTML = P.facePlug(VBr) + `<g id="vb-key">${P.keySection(VBr, b, e, -0.5)}</g>`;
    el.vbKey = $("vb-key");
  }
  el.key.setAttribute("opacity", K.r2(fade));
  el.dKey.setAttribute("opacity", K.r2(fade));
  el.dKp.innerHTML = P.keyPins(VD, st, phi);
  el.dDrv.innerHTML = P.drivers(VD, st);
  el.dGaps.innerHTML = P.gaps(VD, st);
  el.vbKey.setAttribute("opacity", K.r2(fade));
  el.kp.innerHTML = P.keyPins(VM, st, phi);
  el.drv.innerHTML = P.drivers(VM, st);
  el.spr.innerHTML = P.springs(VM, st);
  el.gaps.innerHTML = P.gaps(VM, st);
  const s3 = st[2];
  el.ccRot.innerHTML = P.plugAcross(VCr) + P.keySection(VCr, b, e, M.pinU(2)) + P.keyPinAcross(VCr, s3, P.PIN_ITEM[2]);
  el.ccStack.innerHTML = P.driverAcross(VC, s3) + P.springAcross(VC, s3);
  el.ccGap.innerHTML = X.gapAcross(VC, s3);
  el.ccb.innerHTML = X.ccBalloons(VC, s3, phi);
  el.mvb.innerHTML = X.movingBalloons(VM, st, phi, e, MOVING, 40);
  const kb = el.mvb.lastElementChild;
  if (kb && fade < 0.999) kb.setAttribute("opacity", K.r2(fade));
  el.dimIn.innerHTML = X.insertDim(VM, e);
  el.torque.setAttribute("visibility", torque ? "visible" : "hidden");
  st.forEach((s, i) => {
    el.bars[i].setAttribute("d", X.barPath(CH, i, s.off));
    el.vals[i].textContent = sign(s.off);
  });
  shown = { phi, e, wrong };

  const free = M.free(st);
  const blk = M.blocking(st);
  let state;
  if (phi > 0.5) state = `PLUG TURNED ${Math.round(phi)}°`;
  else if (free) state = "ALL 5 GAPS ON THE SHEAR LINE";
  else if (blk.length === 1) state = `PIN ${blk[0] + 1} ${sign(st[blk[0]].off)} mm · ${torque ? "TURN BLOCKED" : "LOCKED"}`;
  else state = `${blk.length} PINS OFF THE LINE · ${torque ? "TURN BLOCKED" : "LOCKED"}`;
  el.readout.textContent = `KEY ${M.codeText(b)} · IN ${e.toFixed(1)} mm · ${state}`;
  say(`Key ${M.codeText(b)}, inserted ${e.toFixed(0)} millimetres. ${state.toLowerCase()}.`, live.clock);
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
  // A still, true moment: the wrong key home and the turn refused.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 4.0; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const toSheet = (ev) => {
  const m = svg.getScreenCTM();
  return m ? [(ev.clientX - m.e) / m.a, (ev.clientY - m.f) / m.d] : [ev.clientX, ev.clientY];
};
const stopTour = () => {
  auto = false;
  e = Math.min(E, Math.max(0, e));
  eTarget = e;
  phiTarget = phi;
};

function drag(node, { start, move }) {
  let id = null;
  node.addEventListener("pointerdown", (ev) => {
    id = ev.pointerId;
    node.setPointerCapture(id);
    dragging = true;
    stopTour();
    start(toSheet(ev));
    live.input();
    ev.preventDefault();
  });
  node.addEventListener("pointermove", (ev) => {
    if (ev.pointerId !== id) return;
    move(toSheet(ev));
    live.input();
  });
  const stop = (ev) => {
    if (ev.pointerId !== id) return;
    id = null;
    dragging = false;
    if (phi < 0.5) phiTarget = 0;
    live.input();
  };
  node.addEventListener("pointerup", stop);
  node.addEventListener("pointercancel", stop);
}

// Push and pull the key.
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let x0 = 0;
  let e0 = 0;
  drag(hit, {
    start: ([x]) => {
      x0 = x;
      e0 = e;
    },
    move: ([x]) => {
      if (phi < 0.5) eTarget = Math.min(E, Math.max(0, e0 + (x - x0) / VM.k));
    },
  });
}

// Turn the key: the angle of the pointer about the view's centre.
for (const hit of svg.querySelectorAll("[data-turn]")) {
  const c = hit.dataset.turn === "B" ? specs.B_circle : specs.C_circle;
  let a0 = 0;
  let p0 = 0;
  const ang = ([x, y]) => (Math.atan2(y - c.cy, x - c.cx) * 180) / Math.PI;
  drag(hit, {
    start: (p) => {
      a0 = ang(p);
      p0 = phiTarget;
    },
    move: (p) => {
      let d = ang(p) - a0;
      d = ((d + 540) % 360) - 180;
      phiTarget = Math.min(M.CAM_TURN, Math.max(0, p0 + d));
    },
  });
}

svg.addEventListener("keydown", (ev) => {
  const k = ev.key;
  if (k === "ArrowRight" || k === "ArrowLeft") {
    stopTour();
    if (phi < 0.5) eTarget = Math.min(E, Math.max(0, eTarget + (k === "ArrowRight" ? 2 : -2)));
  } else if (k === "ArrowUp" || k === "ArrowDown") {
    stopTour();
    phiTarget = Math.min(M.CAM_TURN, Math.max(0, phiTarget + (k === "ArrowUp" ? 15 : -15)));
  } else if (k === "End" || k === "Home") {
    stopTour();
    if (phi < 0.5) eTarget = k === "End" ? E : 0;
  } else if (k === "k" || k === "K") {
    stopTour();
    phiTarget = 0;
    eTarget = 0;
    pendingSwap = true;
  } else if (k === " ") {
    auto = !auto;
    if (auto) tourT = 0;
  } else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  ev.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
