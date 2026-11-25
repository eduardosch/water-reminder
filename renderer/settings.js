const RING_CIRCUMFERENCE = 2 * Math.PI * 88; // matches r="88" in settings.html
const TICK_MS = 1000;
const MINUTES_PER_HOUR = 60;

const $ = (id) => document.getElementById(id);

const els = {
  app: $("app"),
  minimize: $("minimize"),
  close: $("close"),
  ring: document.querySelector(".ring"),
  ringProgress: $("ring-progress"),
  ringLabel: $("ring-label"),
  ringValue: $("ring-value"),
  ringSub: $("ring-sub"),
  activeActions: $("active-actions"),
  test: $("test"),
  pause: $("pause"),
  pauseMenu: $("pause-menu"),
  resume: $("resume"),
  dec: $("dec"),
  inc: $("inc"),
  interval: $("interval"),
  presets: $("presets"),
  autostart: $("autostart"),
  autostartHint: $("autostart-hint"),
  sound: $("sound"),
};

let state = null;
let built = false;
let pauseMenuOpen = false;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function presetLabel(minutes) {
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m`;
  return `${minutes / MINUTES_PER_HOUR}h`;
}

function button(className, label, onClick) {
  const btn = document.createElement("button");
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function setPauseMenu(open) {
  pauseMenuOpen = open;
  els.pauseMenu.hidden = !open;
  els.pause.setAttribute("aria-expanded", String(open));
}

function pauseFor(minutes) {
  setPauseMenu(false);
  window.api.pause(minutes);
}

function buildStatic(s) {
  for (const minutes of s.intervalPresets) {
    const btn = button("segment", presetLabel(minutes), () => {
      window.api.setSettings({ intervalMinutes: minutes });
    });
    btn.dataset.minutes = String(minutes);
    btn.title = `${minutes} minutes`;
    els.presets.appendChild(btn);
  }

  for (const p of s.pausePresets) {
    els.pauseMenu.appendChild(button("pause-option", p.label, () => pauseFor(p.minutes)));
  }
  els.pauseMenu.appendChild(button("pause-option", "Until I resume", () => pauseFor(null)));

  els.dec.title = `${s.intervalStepMinutes} minutes less`;
  els.inc.title = `${s.intervalStepMinutes} minutes more`;
  els.dec.setAttribute("aria-label", els.dec.title);
  els.inc.setAttribute("aria-label", els.inc.title);

  built = true;
}

// Countdown ring: recomputed every second from nextAlertAt, no IPC needed.
function renderRing() {
  if (!state) return;
  const { settings } = state;
  const pausedUntil = settings.pausedUntil;
  let fraction = 0;

  if (state.paused) {
    els.ringLabel.textContent = "Paused";
    els.ringValue.textContent = pausedUntil === "indefinite" ? "—" : formatTime(pausedUntil);
    els.ringSub.textContent =
      pausedUntil === "indefinite" ? "Until you resume" : "Resumes automatically";
  } else if (state.nextAlertAt) {
    const remainingMs = Math.max(0, state.nextAlertAt - Date.now());
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    fraction = Math.min(1, remainingMs / (settings.intervalMinutes * 60 * 1000));
    els.ringLabel.textContent = "Next sip in";
    els.ringValue.textContent = `${minutes}:${seconds}`;
    els.ringSub.textContent = `at ${formatTime(state.nextAlertAt)}`;
  }

  els.ring.classList.toggle("paused", state.paused);
  els.ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
}

function renderSwitch(el, on) {
  el.setAttribute("aria-checked", String(on));
}

function render(next) {
  state = next;
  if (!built) buildStatic(state);
  const { settings } = state;

  renderRing();

  els.activeActions.hidden = state.paused;
  els.resume.hidden = !state.paused;
  if (state.paused && pauseMenuOpen) setPauseMenu(false);

  els.interval.textContent = `${settings.intervalMinutes} min`;
  els.dec.disabled = settings.intervalMinutes <= state.minInterval;
  els.inc.disabled = settings.intervalMinutes >= state.maxInterval;
  for (const btn of els.presets.children) {
    btn.classList.toggle("active", Number(btn.dataset.minutes) === settings.intervalMinutes);
  }

  renderSwitch(els.autostart, settings.autoStart);
  els.autostart.disabled = !state.autoStartSupported;
  els.autostartHint.textContent = state.autoStartSupported
    ? "Launch quietly when you sign in"
    : "Available in the installed app";
  renderSwitch(els.sound, settings.soundEnabled);
}

function stepInterval(direction) {
  if (!state) return;
  const value = state.settings.intervalMinutes + direction * state.intervalStepMinutes;
  window.api.setSettings({ intervalMinutes: value });
}

els.ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);

els.minimize.addEventListener("click", () => window.api.minimizeWindow());
els.close.addEventListener("click", () => window.api.closeWindow());
els.test.addEventListener("click", () => window.api.testAlert());
els.pause.addEventListener("click", () => setPauseMenu(!pauseMenuOpen));
els.resume.addEventListener("click", () => window.api.resume());
els.dec.addEventListener("click", () => stepInterval(-1));
els.inc.addEventListener("click", () => stepInterval(1));
els.autostart.addEventListener("click", () => {
  window.api.setSettings({ autoStart: !state.settings.autoStart });
});
els.sound.addEventListener("click", () => {
  window.api.setSettings({ soundEnabled: !state.settings.soundEnabled });
});

// The window has no OS frame, so size it to the content (e.g. when the pause menu opens).
new ResizeObserver(() => window.api.fitWindow(els.app.offsetHeight)).observe(els.app);

window.api.onStateChanged(render);
window.api.getState().then(render);
setInterval(renderRing, TICK_MS);
