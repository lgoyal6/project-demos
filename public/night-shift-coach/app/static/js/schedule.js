// ── Night Shift Schedule ──────────────────────────────────────────────────────

class NightShiftSchedule {
  constructor(state) {
    this.state     = state;
    this._selected = new Set();
    this._phaseShift = false;
    this._numDays  = 30;

    this._calGrid  = document.getElementById('calendar-grid');
    this._info     = document.getElementById('sched-info');
    this._row1     = document.getElementById('sched-row1');
    this._sep      = document.getElementById('sched-sep');
    this._row2     = document.getElementById('sched-row2');
    this._phaseBtn = document.getElementById('phase-shift-btn');
    this._maintBtn = document.getElementById('maintain-btn');
    this._resetBtn = document.getElementById('sched-reset');
    this._pdfBtn   = document.getElementById('pdf-btn');
    this._overlay  = document.getElementById('day-detail-overlay');
    this._ddeDate  = document.getElementById('dde-date');
    this._ddeTable = document.getElementById('dde-table');
    this._ddeBanner= document.getElementById('dde-banner');
    this._ddeClose = document.getElementById('dde-close');
    this._ddeDialCanvas = document.getElementById('dde-dial-canvas');

    this._staticDial = new StaticDialCanvas(this._ddeDialCanvas);
    this._staticDial.setSize(280);

    this._buildCalendar();
    this._wireButtons();
  }

  _buildCalendar() {
    this._calGrid.innerHTML = '';
    const today = new Date();
    for (let i=0; i<this._numDays; i++) {
      const d = new Date(today); d.setDate(today.getDate()+i);
      const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const col = document.createElement('div');
      col.className = 'cal-day';
      col.innerHTML = `
        <div class="cal-day-label">${dayNames[d.getDay()]}</div>
        <div class="cal-day-num">${d.getDate()}</div>
        <div class="cal-month">${monthNames[d.getMonth()]}</div>
        <div class="cal-icon" data-idx="${i}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="cal-open-btn" data-idx="${i}" title="View day details">
          <span style="font-size:13px">Details</span>
        </div>
      `;
      col.querySelector('.cal-icon').addEventListener('click', () => this._toggleDay(i));
      col.querySelector('.cal-open-btn').addEventListener('click', () => this._showDayPanel(i));
      this._calGrid.appendChild(col);
    }
  }

  _wireButtons() {
    this._resetBtn.addEventListener('click', () => {
      this._selected.clear();
      // Hide all open-detail buttons
      this._calGrid.querySelectorAll('.cal-open-btn').forEach(b => b.style.visibility='hidden');
      this._phaseShift = false;
      this._phaseBtn.classList.remove('active');
      this._maintBtn.classList.add('active');
      this._phaseBtn.style.background='rgb(28,28,45)';
      this._phaseBtn.style.color='rgb(145,145,175)';
      this._phaseBtn.style.borderColor='rgb(52,52,80)';
      this._maintBtn.style.background='rgb(28,105,48)';
      this._maintBtn.style.color='rgb(210,255,218)';
      this._maintBtn.style.borderColor='rgb(50,175,80)';
      this._updateCalendarColors();
      this._updateInfoRows();
    });

    this._phaseBtn.addEventListener('click', () => {
      this._phaseShift = true;
      this._phaseBtn.classList.add('active');
      this._maintBtn.classList.remove('active');
      this._phaseBtn.style.background='rgb(140,40,40)';
      this._phaseBtn.style.color='rgb(255,215,215)';
      this._phaseBtn.style.borderColor='rgb(200,60,60)';
      this._maintBtn.style.background='rgb(28,28,45)';
      this._maintBtn.style.color='rgb(145,145,175)';
      this._maintBtn.style.borderColor='rgb(52,52,80)';
      this._updateCalendarColors();
    });

    this._maintBtn.addEventListener('click', () => {
      this._phaseShift = false;
      this._maintBtn.classList.add('active');
      this._phaseBtn.classList.remove('active');
      this._maintBtn.style.background='rgb(28,105,48)';
      this._maintBtn.style.color='rgb(210,255,218)';
      this._maintBtn.style.borderColor='rgb(50,175,80)';
      this._phaseBtn.style.background='rgb(28,28,45)';
      this._phaseBtn.style.color='rgb(145,145,175)';
      this._phaseBtn.style.borderColor='rgb(52,52,80)';
      this._updateCalendarColors();
    });

    this._ddeClose.addEventListener('click', () => this._hidePanel());
    this._overlay.addEventListener('click', e => { if (e.target===this._overlay) this._hidePanel(); });
    this._pdfBtn.addEventListener('click', () => this._exportPDF());
  }

  _toggleDay(idx) {
    if (this._selected.has(idx)) this._selected.delete(idx);
    else this._selected.add(idx);
    this._updateCalendarColors();
    this._updateInfoRows();
  }

  _getRuns() {
    if (!this._selected.size) return [];
    const days = [...this._selected].sort((a,b)=>a-b);
    const runs = [];
    let s=days[0], e=days[0];
    for (let i=1;i<days.length;i++) {
      if (days[i]===e+1) { e=days[i]; }
      else { runs.push([s,e,e-s+1]); s=e=days[i]; }
    }
    runs.push([s,e,e-s+1]);
    return runs;
  }

  _updateCalendarColors() {
    const runs = this._getRuns();
    // Build a map: dayIdx → 'green'|'red'|null
    const colMap = {};
    for (const [start,end,length] of runs) {
      for (let i=start;i<=end;i++) {
        if (length>=7 && this._phaseShift) colMap[i]='red';
        else colMap[i]='green';
      }
    }
    for (let i=0;i<this._numDays;i++) {
      const day     = this._calGrid.children[i];
      const icon    = day?.querySelector('.cal-icon');
      const openBtn = day?.querySelector('.cal-open-btn');
      if (!icon) continue;
      icon.classList.remove('selected-green','selected-red');
      if (colMap[i]==='green') icon.classList.add('selected-green');
      else if (colMap[i]==='red') icon.classList.add('selected-red');
      // Show the detail-open button only when this day is selected
      if (openBtn) openBtn.style.visibility = this._selected.has(i) ? 'visible' : 'hidden';
    }
  }

  _updateInfoRows() {
    const runs = this._getRuns();
    const hasShort = runs.some(([,,l])=>l<7);
    const hasLong  = runs.some(([,,l])=>l>=7);
    const visible  = hasShort||hasLong;

    this._info.classList.toggle('sched-hidden', !visible);
    this._row1.classList.toggle('sched-hidden', !hasShort);
    this._sep.classList.toggle('sched-hidden',  !(hasShort&&hasLong));
    this._row2.classList.toggle('sched-hidden',  !hasLong);
  }

  async _showDayPanel(dayIdx) {
    const runs = this._getRuns();
    let phaseDay = 0;
    if (this._phaseShift) {
      for (const [start,end,length] of runs) {
        if (length>=7 && dayIdx>=start && dayIdx<=end) {
          phaseDay = dayIdx - start + 1;
          break;
        }
      }
    }

    // Compute shifted state
    let panelState = Object.assign({}, this.state);
    if (phaseDay >= 1) {
      const resp = await fetch('/api/run/?project=night-shift-coach&operation=phase_shift', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({state: this.state, phase_day: phaseDay})
      });
      const data = await resp.json();
      panelState = Object.assign({}, this.state, {
        dlmo: data.dlmo, mcbt: data.mcbt, ir_curve: data.ir_curve
      });
      this._buildDayPanel(dayIdx, phaseDay, panelState, data.rows);
    } else {
      const resp = await fetch('/api/run/?project=night-shift-coach&operation=recommendations', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({state: panelState, phase_day: 0})
      });
      const data = await resp.json();
      this._buildDayPanel(dayIdx, 0, panelState, data.rows);
    }
  }

  _buildDayPanel(dayIdx, phaseDay, panelState, rows) {
    // Date string
    const today = new Date();
    const d = new Date(today); d.setDate(today.getDate()+dayIdx);
    this._ddeDate.textContent = dateStr(d);

    // Dial replica
    const dialState = Object.assign({}, panelState);
    dialState.melatonin_marker_h  = null;
    dialState.blue_light_marker_h = null;

    if (phaseDay >= 1) {
      const dlmo      = panelState.dlmo;
      const sleepRef  = panelState.biphasic ? panelState.so1 : panelState.sleep_onset;
      const distSl    = ((sleepRef-dlmo)%24+24)%24;
      const melH      = distSl < 8.0 ? sleepRef : (dlmo+8)%24;
      const bluH      = (dlmo+3)%24;
      const distBl    = ((sleepRef-bluH)%24+24)%24;
      const sr = (panelState.sunrise??6)%24, ss = (panelState.sunset??20)%24;
      const blIsDay   = ((bluH-sr)%24+24)%24 < ((ss-sr)%24+24)%24;
      dialState.melatonin_marker_h  = melH;
      dialState.blue_light_marker_h = (distBl>=3.0&&!blIsDay) ? bluH : null;
    }

    this._staticDial.draw(dialState);

    // Table
    this._ddeTable.innerHTML = '';
    for (const [label,value] of rows) {
      const row = document.createElement('div');
      row.className = 'dde-row';
      row.innerHTML = `
        <div class="dde-cell1">${label}</div>
        <div class="dde-vsep"></div>
        <div class="dde-cell2">${value.replace(/\n/g,'<br>')}</div>
      `;
      this._ddeTable.appendChild(row);
    }

    // Banner
    if (phaseDay >= 1) {
      this._ddeBanner.textContent = `Phase shift to nights: Day ${phaseDay}`;
      this._ddeBanner.style.background = 'rgb(185,55,55)';
    } else {
      this._ddeBanner.textContent = 'Maintain Day Rhythm';
      this._ddeBanner.style.background = 'rgb(42,155,72)';
    }

    this._overlay.classList.remove('overlay-hidden');
  }

  _hidePanel() {
    this._overlay.classList.add('overlay-hidden');
  }

  async _exportPDF() {
    const runs = this._getRuns();
    if (!runs.length) { alert('No days selected.'); return; }

    const allDays = [];
    for (const [start,end,length] of runs.sort((a,b)=>a[0]-b[0])) {
      for (let i=start;i<=end;i++) {
        const phaseDay = (this._phaseShift&&length>=7) ? i-start+1 : 0;
        allDays.push({dayIdx:i, phaseDay});
      }
    }

    // Build a hidden off-screen canvas page-by-page
    const panels = [];
    for (const {dayIdx,phaseDay} of allDays) {
      let ps = Object.assign({}, this.state);
      if (phaseDay>=1) {
        const resp = await fetch('/api/run/?project=night-shift-coach&operation=phase_shift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:this.state,phase_day:phaseDay})});
        const data = await resp.json();
        ps = Object.assign({},this.state,{dlmo:data.dlmo,mcbt:data.mcbt,ir_curve:data.ir_curve});
        panels.push({dayIdx,phaseDay,state:ps,rows:data.rows});
      } else {
        const resp = await fetch('/api/run/?project=night-shift-coach&operation=recommendations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:ps,phase_day:0})});
        const data = await resp.json();
        panels.push({dayIdx,phaseDay:0,state:ps,rows:data.rows});
      }
    }

    // Render to a print window
    const win = window.open('','_blank');
    win.document.write(`<html><head><title>Night Shift Report</title>
    <style>
    body{margin:0;background:white;font-family:"Helvetica Neue",sans-serif;}
    .page{width:7.5in;margin:0.5in auto;display:grid;grid-template-columns:1fr 1fr;gap:24px;page-break-after:always;}
    .panel{border:1px solid rgb(210,210,235);border-radius:10px;padding:14px;background:white;}
    .panel-date{text-align:center;font:bold 14px "Helvetica Neue";color:black;margin-bottom:8px;}
    .panel-table{border:1px solid rgb(210,210,235);border-radius:6px;overflow:hidden;margin-bottom:10px;}
    .trow{display:flex;border-bottom:1px solid rgb(210,210,235);}
    .trow:last-child{border-bottom:none;}
    .tc1{width:120px;font:11px sans-serif;color:black;padding:8px;flex-shrink:0;}
    .tvs{width:1px;background:rgb(210,210,235);}
    .tc2{flex:1;font:bold 11px sans-serif;color:black;padding:8px;text-align:center;white-space:pre-line;}
    .banner{border-radius:6px;text-align:center;font:bold 12px sans-serif;color:black;padding:7px 0;margin-top:8px;}
    @media print{.page{page-break-after:always;}}
    </style></head><body>`);

    for (let p=0; p<panels.length; p+=6) {
      const chunk = panels.slice(p,p+6);
      win.document.write('<div class="page">');
      for (const {dayIdx,phaseDay,rows} of chunk) {
        const today = new Date();
        const d = new Date(today); d.setDate(today.getDate()+dayIdx);
        const bannerBg = phaseDay>=1 ? 'rgb(185,55,55)' : 'rgb(42,155,72)';
        const bannerTx = phaseDay>=1 ? `Phase shift to nights: Day ${phaseDay}` : 'Maintain Day Rhythm';
        let tableHtml = '<div class="panel-table">';
        for (const [label,value] of rows) {
          tableHtml += `<div class="trow"><div class="tc1">${label}</div><div class="tvs"></div><div class="tc2">${value.replace(/\n/g,'<br>')}</div></div>`;
        }
        tableHtml += '</div>';
        win.document.write(`
          <div class="panel">
            <div class="panel-date">${dateStr(d)}</div>
            ${tableHtml}
            <div class="banner" style="background:${bannerBg}">${bannerTx}</div>
          </div>
        `);
      }
      win.document.write('</div>');
    }
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(()=>win.print(), 600);
  }
}
