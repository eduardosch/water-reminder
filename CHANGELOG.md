# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.3] - 2026-11-25

### Fixed

- Reminder sound not heard on Bluetooth headphones: they drop the first second or two of audio
  while waking up, longer than the chime. The popup now opens the audio output with silence and
  plays the chime 1.5 s later

## [1.1.2] - 2026-11-25

### Changed

- "Remind me now" (settings window) and "Show reminder now" (tray) restart the countdown to the
  next reminder, unless alerts are paused

### Fixed

- Reminder sound errors are no longer swallowed silently; they are written to the app log

## [1.1.1] - 2026-11-25

### Changed

- Default reminder interval is now 15 minutes (was 30); existing saved settings are kept

## [1.1.0] - 2026-11-25

### Added

- Project website on GitHub Pages (`docs/`), with a download page that links to the latest
  release's installers and highlights the visitor's OS
- `docs/workflow.md` documenting the application workflow with Mermaid flowcharts, state and
  sequence diagrams
- `CLAUDE.md` rule to keep `docs/workflow.md` in sync with app behavior

### Changed

- Redesigned settings window: frameless window with its own title bar (minimize, close to
  tray), countdown ring to the next reminder, "Remind me now" / "Pause" / "Resume reminders"
  buttons, interval stepper (5-minute steps) with segmented presets, and switch toggles with
  hints; the window sizes itself to its content
- Bundled the Figtree and Bricolage Grotesque fonts (SIL OFL) for the settings window

## [1.0.0] - 2026-11-25

### Added

- Installers published as a GitHub Release: the workflow creates the draft release up front
  (avoids upload races between platform builds) and publishes it automatically
  once all platform builds pass
- `CLAUDE.md` rule to cut a new release (version bump + tag) whenever a change affects the
  installed app
- Settings window to choose the reminder interval (1–480 min, with presets), toggle
  "Start with system" and "Play sound", pause/resume alerts and show a test reminder
- Tray menu with next-reminder status, interval presets, pause (30 min / 1 h / 2 h / until
  resumed), start with system, settings and quit; closing the window keeps the app in the tray
- Start with system on Windows, macOS and Linux (starts hidden in the tray); disabling removes
  the startup entry, and changes made in the OS are respected
- Settings and pause state persisted to `settings.json`; timer restarts after wake from sleep
- Single-instance lock (launching again opens the settings window)
- Popup notification sound
- Windows installer (NSIS) listed in Add or remove programs; uninstall also removes the
  startup entry and app data
- Linux `.deb` and AppImage, macOS universal `.dmg`
- GitHub Actions workflow that builds all installers on `v*` tags into a draft GitHub Release
- `CLAUDE.md` with project guidelines for Claude Code (overview, tooling, code style,
  main-process patterns, Electron security rules, renderer/UI patterns, commits & releases)
- `CHANGELOG.md` to track notable changes
- `.claude/settings.json` enabling the project's Claude Code plugins

### Changed

- Upgraded electron-builder to 26 (the NSIS installer built with 24 crashed on recent Windows 11)
- Windows build produces only the NSIS installer (portable build removed)
- Product name is now "Water Reminder"; app id `com.eduardoschroder.waterreminder`
- Renderer windows use `contextIsolation` with a preload bridge and a strict CSP
- README rewritten with download, usage, uninstall and release instructions

### Fixed

- Missing `preload.js` referenced by the popup window
