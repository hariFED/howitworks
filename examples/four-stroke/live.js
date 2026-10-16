// Page code for four-stroke.html. K (kit), L (runtime), C (self-check), M (model) and P (parts)
// are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const VM = K.view(specs.main);
const VC = K.view(specs.C);
const PVC = __PV__;
const LC = __LC__;
const PV0 = __PV0__;
const $ = (id) => document.getElementById(id);

const CYC = M.cycle();
const TAB = CYC.table;
const views = [["main", VM], ["C", VC]];
const el = {
  piston: views.map(([id, V]) => [$(`piston-${id}`), V]),
  valves: views.flatMap(([id, V]) => ["in", "ex"].map((key) => [$(`valve-${key}-${id}`), $(`spring-${key}-${id}`), V, key])),
  gas: views.map(([id, V]) => [$(`gas-${id}`), $(`flame-${id}`), $(`clipgas-${id}`), V, $(`under-${id}`)]),
  gasB: $("gas-B"),
  web: $("web-main"),
  rod: $("rod-main"),
  cams: $("cams-main"),
  dim: $("dim-travel-wrap"),
  live: Object.keys(LIVE).map((n) => [n, $(`lb-${n}`)]),
  pvNow: $("pv-now"),
  pvDot: $("pv-dot"),
  cursor: $("lift-cursor"),
  readout: $("readout"),
};
const say = L.announcer($("sr"), 2);

// Where each live balloon's dot sits on its moving part, in world mm.
const rad = Math.PI / 180;
const dotAt = {
  2: (phi) => [-40 * Math.sin(phi * rad), -40 * Math.cos(phi * rad)],
  3: (phi) => { const [a, b] = M.crankPin(phi); return [a + 5.5, b - 5.5]; },
  4: (phi) => { const [a, b] = M.crankPin(phi); return [a + 12.1, b - 3.2]; },
  5: (phi) => { const [a, b] = M.crankPin(phi); const g = M.pinV(phi); return [a * 0.55, b + (g - b) * 0.45]; },
  21: (phi) => P.W("ex", 9.6, M.TIP_S - 3.25 - M.valveLift("ex", phi)),
  22: (phi) => P.W("ex", 3.45, M.TIP_S - 4.8 - M.valveLift("ex", phi)),
};

// ---------------------------------------------------------------- state
const DEG_PER_S = 90; // the tour turns one working cycle (720°) in 8 s
let phi = 0; // crank angle, unwrapped
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
const opacity = (p) => K.r2(0.2 + 0.8 * Math.min(1, Math.max(0, Math.log(p / 0.7) / Math.log(60 / 0.7))));
const pvPt = (s) => `${K.r2(PVC.x0 + (s.V / PVC.vMax) * (PVC.x1 - PVC.x0))},${K.r2(PVC.y1 - (Math.log(Math.max(PVC.pMin, s.p) / PVC.pMin) / Math.log(PVC.pMax / PVC.pMin)) * (PVC.y1 - PVC.y0))}`;
const shown = { in: -1, ex: -1 };
const EVC = M.EVENTS.ex.close - 720;

function render(live) {
  const f = M.wrap(phi);
  const s = M.at(TAB, f);
  const lifts = { in: M.valveLift("in", f), ex: M.valveLift("ex", f) };

  // crank train
  for (const [node, V] of el.piston) node.setAttribute("transform", `translate(0 ${K.r2(-(M.pinV(f) - PV0) * V.k)})`);
  const [cx, cy] = VM.p([0, 0]);
  el.web.setAttribute("transform", `rotate(${K.r2(f % 360)} ${cx} ${cy})`);
  el.rod.innerHTML = P.rodSet(VM, f);
  el.cams.innerHTML = P.cam(VM, "in", f) + P.cam(VM, "ex", f);

  // valves ride their lift; springs are redrawn
  for (const [vNode, sNode, V, key] of el.valves) {
    const [dx, dy] = P.liftShift(V, key, lifts[key]);
    vNode.setAttribute("transform", `translate(${dx} ${dy})`);
    sNode.innerHTML = P.spring(V, key, lifts[key]);
  }

  // the gas: fresh charge from IVO.. spark, burned gas after; the flame grows from the plug gap
  const burning = f >= M.SPARK || f < EVC;
  const xb = s.xb;
  const flameOn = f >= M.SPARK && xb < 0.995;
  for (const [gas, flame, clip, V, under] of el.gas) {
    const d = K.d(V, P.cylinderGas(f));
    gas.setAttribute("d", d);
    gas.setAttribute("class", burning && !flameOn ? "tint burn" : "tint");
    gas.setAttribute("fill-opacity", opacity(s.p));
    clip.setAttribute("d", d);
    const fr = flameOn ? K.r2(38 * Math.sqrt(xb) * V.k) : 0;
    flame.setAttribute("r", fr);
    under.setAttribute("r", fr);
    flame.setAttribute("fill-opacity", opacity(s.p));
  }
  el.gasB.setAttribute("class", burning && !(flameOn && xb < 0.5) ? "tint burn" : "tint");
  el.gasB.setAttribute("fill-opacity", opacity(s.p));

  // live dimension and balloons
  el.dim.innerHTML = K.dim(VM, [M.BORE / 2, M.crownAtTDC], [M.BORE / 2, M.crown(f)], {
    dir: "v",
    off: K.r2(VM.p([82, 0])[0] - VM.p([M.BORE / 2, 0])[0]),
    text: `s=${K.fmt(M.travel(f), 1)}`,
    id: "dim-travel",
  });
  for (const [n, node] of el.live) node.innerHTML = K.balloon(VM, dotAt[n](f), LIVE[n].at, n, { target: n });

  // diagrams
  const n = Math.floor(f);
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(pvPt(TAB[i]));
  pts.push(pvPt(s));
  el.pvNow.setAttribute("points", pts.join(" "));
  const [px, py] = pvPt(s).split(",");
  el.pvDot.setAttribute("cx", px);
  el.pvDot.setAttribute("cy", py);
  const x = K.r2(LC.x0 + (f / 720) * (LC.x1 - LC.x0));
  el.cursor.setAttribute("d", `M${x} ${LC.y0 - 12}V${LC.y1}`);

  const stroke = M.strokeOf(f);
  el.readout.textContent = `${Math.round(f)}° ${stroke} · p ${s.p < 10 ? s.p.toFixed(2) : s.p.toFixed(1)} bar · V ${s.V.toFixed(1)} cm³ · ${Math.round(s.T)} K · IN ${lifts.in.toFixed(1)} EX ${lifts.ex.toFixed(1)}`;
  say(`${stroke.toLowerCase()} stroke, crank ${Math.round(f)} degrees, cylinder pressure ${s.p.toFixed(1)} bar, ${Math.round(s.T)} kelvin.`, live.clock);
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
  // A still, true moment: just after the firing TDC, the flame most of the way across.
  phi = target = 372;
  render(live);
}

// Rotary drag about the crank axis: the pointer's angle change turns the crank.
const hit = svg.querySelector("[data-drag]");
let last = null;
const angleOf = (e) => {
  const m = svg.getScreenCTM();
  const x = (e.clientX - m.e) / m.a;
  const y = (e.clientY - m.f) / m.d;
  const [cx, cy] = VM.p([0, 0]);
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
  target += d; // clockwise on screen is a positive turn
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
