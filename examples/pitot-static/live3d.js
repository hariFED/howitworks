// Page code for pitot-static-3d.html (an ES module). Inlined above it: K, L, S (kit), A (the parent's
// model), M (model.mjs, the sheet's, unchanged), P (parts.mjs) and SC (scene3d.mjs). The kit draws,
// frames, explodes and balloons; this file runs the sheet's tour and keys and poses the movements.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.05, look: [-180, 330, 0] } });
const rad = Math.PI / 180;

let s = M.tourStart();
let mode = "tour";
const ctl = { iasCmd: M.V_CRUISE, vsCmd: 0 };
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    mode = "tour";
    s = M.tourStart();
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) s = M.tourStart();
    } else {
      s.warp = 1;
      M.stepSystem(s, h, ctl);
      s.t += h;
    }
  }
  return true;
}
function toFree() {
  if (mode === "tour") {
    mode = "free";
    ctl.iasCmd = Math.round(s.ias);
    ctl.vsCmd = Math.round(s.w / M.FPM / 100) * 100;
  }
}

// ---------------------------------------------------------------- poses from the model
const I = P.INSTR;
const shown = { asi: null, alt: null, vsi: null };
function capsule(id, name, c, x0, dl, front) {
  V.reshape(id, name, { loop: SC.capSheet(x0, c.gap, c.R, dl, front) });
}
function movement(ids, st, cw, dl, extra) {
  const [rodId, secId, pinId] = ids;
  V.solid(rodId, "rod").position.x = dl;
  V.solid(rodId, "crank").rotation.z = st.rock * rad;
  V.solid(rodId, "arm").rotation.z = st.rock * rad;
  V.solid(secId, "sector").rotation.x = (extra?.sg ?? 1) * st.sDeg * rad;
  V.solid(pinId, "pinion").rotation.x = -cw * rad;
}
function pose(ind) {
  const a = P.asiState(ind);
  if (shown.asi == null || Math.abs(shown.asi - a.cw) > 0.05) {
    capsule(13, "cf", I.asi.cap, I.asi.cap.x0, a.dl, true);
    movement([14, 15, 16], a, a.cw, a.dl);
    V.solid(16, "ptr").rotation.x = -a.cw * rad;
    shown.asi = a.cw;
  }
  const l = P.altState(ind, s.set);
  if (shown.alt == null || Math.abs(shown.alt - l.cw1) > 0.1) {
    const c = I.alt.cap;
    const half = l.dl / 2;
    const x2 = c.x0 + 2 * c.gap + 1 + c.gap;
    capsule(19, "c1", c, c.x0, half, true);
    V.solid(19, "c2r").position.x = half;
    capsule(19, "c2", c, x2 + half, half, true);
    movement([20, 20, 20], l, l.cw1, l.dl, { sg: -1 });
    V.solid(20, "wheel").rotation.x = l.wheel * rad;
    V.solid(21, "long").rotation.x = -l.cw1 * rad;
    V.solid(21, "short").rotation.x = -l.cw10 * rad;
    shown.alt = l.cw1;
  }
  const w = P.vsiState(ind);
  if (shown.vsi == null || Math.abs(shown.vsi - w.cw) > 0.05) {
    capsule(24, "cf", I.vsi.cap, I.vsi.cap.x0, w.dl, true);
    movement([26, 26, 26], w, 270 + w.cw, w.dl);
    V.solid(26, "ptr").rotation.x = -(270 + w.cw) * rad;
    shown.vsi = w.cw;
  }
}
V.frame([() => pose(M.indications(M.tourStart()))]);

const tint = (p) => Math.min(1, Math.max(0.12, (p - 40000) / 64000));
const say = L.announcer($("sr"), 2);
const fmtK = (n) => Math.round(n).toLocaleString("en-US");
const sgn = (x) => (x >= 0 ? "+" : "−");
function render(live) {
  const ind = M.indications(s);
  pose(ind);
  V.set(10, { pos: [s.valve * P.AV.travel, 0, 0] });
  const tp = tint(s.pPit);
  const ts = tint(s.pSt);
  for (const f of ["head", "pitotA", "pitotB", "asiCap"]) V.fluid(f, { density: tp, wash: 0.03 + 0.08 * tp });
  for (const f of ["static", "manifold", "vsiCap"]) V.fluid(f, { density: ts, wash: 0.03 + 0.08 * ts });
  V.fluid("head", { density: s.ram ? 0.12 : tp });
  const tr = M.truth(s);
  $("readout").textContent = `${fmtK(M.ft(s.h))} ft · IAS ${Math.round(s.ias)} (TAS ${Math.round(tr.tas)}) → ASI ${Math.round(ind.ias)} · ALT ${fmtK(ind.hInd)} · VSI ${sgn(ind.vsi)}${fmtK(Math.abs(ind.vsi))} · ${M.phase(s)}`;
  say(`${M.phase(s).toLowerCase()}: airspeed indicator ${Math.round(ind.ias)} knots, altimeter ${fmtK(ind.hInd)} feet, vertical speed ${fmtK(ind.vsi)} feet a minute.`, live.clock);
}

// ---------------------------------------------------------------- controls, as on the sheet
const setBaro = (pa) => (s.set = Math.min(M.BARO.max * 100, Math.max(M.BARO.min * 100, pa)));
V.drag([22], { axis: [0, 1, 0], length: 50, start: () => (toFree(), (s.set - 95000) / 10000), move: (v) => setBaro(Math.round((95000 + v * 10000) / 100) * 100) });
const key = (k, fn) => V.key(k, () => (toFree(), fn()));
key("p", () => ((s.ram = !s.ram), s.ram && (s.heat = false)));
key("d", () => ((s.drain = !s.drain), s.drain && (s.heat = false)));
key("o", () => (s.ports = !s.ports));
key("a", () => (s.alt = !s.alt));
key("h", () => (s.heat = !s.heat));
key("[", () => setBaro(s.set - 100));
key("]", () => setBaro(s.set + 100));
key("ArrowLeft", () => (ctl.iasCmd = Math.max(50, ctl.iasCmd - 5)));
key("ArrowRight", () => (ctl.iasCmd = Math.min(160, ctl.iasCmd + 5)));
key("ArrowUp", () => (ctl.vsCmd = Math.min(1500, ctl.vsCmd + 100)));
key("ArrowDown", () => (ctl.vsCmd = Math.max(-1500, ctl.vsCmd - 100)));
V.key(" ", () => {
  mode = "tour";
  s = M.tourStart();
});
$("ice")?.addEventListener("click", () => (toFree(), (s.ram = !s.ram), (s.heat = !s.ram), V.input()));
$("alt")?.addEventListener("click", () => (toFree(), (s.alt = !s.alt), V.input()));

// the page's own self-tests (?selftest=1)
V.test("P ices the ram hole and the ASI unwinds", ({ key: k }) => {
  k("p");
  for (let i = 0; i < 400; i++) M.stepPneumatics(s, 0.005);
  return { pass: s.ram && M.indications(s).ias < 20, info: [s.ram, M.indications(s).ias] };
});
V.test("] raises the baro setting", ({ key: k }) => {
  const a = s.set;
  k("]");
  return { pass: s.set === Math.min(M.BARO.max * 100, a + 100), info: [a, s.set] };
});
V.test("A opens the alternate static source", ({ key: k }) => {
  const a = s.alt;
  k("a");
  return { pass: s.alt === !a, info: [a, s.alt] };
});
V.test("ISA: IAS 110 kt at 6500 ft is about 121 kt TAS", () => {
  const t = M.tasKt(110, 6500);
  return { pass: Math.abs(t - 121.1) < 0.3, info: [t] };
});

V.run({ step, render, still: 40, idleAfter: 8 });
