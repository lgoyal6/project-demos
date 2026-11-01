// ── Shared math helpers (mirror of Python utils in app.py) ──────────────────

const PI2 = Math.PI * 2;

/** Convert clock hour → canvas angle (0=right, clockwise). */
function hourToAngle(h) { return (h / 24) * PI2; }

/** Cartesian point on circle. */
function polar(cx, cy, r, hour) {
  const a = hourToAngle(hour);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Convert canvas (x,y) → clock hour. */
function xyToHour(cx, cy, x, y) {
  return ((Math.atan2(y - cy, x - cx) / PI2) * 24 + 24) % 24;
}

/** Draw a ring-sector arc path (from h_start to h_end clockwise). */
function ringSector(ctx, cx, cy, rOut, rIn, hStart, hEnd) {
  const a0 = hourToAngle(hStart), a1 = hourToAngle(hEnd);
  ctx.beginPath();
  ctx.arc(cx, cy, rOut, a0, a1, false);
  ctx.arc(cx, cy, rIn,  a1, a0, true);
  ctx.closePath();
}

/** Linear interpolate between two rgb arrays. */
function lerpColor(lo, hi, t) {
  return [
    Math.round(lo[0] + (hi[0] - lo[0]) * t),
    Math.round(lo[1] + (hi[1] - lo[1]) * t),
    Math.round(lo[2] + (hi[2] - lo[2]) * t),
  ];
}
function rgbStr(c, a = 1) {
  return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Catmull-Rom spline through 25 points (same as _pc_interp in Python). */
function pcInterp(data, t) {
  const n = data.length;
  const i = Math.min(Math.floor(t), n - 2);
  const f = t - i;
  const i0 = Math.max(0, i-1), i2 = Math.min(n-1, i+1), i3 = Math.min(n-1, i+2);
  const p0=data[i0], p1=data[i], p2=data[i2], p3=data[i3];
  const v = 0.5*(2*p1+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f);
  return Math.max(0, Math.min(1, v));
}

/** Format fractional hour as "6:30 AM". */
function fmtHour(h) {
  h = ((h % 24) + 24) % 24;
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  hh %= 24;
  const suf  = hh < 12 ? 'AM' : 'PM';
  const disp = (hh % 12) || 12;
  return `${disp}:${String(mm).padStart(2,'0')} ${suf}`;
}

/** Hour label like "6am", "12pm". */
function hourLabel(h) {
  h = ((h % 24) + 24) % 24;
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h-12}pm`;
}

/** Clockwise distance from a to b (both in [0,24)). */
function cwDist(a, b) { return (b - a + 24) % 24; }

/** Ordinal suffix. */
function ordinal(n) {
  if ([11,12,13].includes(n)) return `${n}th`;
  return `${n}${{1:'st',2:'nd',3:'rd'}[n%10]||'th'}`;
}

/** Date string like "Mon, May 25th, 2026". */
function dateStr(d) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const PAL = {
  BG:       [14,  14,  24],
  PANEL_BG: [20,  20,  34],
  FACE:     [22,  22,  38],
  NIGHT:    [40,  55, 150],
  DAY:      [255,185,  60],
  TICK_MAJ: [180,180, 210],
  TICK_MIN: [80,  80, 110],
  LABEL:    [210,210, 235],
  HAND:     [255, 70,  70],
  MARKER:   [255, 70,  70],
  RING_EDGE:[60,  60, 100],
  SP_LOW:   [45,  45,  58],
  SP_HIGH:  [220, 50,  50],
  CR_LOW:   [45,  45,  58],
  CR_HIGH:  [70, 130, 230],
  CR_MIX:   [145, 90, 140],
  EAT_LOW:  [38,  28,  52],
  EAT_WIN:  [155, 75, 210],
  EAT_MRK:  [200,120, 245],
};

// ── Biomarker curve data ──────────────────────────────────────────────────────
const MEL_DATA = [
  0.03,0.03,0.03,0.03,0.03,0.03,0.04,0.05,
  0.06,0.10,0.25,0.45,0.65,0.82,0.95,1.00,
  0.95,0.85,0.65,0.40,0.18,0.06,0.03,0.03,0.03,
];
const COR_DATA = [
  0.62,0.57,0.52,0.47,0.42,0.38,0.33,0.28,
  0.22,0.18,0.14,0.11,0.08,0.10,0.17,0.30,
  0.48,0.65,0.80,0.92,1.00,0.95,0.82,0.72,0.62,
];
const CBT_DATA = [
  0.82,0.85,0.88,0.90,0.90,0.88,0.85,0.79,
  0.70,0.60,0.50,0.40,0.30,0.23,0.18,0.16,
  0.15,0.18,0.28,0.42,0.58,0.70,0.76,0.80,0.82,
];

const D_NAT=9, PEAK_NAT=15, O_NAT=21, CBT_MIN_NAT=16;
const COR_N_T=12, COR_P_T=20, COR_N_V=0.08, COR_P_V=1.0;

function melValAt(tGraph, tD, tPeak, tO) {
  const durRise  = ((tPeak-tD)+24)%24;
  const durFall  = ((tO-tPeak)+24)%24;
  const durTotal = ((tO-tD)+24)%24;
  const tPast    = ((tGraph-tD)+24)%24;
  let tData;
  if (tPast <= durTotal) {
    if (durRise > 1e-3 && tPast <= durRise) {
      const frac = tPast/durRise;
      tData = D_NAT + frac*(PEAK_NAT-D_NAT);
    } else if (durFall > 1e-3) {
      const frac = (tPast-durRise)/durFall;
      tData = PEAK_NAT + frac*(O_NAT-PEAK_NAT);
    } else { tData = PEAK_NAT; }
  } else {
    const durBase = 24-durTotal;
    if (durBase > 1e-3) {
      const frac = (tPast-durTotal)/durBase;
      tData = O_NAT + frac*(24-(O_NAT-D_NAT));
    } else { tData = 0; }
  }
  return pcInterp(MEL_DATA, ((tData%24)+24)%24);
}

function cbtValAt(tGraph, tMcbt) {
  const shift  = tMcbt - CBT_MIN_NAT;
  const tData  = ((tGraph-shift)%24+24)%24;
  return pcInterp(CBT_DATA, tData);
}

function corValAt(tGraph, tN, tP, vN, vP) {
  if (tP <= tN) tP = tN + 0.5;
  let tData;
  if      (tGraph <= tN) { const f=tN>1e-3?tGraph/tN:0; tData=f*COR_N_T; }
  else if (tGraph <= tP) { const f=(tGraph-tN)/(tP-tN); tData=COR_N_T+f*(COR_P_T-COR_N_T); }
  else                   { const rem=24-tP; const f=rem>1e-3?(tGraph-tP)/rem:1; tData=COR_P_T+f*(24-COR_P_T); }
  const vRaw = pcInterp(COR_DATA, tData);
  const span = COR_P_V-COR_N_V;
  const fv   = span>1e-6?(vRaw-COR_N_V)/span:0.5;
  return Math.max(0, Math.min(1, vN+fv*(vP-vN)));
}

function computeIrCurve(dlmo, mcbt, melOffsetAbs, corNadirH, corPeakH, corNadirV=0.08, corPeakV=1.0, shiftH=0) {
  const melOff = ((melOffsetAbs+shiftH)%24+24)%24;
  let tD  = ((dlmo-12)%24+24)%24;
  let tO  = ((melOff-12)%24+24)%24;
  let tMc = ((mcbt-12)%24+24)%24;
  const dur = ((tO-tD)%24+24)%24;
  const eps = 0.1;
  let past = ((tMc-tD)%24+24)%24;
  if (dur > 2*eps) {
    past = Math.max(eps, Math.min(dur-eps, past));
    tMc  = (tD+past)%24;
  }
  const tPeak = tMc;
  const tN = ((corNadirH-12)%24+24)%24;
  const tP = ((corPeakH-12)%24+24)%24;
  const vN=corNadirV, vP=corPeakV;
  const curve = [];
  for (let i=0; i<180; i++) {
    const hAbs = i*24/180;
    const t    = ((hAbs-12)%24+24)%24;
    const mel  = melValAt(t, tD, tPeak, tO);
    const dt   = 0.25;
    const cFwd = corValAt((t+dt)%24, tN, tP, vN, vP);
    const cBwd = corValAt(((t-dt)%24+24)%24, tN, tP, vN, vP);
    const slope = (cFwd-cBwd)/(2*dt);
    const uptrend = Math.max(0, Math.tanh(slope*8));
    curve.push(Math.min(1, mel*(1+uptrend)/2));
  }
  return curve;
}

function sleepPressure(hour, sleepOnset, hoursNeeded) {
  if (hoursNeeded<=0||hoursNeeded>=24) return 0;
  const wakeDur   = 24-hoursNeeded;
  const wakeStart = (sleepOnset+hoursNeeded)%24;
  const delta     = ((hour-wakeStart)%24+24)%24;
  if (delta<=wakeDur) return Math.pow(delta/wakeDur, 2.5);
  const t = (delta-wakeDur)/hoursNeeded;
  return (1+Math.cos(Math.PI*t))/2;
}

function sleepPressureBiphasic(hour, so1, aw1, so2, aw2, hoursNeeded) {
  if (hoursNeeded<=0||hoursNeeded>=24) return 0;
  const wTotal = 24-hoursNeeded;
  if (wTotal<=0) return 0;
  const rW=1/wTotal, rD=1/hoursNeeded;
  const wPre=((so1-aw2)%24+24)%24, s1=((aw1-so1)%24+24)%24, wMid=((so2-aw1)%24+24)%24;
  const pSo1=rW*wPre, pAw1=Math.max(0,pSo1-rD*s1), pSo2=pAw1+rW*wMid;
  const d=((hour-aw2)%24+24)%24;
  if (d<=wPre)               return rW*d;
  if (d<=wPre+s1)            return Math.max(0,pSo1-rD*(d-wPre));
  if (d<=wPre+s1+wMid)       return pAw1+rW*(d-wPre-s1);
  return Math.max(0, pSo2-rD*(d-wPre-s1-wMid));
}

function circadianPressure(hour, dlmo, mcbt, hoursNeeded) {
  if (hoursNeeded<=0||hoursNeeded>=24) return 0;
  const blueStart      = ((dlmo-2)%24+24)%24;
  const greyEndDefault = (dlmo+hoursNeeded)%24;
  const spMcbt    = ((mcbt-blueStart)%24+24)%24;
  const spDefault = ((greyEndDefault-blueStart)%24+24)%24;
  let greyEnd, totalSpan;
  if (spMcbt > spDefault) { greyEnd=(mcbt+2)%24; totalSpan=((greyEnd-blueStart)%24+24)%24; }
  else                    { greyEnd=greyEndDefault; totalSpan=spDefault; }
  const delta   = ((hour-blueStart)%24+24)%24;
  const riseDur = Math.max(spMcbt, 0.001);
  const fallDur = Math.max(((greyEnd-mcbt)%24+24)%24, 0.001);
  if (delta >= totalSpan) return 0;
  if (delta <= riseDur)   return Math.pow(delta/riseDur, 1.5);
  const t = (delta-riseDur)/fallDur;
  return (1+Math.cos(Math.PI*t))/2;
}

function afternoonDipBoost(hour, dipHour, halfWidth=1.0, boost=0.20) {
  const delta = Math.abs(((hour-dipHour+12)%24)-12);
  if (delta >= halfWidth) return 0;
  return boost*0.5*(1+Math.cos(Math.PI*delta/halfWidth));
}

function sleepPressureWithNap(hour, sleepOnset, hoursNeeded, napHour, napReduction) {
  if (hoursNeeded<=0||hoursNeeded>=24) return 0;
  const wakeDur   = 24-hoursNeeded;
  const wakeStart = (sleepOnset+hoursNeeded)%24;
  const delta     = ((hour-wakeStart)%24+24)%24;
  if (delta > wakeDur) {
    const t=(delta-wakeDur)/hoursNeeded;
    return (1+Math.cos(Math.PI*t))/2;
  }
  const deltaNap = ((napHour-wakeStart)%24+24)%24;
  if (napReduction<=0||deltaNap>=wakeDur||delta<=deltaNap) return Math.pow(delta/wakeDur,2.5);
  const spAtNap    = Math.pow(deltaNap/wakeDur, 2.5);
  const spPostNap  = Math.max(0, spAtNap-napReduction);
  const remDur     = wakeDur-deltaNap;
  const frac       = remDur>0?(delta-deltaNap)/remDur:1;
  return spPostNap+Math.pow(frac,2.5)*(1-spPostNap);
}

function optimalEatStart(irCurve, wakeFallback) {
  if (!irCurve || irCurve.length===0) return wakeFallback;
  const maxV = Math.max(...irCurve), minV = Math.min(...irCurve);
  if (maxV < 0.05) return wakeFallback;
  const plateau = minV+(maxV-minV)*0.15;
  const N = irCurve.length;
  for (let i=0;i<N;i++) {
    const ok = Array.from({length:Math.floor(N/6)},(_,j)=>irCurve[(i+j)%N]).every(v=>v<=plateau);
    if (ok) return (i*24/N+24)%24;
  }
  return wakeFallback;
}
