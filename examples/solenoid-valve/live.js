// Page code for solenoid-valve.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const VM = K.view(specs.main);
const VP = K.view(specs.P);
const CH = __CHART__;
const FG = __FG__;
const $ = (id) => document.getElementById(id);
const SLOW = 0.1; // the sheet runs ten times slower than the valve
const P_NOMINAL = M.P_SUPPLY;

const views = [["main", VM], ["P", VP]].map(([id, V]) => ({
  V,
  mx: $(`mx-${id}`),
  mz: $(`mz-${id}`),
  dia: $(`dia-${id}`),
  spring: $(`spring-${id}`),
  wc: $(`w-c-${id}`),
  win: $(`w-in-${id}`),
  wout: $(`w-out-${id}`),
}));
const el = {
  gap: $("dim-gap-wrap"),
  lift: $("dim-lift-wrap"),
  pb: P.PILOT_BALLOONS.map((b) => [b, $(`pb-${b.n}`)]),
  patIn: $("w-in"),
  patOut: $("w-out"),
  tr: Object.fromEntries(["i", "x", "z", "q"].map((k) => [k, [$(`tr-${k}`), $(`tr-${k}-prev`)]])),
  cursor: $("cursor"),
  qdot: $("q-dot"),
  evOn: [$("ev-on"), $("ev-on-t")],
  evOff: [$("ev-off"), $("ev-off-t")],
  fgTrace: $("fg-trace"),
  fgDot: $("fg-dot"),
  load: $("load-line"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
const s = M.valve(P_NOMINAL);
let pTarget = P_NOMINAL;
let cyc = 0; // time into the current sweep, model s
let cycleStart = 0;
let now = [];
let prev = [];
let fg = [];
let lastSample = -1;
let phase = 0; // the water's drift along the ports, sheet units
let wasTouring = true;

function sweep() {
  prev = now;
  now = [];
  fg = [];
  lastSample = -1;
  cyc = 0;
  cycleStart = s.t;
}

// ---------------------------------------------------------------- step and render
function step(dt, live) {
  const h = dt * SLOW;
  const before = [s.x, s.z, s.i, s.p1];
  if (live.touring) {
    if (!wasTouring) sweep(); // the tour starts its programme from the top
    pTarget = P_NOMINAL;
    M.setCoil(s, cyc >= M.TOUR.on && cyc < M.TOUR.off);
  }
  wasTouring = live.touring;
  s.p1 = L.follow(s.p1, pTarget, 4, dt);
  M.advance(s, h);
  cyc += h;
  phase = (phase + (M.lpm(s.q) / 35) * 14 * dt) % 2.8;
  if (cyc - lastSample >= 0.002) {
    lastSample = cyc;
    now.push([cyc * 1000, s.i, s.x, s.z, M.lpm(s.q)]);
  }
  const lastFg = fg[fg.length - 1];
  if (fg.length < 1500 && (!lastFg || Math.abs(lastFg[0] - M.gapOf(s.x)) > 0.02 || Math.abs(lastFg[1] - s.f) > 0.25)) fg.push([M.gapOf(s.x), s.f]);
  if (cyc >= M.TOUR.end) sweep();
  const after = [s.x, s.z, s.i, s.p1];
  return after.some((v, k) => Math.abs(v - before[k]) > 1e-6) || s.lam > 0 !== s.on;
}

const tX = (ms) => K.r2(CH.x0 + (Math.min(CH.tMax, ms) / CH.tMax) * (CH.x1 - CH.x0));
const stripY = (k, v, max) => {
  const bot = CH.y0 + k * (CH.strip + CH.gap) + CH.strip;
  return K.r2(bot - (Math.min(max, Math.max(0, v)) / max) * CH.strip);
};
const series = [
  ["i", 1, 0, CH.iMax],
  ["x", 2, 1, CH.lMax],
  ["z", 3, 1, CH.lMax],
  ["q", 4, 2, CH.qMax],
];
const gX = (g) => K.r2(FG.x0 + (g / FG.gMax) * (FG.x1 - FG.x0));
const fY = (f) => K.r2(FG.y1 - (Math.min(FG.fMax, Math.max(0, f)) / FG.fMax) * (FG.y1 - FG.y0));
const tint = (pa) => K.r2(0.14 + 0.66 * Math.min(1, Math.max(0, M.bar(pa) / 4)));
let shown = { x: -1, z: -1, p1: -1 };

function marker([line, text], at) {
  const t = (at - cycleStart) * 1000;
  const on = at >= 0 && t >= 0 && t <= CH.tMax;
  line.setAttribute("visibility", on ? "visible" : "hidden");
  text.setAttribute("visibility", on ? "visible" : "hidden");
  if (!on) return;
  line.setAttribute("d", `M${tX(t)} ${CH.y0}V${CH.y1}`);
  text.setAttribute("x", tX(t));
}

function render(live) {
  const { x, z } = s;
  for (const v of views) {
    v.mx.setAttribute("transform", `translate(0 ${K.r2(-x * v.V.k)})`);
    v.mz.setAttribute("transform", `translate(0 ${K.r2(-z * v.V.k)})`);
    if (Math.abs(z - shown.z) > 0.002) {
      v.dia.innerHTML = P.diaphragm(v.V, z);
      v.win.setAttribute("d", P.waterPath(v.V, P.inletWater(z)));
      v.wout.setAttribute("d", P.waterPath(v.V, P.outletWater(z)));
    }
    if (Math.abs(x - shown.x) > 0.002) v.spring.innerHTML = P.spring(v.V, x);
    v.wc.setAttribute("fill-opacity", tint(s.pc));
    v.win.setAttribute("fill-opacity", tint(s.p1));
    v.wout.setAttribute("fill-opacity", tint(s.p2));
  }
  if (Math.abs(z - shown.z) > 0.002) {
    el.lift.innerHTML = K.dim(VP, [-8, M.SEAT_TOP], [-8, M.SEAT_TOP + z], { dir: "v", off: 432 - VP.p([-8, 0])[0], text: `h=${z.toFixed(2)}`, id: "dim-lift" });
    shown.z = z;
  }
  if (Math.abs(x - shown.x) > 0.002) {
    el.gap.innerHTML = K.dim(VM, [M.PLUNGER_R, M.POLE_FACE], [M.PLUNGER_R, M.PLUNGER_TOP + x], { dir: "v", off: 312 - VM.p([M.PLUNGER_R, 0])[0], text: (M.STROKE - x).toFixed(2), id: "dim-gap" });
    shown.x = x;
  }
  for (const [b, node] of el.pb) node.innerHTML = P.pilotBalloon(VP, b, x, z);
  el.patIn.setAttribute("patternTransform", `translate(${K.r2(phase)} 0)`);
  el.patOut.setAttribute("patternTransform", `translate(${K.r2(phase)} 0)`);

  // DIAGRAM 1: this sweep in full, the last one thin where this one has not reached yet
  const tNow = cyc * 1000;
  for (const [key, col, strip, max] of series) {
    const pts = (list) => list.map((r) => `${tX(r[0])},${stripY(strip, r[col], max)}`).join(" ");
    const [cur, old] = el.tr[key];
    cur.setAttribute("points", pts(now));
    old.setAttribute("points", pts(prev.filter((r) => r[0] > tNow + 8)));
  }
  el.cursor.setAttribute("d", `M${tX(tNow)} ${CH.y0}V${CH.y1}`);
  el.qdot.setAttribute("cx", tX(tNow));
  el.qdot.setAttribute("cy", stripY(2, M.lpm(s.q), CH.qMax));
  marker(el.evOn, s.onAt);
  marker(el.evOff, s.offAt);

  // DIAGRAM 2: where the plunger is on its force–gap map
  el.fgTrace.setAttribute("points", fg.map(([g, f]) => `${gX(g)},${fY(f)}`).join(" "));
  el.fgDot.setAttribute("cx", gX(M.gapOf(x)));
  el.fgDot.setAttribute("cy", fY(s.f));
  if (Math.abs(s.p1 - shown.p1) > 500) {
    const pts = [];
    for (let xx = 0; xx <= M.STROKE + 1e-9; xx += 0.1) pts.push(`${gX(M.gapOf(xx))},${fY(M.springForce(xx) + M.PLUNGER_MASS * M.G + (xx < 0.05 ? M.pilotLoad(s.p1) : 0))}`);
    el.load.setAttribute("points", pts.join(" "));
    shown.p1 = s.p1;
  }

  const text = `t ${Math.round(tNow)} ms · ${s.i.toFixed(2)} A · LIFT ${x.toFixed(2)}/${z.toFixed(2)} mm · p ${M.bar(s.p1).toFixed(1)}/${M.bar(s.pc).toFixed(2)} bar · ${Math.round(M.lpm(s.q))} L/min`;
  el.readout.textContent = text;
  say(
    `Coil ${s.on ? "on" : "off"}, ${s.i.toFixed(2)} amps. Plunger lift ${x.toFixed(1)} millimetres, diaphragm ${z.toFixed(1)}. Supply ${M.bar(s.p1).toFixed(1)} bar, flow ${Math.round(M.lpm(s.q))} litres a minute.`,
    live.clock
  );
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
  // A still, true moment: the tour played to 4 s (the valve wide open), drawn once.
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 4; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const clampP = (p) => Math.min(8e5, Math.max(0.5e5, p));
const toggle = () => {
  M.setCoil(s, !s.on);
  live.input();
};
for (const hit of svg.querySelectorAll("[data-drag]")) {
  let p0 = 0;
  let moved = false;
  L.dragY(svg, hit, {
    start: () => {
      p0 = pTarget;
      moved = false;
      live.input();
    },
    move: (dy) => {
      if (Math.abs(dy) > 4) moved = true;
      if (moved) pTarget = clampP(p0 - dy * 2000);
      live.input();
    },
    end: () => {
      if (!moved) toggle();
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === " " || k === "Enter") toggle();
  else if (k === "ArrowUp" || k === "ArrowDown") pTarget = clampP(pTarget + (k === "ArrowUp" ? 0.5e5 : -0.5e5));
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.05 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
