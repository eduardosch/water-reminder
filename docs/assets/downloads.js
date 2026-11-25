// Points the download buttons at the files of the latest GitHub release. Installer names
// include the version, so they can't be hardcoded; if the API call fails the buttons keep
// their fallback link to the releases page.
const LATEST_RELEASE_URL =
  "https://api.github.com/repos/eduardosch/water-reminder/releases/latest";

const ASSET_PATTERNS = {
  windows: /Setup-.*\.exe$/,
  mac: /\.dmg$/,
  deb: /\.deb$/,
  appimage: /\.AppImage$/,
};

function detectOs() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "mac";
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return null;
}

function highlightCurrentOs() {
  const os = detectOs();
  const card = os && document.querySelector(`.card[data-os="${os}"]`);
  if (card) card.classList.add("current");
}

function applyRelease(release) {
  const version = document.getElementById("version");
  if (version && release.tag_name) version.textContent = `Latest version: ${release.tag_name}`;

  for (const button of document.querySelectorAll("[data-asset]")) {
    const pattern = ASSET_PATTERNS[button.dataset.asset];
    const asset = release.assets.find((a) => pattern.test(a.name));
    if (asset) button.href = asset.browser_download_url;
  }
}

highlightCurrentOs();
fetch(LATEST_RELEASE_URL)
  .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
  .then(applyRelease)
  .catch(() => {});
