/* Water Reminder — interactive window mock, faithful to the app design.
   Usage: WaterWindow.mount(el, { interval, remainingSec, paused, menu, startup, sound, toast, frozen }) */
(function () {
  const DROP = (fill) =>
    `<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true"><path d="M7 .8S1 7.4 1 10.6a6 6 0 0 0 12 0C13 7.4 7 .8 7 .8Z" fill="${fill}"/></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const C = 552.92;

  function mount(root, opts = {}) {
    const s = {
      interval: opts.interval ?? 15,
      endsAt: Date.now() + (opts.remainingSec ?? 25 * 60 + 43) * 1000,
      paused: opts.paused ?? null, // null | timestamp | 'indef'
      menu: !!opts.menu,
      startup: opts.startup ?? true,
      sound: opts.sound ?? true,
      toast: opts.toast ?? null,
      now: Date.now(),
    };
    if (typeof s.paused === "number" && s.paused < 1e12) s.paused = Date.now() + s.paused * 60000;
    let toastTimer;

    root.classList.add("ww");
    root.innerHTML = `
      <div class="ww-bar">
        <div class="ww-title">${DROP("#1A7FD6")}<span>Water Reminder</span></div>
        <div class="ww-ctrls">
          <button class="ww-ic" title="Minimize" aria-label="Minimize"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
          <button class="ww-ic" title="Close to tray" aria-label="Close to tray"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
        </div>
      </div>
      <div class="ww-body">
        <div class="ww-card ww-hero">
          <div class="ww-ring">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="#EAF1F7" stroke-width="10"/>
              <circle class="ww-prog" cx="100" cy="100" r="88" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}"/>
            </svg>
            <div class="ww-ring-in">
              <span class="ww-lbl"></span><span class="ww-val"></span><span class="ww-sub"></span>
            </div>
          </div>
          <div class="ww-actions"></div>
          <div class="ww-pausegrid"></div>
        </div>
        <div class="ww-card ww-int">
          <div class="ww-row">
            <span class="ww-strong">Remind me every</span>
            <div class="ww-step">
              <button data-act="dec" title="5 minutes less">−</button>
              <span class="ww-intv"></span>
              <button data-act="inc" title="5 minutes more">+</button>
            </div>
          </div>
          <div class="ww-seg"></div>
        </div>
        <div class="ww-card ww-tgls"></div>
        <p class="ww-foot">Closing this window keeps Water Reminder running in the tray.</p>
      </div>
      <div class="ww-toast" hidden>${DROP("#6FB6F2")}<span></span></div>`;

    const $ = (q) => root.querySelector(q);
    const setInterval_ = (m) => { m = Math.max(1, Math.min(480, m)); s.interval = m; s.endsAt = Date.now() + m * 60000; render(); };
    const toast = (t) => { clearTimeout(toastTimer); s.toast = t; render(); toastTimer = setTimeout(() => { s.toast = null; render(); }, 2600); };

    const remind = () => (opts.onRemind ? opts.onRemind(s) : toast("Time to drink water!"));

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const a = b.dataset.act, v = b.dataset.v;
      if (a === "dec") setInterval_(s.interval - 5);
      else if (a === "inc") setInterval_(s.interval + 5);
      else if (a === "preset") setInterval_(+v);
      else if (a === "now") remind();
      else if (a === "menu") { s.menu = !s.menu; render(); }
      else if (a === "pause") { s.paused = v === "indef" ? "indef" : Date.now() + +v * 60000; s.menu = false; render(); }
      else if (a === "resume") { s.paused = null; s.endsAt = Date.now() + s.interval * 60000; render(); }
      else if (a === "tg") { s[v] = !s[v]; render(); }
    });

    function render() {
      const paused = !!s.paused, now = s.now;
      const rem = Math.max(0, s.endsAt - now);
      const frac = paused ? 0 : rem / (s.interval * 60000);
      const prog = $(".ww-prog");
      const dk = document.documentElement.dataset.theme === "dark";
      prog.setAttribute("stroke", paused ? (dk ? "#2A3A49" : "#D3DCE4") : (dk ? "#3B9BF0" : "#1A7FD6"));
      prog.setAttribute("stroke-dashoffset", (C * (1 - frac)).toFixed(2));
      $(".ww-lbl").textContent = paused ? "Paused" : "Next sip in";
      $(".ww-val").textContent = paused
        ? (s.paused === "indef" ? "—" : fmt(s.paused))
        : `${Math.floor(rem / 60000)}:${pad(Math.floor(rem / 1000) % 60)}`;
      $(".ww-sub").textContent = paused ? (s.paused === "indef" ? "Until you resume" : "Resumes automatically") : `at ${fmt(s.endsAt)}`;

      $(".ww-actions").innerHTML = paused
        ? `<button class="ww-btn ww-pri" data-act="resume"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 1.8v8.4L10 6z" fill="#fff"/></svg>Resume reminders</button>`
        : `<button class="ww-btn ww-pri" data-act="now">${DROP("#fff")}Remind me now</button>
           <button class="ww-btn ww-sec" data-act="menu" aria-expanded="${s.menu}"><svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.6" height="9" rx="1" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx="1" fill="currentColor"/></svg>Pause</button>`;
      const pg = $(".ww-pausegrid");
      pg.hidden = !(s.menu && !paused);
      pg.innerHTML = [["30", "30 minutes"], ["60", "1 hour"], ["120", "2 hours"], ["indef", "Until I resume"]]
        .map(([v, l]) => `<button data-act="pause" data-v="${v}">${l}</button>`).join("");

      $(".ww-intv").textContent = `${s.interval} min`;
      $(".ww-seg").innerHTML = [15, 30, 45, 60, 90, 120]
        .map((m) => `<button data-act="preset" data-v="${m}" class="${s.interval === m ? "on" : ""}">${m < 60 ? m + "m" : m / 60 + "h"}</button>`).join("");

      $(".ww-tgls").innerHTML = [["startup", "Start with system", "Launch quietly when you sign in"], ["sound", "Play sound", "A soft chime with each reminder"]]
        .map(([k, l, h]) => `<button class="ww-tg" data-act="tg" data-v="${k}" role="switch" aria-checked="${s[k]}">
            <span class="ww-tgtxt"><span class="ww-strong">${l}</span><span class="ww-hint">${h}</span></span>
            <span class="ww-track ${s[k] ? "on" : ""}"><span class="ww-knob"></span></span></button>`).join("");

      const t = $(".ww-toast"); t.hidden = !s.toast; t.querySelector("span").textContent = s.toast || "";
    }

    render();
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    if (!opts.frozen) {
      setInterval(() => {
        s.now = Date.now();
        if (s.paused && s.paused !== "indef" && s.now >= s.paused) { s.paused = null; s.endsAt = s.now + s.interval * 60000; }
        if (!s.paused && s.now >= s.endsAt) { s.endsAt = s.now + s.interval * 60000; remind(); }
        render();
      }, 1000);
    }
  }
  window.WaterWindow = { mount };
})();
