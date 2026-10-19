// Page code for aero-engine.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const VM = K.view(specs.main);
const VA = P.aa(K.view(specs.AA));
const VC = P.aa(K.view(specs.C));
const VD = K.view(specs.D);
const VE = P.aa(K.view(specs.E));
const TC = __TC__;
const PA0 = __PA0__;
const $ = (id) => document.getElementById(id);

const CYC = M.cycle();
const TAB = CYC.table;
const rad = Math.PI / 180;
const TQ = [];
for (let f = 0; f <= 720; f++) TQ.push(M.engine(TAB, f).total);

const el = {
  crank: [[$("crank-main"), VM], [$("crank-D"), VD]],
  plan: M.IDS.map((k) => ({ k, VL: P.plan(VM, k), rod: $(`rod-p${k}`), pist: $(`pist-p${k}`), gas: $(`gas-p${k}`) })),
  aa: [["AA", VA, true], ["C", VC, false], ["E", VE, true]].map(([id, V, train]) => ({
    id, V, train,
    crank: $(`crank-${id}`), rod: $(`rod-${id}`), pist: $(`pist-${id}`), cam: $(`cam-${id}`), tap: $(`tap-${id}`),
    valve: $(`valve-${id}`), spr: $(`spr-${id}`), rocker: $(`rocker-${id}`), gas: $(`gas-${id}`), clip: $(`clipgas-${id}`),
    flames: [0, 1].map((i) => $(`flame-${id}-${i}`)),
  })),
  dim: $("dim-travel-wrap"),
  live: Object.keys(LIVE).map((n) => [n, $(`lb-${n}`)]),
  lb12: $("lb-12"),
  tqNow: $("tq-now"),
  tqDot: $("tq-dot"),
  cursor: $("tq-cursor"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// where each live balloon's dot sits on its moving part (cylinder 3, plan), in its own frame (a, c)
const dotAt = {
  5: (psi) => [M.pinA(psi) - P.SMALL_R - 14, -9],
  8: (psi) => [M.pinA(psi), -40],
  6: (psi) => [M.crown(psi) - 4, -30],
  7: (psi) => [M.crown(psi) - 8.75, -62.6],
};

// ---------------------------------------------------------------- state
const DEG_PER_S = 90; // the tour turns one working cycle (720°) in 8 s
let phi = 0;
let target = 0;
let auto = false;
let dragging = false;

function step(dt, live) {
  const driven = (live.touring || auto) && !dragging;
  if (driven) {
    target += DEG_PER_S * dt;
    phi = target;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  for (let i = 0; i < n; i++) phi = live.reduced ? target : L.follow(phi, target, dragging ? 40 : 14, dt / n);
  return Math.abs(phi - target) > 0.01;
}

// ---------------------------------------------------------------- render
const opacity = (p) => K.r2(0.2 + 0.8 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(55 / 0.7))));
const tqPt = (f, t) => `${K.r2(TC.x0 + (f / 720) * (TC.x1 - TC.x0))},${K.r2(TC.y1 - ((Math.max(TC.tMin, Math.min(TC.tMax, t)) - TC.tMin) / (TC.tMax - TC.tMin)) * (TC.y1 - TC.y0))}`;
const EVC = M.EVENTS.ex.close - 720;
const burning = (psi) => psi >= M.SPARK || psi < EVC;
const shift = (V, a) => {
  const [x0, y0] = V.p([0, 0]);
  const [x1, y1] = V.p([a, 0]);
  return `translate(${K.r2(x1 - x0)} ${K.r2(y1 - y0)})`;
};

function render(live) {
  const f = M.wrap(phi);
  const eng = M.engine(TAB, f);

  // plan: the crank, the four rods and pistons, the four charges
  for (const [node, V] of el.crank) node.innerHTML = P.crankPlan(V, f);
  for (const c of el.plan) {
    const s = eng.cyl[c.k];
    c.rod.innerHTML = P.part(5, P.rodPlan(c.VL, s.psi));
    c.pist.setAttribute("transform", shift(c.VL, M.pinA(s.psi) - PA0));
    c.gas.setAttribute("d", K.d(c.VL, P.cylinderGas(s.psi)));
    c.gas.setAttribute("class", burning(s.psi) ? "tint burn" : "tint");
    c.gas.setAttribute("fill-opacity", opacity(s.p));
  }

  // A-A, Detail C and Detail E: cylinder 1
  const c1 = eng.cyl[1];
  const psi = c1.psi;
  const lift = M.valveLift("in", psi);
  const tl = M.tappetLift("in", psi);
  const pa = M.pinA(psi);
  const flameOn = psi >= M.SPARK && c1.xb < 0.995;
  for (const a of el.aa) {
    if (a.crank) a.crank.innerHTML = P.crankAA(a.V, f);
    if (a.rod) a.rod.innerHTML = P.rodAA(a.V, M.crankPin(1, f), [pa, 0]);
    if (a.pist) a.pist.setAttribute("transform", shift(a.V, pa - PA0));
    if (a.cam) a.cam.innerHTML = P.cam(a.V, psi);
    if (a.tap) a.tap.setAttribute("transform", shift(a.V, tl));
    if (a.valve) {
      const [dx, dy] = P.liftVec(lift);
      const [x0, y0] = a.V.p([0, 0]);
      const [x1, y1] = a.V.p([dx, dy]);
      a.valve.setAttribute("transform", `translate(${K.r2(x1 - x0)} ${K.r2(y1 - y0)})`);
    }
    if (a.spr) a.spr.innerHTML = P.part(12, P.springs(a.V, lift));
    if (a.rocker) a.rocker.innerHTML = P.rocker(a.V, lift);
    if (a.gas) {
      const d = K.d(a.V, P.cylinderGas(psi));
      a.gas.setAttribute("d", d);
      a.gas.setAttribute("class", burning(psi) && !flameOn ? "tint burn" : "tint");
      a.gas.setAttribute("fill-opacity", opacity(c1.p));
      a.clip.setAttribute("d", d);
      const r = flameOn ? K.r2(52 * Math.sqrt(c1.xb) * a.V.k) : 0;
      for (const fl of a.flames) {
        fl.setAttribute("r", r);
        fl.setAttribute("fill-opacity", opacity(c1.p));
      }
    }
  }

  // live dimension and balloons
  const p3 = eng.cyl[3].psi;
  el.dim.innerHTML = K.dim(P.plan(VM, 3), [M.crownAtTDC, -M.BORE / 2], [M.crown(p3), -M.BORE / 2], {
    dir: "h",
    off: K.r2(VM.p([0, -212])[1] - VM.p([0, -72.5 - M.BORE / 2])[1]),
    text: `s₃=${K.fmt(M.travel(p3), 1)}`,
    id: "dim-travel",
  });
  const V3 = P.plan(VM, 3);
  for (const [n, node] of el.live) node.innerHTML = K.balloon(V3, dotAt[n](p3), LIVE[n].at, n, { target: n });
  el.lb12.innerHTML = K.balloon(VA, P.W(-17, P.FLOOR + 3 + ((P.TIP - 10 - lift - P.FLOOR) * 2) / 5), [500, 132], 12, { target: 12 });

  // the torque diagram
  const n = Math.floor(f);
  const pts = [];
  for (let i = 0; i <= n; i += 2) pts.push(tqPt(i, TQ[i]));
  pts.push(tqPt(f, eng.total));
  el.tqNow.setAttribute("points", pts.join(" "));
  const [px, py] = tqPt(f, eng.total).split(",");
  el.tqDot.setAttribute("cx", px);
  el.tqDot.setAttribute("cy", py);
  el.cursor.setAttribute("d", `M${px} ${TC.y0}V${TC.y1}`);

  const firing = M.IDS.find((k) => eng.cyl[k].stroke === "POWER");
  const short = { INTAKE: "IN", COMPRESSION: "CMP", POWER: "PWR", EXHAUST: "EXH" };
  el.readout.textContent = `${Math.round(f)}° · ${M.FIRING.map((k) => `${k} ${short[eng.cyl[k].stroke]}`).join(" ")} · p${firing} ${eng.cyl[firing].p.toFixed(1)} bar · T ${Math.round(eng.total)} N·m`;
  say(`crank ${Math.round(f)} degrees, cylinder ${firing} on its power stroke at ${eng.cyl[firing].p.toFixed(0)} bar, crank torque ${Math.round(eng.total)} newton metres.`, live.clock);
}

// ---------------------------------------------------------------- input
const live = L.run({ root: svg, step, render, idleAfter: 5, onFrozen: () => q.check && C.selfCheck(svg) });

if (live.reduced && !live.frozen) {
  phi = target = 372; // just after cylinder 1's firing TDC: both flames most of the way across
  render(live);
}

// Rotary drag about the crank axis in A-A: the pointer's angle change turns the crank. A-A looks aft,
// where the crank turns counter-clockwise.
const hit = svg.querySelector("[data-drag]");
let last = null;
const angleOf = (e) => {
  const m = svg.getScreenCTM();
  const x = (e.clientX - m.e) / m.a;
  const y = (e.clientY - m.f) / m.d;
  const [cx, cy] = VA.p([0, 0]);
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
};
hit.addEventListener("pointerdown", (e) => {
  hit.setPointerCapture(e.pointerId);
  dragging = true;
  auto = false;
  target = phi;
  last = angleOf(e);
  live.input();
  e.preventDefault();
});
hit.addEventListener("pointermove", (e) => {
  if (last === null) return;
  const a = angleOf(e);
  let d = a - last;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  last = a;
  target -= d; // counter-clockwise on screen (y down) is a positive turn here
  live.input();
});
const release = () => {
  last = null;
  dragging = false;
  live.input();
};
hit.addEventListener("pointerup", release);
hit.addEventListener("pointercancel", release);

svg.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowRight" || k === "ArrowLeft") target += k === "ArrowRight" ? 10 : -10;
  else if (k === "Home") target = Math.round(target / 720) * 720;
  else if (k === " ") auto = !auto;
  else if (k === "s" || k === "S") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  if (k !== " " && k !== "s" && k !== "S") auto = false;
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
