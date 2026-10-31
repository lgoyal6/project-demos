// ── Q&A Panel controller ─────────────────────────────────────────────────────

class QAPanel {
  constructor(state, onChange) {
    this.state    = state;
    this.onChange = onChange;
    this._wire();
    this._fetchSunTimes();
  }

  _wire() {
    const s = this.state;

    // ── Sunrise/Sunset mode ──────────────────────────────────────────────
    // Auto: fetches times from server and shows in coloured boxes.
    // Manual: user drags markers on the dial; boxes update via refresh() on state change.
    this._sunGroup(['sun-auto','sun-manual'], id => {
      if (id === 'sun-auto') this._fetchSunTimes();
    });

    // ── Sleep hours slider ───────────────────────────────────────────────
    const sleepSlider = document.getElementById('sleep-slider');
    const sleepVal    = document.getElementById('sleep-val');
    sleepSlider.addEventListener('input', () => {
      const h = sleepSlider.value * 0.5;
      sleepVal.textContent = `${h.toFixed(1)} hrs`;
      s.hours_needed = h;
      if (s.biphasic) {
        const s1 = ((s.aw1-s.so1)%24+24)%24;
        const s2 = Math.max(0.25, h-s1);
        s.aw2 = (s.so2+s2)%24;
      }
      this.onChange();
    });

    // ── Sleep pattern ────────────────────────────────────────────────────
    this._exclusiveGroup(
      [['pat-mono','mono'],['pat-nap','nap'],['pat-bi','biphasic']],
      id => {
        s.biphasic  = (id==='biphasic');
        s.show_nap  = (id==='nap');
        document.getElementById('nap-section').classList.toggle('qa-hidden', id!=='nap');
        if (id==='nap') s.nap_duration = parseInt(document.getElementById('nap-slider').value);
        this.onChange();
      }
    );

    // Nap slider
    const napSlider = document.getElementById('nap-slider');
    const napVal    = document.getElementById('nap-val');
    napSlider.addEventListener('input', () => {
      napVal.textContent = `${napSlider.value} mins`;
      s.nap_duration = parseInt(napSlider.value);
      this.onChange();
    });

    // ── Eating pattern ───────────────────────────────────────────────────
    this._exclusiveGroup(
      [['eat-adlib','adlib'],['eat-tr10','tr10'],['eat-tr8','tr8']],
      id => {
        s.eating_mode = id;
        this._updateBiomarker();
        this.onChange();
      }
    );

    // ── Afternoon dip ────────────────────────────────────────────────────
    this._exclusiveGroup(
      [['dip-no',false],['dip-yes',true]],
      id => { s.show_dip = (id===true||id==='true'); this._updateBiomarker(); this.onChange(); }
    );

    // ── Night shift ──────────────────────────────────────────────────────
    this._exclusiveGroup(
      [['ns-no',false],['ns-yes',true]],
      id => {
        s.show_night_shift = (id===true||id==='true');
        document.getElementById('ns-section').classList.toggle('qa-hidden', !s.show_night_shift);
        if (s.show_night_shift) { s.sleep_onset = 8.0; }
        this._updateBiomarker();
        this.onChange();
      }
    );

    // NS hours slider
    const nsSlider = document.getElementById('ns-slider');
    const nsVal    = document.getElementById('ns-val');
    nsSlider.addEventListener('input', () => {
      const h = nsSlider.value * 0.5;
      nsVal.textContent = `${h.toFixed(1)} hrs`;
      s.night_shift_hours = h;
      this.onChange();
    });
  }

  _exclusiveGroup(pairs, cb) {
    for (const [id, val] of pairs) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.addEventListener('click', () => {
        pairs.forEach(([i]) => document.getElementById(i)?.classList.remove('active'));
        btn.classList.add('active');
        cb(val);
      });
    }
  }

  _sunGroup(ids, cb) {
    ids.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        ids.forEach(i => document.getElementById(i)?.classList.remove('active'));
        btn.classList.add('active');
        cb(id);
      });
    });
  }

  // Update the coloured sunrise/sunset boxes with formatted times
  _setSunBoxes(sr, ss) {
    const srBox = document.getElementById('qa-sunrise-box');
    const ssBox = document.getElementById('qa-sunset-box');
    if (srBox) srBox.textContent = fmtHour(sr);
    if (ssBox) ssBox.textContent = fmtHour(ss);
  }

  _timeToHour(str) {
    const [h,m] = str.split(':').map(Number);
    return h + m/60;
  }

  _hourToTimeStr(h) {
    const totalMins = Math.round(((h % 24) + 24) % 24 * 60);
    const hrs  = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
  }

  async _fetchSunTimes() {
    const lbl = document.getElementById('sun-location');
    try {
      const response = await fetch('/api/run/?project=night-shift-coach&operation=sun_times');
      if (!response.ok) throw new Error('Example sun times unavailable.');
      const data = await response.json();
      this.state.sunrise = data.sunrise; this.state.sunset = data.sunset;
      lbl.textContent = data.location;
      this._setSunBoxes(data.sunrise, data.sunset);
      this._updateBiomarker(); this.onChange();
    } catch {
      lbl.textContent = 'Example calculation unavailable. Use manual times.';
    }
  }

  _updateBiomarker() {
    const s = this.state;
    const bi = s.biphasic;

    const set = (id, h) => {
      const box = document.querySelector(`#${id} .bm-box`);
      if (box) box.textContent = fmtHour(h);
    };
    const show = (id, vis) => {
      document.getElementById(id)?.classList.toggle('bm-hidden', !vis);
    };

    // Col 1: Bedtime (or Bedtime1/2 if biphasic), Nap, Eat start/end
    set('bm-bedtime',  s.sleep_onset??0);
    set('bm-bedtime1', s.so1??0);
    set('bm-bedtime2', s.so2??7);
    set('bm-nap',      s.nap_hour??13);

    const eatMode = s.eating_mode ?? 'adlib';
    const showEat = eatMode !== 'adlib';
    if (showEat) {
      const eatDur = eatMode === 'tr10' ? 10 : 8;
      const eatStart = s.eating_start ?? 8;
      set('bm-eat-start', eatStart);
      set('bm-eat-end',   (eatStart + eatDur) % 24);
    }

    // Col 2: DLMO, mCBT, Dip
    set('bm-dlmo', s.dlmo??21);
    set('bm-mcbt', s.mcbt??4);
    set('bm-dip',  s.afternoon_dip??14);

    show('bm-bedtime',   !bi);
    show('bm-bedtime1',  bi);
    show('bm-bedtime2',  bi);
    show('bm-nap',       s.show_nap??false);
    show('bm-eat-start', showEat);
    show('bm-eat-end',   showEat);
    show('bm-dip',       s.show_dip??false);
  }

  refresh() {
    this._updateBiomarker();
    this._setSunBoxes(this.state.sunrise ?? 6, this.state.sunset ?? 20);
  }

  resetToDefaults() {
    // Reset Q&A UI and state to defaults
    const s = this.state;
    s.hours_needed = 7.0; s.sleep_onset = 0.0; s.biphasic=false; s.show_nap=false;
    s.eating_mode='adlib'; s.show_dip=false; s.show_night_shift=false;
    document.getElementById('sleep-slider').value = 14;
    document.getElementById('sleep-val').textContent = '7.0 hrs';
    ['pat-mono'].forEach(id=>document.getElementById(id)?.classList.add('active'));
    ['pat-nap','pat-bi'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
    document.getElementById('nap-section').classList.add('qa-hidden');
    ['eat-adlib'].forEach(id=>document.getElementById(id)?.classList.add('active'));
    ['eat-tr10','eat-tr8'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
    ['dip-no'].forEach(id=>document.getElementById(id)?.classList.add('active'));
    ['dip-yes'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
    ['ns-no'].forEach(id=>document.getElementById(id)?.classList.add('active'));
    ['ns-yes'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
    document.getElementById('ns-section').classList.add('qa-hidden');
    // Reset sunrise/sunset to Automatic and re-fetch
    document.getElementById('sun-auto')?.classList.add('active');
    document.getElementById('sun-manual')?.classList.remove('active');
    this._fetchSunTimes();
    this._updateBiomarker();
  }
}
