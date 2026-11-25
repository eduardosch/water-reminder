// Landing page: live settings-window demo, reminder popup, download links and scroll reveals.

// Installer names include the version, so they can't be hardcoded; if the API call fails the
// buttons keep their fallback link to the latest release page.
const LATEST_RELEASE_URL =
  "https://api.github.com/repos/eduardosch/water-reminder/releases/latest";
const ASSET_PATTERNS = {
  windows: /Setup-.*\.exe$/,
  mac: /\.dmg$/,
  deb: /\.deb$/,
  appimage: /\.AppImage$/,
};
const POPUP_DURATION_MS = 4500;
const DEMO_REMAINING_SEC = 11 * 60 + 43;

function detectOs() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua)) return "mac";
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return null;
}

// The visitor's own platform moves to the top and gets the "Recommended" badge.
function highlightCurrentOs() {
  const os = detectOs();
  const plat = os && document.querySelector(`.plat[data-os="${os}"]`);
  if (plat) {
    plat.classList.add("mine");
    plat.parentNode.prepend(plat);
  }
}

function applyRelease(release) {
  for (const link of document.querySelectorAll("[data-asset]")) {
    const pattern = ASSET_PATTERNS[link.dataset.asset];
    const asset = release.assets.find((a) => pattern.test(a.name));
    if (asset) link.href = asset.browser_download_url;
  }
  if (!release.tag_name) return;
  for (const small of document.querySelectorAll("small[data-desc]")) {
    small.textContent = `${small.dataset.desc} · ${release.tag_name}`;
  }
}

function setupPopup() {
  const popup = document.getElementById("popup");
  let timer;
  const hide = () => popup.classList.remove("show");
  document.getElementById("popup-close").addEventListener("click", hide);
  return () => {
    hide();
    void popup.offsetWidth; // restart the slide-in animation
    popup.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(hide, POPUP_DURATION_MS);
  };
}

function setupReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

highlightCurrentOs();
window.WaterWindow.mount(document.getElementById("demo"), {
  interval: 15,
  remainingSec: DEMO_REMAINING_SEC,
  onRemind: setupPopup(),
});
setupReveal();

fetch(LATEST_RELEASE_URL)
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
  .then(applyRelease)
  .catch(() => {});
