// ── Plasma Concentration Panel (Circadian Biomarkers graph) ──────────────────

class PlasmaPanel {
  constructor(canvas, state, onStateChange, onMasterReset) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
    this.onStateChange  = onStateChange;
    this.onMasterReset  = onMasterReset || null;
    this._dragging = null;
    this._dpr = window.devicePixelRatio || 1;

    // Panel-local cortisol amplitude state
    this._corNadirV = 0.08;
    this._corPeakV  = 1.00;
    this._melOffsetAbs = 9.0;   // melatonin offset hour (independent)

    this._W = 420; this._H = 340;
    this._setup();

    canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    canvas.addEventListener('mouseleave', e => this._onMouseUp(e));
  }

  _setup() {
    const dpr = this._dpr;
    this.canvas.width  = this._W * dpr;
    this.canvas.height = this._H * dpr;
    this.canvas.style.width  = this._W + 'px';
    this.canvas.style.height = this._H + 'px';
    this.ctx.scale(dpr, dpr);
  }

  _graphRect() {
    const ml=10, mr=8, mt=32, mb=80;
    return { gx:ml, gy:mt, gw:this._W-ml-mr, gh:this._H-mt-mb };
  }

  _anchors() {
    const s = this.state;
    const dlmo = s.dlmo ?? 21, mcbt = s.mcbt ?? 4;
    const tD   = ((dlmo-12)%24+24)%24;
    const tO   = ((this._melOffsetAbs-12)%24+24)%24;
    let   tMc  = ((mcbt-12)%24+24)%24;
    const dur  = ((tO-tD)%24+24)%24;
    const eps  = 0.1;
    let past   = ((tMc-tD)%24+24)%24;
    if (dur > 2*eps) {
      past = Math.max(eps, Math.min(dur-eps, past));
      tMc  = (tD+past)%24;
    }
    return { tD, tPeak:tMc, tO, tMc };
  }

  _corAnchors() {
    const s = this.state;
    const tN = ((( s.cor_nadir_h??0)-12)%24+24)%24;
    const tP = (((s.cor_peak_h??8)-12)%24+24)%24;
    return { tN, tP };
  }

  draw() {
    const ctx = this.ctx;
    const s   = this.state;
    const {gx,gy,gw,gh} = this._graphRect();
    const W=this._W, H=this._H;

    ctx.fillStyle = `rgb(20,20,34)`;
    ctx.fillRect(0, 0, W, H);

    // Title
    const tSize = Math.max(8, Math.round(H*0.038));
    ctx.font = `bold ${tSize}px Helvetica Neue`;
    ctx.fillStyle = `rgb(210,210,235)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const ttl = 'Circadian Biomarkers';
    ctx.fillText(ttl, W/2, gy-6);

    // Graph background
    ctx.fillStyle = 'rgb(18,18,30)';
    ctx.fillRect(gx, gy, gw, gh);

    // Sleep shading
    const shadeCol = 'rgba(70,130,230,0.2)';
    const shadeBand = (tS, tE) => {
      tS = ((tS%24)+24)%24; tE = ((tE%24)+24)%24;
      ctx.fillStyle = shadeCol;
      if (tS <= tE) {
        ctx.fillRect(gx+tS/24*gw, gy, (tE-tS)/24*gw, gh);
      } else {
        ctx.fillRect(gx+tS/24*gw, gy, (1-tS/24)*gw, gh);
        ctx.fillRect(gx, gy, tE/24*gw, gh);
      }
    };
    if (s.biphasic) {
      shadeBand(((s.so1??0)-12+24)%24, (((s.aw1??4)-12+24)%24));
      shadeBand(((s.so2??7)-12+24)%24, (((s.aw2??10)-12+24)%24));
    } else {
      shadeBand(((s.sleep_onset??0)-12+24)%24, ((s.sleep_onset??0)+(s.hours_needed??7)-12+24)%24);
    }

    // Axes
    ctx.strokeStyle='rgb(70,70,100)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx,gy+gh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx,gy+gh); ctx.lineTo(gx+gw,gy+gh); ctx.stroke();

    // Y-axis label (rotated)
    const ySize = Math.max(6, Math.round(H*0.028));
    ctx.save();
    ctx.font = `${ySize}px Helvetica Neue`;
    ctx.fillStyle = 'rgb(130,130,160)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.translate(ySize, gy+gh/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('Plasma concentration', 0, 0);
    ctx.restore();

    // X-axis ticks
    const xSize = Math.max(5, Math.round(H*0.022));
    ctx.font = `${xSize}px Helvetica Neue`;
    ctx.fillStyle = 'rgb(210,210,235)';
    for (let tOff=0; tOff<=24; tOff+=2) {
      const tx = gx + tOff/24*gw;
      ctx.strokeStyle='rgb(70,70,100)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(tx,gy+gh); ctx.lineTo(tx,gy+gh+4); ctx.stroke();
      const ah = (12+tOff)%24;
      const lb = ah===0?'12am':ah===12?'12pm':ah<12?`${ah}am`:`${ah-12}pm`;
      ctx.save();
      ctx.translate(tx+1, gy+gh+6);
      ctx.rotate(Math.PI/4);
      ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(lb, 0, 0);
      ctx.restore();
    }

    const {tD,tPeak,tO,tMc} = this._anchors();
    const {tN,tP} = this._corAnchors();
    const vN=this._corNadirV, vP=this._corPeakV;

    // Curves
    const N = 300;
    const drawCurve = (fn, color) => {
      ctx.beginPath();
      for (let i=0;i<=N;i++) {
        const t  = i*24/N;
        const px = gx + t/24*gw;
        const py = gy + (1-fn(t))*gh;
        i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.stroke();
    };
    drawCurve(t => cbtValAt(t, tMc),                                `rgb(220,50,50)`);
    drawCurve(t => corValAt(t, tN, tP, vN, vP),                    `rgb(255,185,60)`);
    drawCurve(t => melValAt(t, tD, tPeak, tO),                     `rgb(70,130,230)`);

    // Update IR curve
    const ir = computeIrCurve(
      s.dlmo??21, s.mcbt??4, this._melOffsetAbs,
      s.cor_nadir_h??0, s.cor_peak_h??8,
      this._corNadirV, this._corPeakV
    );
    this.state.ir_curve = ir;

    // Inline labels at left edge
    const labSize = Math.max(6, Math.round(H*0.026));
    ctx.font = `${labSize}px Helvetica Neue`;
    const labData = [
      [cbtValAt(0, tMc),           'rgb(220,50,50)',   'Core Body Temp'],
      [corValAt(0,tN,tP,vN,vP),   'rgb(255,185,60)', 'Cortisol'],
      [melValAt(0,tD,tPeak,tO),   'rgb(70,130,230)', 'Melatonin'],
    ];
    for (const [val,color,name] of labData) {
      const cy_ = gy+(1-val)*gh;
      ctx.fillStyle='rgba(14,14,24,0.706)';
      const tw = ctx.measureText(name).width;
      ctx.fillRect(gx+3, cy_-labSize-1, tw+4, labSize+3);
      ctx.fillStyle=color; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillText(name, gx+5, cy_);
    }

    // Timeline (red vertical line)
    const tLine = ((( s.line_hour??12)-12)%24+24)%24;
    const xLine = gx + tLine/24*gw;
    ctx.strokeStyle=`rgb(255,70,70)`; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(xLine,gy); ctx.lineTo(xLine,gy+gh); ctx.stroke();

    // Draggable markers
    const mk = 5;
    const xD = gx+tD/24*gw, yD = gy+(1-melValAt(tD,tD,tPeak,tO))*gh;
    const xO = gx+tO/24*gw, yO = gy+(1-melValAt(tO,tD,tPeak,tO))*gh;
    const xM = gx+tMc/24*gw,yM = gy+(1-cbtValAt(tMc,tMc))*gh;
    const xNc= gx+tN/24*gw, yNc= gy+(1-corValAt(tN,tN,tP,vN,vP))*gh;
    const xPc= gx+tP/24*gw, yPc= gy+(1-corValAt(tP,tN,tP,vN,vP))*gh;

    ctx.fillStyle='rgb(70,130,230)';
    [[xO,yO],[xD,yD],[xM,yM]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,mk,0,PI2);ctx.fill();});
    ctx.fillStyle='rgb(255,185,60)';
    [[xNc,yNc],[xPc,yPc]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,mk,0,PI2);ctx.fill();});

    // Labels
    ctx.fillStyle='rgb(70,130,230)';
    ctx.font=`bold ${Math.max(7,Math.round(H*0.028))}px Helvetica Neue`;
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    const dlmoLW = ctx.measureText('DLMO').width;
    let dlmoLX = xD+mk+3;
    if (dlmoLX+dlmoLW > gx+gw) dlmoLX = xD-mk-3-dlmoLW;
    ctx.fillText('DLMO', dlmoLX, yD-mk-2+labSize);

    ctx.font=`bold ${Math.max(6,Math.round(H*0.024))}px Helvetica Neue`;
    const lines=['Min Core','Body Temp'];
    const lhSm = Math.max(6,Math.round(H*0.024))+2;
    lines.forEach((ln,i)=>{
      const lw2 = ctx.measureText(ln).width;
      let lx2 = xM-lw2/2;
      let ly2 = yM + mk + 4 + (i+1)*lhSm;   // below the marker
      lx2 = Math.max(gx+2, Math.min(gx+gw-lw2-2, lx2));
      ctx.fillText(ln, lx2, ly2);
    });

    // ── Reset buttons ─────────────────────────────────────────────────────
    const btn1W=128, btn2W=108, btnH=26, btnGap=8;
    const totalBtnW = btn1W + btn2W + btnGap;
    const btn1X = gx + (gw - totalBtnW) / 2;
    const btn2X = btn1X + btn1W + btnGap;
    const btnY  = gy + gh + 48;

    // Reset Biomarkers
    ctx.fillStyle='rgb(35,35,55)';
    ctx.strokeStyle='rgb(70,70,110)'; ctx.lineWidth=1;
    this._roundRect(ctx, btn1X, btnY, btn1W, btnH, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgb(210,210,235)';
    ctx.font=`bold 11px Helvetica Neue`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Reset Biomarkers', btn1X+btn1W/2, btnY+btnH/2);
    this._resetBtnRect = {x:btn1X, y:btnY, w:btn1W, h:btnH};

    // Master Reset (red-tinted)
    ctx.fillStyle='rgb(60,22,22)';
    ctx.strokeStyle='rgb(160,55,55)'; ctx.lineWidth=1;
    this._roundRect(ctx, btn2X, btnY, btn2W, btnH, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgb(255,185,185)';
    ctx.fillText('Master Reset', btn2X+btn2W/2, btnY+btnH/2);
    this._masterResetBtnRect = {x:btn2X, y:btnY, w:btn2W, h:btnH};
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  _hitRadius() { return 8; }

  _markerHit(mx, my) {
    const {gx,gy,gw,gh} = this._graphRect();
    const {tD,tPeak,tO,tMc} = this._anchors();
    const {tN,tP} = this._corAnchors();
    const vN=this._corNadirV, vP=this._corPeakV;
    const R2 = this._hitRadius()**2;
    const pts = {
      dlmo:     [gx+tD/24*gw,  gy+(1-melValAt(tD,tD,tPeak,tO))*gh],
      offset:   [gx+tO/24*gw,  gy+(1-melValAt(tO,tD,tPeak,tO))*gh],
      mcbt:     [gx+tMc/24*gw, gy+(1-cbtValAt(tMc,tMc))*gh],
      cor_nadir:[gx+tN/24*gw,  gy+(1-corValAt(tN,tN,tP,vN,vP))*gh],
      cor_peak: [gx+tP/24*gw,  gy+(1-corValAt(tP,tN,tP,vN,vP))*gh],
    };
    for (const [name,[px,py]] of Object.entries(pts)) {
      if ((mx-px)**2+(my-py)**2<=R2) return name;
    }
    // Reset buttons
    const b=this._resetBtnRect;
    if (b&&mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h) return 'reset';
    const b2=this._masterResetBtnRect;
    if (b2&&mx>=b2.x&&mx<=b2.x+b2.w&&my>=b2.y&&my<=b2.y+b2.h) return 'master_reset';
    // Red line
    const tLine = ((( this.state.line_hour??12)-12)%24+24)%24;
    const xLine = gx+tLine/24*gw;
    if (Math.abs(mx-xLine)<=6&&my>=gy&&my<=gy+gh) return 'line';
    return null;
  }

  _clientXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this._W / rect.width;
    const scaleY = this._H / rect.height;
    return { x:(e.clientX-rect.left)*scaleX, y:(e.clientY-rect.top)*scaleY };
  }

  _onMouseDown(e) {
    const {x,y} = this._clientXY(e);
    this._dragging = this._markerHit(x,y);
    if (this._dragging==='reset') { this._resetMarkers(); this._dragging=null; }
    else if (this._dragging==='master_reset') {
      this._resetMarkers();
      if (this.onMasterReset) this.onMasterReset();
      this._dragging=null;
    }
  }

  _onMouseMove(e) {
    const {x,y} = this._clientXY(e);
    if (this._dragging) {
      this._applyDrag(x, y);
      this.draw();
      this.onStateChange();
    } else {
      this.canvas.style.cursor = this._markerHit(x,y) ? 'grab' : 'default';
    }
  }

  _onMouseUp(e) { this._dragging = null; }

  _applyDrag(mx, my) {
    const {gx,gy,gw,gh} = this._graphRect();
    const s = this.state;
    const t = Math.max(0, Math.min(24, (mx-gx)/gw*24));  // graph-t
    const h = (t+12)%24;   // absolute hour
    const d = this._dragging;
    if (d==='dlmo')      { s.dlmo = h; }
    else if (d==='mcbt') { s.mcbt = h; }
    else if (d==='offset') { this._melOffsetAbs = h; }
    else if (d==='cor_nadir') { s.cor_nadir_h = h; }
    else if (d==='cor_peak')  { s.cor_peak_h  = h; }
    else if (d==='line') {
      const tLine = Math.max(0, Math.min(24, (mx-gx)/gw*24));
      s.line_hour = (tLine+12)%24;
    }
    // Vertical drag for cortisol amplitude
    if (d==='cor_nadir') {
      const v = Math.max(0, Math.min(1, 1-(my-gy)/gh));
      this._corNadirV = Math.min(v, this._corPeakV-0.05);
    }
    if (d==='cor_peak') {
      const v = Math.max(0, Math.min(1, 1-(my-gy)/gh));
      this._corPeakV = Math.max(v, this._corNadirV+0.05);
    }
  }

  _resetMarkers() {
    const s = this.state;
    s.dlmo=21; s.mcbt=4; s.cor_nadir_h=0; s.cor_peak_h=8; s.line_hour=12;
    this._melOffsetAbs=9; this._corNadirV=0.08; this._corPeakV=1.0;
    this.draw(); this.onStateChange();
  }
}
