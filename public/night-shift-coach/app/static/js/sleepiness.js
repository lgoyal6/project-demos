// ── Sleepiness + Insulin Resistance Panel ─────────────────────────────────────
// Mirrors the original iOS app SleepinessPanel paintEvent exactly.

class SleepinessPanel {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
    this._dpr   = window.devicePixelRatio || 1;
  }

  resize(w, h) {
    const dpr = this._dpr;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this._w = w;
    this._h = h;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const s   = this.state;
    const w   = this._w || this.canvas.clientWidth;
    const h   = this._h || this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgb(20,20,34)';
    ctx.fillRect(0, 0, w, h);

    // ── Compute sleepiness values at line_hour ────────────────────────────
    const lh = s.line_hour ?? 12;
    const hn = s.hours_needed ?? 7;
    const dl = s.dlmo ?? 21, mc = s.mcbt ?? 4;
    const so = s.sleep_onset ?? 0;

    let sp;
    if (s.biphasic) {
      sp = sleepPressureBiphasic(lh, s.so1??0, s.aw1??4, s.so2??7, s.aw2??10, hn);
    } else if (s.show_nap) {
      const nm = s.nap_duration ?? 30;
      const napRed = nm <= 40 ? 0.05 : nm <= 60 ? 0.10 : 0.20;
      sp = sleepPressureWithNap(lh, so, hn, s.nap_hour??13, napRed);
    } else {
      sp = sleepPressure(lh, so, hn);
    }

    let circ = circadianPressure(lh, dl, mc, hn);
    if (s.show_dip) circ = Math.min(1, circ + afternoonDipBoost(lh, s.afternoon_dip??14));

    const combo = Math.min(1.0, (2.0*circ + sp) / 3.0);

    // ── Compute IR values ─────────────────────────────────────────────────
    const irCurve = s.ir_curve || [];
    const irIdx   = Math.floor(((lh%24+24)%24) / 24 * 180) % 180;
    const lineIR  = irCurve[irIdx] ?? 0;

    let alignment = 0;
    if (s.eating_mode !== 'adlib' && irCurve.length > 0) {
      const dur      = s.eating_mode === 'tr8' ? 8.0 : 10.0;
      const nSegs    = Math.max(1, Math.round(dur / 24 * 180));
      const startSeg = Math.floor(((s.eating_start??8) / 24) * 180) % 180;
      let irInWin = 0;
      for (let j = 0; j < nSegs; j++) irInWin += irCurve[(startSeg+j)%180];
      const totalIR = irCurve.reduce((a,b)=>a+b, 0);
      alignment = totalIR > 0 ? Math.max(0, Math.min(1, 1 - irInWin/totalIR)) : 1.0;
    }

    // ── Layout constants ──────────────────────────────────────────────────
    const barW  = 38, gap = 18;
    const barsTotalW = 3*barW + 2*gap;   // 150
    const ylabelW    = 30;
    const totalBlock = ylabelW + barsTotalW;
    const leftOff    = (w - totalBlock) / 2;
    const ylabelX    = leftOff;
    const barsX      = leftOff + ylabelW;

    // Font sizes
    const titleSize = 16, subSize = 9, axisSize = 9, lblSize = 9;

    // ── Section 1: Sleepiness title ───────────────────────────────────────
    ctx.font = `bold ${titleSize}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgb(210,210,235)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Sleepiness', w/2, 42);

    ctx.font = `${subSize}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgb(90,90,130)';
    ctx.fillText('drag red line to measure', w/2, 60);

    // ── Graph 1: Sleepiness bars ──────────────────────────────────────────
    const graphH   = Math.max(1, Math.round(h * 0.30));
    const graphTop = 80;
    const graphBot = graphTop + graphH;

    // Y-axis labels
    ctx.font = `${axisSize}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgb(110,110,155)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Max', ylabelX, graphTop + axisSize + 2);
    ctx.fillText('Min', ylabelX, graphBot);

    // Bottom axis line
    ctx.strokeStyle = 'rgb(60,60,100)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barsX - 2, graphBot);
    ctx.lineTo(barsX + barsTotalW + 2, graphBot);
    ctx.stroke();

    // Bars
    const barsData = [
      { val: circ,  color: [70,130,230],  lines: ['Circadian']           },
      { val: sp,    color: [220,50,50],   lines: ['Sleep', 'Pressure']   },
      { val: combo, color: [145,90,140],  lines: ['Combination']         },
    ];

    ctx.font = `${lblSize}px "Helvetica Neue"`;
    ctx.textBaseline = 'alphabetic';
    const lh_px = lblSize + 3;

    barsData.forEach(({val, color, lines}, i) => {
      const bx     = barsX + i*(barW+gap);
      const fillH  = Math.round(val * graphH);

      // Background
      ctx.fillStyle = 'rgb(32,32,50)';
      ctx.fillRect(bx, graphTop, barW, graphH);

      // Fill (grows from bottom)
      if (fillH > 0) {
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.843)`;
        ctx.fillRect(bx, graphBot - fillH, barW, fillH);
      }

      // Labels below axis
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.textAlign = 'center';
      lines.forEach((line, j) => {
        ctx.fillText(line, bx + barW/2, graphBot + 6 + (j+1)*lh_px);
      });
    });

    // ── Divider ───────────────────────────────────────────────────────────
    const irSectionTop = graphBot + lh_px * 2 + 26;
    ctx.strokeStyle = 'rgb(50,50,80)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, irSectionTop);
    ctx.lineTo(w - 12, irSectionTop);
    ctx.stroke();

    // ── Section 2: Insulin Resistance title ───────────────────────────────
    const irTitleY   = irSectionTop + 24;
    const irGraphTop = irTitleY + 24;
    const irGraphH   = Math.max(1, Math.round(h * 0.21));
    const irGraphBot = irGraphTop + irGraphH;

    ctx.font = `bold ${titleSize}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgb(210,210,235)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Insulin Resistance', w/2, irTitleY);

    // IR bar layout ,  2 bars centred
    const irBarW  = 38, irGap = 30;
    const irBarsW = 2*irBarW + irGap;
    const irLeft  = (w - ylabelW - irBarsW) / 2;
    const irYlblX = irLeft;
    const irBarsX = irLeft + ylabelW;

    // Y-axis labels
    ctx.font = `${axisSize}px "Helvetica Neue"`;
    ctx.fillStyle = 'rgb(110,110,155)';
    ctx.textAlign = 'left';
    ctx.fillText('Max', irYlblX, irGraphTop + axisSize + 2);
    ctx.fillText('Min', irYlblX, irGraphBot);

    // Bottom axis line
    ctx.strokeStyle = 'rgb(60,60,100)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(irBarsX - 2, irGraphBot);
    ctx.lineTo(irBarsX + irBarsW + 2, irGraphBot);
    ctx.stroke();

    // IR Bars
    const irBarsData = [
      { val: lineIR,   color: [40,180,70],  lines: ['Insulin', 'Resistance'] },
      { val: alignment, color: [20,110,45], lines: ['Alignment']             },
    ];

    ctx.font = `${lblSize}px "Helvetica Neue"`;
    ctx.textBaseline = 'alphabetic';

    irBarsData.forEach(({val, color, lines}, i) => {
      const bx    = irBarsX + i*(irBarW+irGap);
      const fillH = Math.round(val * irGraphH);

      // Background
      ctx.fillStyle = 'rgb(32,32,50)';
      ctx.fillRect(bx, irGraphTop, irBarW, irGraphH);

      // Fill (grows from bottom)
      if (fillH > 0) {
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.843)`;
        ctx.fillRect(bx, irGraphBot - fillH, irBarW, fillH);
      }

      // Labels below axis
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.textAlign = 'center';
      lines.forEach((line, j) => {
        ctx.fillText(line, bx + irBarW/2, irGraphBot + 6 + (j+1)*lh_px);
      });
    });

    // ── Alignment note (centered, "Alignment" in green) ──────────────────
    const noteTop = irGraphBot + lh_px * 2 + 20;
    const noteFont = `13px "Helvetica Neue"`;
    const noteLineH = 18;
    const noteMaxW  = w - 20;
    ctx.font = noteFont;
    ctx.textBaseline = 'top';

    // Build wrapped lines from the note text
    const noteWords = ('Alignment refers to how well your eating schedule aligns with ' +
                       'the times your body has the lowest insulin resistance').split(' ');
    const noteLines = [];
    let noteCur = '';
    for (const word of noteWords) {
      const test = noteCur ? noteCur + ' ' + word : word;
      if (ctx.measureText(test).width > noteMaxW && noteCur) {
        noteLines.push(noteCur);
        noteCur = word;
      } else { noteCur = test; }
    }
    if (noteCur) noteLines.push(noteCur);

    // Render each line centered; first word of first line ("Alignment") in green
    for (let li = 0; li < noteLines.length; li++) {
      const lineStr = noteLines[li];
      const lineW   = ctx.measureText(lineStr).width;
      const lineX   = w / 2 - lineW / 2;
      const lineY   = noteTop + li * noteLineH;
      if (li === 0 && lineStr.startsWith('Alignment')) {
        // "Alignment" in green
        ctx.fillStyle = 'rgb(20,110,45)';
        ctx.textAlign = 'left';
        ctx.fillText('Alignment', lineX, lineY);
        const rest = lineStr.slice('Alignment'.length);
        if (rest) {
          ctx.fillStyle = 'rgb(210,210,235)';
          ctx.fillText(rest, lineX + ctx.measureText('Alignment').width, lineY);
        }
      } else {
        ctx.fillStyle = 'rgb(210,210,235)';
        ctx.textAlign = 'left';
        ctx.fillText(lineStr, lineX, lineY);
      }
    }
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '', curY = y;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, curY);
        line = word;
        curY += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, curY);
  }
}
