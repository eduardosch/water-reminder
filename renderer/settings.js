const $ = (id) => document.getElementById(id);

const els = {
  status: $("status"),
  interval: $("interval"),
  presets: $("presets"),
  pauseControls: $("pause-controls"),
  resume: $("resume"),
  test: $("test"),
  autostart: $("autostart"),
  autostartNote: $("autostart-note"),
  sound: $("sound"),
};

let built = false;

function chip(label, onClick) {
  const btn = document.createElement("button");
  btn.className = "chip";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function buildStatic(state) {
  els.interval.min = state.minInterval;
  els.interval.max = state.maxInterval;

  for (const minutes of state.intervalPresets) {
    const btn = chip(`${minutes} min`, () => window.api.setSettings({ intervalMinutes: minutes }));
    btn.dataset.minutes = String(minutes);
    els.presets.appendChild(btn);
  }

  for (const p of state.pausePresets) {
    els.pauseControls.appendChild(chip(`Pause ${p.label}`, () => window.api.pause(p.minutes)));
  }
  els.pauseControls.appendChild(chip("Pause until I resume", () => window.api.pause(null)));

  built = true;
}

function render(state) {
  if (!built) buildStatic(state);
  const { settings } = state;

  els.status.textContent = state.status;
  els.status.classList.toggle("paused", state.paused);

  if (document.activeElement !== els.interval) els.interval.value = settings.intervalMinutes;
  for (const btn of els.presets.children) {
    btn.classList.toggle("active", Number(btn.dataset.minutes) === settings.intervalMinutes);
  }

  els.pauseControls.hidden = state.paused;
  els.resume.hidden = !state.paused;

  els.autostart.checked = settings.autoStart;
  els.autostart.disabled = !state.autoStartSupported;
  els.autostartNote.hidden = state.autoStartSupported;
  els.sound.checked = settings.soundEnabled;
}

function commitInterval() {
  const value = Number(els.interval.value);
  if (!Number.isFinite(value) || value <= 0) return;
  window.api.setSettings({ intervalMinutes: value }).then(render);
}

els.interval.addEventListener("change", commitInterval);
els.interval.addEventListener("keydown", (e) => {
  if (e.key === "Enter") els.interval.blur();
});
els.interval.addEventListener("blur", () => window.api.getState().then(render));
els.resume.addEventListener("click", () => window.api.resume());
els.test.addEventListener("click", () => window.api.testAlert());
els.autostart.addEventListener("change", () => window.api.setSettings({ autoStart: els.autostart.checked }));
els.sound.addEventListener("change", () => window.api.setSettings({ soundEnabled: els.sound.checked }));

window.api.onStateChanged(render);
window.api.getState().then(render);

// Keep the "Paused until …" / "Next reminder at …" text fresh.
setInterval(() => window.api.getState().then(render), 30000);
