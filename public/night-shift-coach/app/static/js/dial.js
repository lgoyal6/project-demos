// ── Circadian Dial ,  HTML5 Canvas renderer + interaction ─────────────────────
//
// Ring layout (fractions of S = min(w,h)):
//   Outer (day/night): 0.352 → 0.420
//   Sleep Pressure:    0.280 → 0.352
//   Circadian Rhythm:  0.210 → 0.280
//   Eating:            0.140 → 0.210
//   Hub:               0.036

const SEGS = 180;

// ── Day/Night smooth transition helper ───────────────────────────────────────
// Returns 0 (full night) … 1 (full day) with ±½·transW smooth blend at edges.
function dayFrac(h, sr, ss, transW) {
  const half = transW / 2;
  // Signed circular distance from reference (result in [-12,12])
  function cDist(a, ref) {
    let d = ((a - ref) % 24 + 24) % 24;
    if (d > 12) d -= 24;
    return d;
  }
  const dSR = cDist(h, sr);
  const dSS = cDist(h, ss);
  // sin from -π/2 to +π/2 gives a smooth S-curve with zero slope at endpoints
  if (Math.abs(dSR) <= half) return 0.5 + 0.5 * Math.sin((Math.PI / 2) * dSR / half);
  if (Math.abs(dSS) <= half) return 0.5 - 0.5 * Math.sin((Math.PI / 2) * dSS / half);
  const dayLen = ((ss - sr + 24) % 24);
  const fromSR = ((h - sr + 24) % 24);
  return fromSR < dayLen ? 1.0 : 0.0;
}

class CircadianDialCanvas {
  constructor(canvas, state, onStateChange) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
    this.onStateChange = onStateChange;
    this._dragging      = null;
    this._nsDragOffset  = 0;
    this._eatDragOffset = 0;
    this._dpr = window.devicePixelRatio || 1;

    canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    canvas.addEventListener('mouseleave', e => this._onMouseUp(e));
    canvas.addEventListener('touchstart', e => this._onTouch(e,'down'), {passive:false});
    canvas.addEventListener('touchmove',  e => this._onTouch(e,'move'), {passive:false});
    canvas.addEventListener('touchend',   e => this._onTouch(e,'up'),   {passive:false});
  }

  resize(w, h) {
    const dpr = this._dpr;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this._w = w; this._h = h;
    this.draw();
  }

  _geom() {
    const w = this._w || this.canvas.clientWidth;
    const h = this._h || this.canvas.clientHeight;
    return { cx: w/2, cy: h/2, S: Math.min(w, h) };
  }

  _radii(S) {
    const R_OUT    = S * 0.420, R_IN    = S * 0.352;
    const R_SP_IN  = S * 0.280, R_CR_IN = S * 0.210;
    const R_EAT_IN = S * 0.140;
    return {
      R_OUT, R_IN, R_SP_IN, R_CR_IN, R_EAT_IN,
      R_HUB:      S * 0.036,
      R_MRK:      (R_OUT + R_IN) / 2,
      R_SP_MID:   (R_IN  + R_SP_IN)  / 2,
      R_CR_MID:   (R_SP_IN + R_CR_IN) / 2,
      R_EAT_MID:  (R_CR_IN + R_EAT_IN) / 2,
      R_TICK_MAJ: R_OUT + S * 0.022,
      R_TICK_MIN: R_OUT + S * 0.013,
      R_TICK_HHR: R_OUT + S * 0.007,
      R_LBL:      R_OUT + S * 0.052,
      MR:    S * 0.021,
      MR_SP: S * 0.019,
      MR_CR: S * 0.018,
    };
  }

  draw(noLine = false) {
    const ctx = this.ctx;
    const s   = this.state;
    const { cx, cy, S } = this._geom();
    const rd = this._radii(S);
    const { R_OUT, R_IN, R_SP_IN, R_CR_IN, R_EAT_IN, R_HUB,
            R_MRK, R_SP_MID, R_CR_MID, R_EAT_MID,
            R_TICK_MAJ, R_TICK_MIN, R_TICK_HHR, R_LBL,
            MR, MR_SP, MR_CR } = rd;

    ctx.clearRect(0, 0, this._w, this._h);
    ctx.fillStyle = rgbStr(PAL.BG);
    ctx.fillRect(0, 0, this._w, this._h);

    const step = 24 / SEGS;

    // ── 1. Inner face ─────────────────────────────────────────────────────────
    ctx.beginPath(); ctx.arc(cx, cy, R_CR_IN, 0, PI2);
    ctx.fillStyle = rgbStr(PAL.FACE); ctx.fill();

    // ── 2a. Eating ring background ────────────────────────────────────────────
    ringSector(ctx, cx, cy, R_CR_IN, R_EAT_IN, 0, 24);
    ctx.fillStyle = rgbStr(PAL.EAT_LOW); ctx.fill();

    // ── 2b. Eating ring fill ──────────────────────────────────────────────────
    const eatMode = s.eating_mode;
    if (eatMode === 'adlib') {
      ringSector(ctx, cx, cy, R_CR_IN, R_EAT_IN, 0, 24);
      ctx.fillStyle = `rgba(190,120,235,0.255)`; ctx.fill();
    } else {
      const dur = eatMode === 'tr10' ? 10 : 8;
      ringSector(ctx, cx, cy, R_CR_IN, R_EAT_IN, s.eating_start, s.eating_start + dur);
      ctx.fillStyle = `rgba(155,75,210,0.765)`; ctx.fill();
    }

    // ── 2c. IR overlay ────────────────────────────────────────────────────────
    const irCurve = s.ir_curve || [];
    const irStep  = 24 / 180;
    for (let i = 0; i < 180; i++) {
      const ir = irCurve[i] || 0;
      if (ir > 0.02) {
        ringSector(ctx, cx, cy, R_CR_IN, R_EAT_IN, i * irStep, (i+1) * irStep);
        ctx.fillStyle = `rgba(40,180,70,${ir * 0.667})`; ctx.fill();
      }
    }

    // ── 2d. "Max insulin resistance" curved label at IR peak ─────────────────
    // rotate(a - π/2) aligns local-x with the counter-clockwise tangent and
    // automatically places character bottoms outward ,  no scale() needed.
    if (irCurve.length > 0) {
      let maxIdx = 0, maxVal = 0;
      for (let i = 0; i < 180; i++) {
        if ((irCurve[i] || 0) > maxVal) { maxVal = irCurve[i]; maxIdx = i; }
      }
      if (maxVal > 0.1) {
        const maxH   = (maxIdx + 0.5) * 24 / 180;
        const text   = 'Insulin resistance';
        const r      = R_EAT_MID;
        const midA   = hourToAngle(maxH);
        const charW  = S * 0.017;
        // Start at the clockwise end and step counter-clockwise so 'M' is
        // at the larger angle and the word reads in the CCW direction.
        const startA = midA + (text.length * charW) / (2 * r);
        const step   = -(charW / r);
        ctx.save();
        ctx.font         = `bold ${Math.max(6, Math.round(S * 0.017))}px Helvetica Neue`;
        ctx.fillStyle    = 'black';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < text.length; i++) {
          const a = startA + (i + 0.5) * step;
          ctx.save();
          ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
          ctx.rotate(a - Math.PI / 2);   // CCW tangent; bottoms face outward
          ctx.fillText(text[i], 0, 0);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // ── 3. Circadian Rhythm ring ──────────────────────────────────────────────
    for (let i = 0; i < SEGS; i++) {
      const hMid = (i + 0.5) * step;
      let pres = circadianPressure(hMid, s.dlmo, s.mcbt, s.hours_needed);
      if (s.show_dip) pres = Math.min(1, pres + afternoonDipBoost(hMid, s.afternoon_dip));
      const c = lerpColor(PAL.CR_LOW, PAL.CR_HIGH, pres);
      ringSector(ctx, cx, cy, R_SP_IN, R_CR_IN, i * step, (i+1) * step);
      ctx.fillStyle = rgbStr(c); ctx.fill();
    }

    // ── 3b. Afternoon dip overlay ─────────────────────────────────────────────
    if (s.show_dip) {
      const dipHW = 1.0, dipN = 60, dipStep = 2 * dipHW / dipN;
      for (let i = 0; i < dipN; i++) {
        const h0   = s.afternoon_dip - dipHW + i * dipStep;
        const hMid = h0 + dipStep / 2;
        const delta = Math.abs(((hMid - s.afternoon_dip + 12) % 24) - 12);
        const frac  = 0.5 * (1 + Math.cos(Math.PI * delta / dipHW));
        const alpha = frac * 0.627;
        if (alpha > 0) {
          ringSector(ctx, cx, cy, R_SP_IN, R_CR_IN, h0, h0 + dipStep);
          ctx.fillStyle = `rgba(70,130,230,${alpha})`; ctx.fill();
        }
      }
    }

    // ── 4. Sleep Pressure ring ────────────────────────────────────────────────
    for (let i = 0; i < SEGS; i++) {
      const hMid = (i + 0.5) * step;
      let pres;
      if (s.biphasic) {
        pres = sleepPressureBiphasic(hMid, s.so1, s.aw1, s.so2, s.aw2, s.hours_needed);
      } else if (s.show_nap) {
        const napRed = Math.min(0.4, (s.nap_duration / 60) * 0.5);
        pres = sleepPressureWithNap(hMid, s.sleep_onset, s.hours_needed, s.nap_hour, napRed);
      } else {
        pres = sleepPressure(hMid, s.sleep_onset, s.hours_needed);
      }
      const c = lerpColor(PAL.SP_LOW, PAL.SP_HIGH, pres);
      ringSector(ctx, cx, cy, R_IN, R_SP_IN, i * step, (i+1) * step);
      ctx.fillStyle = rgbStr(c); ctx.fill();
    }

    // ── 4b. Sleep bar (blue arc, inner 1/5 of SP ring) ────────────────────────
    const spWidth   = R_IN - R_SP_IN;
    const R_BAR_IN  = R_SP_IN;
    const R_BAR_OUT = R_SP_IN + spWidth / 5;
    if (s.biphasic) {
      ringSector(ctx, cx, cy, R_BAR_OUT, R_BAR_IN, s.so1, s.aw1);
      ctx.fillStyle = 'rgba(70,130,230,0.902)'; ctx.fill();
      ringSector(ctx, cx, cy, R_BAR_OUT, R_BAR_IN, s.so2, s.aw2);
      ctx.fillStyle = 'rgba(70,130,230,0.902)'; ctx.fill();
    } else {
      ringSector(ctx, cx, cy, R_BAR_OUT, R_BAR_IN, s.sleep_onset, s.sleep_onset + s.hours_needed);
      ctx.fillStyle = 'rgba(70,130,230,0.902)'; ctx.fill();
    }

    // ── 4c. Night shift bar (green, outer 2/5 of SP ring) ────────────────────
    if (s.show_night_shift) {
      const R_NS_OUT = R_IN, R_NS_IN = R_IN - spWidth * 2 / 5;
      ringSector(ctx, cx, cy, R_NS_OUT, R_NS_IN,
                 s.night_shift_start, s.night_shift_start + s.night_shift_hours);
      ctx.fillStyle = 'rgb(40,180,70)'; ctx.fill();
      {
        const nsText  = 'Night Shift';
        const nsR     = (R_NS_OUT + R_NS_IN) / 2;
        const nsMidH  = (s.night_shift_start + s.night_shift_hours / 2 + 24) % 24;
        const nsMidA  = hourToAngle(nsMidH);
        const nsCharW = S * 0.017;
        const nsStartA = nsMidA + (nsText.length * nsCharW) / (2 * nsR);
        const nsStep   = -(nsCharW / nsR);
        ctx.save();
        ctx.font         = `bold ${Math.max(6, Math.round(S * 0.017))}px Helvetica Neue`;
        ctx.fillStyle    = 'black';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < nsText.length; i++) {
          const a = nsStartA + (i + 0.5) * nsStep;
          ctx.save();
          ctx.translate(cx + nsR * Math.cos(a), cy + nsR * Math.sin(a));
          ctx.rotate(a - Math.PI / 2);
          ctx.fillText(nsText[i], 0, 0);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // ── 5. Outer (Day/Night) ring ,  smooth 1-hour transition ─────────────────
    const NIGHT_C = [40, 55, 150], DAY_C = [255, 185, 60];
    for (let i = 0; i < SEGS; i++) {
      const hMid = (i + 0.5) * step;
      const frac = dayFrac(hMid, s.sunrise, s.sunset, 1.0);
      const c    = lerpColor(NIGHT_C, DAY_C, frac);
      ringSector(ctx, cx, cy, R_OUT, R_IN, i * step, (i+1) * step);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.824)`; ctx.fill();
    }

    // ── 5b. "Avoid sunlight" bar when bedtime is past sunrise ─────────────────
    if (!s.biphasic) {
      const hoursAfterSR = ((s.sleep_onset - s.sunrise + 24) % 24);
      if (hoursAfterSR > 0 && hoursAfterSR < 10) {
        const barStart = (s.sunrise - 1 + 24) % 24;
        const barSpan  = ((s.sleep_onset - barStart + 24) % 24);
        if (barSpan > 0 && barSpan < 12) {
          // Bar sits INSIDE the Day/Night ring, adjacent to its inner border (R_IN)
          const avoidW      = (R_OUT - R_IN) * 0.42;
          const R_AVOID_IN  = R_IN;              // inner edge = inner border of Day/Night ring
          const R_AVOID_OUT = R_IN + avoidW;     // extends outward into Day/Night ring
          ringSector(ctx, cx, cy, R_AVOID_OUT, R_AVOID_IN, barStart, s.sleep_onset);
          ctx.fillStyle = 'rgba(20,30,110,0.93)'; ctx.fill();
          {
            const avText  = 'Avoid sunlight';
            const avR     = (R_AVOID_OUT + R_AVOID_IN) / 2;
            const avMidH  = (barStart + barSpan / 2 + 24) % 24;
            const avMidA  = hourToAngle(avMidH);
            const avCharW = S * 0.017;
            const avStartA = avMidA + (avText.length * avCharW) / (2 * avR);
            const avStep   = -(avCharW / avR);
            ctx.save();
            ctx.font         = `bold ${Math.max(6, Math.round(S * 0.017))}px Helvetica Neue`;
            ctx.fillStyle    = 'rgb(200,210,255)';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < avText.length; i++) {
              const a = avStartA + (i + 0.5) * avStep;
              ctx.save();
              ctx.translate(cx + avR * Math.cos(a), cy + avR * Math.sin(a));
              ctx.rotate(a - Math.PI / 2);
              ctx.fillText(avText[i], 0, 0);
              ctx.restore();
            }
            ctx.restore();
          }
        }
      }
    }

    // ── Ring border lines ─────────────────────────────────────────────────────
    [R_OUT, R_IN, R_SP_IN, R_CR_IN, R_EAT_IN].forEach(r => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, PI2);
      ctx.strokeStyle = rgbStr(PAL.RING_EDGE); ctx.lineWidth = 0.5; ctx.stroke();
    });

    // ── 6. Ticks ,  all 24 hours ───────────────────────────────────────────────
    for (let hr = 0; hr < 24; hr++) {
      const isMaj = (hr % 6 === 0), isHhr = (hr % 3 === 0 && !isMaj);
      const rTick = isMaj ? R_TICK_MAJ : isHhr ? R_TICK_MIN : R_TICK_HHR;
      const p0 = polar(cx, cy, R_OUT, hr), p1 = polar(cx, cy, rTick, hr);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = isMaj ? rgbStr(PAL.TICK_MAJ) : rgbStr(PAL.TICK_MIN);
      ctx.lineWidth   = isMaj ? 1.2 : 0.6; ctx.stroke();
    }

    // ── Hour labels ,  all 24 hours, drawn upright (no rotation) ─────────────
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (let hr = 0; hr < 24; hr++) {
      const pt    = polar(cx, cy, R_LBL, hr);
      const isMaj = (hr % 6 === 0);
      ctx.font      = `${isMaj ? 'bold ' : ''}${Math.max(6, Math.round(S * (isMaj ? 0.026 : 0.018)))}px Helvetica Neue`;
      ctx.fillStyle = rgbStr(PAL.LABEL);
      ctx.fillText(hourLabel(hr), pt.x, pt.y);
    }

    // ── 7. Hub ────────────────────────────────────────────────────────────────
    ctx.beginPath(); ctx.arc(cx, cy, R_HUB, 0, PI2);
    ctx.fillStyle = rgbStr(PAL.CR_LOW); ctx.fill();

    // ── 8. Markers ────────────────────────────────────────────────────────────

    // Sunrise / Sunset ,  text only, no dot, black
    this._drawRingLabel(ctx, cx, cy, R_MRK, s.sunrise, 'Sunrise', S);
    this._drawRingLabel(ctx, cx, cy, R_MRK, s.sunset,  'Sunset',  S);

    // Circadian Rhythm ring markers ,  DLMO and mCBT labels in black
    this._drawMarker(cx, cy, R_CR_MID, s.dlmo, MR_CR, PAL.CR_HIGH, ['DLMO'], S, 'black');
    this._drawMarker(cx, cy, R_CR_MID, s.mcbt, MR_CR, PAL.CR_HIGH, ['mCBT'], S, 'black');
    if (s.show_dip) this._drawMarker(cx, cy, R_CR_MID, s.afternoon_dip, MR_CR, PAL.DAY, ['Dip'], S);
    if (s.show_nap) this._drawMarker(cx, cy, R_CR_MID, s.nap_hour, MR_CR, [255,100,100], ['Nap'], S);

    // Sleep Pressure ring markers ,  Bedtime labels in black
    if (s.biphasic) {
      this._drawMarker(cx, cy, R_SP_MID, s.so1, MR_SP, PAL.MARKER, ['Bedtime 1'], S, 'black');
      this._drawMarker(cx, cy, R_SP_MID, s.aw1, MR_SP, PAL.MARKER, ['Awaken 1'],  S, 'black');
      this._drawMarker(cx, cy, R_SP_MID, s.so2, MR_SP, PAL.MARKER, ['Bedtime 2'], S, 'black');
      this._drawMarker(cx, cy, R_SP_MID, s.aw2, MR_SP, PAL.MARKER, ['Awaken 2'],  S, 'black');
    } else {
      this._drawMarker(cx, cy, R_SP_MID, s.sleep_onset, MR_SP, PAL.MARKER, ['Bedtime'], S, 'black');
    }

    // "Eating Window" arc text on the eating ring (outward, black)
    if (eatMode !== 'adlib') {
      const dur = eatMode === 'tr10' ? 10 : 8;
      {
        const ewText  = 'Eating Window';
        const ewR     = R_EAT_MID;
        const ewMidH  = (s.eating_start + dur / 2 + 24) % 24;
        const ewMidA  = hourToAngle(ewMidH);
        const ewCharW = S * 0.017;
        const ewStartA = ewMidA + (ewText.length * ewCharW) / (2 * ewR);
        const ewStep   = -(ewCharW / ewR);
        ctx.save();
        ctx.font         = `bold ${Math.max(6, Math.round(S * 0.017))}px Helvetica Neue`;
        ctx.fillStyle    = 'black';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < ewText.length; i++) {
          const a = ewStartA + (i + 0.5) * ewStep;
          ctx.save();
          ctx.translate(cx + ewR * Math.cos(a), cy + ewR * Math.sin(a));
          ctx.rotate(a - Math.PI / 2);
          ctx.fillText(ewText[i], 0, 0);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // Phase-shift M / B letter markers
    if (s.melatonin_marker_h  != null)
      this._drawLetterMarker(ctx, cx, cy, R_SP_MID, s.melatonin_marker_h,  MR_SP*1.5, 'white',           'M', S);
    if (s.blue_light_marker_h != null)
      this._drawLetterMarker(ctx, cx, cy, R_SP_MID, s.blue_light_marker_h, MR_SP*1.5, 'rgb(70,130,230)', 'B', S);

    // ── 9. Red hand ───────────────────────────────────────────────────────────
    if (!noLine) {
      // Line from center to inner boundary of eating ring
      const handPt = polar(cx, cy, R_EAT_IN, s.line_hour);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(handPt.x, handPt.y);
      ctx.strokeStyle = rgbStr(PAL.HAND);
      ctx.lineWidth   = Math.max(1.5, S * 0.004);
      ctx.lineCap     = 'round'; ctx.stroke();

      // Time box at hub showing current hour
      const timeStr = fmtHour(s.line_hour);
      const tfs     = Math.max(8, Math.round(S * 0.040));
      ctx.font = `bold ${tfs}px Helvetica Neue`;
      const tmW  = ctx.measureText(timeStr).width + S * 0.040;
      const tmH  = tfs * 1.75;
      const tbX  = cx - tmW / 2, tbY = cy - tmH / 2;

      ctx.fillStyle = 'rgba(14,14,28,0.90)';
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(tbX, tbY, tmW, tmH, 5); ctx.fill();
      } else {
        ctx.fillRect(tbX, tbY, tmW, tmH);
      }
      ctx.fillStyle    = 'rgb(255,80,80)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeStr, cx, cy);
    }
  }

  // ── Draw a text-only label on the ring (no dot) ,  used for Sunrise/Sunset ──
  // Drawn upright (no rotation) so it reads normally regardless of position.
  _drawRingLabel(ctx, cx, cy, r, hour, text, S) {
    const pt = polar(cx, cy, r, hour);
    ctx.font         = `bold ${Math.max(7, Math.round(S * 0.022))}px Helvetica Neue`;
    ctx.fillStyle    = 'rgb(10,10,10)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pt.x, pt.y);
  }

  // ── Draw a dot marker + text label ───────────────────────────────────────────
  // textColor: optional override for the text (defaults to same as dot color).
  _drawMarker(cx, cy, r, hour, dotR, color, lines, S, textColor = null) {
    const ctx   = this.ctx;
    const pt    = polar(cx, cy, r, hour);

    // Halo
    ctx.beginPath(); ctx.arc(pt.x, pt.y, dotR * 1.8, 0, PI2);
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.176)`; ctx.fill();
    // Dot
    ctx.beginPath(); ctx.arc(pt.x, pt.y, dotR, 0, PI2);
    ctx.fillStyle   = rgbStr(color); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.784)'; ctx.lineWidth = 1; ctx.stroke();

    // Text label ,  drawn upright (no rotation), offset radially outward from dot
    if (lines && lines.length > 0 && S) {
      const fs = Math.max(6, Math.round(S * 0.018));
      const lh = fs + 2;
      ctx.font         = `bold ${fs}px Helvetica Neue`;
      ctx.fillStyle    = textColor ?? rgbStr(color);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      // Unit vector pointing outward (away from centre) at this marker position
      const dist = Math.hypot(pt.x - cx, pt.y - cy) || 1;
      const nx = (pt.x - cx) / dist, ny = (pt.y - cy) / dist;
      const offset = dotR * 2.2;
      lines.forEach((line, i) => {
        const d = offset + i * lh;
        ctx.fillText(line, pt.x + nx * d, pt.y + ny * d);
      });
    }
  }

  _drawEatMarker(ctx, cx, cy, r, hour, dotR) {
    const pt = polar(cx, cy, r, hour);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, dotR, 0, PI2);
    ctx.fillStyle = rgbStr(PAL.EAT_MRK); ctx.fill();
  }

  _drawLetterMarker(ctx, cx, cy, r, hour, dotR, bgColor, letter, S) {
    const pt = polar(cx, cy, r, hour);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, dotR, 0, PI2);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.fillStyle    = 'black';
    ctx.font         = `bold ${Math.max(5, Math.round(dotR * 0.95))}px Helvetica Neue`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, pt.x, pt.y);
  }

  // ── Curved text along a ring arc ─────────────────────────────────────────────
  // outward=false: character tops face outward from centre ,  normal arc text readable
  //                from outside the ring (baseline on arc, text rises outward).
  // outward=true:  character tops face INWARD toward centre ,  text "hangs" from the
  //                arc; still reads left-to-right clockwise from outside. Achieved by
  //                keeping the same clockwise rotation and flipping each glyph vertically.
  _drawArcText(ctx, cx, cy, r, hStart, hEnd, text, S, color = 'black') {
    const spanH    = ((hEnd - hStart + 24) % 24);
    const midH     = (hStart + spanH / 2 + 24) % 24;
    const midAngle = hourToAngle(midH);
    const charW    = S * 0.021;
    const totalW   = text.length * charW;

    // In canvas (y-axis down), sin(midAngle) > 0 means the arc midpoint is in the
    // lower half of the screen. The clockwise tangent there runs right→left, so
    // text would read backwards. Fix: reverse character order + step direction and
    // add scale(1,-1) so tops face inward ,  rendering left→right for the viewer.
    const lower     = Math.sin(midAngle) > 0;
    const chars     = lower ? text.split('').reverse() : text.split('');
    const step      = lower ? -(charW / r) : (charW / r);
    const startAngle = midAngle + (lower ? 1 : -1) * (totalW / (2 * r));

    ctx.save();
    ctx.font         = `bold ${Math.max(7, Math.round(S * 0.017))}px Helvetica Neue`;
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < chars.length; i++) {
      const a = startAngle + (i + 0.5) * step;
      ctx.save();
      ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.rotate(a + Math.PI / 2);
      if (lower) ctx.scale(1, -1);   // flip y → character tops face inward = upright for viewer
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Hit testing ───────────────────────────────────────────────────────────────
  _nearestMarker(x, y) {
    const s  = this.state;
    const { cx, cy, S } = this._geom();
    const rd = this._radii(S);
    const HIT = 14;
    const checks = {
      sunrise: polar(cx, cy, rd.R_MRK,    s.sunrise),
      sunset:  polar(cx, cy, rd.R_MRK,    s.sunset),
      dlmo:    polar(cx, cy, rd.R_CR_MID, s.dlmo),
      mcbt:    polar(cx, cy, rd.R_CR_MID, s.mcbt),
    };
    if (s.show_dip) checks.afternoon_dip = polar(cx, cy, rd.R_CR_MID, s.afternoon_dip);
    if (s.show_nap) checks.nap_hour      = polar(cx, cy, rd.R_CR_MID, s.nap_hour);
    if (s.biphasic) {
      checks.so1 = polar(cx, cy, rd.R_SP_MID, s.so1);
      checks.aw1 = polar(cx, cy, rd.R_SP_MID, s.aw1);
      checks.so2 = polar(cx, cy, rd.R_SP_MID, s.so2);
      checks.aw2 = polar(cx, cy, rd.R_SP_MID, s.aw2);
    } else {
      checks.sleep_onset = polar(cx, cy, rd.R_SP_MID, s.sleep_onset);
    }
    for (const [name, pt] of Object.entries(checks)) {
      if (Math.hypot(x - pt.x, y - pt.y) <= HIT) return name;
    }
    // Eating window bar ,  whole bar is draggable
    if (s.eating_mode !== 'adlib') {
      const dur  = s.eating_mode === 'tr8' ? 8 : 10;
      const dist = Math.hypot(x - cx, y - cy);
      if (rd.R_EAT_IN - 10 <= dist && dist <= rd.R_CR_IN + 10) {
        const h     = xyToHour(cx, cy, x, y);
        const delta = ((h - s.eating_start) % 24 + 24) % 24;
        if (delta <= dur) return 'eat_bar';
      }
    }
    // Night shift bar
    if (s.show_night_shift) {
      const dist = Math.hypot(x - cx, y - cy);
      const spW  = rd.R_IN - rd.R_SP_IN;
      const R_NS_IN = rd.R_IN - spW * 2 / 5;
      if (R_NS_IN - 8 <= dist && dist <= rd.R_IN + 8) {
        const h     = xyToHour(cx, cy, x, y);
        const delta = ((h - s.night_shift_start) % 24 + 24) % 24;
        if (delta <= s.night_shift_hours) return 'ns_bar';
      }
    }
    // Inner face → drag red line
    if (Math.hypot(x - cx, y - cy) < rd.R_CR_IN) return 'line';
    return null;
  }

  _clientXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onMouseDown(e) {
    const { x, y } = this._clientXY(e);
    this._dragging = this._nearestMarker(x, y);
    if (this._dragging === 'ns_bar') {
      const { cx, cy } = this._geom();
      const h = xyToHour(cx, cy, x, y);
      this._nsDragOffset = ((h - this.state.night_shift_start) % 24 + 24) % 24;
    }
    if (this._dragging === 'eat_bar') {
      const { cx, cy } = this._geom();
      const h = xyToHour(cx, cy, x, y);
      this._eatDragOffset = ((h - this.state.eating_start) % 24 + 24) % 24;
    }
    if (this._dragging) this.canvas.style.cursor = 'grabbing';
  }

  _onMouseMove(e) {
    const { x, y } = this._clientXY(e);
    if (this._dragging) {
      this._applyDrag(x, y);
      this.draw();
      this.onStateChange();
    } else {
      this.canvas.style.cursor = this._nearestMarker(x, y) ? 'grab' : 'default';
    }
  }

  _onMouseUp(e) {
    this._dragging = null;
    this.canvas.style.cursor = 'default';
  }

  _onTouch(e, phase) {
    e.preventDefault();
    const t = e.touches[0] || e.changedTouches[0];
    if (!t) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = t.clientX - rect.left, y = t.clientY - rect.top;
    if (phase === 'down')       { this._dragging = this._nearestMarker(x, y); }
    else if (phase === 'move' && this._dragging) { this._applyDrag(x, y); this.draw(); this.onStateChange(); }
    else if (phase === 'up')    { this._dragging = null; }
  }

  _applyDrag(x, y) {
    const s  = this.state;
    const { cx, cy } = this._geom();
    const h  = xyToHour(cx, cy, x, y);
    const d  = this._dragging;
    if      (d === 'sunrise')       s.sunrise       = h;
    else if (d === 'sunset')        s.sunset        = h;
    else if (d === 'sleep_onset')   s.sleep_onset   = h;
    else if (d === 'dlmo')          s.dlmo          = h;
    else if (d === 'mcbt')          s.mcbt          = h;
    else if (d === 'afternoon_dip') s.afternoon_dip = h;
    else if (d === 'nap_hour')      s.nap_hour      = h;
    else if (d === 'eating_start')  s.eating_start  = h;
    else if (d === 'line')          s.line_hour     = h;
    else if (d === 'ns_bar')
      s.night_shift_start = ((h - this._nsDragOffset) % 24 + 24) % 24;
    else if (d === 'eat_bar')
      s.eating_start = ((h - this._eatDragOffset) % 24 + 24) % 24;
    // Biphasic
    else if (d === 'so1') {
      const s1 = ((s.aw1 - s.so1) % 24 + 24) % 24;
      s.so1 = h % 24; s.aw1 = (h + s1) % 24;
    }
    else if (d === 'aw1') {
      const s1 = ((h - s.so1) % 24 + 24) % 24;
      if (s1 >= 0.25 && s1 <= s.hours_needed - 0.25) {
        s.aw1 = h % 24;
        s.aw2 = (s.so2 + (s.hours_needed - s1)) % 24;
      }
    }
    else if (d === 'so2') {
      const s2 = ((s.aw2 - s.so2) % 24 + 24) % 24;
      s.so2 = h % 24; s.aw2 = (h + s2) % 24;
    }
    else if (d === 'aw2') {
      const s2 = ((h - s.so2) % 24 + 24) % 24;
      if (s2 >= 0.25 && s2 <= s.hours_needed - 0.25) {
        s.aw2 = h % 24;
        s.aw1 = (s.so1 + (s.hours_needed - s2)) % 24;
      }
    }
  }
}

// ── Static (non-interactive) replica dial ─────────────────────────────────────
class StaticDialCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._dpr   = window.devicePixelRatio || 1;
  }

  setSize(px) {
    const dpr = this._dpr;
    this.canvas.width  = px * dpr;
    this.canvas.height = px * dpr;
    this.canvas.style.width  = px + 'px';
    this.canvas.style.height = px + 'px';
    this.ctx.scale(dpr, dpr);
    this._sz = px;
  }

  draw(state) {
    const tmp = new CircadianDialCanvas(this.canvas, state, () => {});
    tmp._w = this._sz; tmp._h = this._sz;
    tmp.draw(true); // noLine = true for replica dials
  }
}
