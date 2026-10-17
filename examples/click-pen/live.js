// Page code for click-pen.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VD = K.view(specs.D);
const VE = K.view(specs.E);
const VB = K.view(specs.BB);
const CH = __CHART__;
const LAY = __LAYOUT__;
const $ = (id) => document.getElementById(id);

const axial = [["main", VM], ["D", VD]].map(([id, V]) => ({
  V,
  rotFar: $(`rotfar-${id}`),
  rotNear: $(`rotnear-${id}`),
  plFar: $(`plfar-${id}`),
  pl: $(`pl-${id}`),
  refill: $(`refill-${id}`),
  spring: $(`spring-${id}`),
}));
const el = {
  mvbRefill: $("mvb-refill"),
  mvbPl: $("mvb-pl"),
  mvbDRot: $("mvb-D-rot"),
  mvbDPl: $("mvb-D-pl"),
  bbMark: $("bbmark"),
  dimTip: $("dim-tip-wrap"),
  dimBtn: $("dim-btn-wrap"),
  devLugs: $("dev-lugs"),
  devPl: $("dev-pl"),
  devDot: $("dev-dot"),
  bbGuide: $("bb-guide"),
  bbPl: $("bb-pl"),
  bbRot: $("bb-rot"),
  states: [0, 1, 2, 3].map((i) => $(`sd-${i}`).querySelector(".sd-box")),
  dot: $("chart-dot"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const pen = M.pen();
const Y0 = pen.Y;
let push = 0; // button push the thumb applies, mm
let target = 0;
let offX = 0; // display offsets that ease the spring-driven snaps
let offY = 0;
let dragging = false;
let clickT = -1; // a keyed click in progress

// The tour: rest, click, write, click, retracted again. Two clicks turn the rotator 120°,
// which brings its three lugs back to the same picture: one full cycle of the toggle.
const PERIOD = 5;
const press = (t, t0) => {
  if (t < t0) return 0;
  if (t < t0 + 0.45) return M.PUSH_MAX * L.ease((t - t0) / 0.45);
  if (t < t0 + 0.6) return M.PUSH_MAX;
  if (t < t0 + 1.05) return M.PUSH_MAX * (1 - L.ease((t - t0 - 0.6) / 0.45));
  return 0;
};
const tour = { t: 0 };
const tourPush = (t) => {
  const p = t % PERIOD;
  return p < 2.9 ? press(p, 0.8) : press(p, 3.4);
};
const clickPush = (t) => press(t, 0);

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    let driven = false;
    if (live.touring && !dragging) {
      tour.t += h;
      push = tourPush(tour.t);
      driven = true;
    } else if (clickT >= 0) {
      clickT += h;
      target = clickPush(clickT);
      if (clickT > 1.1) clickT = -1;
    }
    if (!driven) push = live.reduced ? target : L.follow(push, target, 30, h);
    const q0 = pen.q;
    const x0 = pen.X;
    const y0 = pen.Y;
    M.settle(pen, push);
    if (pen.q !== q0) {
      offX += x0 - pen.X;
      offY += y0 - pen.Y;
    }
    offX = live.reduced ? 0 : L.follow(offX, 0, 40, h);
    offY = live.reduced ? 0 : L.follow(offY, 0, 40, h);
  }
  return Math.abs(push - target) > 1e-4 || Math.abs(offX) > 0.01 || Math.abs(offY) > 1e-3 || clickT >= 0;
}

const camAngle = (X) => ((Math.round(X) % 360) + 360) % 360;
let shown = { X: NaN, Y: NaN, yPt: NaN, h: NaN };

function render(live) {
  const X = pen.X + offX;
  const Y = pen.Y + offY;
  const yPt = pen.yPt;
  const du = M.refillEnd(Y) - M.U_R_EXT;
  const dp = yPt - M.YPT_TOP;
  if (X !== shown.X || Y !== shown.Y) {
    for (const a of axial) {
      const rot = P.rotator(a.V, X, Y);
      a.rotFar.innerHTML = rot.far;
      a.rotNear.innerHTML = rot.near;
      a.refill.setAttribute("transform", `translate(${K.r2(du * a.V.k)} 0)`);
      a.spring.innerHTML = P.spring(a.V, Y);
    }
    el.mvbRefill.setAttribute("transform", `translate(${K.r2(du * VM.k)} 0)`);
    el.mvbDRot.setAttribute("transform", `translate(${K.r2((M.refillEnd(Y) - M.refillEnd(Y0)) * VD.k)} 0)`);
    el.devLugs.innerHTML = P.devLugs(VE, X, Y, LAY.E.th0, LAY.E.th1);
    const [cx, cy] = VE.p([X * M.MMD, Y]);
    el.devDot.setAttribute("cx", cx);
    el.devDot.setAttribute("cy", cy);
    el.bbMark.innerHTML = bbMark(Y);
    el.bbRot.setAttribute("transform", `rotate(${K.r2(-X)} ${LAY.BB.cx} ${LAY.BB.cy})`);
    el.dimTip.innerHTML = tipDim(Y);
    shown.X = X;
    shown.Y = Y;
  }
  if (yPt !== shown.yPt) {
    for (const a of axial) {
      a.pl.setAttribute("transform", `translate(${K.r2(dp * a.V.k)} 0)`);
      a.plFar.setAttribute("transform", `translate(${K.r2(dp * a.V.k)} 0)`);
    }
    el.mvbPl.setAttribute("transform", `translate(${K.r2(dp * VM.k)} 0)`);
    el.mvbDPl.setAttribute("transform", `translate(${K.r2(dp * VD.k)} 0)`);
    el.devPl.setAttribute("transform", `translate(0 ${K.r2(-dp * VE.k)})`);
    el.dimBtn.innerHTML = btnDim(yPt);
    shown.yPt = yPt;
  }
  const hCut = Y - 0.5;
  if (Math.abs(hCut - shown.h) > 0.004 || yPt !== shown.yPtB) {
    el.bbGuide.innerHTML = P.bbGuide(VB, hCut);
    el.bbPl.innerHTML = P.bbPlunger(VB, hCut, yPt);
    shown.h = hCut;
    shown.yPtB = yPt;
  }
  const m = ((pen.q % 4) + 4) % 4;
  el.states.forEach((b, i) => b.classList.toggle("on", i === m));
  const c = M.compression(Y);
  el.dot.setAttribute("cx", K.r2(CH.x0 + (c / CH.xMax) * (CH.x1 - CH.x0)));
  el.dot.setAttribute("cy", K.r2(CH.y1 - ((M.RATE * c) / CH.fMax) * (CH.y1 - CH.y0)));
  const tip = -M.tipU(Y);
  const state = M.stateName(pen.q);
  const b = M.buttonDepth(pen);
  el.readout.textContent = `${state} · CAM ${camAngle(X)}° · b ${b.toFixed(1)} · TIP ${tip >= 0 ? "+" : "−"}${Math.abs(tip).toFixed(1)} · F ${M.springForce(Y).toFixed(2)} N`;
  say(`${state.toLowerCase()}, cam at ${camAngle(X)} degrees, button in ${b.toFixed(1)} millimetres, tip ${tip >= 0 ? "out" : "in"} ${Math.abs(tip).toFixed(1)}, spring ${M.springForce(Y).toFixed(1)} newtons.`, live.clock);
}

// The same annotations the build drew, re-measured.
function tipDim(Y) {
  const t = M.tipU(Y);
  const txt = `${t <= 0 ? "+" : "−"}${Math.abs(t).toFixed(1)}`;
  return K.dim(VM, [0, -1.3], [t, -0.5], { dir: "h", off: 26, text: txt, id: "dim-tip" });
}
function btnDim(yPt) {
  const top = (y) => y + P.PL.button + P.PL.buttonH;
  return K.dim(VM, [top(M.YPT_TOP), 0.8], [top(yPt), 0.4], { dir: "h", off: -48, text: `b=${(M.YPT_TOP - yPt).toFixed(1)}`, id: "dim-btn" });
}
function bbMark(Y) {
  const u = Y - 0.5;
  const [x] = VD.p([u, 0]);
  const yT = VD.p([0, 8.7])[1];
  const yB = VD.p([0, -8.7])[1];
  const aT = VD.p([0, 7.0])[1];
  const aB = VD.p([0, -7.0])[1];
  const head = (y) => `M${K.r2(x - 9)} ${y}L${K.r2(x - 3)} ${K.r2(y - 1.8)}L${K.r2(x - 3)} ${K.r2(y + 1.8)}Z`;
  return (
    `<path class="vis" d="M${x} ${yT}V${aT}M${x} ${yB}V${aB}M${x} ${yT}H${K.r2(x - 9)}M${x} ${yB}H${K.r2(x - 9)}"/>` +
    `<path class="head" d="${head(yT)}${head(yB)}"/>` +
    `<text class="t t-lg" x="${K.r2(x - 16)}" y="${K.r2(yT + 4)}" text-anchor="middle">B</text>` +
    `<text class="t t-lg" x="${K.r2(x - 16)}" y="${K.r2(yB + 4)}" text-anchor="middle">B</text>`
  );
}

// ---------------------------------------------------------------- input
const live = L.run({
  root: svg,
  step,
  render,
  idleAfter: 5,
  onFrozen: () => q.check && C.selfCheck(svg),
});

if (live.reduced && !live.frozen) {
  // A still, true moment: the tour played to the writing position, drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 2.6; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clamp = (v) => Math.min(M.PUSH_MAX, Math.max(0, v));

// Horizontal drag, reported as a sheet-unit delta since the press (the pen lies along x).
function dragX(el, { start, move, end }) {
  let id = null;
  let x0 = 0;
  const toSheet = (e) => {
    const m = svg.getScreenCTM();
    return m ? (e.clientX - m.e) / m.a : e.clientX;
  };
  el.addEventListener("pointerdown", (e) => {
    id = e.pointerId;
    el.setPointerCapture(id);
    x0 = toSheet(e);
    start?.();
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => {
    if (e.pointerId === id) move(toSheet(e) - x0);
  });
  const stop = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    end?.();
  };
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

for (const hit of svg.querySelectorAll("[data-drag]")) {
  const k = hit.dataset.drag === "D" ? VD.k : VM.k;
  let p0 = 0;
  dragX(hit, {
    start: () => {
      dragging = true;
      clickT = -1;
      p0 = push;
      target = push;
      live.input();
    },
    move: (dx) => {
      target = clamp(p0 - dx / k);
      live.input();
    },
    end: () => {
      dragging = false;
      target = 0; // let go: the spring returns the button
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const key = e.key;
  if (key === " " || key === "Enter") clickT = 0;
  else if (key === "ArrowLeft") {
    // press 1 mm further from where the button is now (in EXTENDED it already sits 3.2 mm in)
    clickT = -1;
    target = clamp(Math.max(target, M.buttonDepth(pen)) + 1);
  } else if (key === "ArrowRight") {
    clickT = -1;
    target = clamp(target - 1);
  } else if (key === "Home") {
    clickT = -1;
    target = 0;
  } else if (key === "s" || key === "S") live.slow = live.slow === 1 ? 0.2 : live.slow === 0.2 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
