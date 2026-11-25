// Loaded synchronously in <head> so the saved/system theme is applied before the first paint
// (no flash of the wrong theme). The toggle in the nav overrides the system setting and is
// remembered; storage can be unavailable (private mode), so every access is guarded.
(function () {
  const root = document.documentElement;
  let saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch (e) {}
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = saved === "light" || saved === "dark" ? saved : systemDark ? "dark" : "light";

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    const sync = () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      toggle.setAttribute("aria-label", `Switch to ${next} theme`);
    };
    sync();
    toggle.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      sync();
      try {
        localStorage.setItem("theme", root.dataset.theme);
      } catch (e) {}
      document.dispatchEvent(new CustomEvent("themechange"));
    });
  });
})();
