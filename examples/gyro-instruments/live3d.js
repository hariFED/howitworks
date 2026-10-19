// Page code for gyro-instruments-3d.html (an ES module). Inlined above it: K, L, S (kit), A (the parent
// aircraft's model), M (model.mjs, the sheet's model, unchanged), P (parts.mjs) and SC (scene3d.mjs).
// It runs the sheet's tour and controls and poses the parts: the attitude gyro rolls in its case, the
// heading gyro turns about the vertical, the turn coordinator's canted gimbal deflects, the rotors spin
// (shown slowed), the pump's vanes slide, the regulator's poppet lifts, and the faces move.

const $ = (id) => document.getElementById(id);
const V = S.create({ scene: SC.scene(), start: { zoom: 1.05, look: [-100, 0, 0] } });
const rad = Math.PI / 180;

let st = M.system();
let mode = "tour";
const ctl = { rpm: M.RPM_CRUISE, pumpOk: true, phiT: 0, rudT: 0, rud: 0, warp: 1 };
let pumpShown = 0;
let spin = 0;
let setting = 0;
const WARPS = [1, 10, 60];

function toFree() {
  if (mode === "free") return;
  mode = "free";
  ctl.rpm = st.rpm > 0 ? st.rpm : M.RPM_CRUISE;
  ctl.pumpOk = st.pumpOk;
  ctl.phiT = st.phi;
  ctl.warp = 1;
}
function step(dt, live) {
  if (live.touring && mode !== "tour") {
    st = M.system();
    mode = "tour";
  }
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
    spin += h * 4; // the rotors, shown at a readable crawl
  }
  return true;
}

const vaneShown = [];
function render(live) {
  const sh = M.shows(st);
  const kin = st.kin ?? M.kinematics(0, 0, M.V_CRUISE, 0);
  const rel = st.tilt[0] - st.phi;
  for (const id of [13, 14, 15, 16]) V.set(id, { rot: [0, 0, -rel * rad] });
  V.solid(13, "rotor").rotation.y = st.wAI > 50 ? spin : 0;
  const va = st.tilt[0] - kin.apparent;
  V.solid(16, "aft").rotation.z = va * rad;
  for (const id of [18, 19, 20]) V.set(id, { rot: [0, -sh.hiHdg * rad, 0] });
  V.solid(18, "rotor").rotation.x = st.wHI > 50 ? spin : 0;
  V.solid(17, "card").rotation.z = sh.aiRel * rad;
  V.solid(21, "card").rotation.z = sh.hiHdg * rad;
  for (const id of [23, 24, 25]) V.set(id, { rot: [SC.CANT, 0, -st.delta * rad] });
  V.set(26, { rot: [SC.CANT, 0, 0] });
  V.solid(23, "rotor").rotation.x = st.wTC > 50 ? spin : 0;
  V.solid(27, "plane").rotation.z = -sh.tcSymbol * rad;
  V.solid(28, "ball").rotation.z = sh.ball * rad;
  V.solid(11, "needle").rotation.z = (SC.SUC_ANGLE(sh.suctionInHg) - 90) * rad;
  // the pump: the rotor turns, each vane slides out to the bore
  const th = pumpShown % 360;
  V.solid(3, "rotor").rotation.z = th * rad;
  V.solid(5, "shaft").rotation.z = th * rad;
  for (let k = 0; k < M.PUMP.z; k++) {
    const key = `${th.toFixed(1)}|${st.broken && k === 2}`;
    if (vaneShown[k] === key) continue;
    vaneShown[k] = key;
    V.reshape(4, `v${k}`, { shape: P.vanePts(th + k * 60, st.broken && k === 2).map(([x, y]) => [x + SC.POS.pump[0], y + SC.POS.pump[1]]) });
  }
  // the regulator: the poppet drops off its seat, the spring shortens
  const x = st.lift;
  V.solid(7, "pop").rotation.set(0, 0, 0);
  V.set(7, { pos: [0, -x, 0] });
  V.solid(8, "spring").scale.y = (11.38 - x) / 11.38;
  // the air, by its flow
  const qi = M.instrFlow(st.s);
  const qr = st.pumpOk ? M.regFlow(st.s) : 0;
  const d = (q) => 0.06 + 0.8 * Math.min(1, q / 110);
  V.fluid("pump", { density: d(qi + qr) });
  V.fluid("reg", { density: d(qr * 1.5) });
  V.fluid("fil", { density: d(qi * 1.6) });
  for (const k of ["feed", "feed2", "out", "out2"]) V.fluid(`h-${k}`, { density: d(qi * 1.6) });
  for (const k of ["suct", "exh"]) V.fluid(`h-${k}`, { density: d(qi + qr) });
  const warp = st.warp > 1.05 ? `×${Math.round(st.warp)}` : "×1";
  const phase = mode === "tour" ? M.phaseAt(st.t) : "FREE";
  const k1 = (r) => `${(r / 1000).toFixed(1)}k`;
  $("readout").textContent = `${sh.suctionInHg.toFixed(1)} inHg · ROTORS ${k1(sh.rpm.ai)} ${k1(sh.rpm.hi)} ${k1(sh.rpm.tc)} · BANK ${Math.round(st.phi)}° AI ${Math.round(sh.aiRel)}° · HI ${Math.round(sh.hiHdg)}/${Math.round(sh.compass)} · ${warp}`;
}

V.frame([() => render({})]);

V.key("ArrowLeft", () => (toFree(), (ctl.phiT = Math.max(-60, ctl.phiT - 5))));
V.key("ArrowRight", () => (toFree(), (ctl.phiT = Math.min(60, ctl.phiT + 5))));
V.key("ArrowUp", () => (toFree(), (ctl.rpm = Math.min(M.RPM_RATED, ctl.rpm + 100))));
V.key("ArrowDown", () => (toFree(), (ctl.rpm = Math.max(0, ctl.rpm - 100))));
V.key("a", () => (toFree(), (ctl.rudT = -1), setTimeout(() => (ctl.rudT = 0), 1200)));
V.key("d", () => (toFree(), (ctl.rudT = 1), setTimeout(() => (ctl.rudT = 0), 1200)));
V.key("v", () => (toFree(), (ctl.pumpOk = !ctl.pumpOk), ctl.pumpOk && (st.broken = false)));
V.key("h", () => (toFree(), (setting = 0.4)));
V.key("w", () => (toFree(), (ctl.warp = WARPS[(WARPS.indexOf(ctl.warp) + 1) % WARPS.length])));
V.key(" ", () => ((st = M.system()), (mode = "tour")));
$("fail")?.addEventListener("click", () => (toFree(), (ctl.pumpOk = !ctl.pumpOk), ctl.pumpOk && (st.broken = false), V.input()));
$("sethi")?.addEventListener("click", () => (toFree(), (setting = 0.4), V.input()));

V.test("right arrow banks", ({ key }) => {
  key("ArrowRight");
  return { pass: mode === "free" && ctl.phiT > 0, info: [mode, ctl.phiT] };
});
V.test("V fails the pump", ({ key }) => {
  key("v");
  return { pass: ctl.pumpOk === false, info: [ctl.pumpOk] };
});
V.test("standard rate deflects the TC gimbal 20°", () => {
  const s = M.system();
  s.wTC = M.TC.rpm / M.RPM_PER_RAD;
  for (let i = 0; i < 4000; i++) M.step(s, 0.004, { rpm: 0, master: true, pumpOk: false, phi: M.BANK_STD, dphi: 0, rud: 0 });
  return { pass: Math.abs(s.delta - M.TC_MARK * (M.STD_RATE * Math.cos(M.BANK_STD * rad) * Math.cos(M.CANT * rad)) / M.TC_IN_STD) < 1, info: [s.delta] };
});

V.run({ step, render, still: 16, idleAfter: 8 });
