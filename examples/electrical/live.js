// Page code for electrical.html. K (kit), L (runtime), C (self-check), A, FS, WF (the aircraft's, the
// fuel system's and the flaps' models, which this model imports), M (model) and P (parts) are inlined
// above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const V = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, K.view(v)]));
const { SLOW, H, C1, C2, C3, REG, CBP, SWP, BCOIL, SCOIL, WIRES, BC, NODE, SC } = __CHARTS__;
const VH = K.view({ x: H.x + 49, y: 604, scale: 1 });
const $ = (id) => document.getElementById(id);
const el = {
  belt: $("a-belt"),
  rotorB: $("b-rotor"),
  slots: Array.from({ length: M.ALT.slots }, (_, k) => $(`b-slot${k}`)),
  drive: $("d-drive"),
  hRing: $("h-ring"),
  hPinion: $("h-pinion"),
  lb20: $("lb-20"),
  acid: Array.from({ length: P.BT.cells }, (_, i) => $(`e-acid${i}`)),
  plunger: $("g-plunger"),
  bimetal: $("g-bimetal"),
  key: $("f-key"),
  rock: { alt: $("f-alt"), bat: $("f-bat"), avn: $("f-avn") },
  needle: $("f-needle"),
  lv: $("f-lv"),
  cbFace: M.CB.map((_, i) => $(`f-cb${i}`)),
  wires: Object.keys(WIRES).map((id) => [id, $(id), WIRES[id]]),
  cbLine: Object.fromEntries(Object.keys(CBP).map((id) => [id, $(`s-cb-${id}-l`)])),
  swBlade: Object.fromEntries(Object.keys(SWP).map((id) => [id, $(`s-sw-${id}-b`)])),
  bcBar: $("s-bc-bar"),
  scBar: $("s-sc-bar"),
  pwm: $("s-pwm"),
  c1dot: $("c1-dot"),
  c1now: $("c1-now"),
  c2dot: $("c2-dot"),
  c2bar: $("c2-bar"),
  c3cur: $("c3-cursor"),
  c3v: $("c3-v"),
  c3i: $("c3-i"),
  readout: $("readout"),
  readout2: $("readout2"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.tourStart();
let mode = "tour"; // "tour" drives everything; "free": the reader's controls
let ctl = M.tourCtl(0, s);
let warpNow = 1;
let keyHeld = false;
let dragRpm = false;
const phase = Object.fromEntries(Object.keys(WIRES).map((id) => [id, 0])); // dash offsets
const STEPS = [M.RPM.idle, M.RPM.runup, M.RPM.cruise, M.RPM.max];

function freeCtl() {
  return { ...ctl, start: keyHeld, pull: ctl.pull.slice() };
}
function step(dt, live) {
  if (live.touring && mode !== "tour" && !keyHeld && !dragRpm) {
    mode = "tour";
    s = M.tourStart();
  }
  const n = Math.max(1, Math.ceil(dt * 480));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      warpNow = M.warpAt(s.t + h);
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.tourStart();
    } else {
      warpNow = s.eng.run && s.Ibat > 1 ? 30 : 1;
      M.step(s, h, freeCtl(), warpNow);
    }
  }
  // the wires' dashes run with their currents (sheet units a second)
  for (const [id, , key] of el.wires) {
    const I = current(key);
    phase[id] -= Math.sign(I) * Math.min(26, 5 * Math.log1p(Math.abs(I))) * dt;
  }
  return true;
}
function current(key) {
  switch (key) {
    case "alt":
      return s.Ialt;
    case "bat":
      return s.Ibat;
    case "shunt":
      return -s.Iamm;
    case "start":
      return s.Ist;
    case "bcoil":
      return s.batCont ? 0.6 : 0;
    case "scoil":
      return s.st.cont ? 0.5 : 0;
    default:
      return s.I[key] ?? 0;
  }
}

// ---------------------------------------------------------------- drawing helpers
const shown = { belt: false, pin: NaN, plunger: "", bimetal: NaN, key: "", rock: "", cb: "", sw: "", acid: NaN };
const c1x = (r) => K.r2(C1.x0 + (Math.min(C1.rMax, Math.max(0, r)) / C1.rMax) * (C1.x1 - C1.x0));
const c1y = (i) => K.r2(C1.y1 - (Math.min(C1.iMax, Math.max(0, i)) / C1.iMax) * (C1.y1 - C1.y0));
const c2x = (r) => K.r2(C2.x0 + ((Math.log10(Math.max(1, Math.min(20, r))) - C2.lx[0]) / (C2.lx[1] - C2.lx[0])) * (C2.x1 - C2.x0));
const c2y = (t) => K.r2(C2.y1 - ((Math.min(C2.ly[1], Math.max(C2.ly[0], Math.log10(Math.max(1e-3, t)))) - C2.ly[0]) / (C2.ly[1] - C2.ly[0])) * (C2.y1 - C2.y0));
const c3x = (t) => K.r2(C3.x0 + (Math.min(C3.tMax, Math.max(0, t)) / C3.tMax) * (C3.x1 - C3.x0));
const c3v = (v) => K.r2(C3.y1 - ((Math.min(C3.vMax, Math.max(C3.vMin, v)) - C3.vMin) / (C3.vMax - C3.vMin)) * (C3.y1 - C3.y0));
const c3i = (i) => K.r2((C3.y0 + C3.y1) / 2 - (Math.min(C3.iLim, Math.max(-C3.iLim, i)) / C3.iLim) * ((C3.y1 - C3.y0) / 2));
const RANGE = Array.from({ length: 41 }, (_, i) => (i * C1.rMax) / 40);
const signed = (x, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;
const mmss = (min) => (!isFinite(min) || min >= 600 ? "> 10 h" : min < 60 ? `${Math.round(min)} min` : `${Math.floor(min / 60)} h ${String(Math.floor(min % 60)).padStart(2, "0")}`);
const closedOf = (id) => ({ alt: s.sw.alt, bat: s.sw.bat, avn: s.sw.avn, start: s.sw.start, nav: s.sw.nav, land: s.sw.land, pitot: s.sw.pitot })[id];
// the breaker to show in Detail G and Diagram 2: one that has tripped, else the hottest
function focusBreaker() {
  let best = 0;
  for (let i = 1; i < M.CB.length; i++) {
    const a = s.cb[i];
    const b = s.cb[best];
    if ((a.open && !b.open) || (a.open === b.open && a.th > b.th)) best = i;
  }
  return best;
}

function render(live) {
  // ---- the schematic: each wire's current in the accent, its dashes running with it
  for (const [id, node, key] of el.wires) {
    const I = Math.abs(current(key));
    node.setAttribute("stroke-opacity", I < 0.02 ? 0 : K.r2(Math.min(1, 0.25 + Math.sqrt(I / 40))));
    node.setAttribute("stroke-dashoffset", K.r2(phase[id] % 54));
  }
  const swState = Object.keys(SWP).map((id) => (closedOf(id) ? 1 : 0)).join("") + (s.batCont ? 1 : 0) + (s.st.cont ? 1 : 0);
  if (swState !== shown.sw) {
    for (const [id, [x, y]] of Object.entries(SWP)) el.swBlade[id].setAttribute("d", `M${x + 1.6} ${y}L${x + 19} ${closedOf(id) ? y : y - 8}`);
    el.bcBar.setAttribute("d", s.batCont ? `M${BC.x0} ${BC.y - 2.4}H${BC.x1}` : `M${BC.x0} ${BC.y - 6}H${BC.x1}`);
    el.scBar.setAttribute("d", s.st.cont ? `M${NODE[0] + 2.4} ${SC.y0}V${SC.y1}` : `M${NODE[0] + 7} ${SC.y0}V${SC.y1}`);
    shown.sw = swState;
  }
  const cbState = s.cb.map((k) => (k.open ? 2 : k.pulled ? 1 : 0)).join("");
  if (cbState !== shown.cb) {
    M.CB.forEach((c, i) => {
      const [x, y] = CBP[c.id] ?? [];
      const off = s.cb[i].open || s.cb[i].pulled;
      if (el.cbLine[c.id]) el.cbLine[c.id].setAttribute("d", off ? `M${x} ${y}H${x + 6}M${x + 14} ${y}H${x + 20}` : `M${x} ${y}H${x + 20}`);
      el.cbFace[i].innerHTML = P.breakerFace(V.F, i, off);
    });
    shown.cb = cbState;
  }
  // the regulator's switching: a few periods of its square wave at the duty it holds
  {
    const x0 = REG.x + 8;
    const x1 = REG.x + REG.w - 8;
    const hi = REG.y + 19;
    const lo = REG.y + 31;
    const per = (x1 - x0) / 4;
    let d = `M${x0} ${lo}`;
    for (let i = 0; i < 4; i++) {
      const a = x0 + i * per;
      const on = Math.max(0, Math.min(1, s.D)) * per;
      if (on > 0.3) d += `L${K.r2(a)} ${hi}L${K.r2(a + on)} ${hi}L${K.r2(a + on)} ${lo}`;
      d += `L${K.r2(a + per)} ${lo}`;
    }
    el.pwm.setAttribute("d", d);
  }
  // ---- Section A-A: the belt; Section B-B: the rotor turns (slowed 1:250), the slots carry the phases
  // a broken belt is gone: its place in the groove in phantom
  if (s.fault.belt !== shown.belt) {
    el.belt.innerHTML = s.fault.belt ? `<g data-role="phantom">${K.line(V.A, P.AL.belt, "phan", true)}<path class="hit" d="${K.d(V.A, P.AL.belt)}"/></g>` : P.beltA(V.A);
    shown.belt = s.fault.belt;
  }
  const th = s.rot / SLOW.rotor;
  const c0 = V.B.p([0, 0]);
  el.rotorB.setAttribute("transform", `rotate(${K.r2((-th * 180) / Math.PI)} ${c0[0]} ${c0[1]})`);
  const amp = Math.min(1, s.Ialt / 50);
  el.slots.forEach((node, k) => {
    const a = (P.slotAngle(k) * Math.PI) / 180;
    // each slot's current follows the claw passing it: the stator's field turns with the rotor
    node.setAttribute("fill-opacity", K.r2(amp * Math.abs(Math.cos(M.ALT.pairs * (a - th - Math.PI / 2)))));
  });
  // ---- Section D-D: the Bendix pinion screws into the ring gear
  if (!(Math.abs(s.st.pin - shown.pin) < 0.004)) {
    el.drive.innerHTML = P.part(20, P.pinion(V.D, s.st.pin) + P.driveSpring(V.D, s.st.pin));
    el.lb20.innerHTML = K.balloon(V.D, [P.pinionShift(s.st.pin) + 7, -P.ST.pinion.rTip + 1.5], LIVE[20].at, 20, { target: 20 });
    shown.pin = s.st.pin;
  }
  // ---- View H: the ring gear turns with the crank; the pinion meshes only once it has screwed in
  {
    const phi = s.eng.theta / SLOW.ring;
    const meshed = s.st.pin > 0.97;
    el.hRing.innerHTML = K.body(VH, P.ringArc(phi));
    // out of mesh the pinion stands 2 mm behind the ring's face, idle: drawn in phantom
    const pin = P.pinionGear(meshed ? phi : 0);
    el.hPinion.innerHTML = meshed ? P.part(20, K.body(VH, pin) + K.body(VH, K.circle(0, 0, 7, 24))) : `<g data-role="phantom">${K.line(VH, pin, "phan", true)}${K.line(VH, K.circle(0, 0, 7, 24), "phan", true)}</g>`;
  }
  // ---- Section E-E: the electrolyte's density follows its specific gravity
  const sg = M.sg(s.soc);
  if (!(Math.abs(sg - shown.acid) < 0.0005)) {
    const op = K.r2(0.25 + 0.75 * Math.min(1, Math.max(0, (sg - 1.11) / 0.175)));
    for (const node of el.acid) node.setAttribute("fill-opacity", op);
    shown.acid = sg;
  }
  // ---- Detail G: the focused breaker's bimetal bends with its heat; tripped, the button pops
  const fi = focusBreaker();
  const fk = s.cb[fi];
  const lift = P.plungerLift(fk.open || fk.pulled);
  const plKey = `${lift}`;
  if (plKey !== shown.plunger) {
    el.plunger.innerHTML = P.plunger(V.G, lift);
    shown.plunger = plKey;
  }
  if (!(Math.abs(fk.th - shown.bimetal) < 0.004)) {
    el.bimetal.innerHTML = P.bimetal(V.G, fk.th);
    shown.bimetal = fk.th;
  }
  // ---- View F: switches, the key, the ammeter, the annunciator
  const rk = `${s.sw.alt}${s.sw.bat}${s.sw.avn}`;
  if (rk !== shown.rock) {
    el.rock.alt.innerHTML = P.rocker(V.F, P.PF.sw.alt, P.PF.sw.v, s.sw.alt);
    el.rock.bat.innerHTML = P.rocker(V.F, P.PF.sw.bat, P.PF.sw.v, s.sw.bat);
    el.rock.avn.innerHTML = P.rocker(V.F, P.PF.sw.avn, P.PF.sw.v, s.sw.avn);
    shown.rock = rk;
  }
  const kp = s.sw.start ? "START" : s.eng.run ? "BOTH" : "OFF";
  if (kp !== shown.key) {
    el.key.innerHTML = P.keySwitch(V.F, kp);
    shown.key = kp;
  }
  el.needle.innerHTML = P.ammeterNeedle(V.F, s.Iamm);
  el.lv.style.display = s.lv ? "" : "none";
  // ---- Diagram 1: the alternator's operating point, and its curve at the present field
  el.c1dot.setAttribute("cx", c1x(s.altN / M.ALT_RATIO));
  el.c1dot.setAttribute("cy", c1y(s.Ialt));
  el.c1now.setAttribute("points", s.If > 0.02 ? RANGE.map((r) => `${c1x(r)},${c1y(M.altCurrent(r * M.ALT_RATIO, s.If, M.REG.set))}`).join(" ") : "");
  // ---- Diagram 2: the focused breaker's clock: how long its present current has heated it, and
  // where it will trip
  {
    const c = M.CB[fi];
    const ratio = (fk.I ?? 0) / c.In;
    const tt = M.tripTime(ratio);
    const x = c2x(Math.max(1, ratio));
    // the time it would have taken this current to heat the element from cold to where it is now
    const k2 = (M.BREAKER.k / Math.max(1e-6, ratio)) ** 2;
    const te = fk.th * k2 < 1 ? -M.BREAKER.tau * Math.log(1 - fk.th * k2) : tt;
    const show = ratio > 0.05 || fk.open;
    el.c2dot.style.display = show ? "" : "none";
    el.c2dot.setAttribute("cx", x);
    el.c2dot.setAttribute("cy", c2y(fk.open ? M.tripTime(Math.max(1.3, ratio)) : Math.max(0.1, te)));
    el.c2bar.setAttribute("d", show && isFinite(tt) ? `M${x} ${C2.y1}V${c2y(tt)}` : "");
  }
  // ---- Diagram 3: where the tour is
  const onTour = mode === "tour";
  for (const node of [el.c3cur, el.c3v, el.c3i]) node.style.display = onTour ? "" : "none";
  if (onTour) {
    el.c3cur.setAttribute("d", `M${c3x(s.t)} ${C3.y0}V${C3.y1}`);
    el.c3v.setAttribute("cx", c3x(s.t));
    el.c3v.setAttribute("cy", c3v(s.V));
    el.c3i.setAttribute("cx", c3x(s.t));
    el.c3i.setAttribute("cy", c3i(s.Iamm));
  }
  // ---- readouts
  const heating = !fk.open && fk.th > 0.12 && (fk.I ?? 0) > M.BREAKER.k * M.CB[fi].In;
  const ph = heating ? `${M.CB[fi].name} BREAKER AT ${Math.round(fk.th * 100)} %` : M.phase(s);
  const end = s.Ibat > 0.3 && s.eng.run ? ` · ${mmss(M.endurance(s.soc, s.Ibat))} LEFT` : "";
  el.readout.textContent = `BUS ${s.V.toFixed(1)} V · ${s.st.cont ? `STARTER ${Math.round(s.Ist)} A` : `LOAD ${s.Itot.toFixed(1)} A`} · ALT ${s.Ialt.toFixed(1)} A · FIELD ${s.If.toFixed(2)} A ${Math.round(s.D * 100)} % · ${Math.round(s.eng.rpm)} rpm`;
  el.readout2.textContent = `AMMETER ${signed(s.Iamm)} A · SG ${sg.toFixed(3)}${end} · ${ph}`;
  say(`Bus ${s.V.toFixed(1)} volts, ammeter ${s.Iamm >= 0 ? "plus" : "minus"} ${Math.abs(s.Iamm).toFixed(0)} amps; ${ph.toLowerCase()}.`, live.clock);
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
  // a still, true moment: the alternator's belt has broken, the battery carries the loads
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 23; t += 1 / 120) step(1 / 120, fake);
  render(live);
}

function toFree() {
  if (mode === "tour") {
    ctl = M.tourCtl(s.t, s);
    ctl.pull = ctl.pull.slice();
    ctl.start = false;
    mode = "free";
  }
}
function toggleBreaker(i) {
  toFree();
  const k = s.cb[i];
  if (k.open) M.resetBreaker(s, i);
  else ctl.pull[i] = !ctl.pull[i];
}
const svgPt = (e) => {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
};
for (const hit of svg.querySelectorAll("[data-cb]")) hit.addEventListener("click", () => (toggleBreaker(Number(hit.dataset.cb)), live.input()));
for (const hit of svg.querySelectorAll("[data-sw]")) hit.addEventListener("click", () => (toFree(), (ctl[hit.dataset.sw] = !ctl[hit.dataset.sw]), live.input()));
for (const hit of svg.querySelectorAll("[data-key]")) {
  hit.addEventListener("pointerdown", (e) => {
    toFree();
    keyHeld = true;
    hit.setPointerCapture(e.pointerId);
    live.input();
  });
  const up = () => ((keyHeld = false), live.input());
  hit.addEventListener("pointerup", up);
  hit.addEventListener("pointercancel", up);
}
for (const hit of svg.querySelectorAll("[data-drag]")) {
  const set = (e) => {
    const r = ((svgPt(e).x - C1.x0) / (C1.x1 - C1.x0)) * C1.rMax;
    ctl.throttle = Math.min(M.RPM.max, Math.max(M.RPM.idle, r));
    live.input();
  };
  hit.addEventListener("pointerdown", (e) => {
    toFree();
    dragRpm = true;
    hit.setPointerCapture(e.pointerId);
    set(e);
  });
  hit.addEventListener("pointermove", (e) => dragRpm && set(e));
  const end = () => ((dragRpm = false), live.input());
  hit.addEventListener("pointerup", end);
  hit.addEventListener("pointercancel", end);
}

const CB_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"];
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
  else if (k === "b" || k === "a" || k === "v" || k === "n" || k === "l" || k === "p") {
    toFree();
    const name = { b: "bat", a: "alt", v: "avn", n: "nav", l: "land", p: "pitot" }[k];
    ctl[name] = !ctl[name];
  } else if (k === "k") {
    if (!e.repeat) {
      toFree();
      keyHeld = true;
    }
  } else if (k === "f") {
    toFree();
    ctl.flapSel = (ctl.flapSel + 10) % 40;
  } else if (k === "z") {
    toFree();
    ctl.belt = !ctl.belt;
  } else if (k === "x") {
    toFree();
    ctl.short = !ctl.short;
  } else if (k === "ArrowUp" || k === "ArrowDown") {
    toFree();
    const now = STEPS.reduce((b, v, i) => (Math.abs(v - ctl.throttle) < Math.abs(STEPS[b] - ctl.throttle) ? i : b), 0);
    ctl.throttle = STEPS[Math.min(STEPS.length - 1, Math.max(0, now + (k === "ArrowUp" ? 1 : -1)))];
  } else if (CB_KEYS.includes(k)) toggleBreaker(CB_KEYS.indexOf(k));
  else return;
  e.preventDefault();
  live.input();
});
svg.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "k") {
    keyHeld = false;
    live.input();
  }
});
svg.addEventListener("blur", () => (keyHeld = false));

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
