// ── Night Shift Coach ,  Main App Coordinator ─────────────────────────────────

// ── Shared app state (mirrors CircadianDial attributes) ──────────────────────
const appState = {
  // Outer ring
  sunrise: 6.0, sunset: 20.0,
  // Sleep pressure
  sleep_onset:  0.0, hours_needed: 7.0,
  // Biphasic
  biphasic: false, so1: 0.0, aw1: 4.0, so2: 7.0, aw2: 10.0,
  // Circadian rhythm
  dlmo: 21.0, mcbt: 4.0,
  afternoon_dip: 14.0, show_dip: false,
  // Nap
  show_nap: false, nap_hour: 13.0, nap_duration: 30,
  // Eating
  eating_mode: 'adlib', eating_start: 8.0,
  // Night shift
  show_night_shift: false, night_shift_hours: 12.0, night_shift_start: 19.0,
  // Red line
  line_hour: 12.0,
  // IR curve (computed)
  ir_curve: new Array(180).fill(0),
  // Cortisol anchors
  cor_nadir_h: 0.0, cor_peak_h: 8.0,
  // Phase-shift markers (for replica dials)
  melatonin_marker_h: null, blue_light_marker_h: null,
};

// ── Component instances ───────────────────────────────────────────────────────
let dialRenderer, plasmaRenderer, sleepinessRenderer, qaPanel, schedulePanel;

function onStateChange() {
  // Recompute IR curve from current state (fast, client-side)
  const ir = computeIrCurve(
    appState.dlmo, appState.mcbt,
    plasmaRenderer?._melOffsetAbs ?? 9.0,
    appState.cor_nadir_h, appState.cor_peak_h,
    plasmaRenderer?._corNadirV   ?? 0.08,
    plasmaRenderer?._corPeakV    ?? 1.0
  );
  appState.ir_curve = ir;

  dialRenderer?.draw();
  plasmaRenderer?.draw();
  sleepinessRenderer?.draw();
  qaPanel?.refresh();
}

// ── Sizing ───────────────────────────────────────────────────────────────────
function resizePanels() {
  // Sleepiness bar
  const sleepCol = document.getElementById('sleepiness-col');
  const sW = sleepCol.clientWidth, sH = sleepCol.clientHeight;
  sleepinessRenderer?.resize(sW, sH);

  // Dial ,  fills whatever flex space it gets; resize on every layout change
  const dialCol = document.getElementById('dial-col');
  const dW = dialCol.clientWidth, dH = dialCol.clientHeight;
  if (dW > 0 && dH > 0) dialRenderer?.resize(dW, dH);
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
      if (target==='main') resizePanels();
    });
  });
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // Dial
  const dialCanvas = document.getElementById('dial-canvas');
  dialRenderer = new CircadianDialCanvas(dialCanvas, appState, onStateChange);

  // Plasma
  const plasmaCanvas = document.getElementById('plasma-canvas');
  plasmaRenderer = new PlasmaPanel(plasmaCanvas, appState, onStateChange, () => {
    // Master Reset: also reset all Q&A state
    qaPanel?.resetToDefaults();
    onStateChange();
  });

  // Sleepiness
  const sleepCanvas = document.getElementById('sleepiness-canvas');
  sleepinessRenderer = new SleepinessPanel(sleepCanvas, appState);

  // Q&A
  qaPanel = new QAPanel(appState, onStateChange);

  // Schedule
  schedulePanel = new NightShiftSchedule(appState);

  // Wait one animation frame so the browser has finished its flex layout pass,
  // then measure everything. This gives the dial its full natural size on launch.
  requestAnimationFrame(() => {
    resizePanels();
    plasmaRenderer.draw();
    onStateChange();
  });

  // Re-size all panels whenever the browser window changes
  window.addEventListener('resize', () => {
    resizePanels();
    onStateChange();
  });
});
