# CLAUDE.md

- before every commit generate the changelog using /add_changelog command
- always update `README.md` when a change affects anything it documents (features, settings,
  tray menu, install/build/release steps, scripts, supported platforms, project structure)

## Project overview

Water Reminder is a cross-platform (Windows / macOS / Linux) Electron tray app that shows a
small always-on-top popup at a configurable interval. Plain JavaScript, no bundler, no framework,
no TypeScript.

- `main.js` — main process: settings store, auto-start, scheduler/pause, windows, tray, IPC, lifecycle
- `preload.js` — the only bridge between main and renderers (`window.api`)
- `renderer/` — static HTML/CSS/JS pages (`index.html` + `popup.js` = reminder popup,
  `settings.*` = settings window), assets under `renderer/assets/{fonts,images,sounds}`
- `build/installer.nsh` — extra NSIS uninstall steps
- `.github/workflows/release.yml` — builds installers on `v*` tags into a draft GitHub Release

## Tooling

- Package manager is **pnpm** (`packageManager` in package.json). Never use npm/yarn or commit a
  `package-lock.json`. Run `pnpm install`, `pnpm start`, `pnpm dist:win|linux|mac`.
- CI uses `pnpm install --frozen-lockfile`, so update `pnpm-lock.yaml` with every dependency change.
- Any new runtime file must be added to `build.files` in package.json or it won't ship in the installer.
- No dependencies beyond `electron` / `electron-builder` unless clearly justified — prefer Node and
  Electron built-ins (e.g. settings are a plain JSON file, not electron-store).

## Code style

- CommonJS (`require`) in main/preload; plain browser scripts (no modules, no build step) in renderer.
- 2-space indentation, double quotes, semicolons, trailing commas in multi-line literals,
  ~100-char lines. Arrow functions for callbacks, `function` declarations for top-level functions.
- `const` by default, `let` only when reassigned; no `var`.
- Constants in `UPPER_SNAKE_CASE` at the top of the file (`INTERVAL_PRESETS`, `POPUP_DURATION_MS`…);
  no magic numbers inline. Units in names (`Ms`, `Minutes`).
- Group `main.js` into sections separated by the existing banner comment:
  `// ----...` / `// Section name` / `// ----...`. Put new code in the matching section.
- Comments explain *why* (platform quirks, OS behavior), not *what*.
- Keep functions small and single-purpose; reuse existing helpers (`log`, `saveSettings`,
  `clampInterval`, `formatTime`, `statusText`, `refreshUI`) instead of duplicating logic.

## Main-process patterns

- **Logging:** use `log(message)` — short lowercase messages, e.g. `log("alerts resumed")`.
- **Errors:** wrap filesystem / OS calls in `try/catch` and `log()` the failure; never let them crash
  the tray app. Treat `ENOENT` as an expected case.
- **Settings:** single in-memory `settings` object merged over `DEFAULT_SETTINGS`. Add new options to
  `DEFAULT_SETTINGS` (with a comment for non-obvious values), validate/clamp on load and on update,
  and persist with `saveSettings()`. All changes go through `updateSettings(patch)`, which handles
  partial patches (`!== undefined` checks), coerces types (`Boolean(...)`, `clampInterval(...)`),
  and calls `reschedule()` or `refreshUI()`.
- **State to UI:** `getState()` is the single source of truth sent to renderers (settings + derived
  status + presets/limits). Renderers never hardcode presets or limits — expose them via `getState()`.
  After any state change call `refreshUI()` (updates tray menu/tooltip and pushes `state:changed`).
- **Timers:** clear existing timers before scheduling (`reschedule()` pattern); handle wake-from-sleep
  via `powerMonitor`. Store timestamps in ms (`Date.now()`).
- **Platform code:** branch with `isWin` / `isMac` / `isLinux`; always cover all three platforms
  (or document why not). Guard packaged-only behavior with `app.isPackaged`.
- **Windows:** keep a single instance per window (`if (win && !win.isDestroyed())` → show/focus);
  create with `show: false` and show on `ready-to-show`; null the reference on `closed`.
  Closing the settings window hides it (tray app keeps running) unless `isQuitting`.
- Respect OS-side changes (e.g. auto-start toggled in Task Manager) — sync from the OS, don't overwrite it.
- If you change the Windows login item name, update `build/installer.nsh` too.

## Security (Electron)

- Every `BrowserWindow`: `nodeIntegration: false`, `contextIsolation: true`. Never enable
  `nodeIntegration`, `enableRemoteModule`, or disable `webSecurity`.
- Renderers talk to main only through `preload.js` → `contextBridge.exposeInMainWorld("api", …)`.
  Expose narrow, named functions — never raw `ipcRenderer`.
- IPC: request/response via `ipcMain.handle` + `ipcRenderer.invoke`; main → renderer pushes via
  `webContents.send`. Channel names are `noun:verb` (`state:get`, `settings:set`, `alerts:pause`).
  Validate/coerce every IPC argument in main (`patch || {}`, `Number(...)`).
- Subscription helpers in preload return an unsubscribe function.
- Every HTML page has a strict CSP meta tag (`default-src 'self'; script-src 'self'`). No inline
  scripts, inline event handlers, or remote resources — put JS in a separate file under `renderer/`.
- Use `textContent`, never `innerHTML`, when inserting text into the DOM.

## Renderer / UI patterns

- Cache elements in an `els` object via `$(id)` helper; build dynamic controls with
  `document.createElement` (see `chip()` in `settings.js`).
- A single idempotent `render(state)` function updates the whole UI from `getState()` output;
  wire it to both `window.api.getState()` and `window.api.onStateChanged()`.
- Don't overwrite an input the user is currently editing (`document.activeElement` check).
- Toggle visibility with the `hidden` attribute and classes with `classList.toggle`.
- CSS: use the custom properties in `settings.css` `:root` (`--blue`, `--bg`, `--card`, `--text`,
  `--muted`, `--border`, `--paused`) and provide dark-mode values in the
  `@media (prefers-color-scheme: dark)` block for any new color. No hardcoded colors elsewhere.
- Brand font is `Bungee-Regular` (headings/popup message); body text uses the system font stack.
- UI text is English, short, sentence case; use `…` (ellipsis character) for menu items that open windows.
- Popup windows must not steal focus (`focusable: false`, `showInactive()`).

## Commits & releases

- Follow the git-commit-style skill (conventional commit type + emoji).
- Generate the changelog with /add_changelog before every commit (see top rule).
- Releases: bump `version` in package.json, then push a matching `vX.Y.Z` tag. The release
  workflow builds all installers and publishes the GitHub Release automatically.
- **Always ship a new installer when necessary:** whenever a commit changes what ends up in the
  installed app (runtime files in `build.files`, `build/installer.nsh`, electron-builder config,
  or runtime/Electron dependency versions), cut a new release in the same task:
  1. Bump `version` (semver: fix → patch, new feature → minor, breaking → major).
  2. Move the `[Unreleased]` changelog entries under `## [X.Y.Z] - YYYY-MM-DD`.
  3. Commit, push `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
  4. Watch the run (`gh run watch`) and confirm the release has the `.exe`, `.deb`, `.AppImage`
     and `.dmg` assets (`gh release view vX.Y.Z`).
  Changes that only touch docs, CI, `CLAUDE.md` or dev tooling don't need a release.
  Never move the tag of a published release — bump the version instead.
