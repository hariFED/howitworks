// Page code for pitot-static.html. K (kit), L (runtime), C (self-check), A (the parent's model), M (model)
// and P (parts) are inlined above this script as namespaces.

const svg = document.querySelector(".bp-sheet");
const q = L.setupPage(svg);
const specs = JSON.parse(svg.dataset.views);
const LIVE = JSON.parse(svg.dataset.live);
const V = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, K.view(v)]));
const { CH, CT } = __CHARTS__;
const $ = (id) => document.getElementById(id);
const el = {
  pitLines: ["pl-pitot", "sd-pitot"].map($),
  stLines: ["pl-portL", "pl-portR", "pl-static", "pl-manifold", "pl-vsiTee", "pl-asiStatic", "sd-portL", "sd-static", "sd-manifold", "sd-vsiTee", "sd-asiStatic", "c-L", "c-R"].map($),
  pitAir: ["a-air", "a-pt0", "a-pt1", "a-line", "b-air", "b-pt", "asi-fit0"].map($),
  stAir: ["d-bore", "f-air", "asi-fit1", "alt-fit0", "vsi-fit0", "e-B"].map($),
  aIce: $("a-ice"),
  bIce: $("b-ice"),
  bDrain: $("b-drain"),
  cIce: $("c-ice"),
  dIce: $("d-ice"),
  eSpool: $("e-spool"),
  eA: $("e-A"),
  eC: $("e-C"),
  eGroove: $("e-groove"),
  lb10: $("lb-10"),
  asiS: $("asi-s"),
  asiF: $("asi-f"),
  altS: $("alt-s"),
  altF: $("alt-f"),
  altK: $("alt-k"),
  vsiS: $("vsi-s"),
  vsiF: $("vsi-f"),
  vsiMu: $("vsi-mu"),
  c1Ias: $("c1-ias"),
  c1Tas: $("c1-tas"),
  c1Dot: $("c1-dot"),
  c1Idot: $("c1-idot"),
  c2True: $("c2-true"),
  c2Ind: $("c2-ind"),
  n: Object.fromEntries(["n-pit", "n-st", "n-vc", "n-ram", "n-drain", "n-ports", "n-alt"].map((id) => [id, $(id)])),
  readout: $("readout"),
  readout2: $("readout2"),
};
const say = L.announcer($("sr"), 2);

// ---------------------------------------------------------------- state
let s = M.tourStart();
let mode = "tour"; // "tour" drives everything; "free": the reader flies and breaks things
const ctl = { iasCmd: M.V_CRUISE, vsCmd: 0 };
let trail = [];
let dragging = false;

function step(dt, live) {
  if (live.touring && mode !== "tour" && !dragging) {
    mode = "tour";
    s = M.tourStart();
    trail = [];
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (mode === "tour") {
      M.tourStep(s, h);
      if (s.t >= M.TOUR) {
        s = M.tourStart();
        trail = [];
      }
    } else {
      s.warp = 1;
      M.stepSystem(s, h, { iasCmd: ctl.iasCmd, vsCmd: ctl.vsCmd });
      s.t += h;
    }
    const last = trail[trail.length - 1];
    if (!last || s.ft - last[0] > 0.1) {
      const ind = M.indications(s);
      trail.push([s.ft, s.w / M.FPM, ind.vsi]);
    }
  }
  while (trail.length && s.ft - trail[0][0] > CT.span) trail.shift();
  return true;
}
function toFree() {
  if (mode === "tour") {
    mode = "free";
    ctl.iasCmd = Math.round(s.ias);
    ctl.vsCmd = Math.round(s.w / M.FPM / 100) * 100;
  }
}

// ---------------------------------------------------------------- drawing helpers
const tint = (p) => K.r2(Math.min(1, Math.max(0.12, (p - 40000) / 64000)));
const cx = (v) => K.r2(CH.x0 + ((Math.min(CH.vMax, Math.max(CH.vMin, v)) - CH.vMin) / (CH.vMax - CH.vMin)) * (CH.x1 - CH.x0));
const cy = (h) => K.r2(CH.y1 - (Math.min(CH.hMax, Math.max(0, h)) / CH.hMax) * (CH.y1 - CH.y0));
const ty = (f) => K.r2((CT.y0 + CT.y1) / 2 - (Math.max(-CT.fMax, Math.min(CT.fMax, f)) / CT.fMax) * ((CT.y1 - CT.y0) / 2));
const shown = { asi: null, alt: null, vsi: null, k: null, ram: null, drain: null, ports: null, valve: null };
const near = (a, b, e) => a != null && Math.abs(a - b) < e;
const sgn = (x) => (x >= 0 ? "+" : "−");
const fmtK = (n) => Math.round(n).toLocaleString("en-US");

function iceAt(Vv, pts) {
  return `<path class="ice" d="${K.d(Vv, pts)}"/>`;
}

function render(live) {
  const ind = M.indications(s);
  const tr = M.truth(s);
  // ---- the instruments: redraw a movement only when its angles move
  const a = P.asiState(ind);
  if (!near(shown.asi, a.cw, 0.05)) {
    const c = P.INSTR.asi.cap;
    el.asiS.innerHTML = `<g data-role="fluid"><path id="asi-cap" class="tint" fill-opacity="${tint(s.pPit)}" d="${K.d(V.asiS, P.capsuleAir(c.x0, c.gap, c.R, a.dl))}"/></g>` + P.asiMoving(V.asiS, a);
    el.asiF.innerHTML = P.asiFrontMoving(V.asiF, a);
    shown.asi = a.cw;
  }
  const al = P.altState(ind, s.set);
  if (!near(shown.alt, al.cw1 + al.cradle * 7, 0.08)) {
    el.altS.innerHTML = P.altMoving(V.altS, al);
    el.altF.innerHTML = P.altFrontMoving(V.altF, al);
    shown.alt = al.cw1 + al.cradle * 7;
  }
  if (!near(shown.k, al.set, 0.01)) {
    const k = P.kollsman(V.altF, al.set);
    el.altK.innerHTML = k.geom + `<g data-role="engraved">${k.text}</g>`;
    shown.k = al.set;
  }
  const w = P.vsiState(ind);
  if (!near(shown.vsi, w.cw, 0.05)) {
    const c = P.INSTR.vsi.cap;
    el.vsiS.innerHTML = `<g data-role="fluid"><path id="vsi-cap" class="tint" fill-opacity="${tint(s.pSt)}" d="${K.d(V.vsiS, P.capsuleAir(c.x0, c.gap, c.R, w.dl))}"/></g>` + P.vsiMoving(V.vsiS, w);
    el.vsiF.innerHTML = P.vsiFrontMoving(V.vsiF, w);
    shown.vsi = w.cw;
  }
  // ---- the air: density follows absolute pressure
  const tp = tint(s.pPit);
  const ts = tint(s.pSt);
  for (const e of el.pitAir) e?.setAttribute("fill-opacity", tp);
  for (const e of el.stAir) e?.setAttribute("fill-opacity", ts);
  el.vsiMu?.setAttribute("fill-opacity", tint(s.pVc));
  const capNow = document.getElementById("asi-cap");
  capNow?.setAttribute("fill-opacity", tp);
  document.getElementById("vsi-cap")?.setAttribute("fill-opacity", ts);
  for (const e of el.pitLines) e?.setAttribute("stroke-opacity", K.r2(0.35 + 0.65 * tp));
  for (const e of el.stLines) e?.setAttribute("stroke-opacity", K.r2(0.35 + 0.65 * ts));
  // ---- ice on the ram hole, the drain, the ports
  if (shown.ram !== s.ram || shown.drain !== s.drain) {
    const hd = P.HD;
    const ram = [[-0.6, -hd.ram - 0.6], [5, -hd.ram - 0.6], [7.5, -hd.ch + 0.2], [7.5, hd.ch - 0.2], [5, hd.ram + 0.6], [-0.6, hd.ram + 0.6]];
    el.aIce.innerHTML = s.ram ? iceAt(V.A, ram) : "";
    el.bIce.innerHTML = s.ram ? iceAt(V.B, ram) : "";
    el.bDrain.innerHTML = P.drainHole(V.B, s.drain);
    shown.ram = s.ram;
    shown.drain = s.drain;
  }
  if (shown.ports !== s.ports) {
    el.dIce.innerHTML = s.ports ? iceAt(V.D, P.spIce()) : "";
    el.cIce.innerHTML = s.ports ? [-1, 1].map((sg) => iceAt(V.C, K.rect(sg * M.PORT_R - 26 * (sg < 0 ? 1 : 0) - (sg > 0 ? -0 : 0), M.PORT_WL - 40, sg * M.PORT_R + (sg > 0 ? 26 : 0), M.PORT_WL + 40))).join("") : "";
    shown.ports = s.ports;
  }
  // ---- the alternate valve's spool
  const sp = K.r2(s.valve * P.AV.travel);
  if (shown.valve !== sp) {
    el.eSpool.innerHTML = P.part(10, P.valveSpool(V.E, sp) + P.valveKnob(V.E, sp));
    el.eGroove.setAttribute("d", K.d(V.E, P.valveAir(sp).groove));
    el.lb10.innerHTML = K.balloon(V.E, [P.AV.knob[1] - 4 + sp, 6], LIVE[10].at, 10, { target: 10 });
    shown.valve = sp;
  }
  el.eA.setAttribute("fill-opacity", tint(tr.air.p));
  el.eC.setAttribute("fill-opacity", tint(tr.pCab));
  el.eGroove.setAttribute("fill-opacity", ts);
  // ---- diagram 3
  el.n["n-pit"].textContent = `Δ ${sgn(s.pPit - s.pSt)}${fmtK(Math.abs(s.pPit - s.pSt))}`;
  el.n["n-st"].textContent = `${(s.pSt / 100).toFixed(1)} hPa`;
  el.n["n-vc"].textContent = `Δ ${sgn(s.pVc - s.pSt)}${fmtK(Math.abs(s.pVc - s.pSt))}`;
  el.n["n-ram"].classList.toggle("on", s.ram);
  el.n["n-drain"].classList.toggle("on", s.drain);
  el.n["n-ports"].classList.toggle("on", s.ports || s.valve > 0.5);
  el.n["n-alt"].classList.toggle("on", s.valve < 0.5);
  // ---- charts
  const hFt = M.ft(s.h);
  el.c1Ias.setAttribute("d", `M${cx(s.ias)} ${CH.y0}V${CH.y1}`);
  el.c1Tas.setAttribute("points", Array.from({ length: 21 }, (_, i) => `${cx(M.tasKt(s.ias, (i * CH.hMax) / 20))},${cy((i * CH.hMax) / 20)}`).join(" "));
  el.c1Dot.setAttribute("cx", cx(tr.tas));
  el.c1Dot.setAttribute("cy", cy(hFt));
  el.c1Idot.setAttribute("cx", cx(s.ias));
  el.c1Idot.setAttribute("cy", cy(hFt));
  const t0 = s.ft - CT.span;
  const px = (f) => K.r2(CT.x0 + ((f - t0) / CT.span) * (CT.x1 - CT.x0));
  el.c2True.setAttribute("points", trail.map(([f, v]) => `${px(f)},${ty(v)}`).join(" "));
  el.c2Ind.setAttribute("points", trail.map(([f, , v]) => `${px(f)},${ty(v)}`).join(" "));
  // ---- readouts
  const ph = mode === "tour" ? M.phase(s) : M.phase(s).replace("CRUISE", "LEVEL");
  const warp = s.warp > 1.5 ? ` · ×${Math.round(s.warp)}` : "";
  el.readout.textContent = `${fmtK(hFt)} ft · IAS ${Math.round(s.ias)} · TAS ${Math.round(tr.tas)} kt · ${sgn(s.w)}${fmtK(Math.abs(s.w / M.FPM))} ft/min · q ${fmtK(tr.q)} Pa${warp}`;
  el.readout2.textContent = `ASI ${Math.round(ind.ias)} · ALT ${fmtK(ind.hInd)} · ${Math.round(s.set / 100)} hPa · VSI ${sgn(ind.vsi)}${fmtK(Math.abs(ind.vsi))} · ${ph}`;
  say(`${ph.toLowerCase()}: true ${fmtK(hFt)} feet, ${Math.round(s.ias)} knots; the airspeed indicator shows ${Math.round(ind.ias)}, the altimeter ${fmtK(ind.hInd)}, the vertical speed indicator ${fmtK(ind.vsi)} feet a minute.`, live.clock);
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
  // a still, true moment: the static ports blocked in the descent, the ASI reading high
  const fake = { touring: true, reduced: false, clock: 0 };
  for (let t = 0; t < 52.5; t += 1 / 240) step(1 / 240, fake);
  render(live);
}

const setBaro = (pa) => (s.set = Math.min(M.BARO.max * 100, Math.max(M.BARO.min * 100, pa)));
for (const hitEl of svg.querySelectorAll("[data-drag]")) {
  let v0 = 0;
  const kind = hitEl.dataset.drag;
  L.dragY(svg, hitEl, {
    start: () => {
      dragging = true;
      toFree();
      v0 = kind === "knob" ? s.set : s.alt ? 1 : 0;
      live.input();
    },
    move: (dy) => {
      if (kind === "knob") setBaro(Math.round((v0 - dy * 20) / 100) * 100);
      else s.alt = dy < -6 ? true : dy > 6 ? false : v0 === 1;
      live.input();
    },
    end: () => {
      dragging = false;
      live.input();
    },
  });
}

svg.addEventListener("keydown", (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === "ArrowLeft" || k === "ArrowRight") {
    toFree();
    ctl.iasCmd = Math.min(160, Math.max(50, ctl.iasCmd + (k === "ArrowRight" ? 5 : -5)));
  } else if (k === "ArrowUp" || k === "ArrowDown") {
    toFree();
    ctl.vsCmd = Math.min(1500, Math.max(-1500, ctl.vsCmd + (k === "ArrowUp" ? 100 : -100)));
  } else if (k === "p") {
    toFree();
    s.ram = !s.ram;
    if (s.ram) s.heat = false;
  } else if (k === "d") {
    toFree();
    s.drain = !s.drain;
    if (s.drain) s.heat = false;
  } else if (k === "o") {
    toFree();
    s.ports = !s.ports;
  } else if (k === "a") {
    toFree();
    s.alt = !s.alt;
  } else if (k === "h") {
    toFree();
    s.heat = !s.heat;
  } else if (k === "[" || k === "]") {
    toFree();
    setBaro(s.set + (k === "]" ? 100 : -100));
  } else if (k === " ") {
    mode = "tour";
    s = M.tourStart();
    trail = [];
  } else if (k === "s") live.slow = live.slow === 1 ? 0.25 : live.slow === 0.25 ? 0.06 : 1;
  else return;
  e.preventDefault();
  live.input();
});

if (q.check && !live.frozen) setTimeout(() => C.selfCheck(svg), 400);
