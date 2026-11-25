---
layout: default
title: Application workflow
mermaid: true
---

# Application workflow

How Water Reminder works: the processes it runs, what happens at startup, how reminders are
scheduled and paused, how the UI stays in sync, and how installers are built and released.

- [1. Architecture](#1-architecture)
- [2. Startup](#2-startup)
- [3. Settings storage](#3-settings-storage)
- [4. Start with system](#4-start-with-system)
- [5. Scheduler and pause](#5-scheduler-and-pause)
- [6. Reminder popup](#6-reminder-popup)
- [7. Settings window and IPC](#7-settings-window-and-ipc)
- [8. Tray menu](#8-tray-menu)
- [9. Sleep, wake and quit](#9-sleep-wake-and-quit)
- [10. Install and uninstall](#10-install-and-uninstall)
- [11. Build and release pipeline](#11-build-and-release-pipeline)

---

## 1. Architecture

Water Reminder is an Electron tray app with no visible main window. Everything that holds state
or touches the operating system runs in the **main process** (`main.js`). The two windows are
plain HTML pages (**renderers**) that cannot use Node.js. They talk to the main process only
through a narrow bridge, `window.api`, defined in `preload.js`.

```mermaid
flowchart TB
  SETTINGS["Settings window<br/>renderer/settings.*"]:::rend
  POPUP["Reminder popup<br/>renderer/index.html"]:::rend
  PRELOAD["preload.js<br/>window.api bridge"]:::bridge
  IPC["IPC handlers"]:::main
  TRAYC["Tray menu"]:::main
  STORE["Settings store"]:::main
  SCHED["Scheduler & pause"]:::main
  AUTO["Start with system"]:::main
  WIN["Window manager"]:::main
  FILE[("settings.json")]:::os
  LOGIN["OS login items"]:::os
  POWER["OS sleep / wake"]:::os
  TRAY["System tray / menu bar"]:::os

  SETTINGS <-->|"invoke / state:changed"| PRELOAD
  PRELOAD <--> IPC
  TRAY <--> TRAYC
  IPC --> STORE
  TRAYC --> STORE
  STORE --> AUTO
  STORE --> SCHED
  STORE <--> FILE
  AUTO <--> LOGIN
  POWER --> SCHED
  SCHED -->|"timer fires"| WIN
  WIN -->|"shows"| POPUP

  classDef rend fill:#e6f1ff,stroke:#0077ff,color:#1d2b3a
  classDef bridge fill:#fff4d6,stroke:#d97706,color:#1d2b3a
  classDef main fill:#e8f7ee,stroke:#16a34a,color:#1d2b3a
  classDef os fill:#f1f1f4,stroke:#6b7a8c,color:#1d2b3a
```

Blue: renderer pages · yellow: preload bridge · green: main process · grey: operating system.

| Part              | File(s)                                  | Responsibility                                                     |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| Settings store    | `main.js`                                | Load, validate and save `settings.json`                            |
| Start with system | `main.js`                                | Register or remove the login item on Windows, macOS and Linux      |
| Scheduler         | `main.js`                                | One timer for the next reminder, or one timer for the end of a pause |
| Windows           | `main.js`                                | Create the popup and the single settings window                    |
| Tray              | `main.js`                                | Context menu, tooltip with the current status                      |
| Bridge            | `preload.js`                             | Exposes `getState`, `setSettings`, `pause`, `resume`, `testAlert`, `onStateChanged` |
| Popup UI          | `renderer/index.html`, `popup.js`, `style.css` | Animation, message, optional sound                         |
| Settings UI       | `renderer/settings.*`                    | Interval, presets, pause/resume, toggles                           |

`getState()` in the main process is the **single source of truth** for the UI. It returns the
settings plus derived values (paused or not, status text, next reminder time) and the presets
and limits, so the renderers never hardcode any of them.

---

## 2. Startup

Only one copy of the app can run. A second launch (for example, double-clicking the shortcut
again) doesn't start a new process; it opens the settings window of the one already running.

```mermaid
flowchart TD
  A(["App launched"]) --> B{"Single-instance<br/>lock acquired?"}
  B -- "No" --> B1["Notify the running instance<br/>(it opens Settings)"] --> B2(["Quit"])
  B -- "Yes" --> C["Platform setup<br/>Linux: transparent visuals<br/>Windows: AppUserModelId"]
  C --> D["app ready"]
  D --> E["macOS: hide Dock icon"]
  E --> F["loadSettings()"]
  F --> G["syncAutoStart()"]
  G --> H["saveSettings()"]
  H --> I["registerIpc()"]
  I --> J["createTray()"]
  J --> K["reschedule()<br/>start the first timer"]
  K --> L["Listen for wake from sleep"]
  L --> M{"Started hidden?<br/>--hidden flag, or<br/>macOS opened at login"}
  M -- "Yes" --> N(["Run quietly in the tray"])
  M -- "No" --> O["showSettings()"] --> N
```

When the OS launches the app at login, it passes `--hidden` (or, on macOS, the app checks
`wasOpenedAtLogin`), so it goes straight to the tray. Launching it yourself opens the settings
window.

---

## 3. Settings storage

Settings live in a plain JSON file in the app's user-data folder:

| System  | Location                                                     |
| ------- | ------------------------------------------------------------ |
| Windows | `%APPDATA%\Water Reminder\settings.json`                     |
| Linux   | `~/.config/Water Reminder/settings.json`                     |
| macOS   | `~/Library/Application Support/Water Reminder/settings.json` |

| Key               | Default | Meaning                                                                         |
| ----------------- | ------- | ------------------------------------------------------------------------------- |
| `intervalMinutes` | `30`    | Minutes between reminders, always clamped to 1–480                              |
| `autoStart`       | `true`  | Start with system                                                               |
| `soundEnabled`    | `true`  | Play a sound with the popup                                                     |
| `pausedUntil`     | `null`  | `null` = active, a timestamp in ms = paused until then, `"indefinite"` = paused until resumed |

```mermaid
flowchart TD
  A["loadSettings()"] --> B{"Read settings.json"}
  B -- "OK" --> C["Merge file over defaults"]
  B -- "File not found" --> D["First run<br/>use defaults"]
  B -- "Other error" --> E["Log the error<br/>use defaults"]
  C --> F["Clamp interval to 1–480"]
  D --> F
  E --> F
  F --> G(["settings in memory"])
```

Every change goes through `updateSettings(patch)`. It applies only the keys present in the
patch, coerces their types, saves the file, then either reschedules (if the interval changed)
or just refreshes the UI. Read and write errors are logged and never crash the app.

---

## 4. Start with system

Each OS has its own login-item mechanism. The app only registers itself when it's
**packaged**: in development the executable is Electron itself, which must never be added
to startup.

| System  | Mechanism                                                              |
| ------- | ---------------------------------------------------------------------- |
| Windows | `HKCU\…\CurrentVersion\Run` value named `WaterReminder`, with `--hidden` |
| macOS   | Login Items, opened hidden                                             |
| Linux   | `~/.config/autostart/water-reminder.desktop` with `--hidden` (uses the AppImage path when running from an AppImage) |

At startup, the app **reads the OS state instead of overwriting it**. If you turned it off in
Task Manager, System Settings or by deleting the `.desktop` file, the app accepts that and
updates its own setting.

```mermaid
flowchart TD
  A["syncAutoStart()"] --> B{"Packaged app?"}
  B -- "No (development)" --> Z(["Do nothing"])
  B -- "Yes" --> C{"First run?"}
  C -- "Yes" --> D["applyAutoStart(setting)<br/>register with the OS"]
  C -- "No" --> E["Read the OS login-item state"]
  E --> F{"Same as the setting?"}
  F -- "Yes" --> Z
  F -- "No" --> G["Adopt the OS state<br/>save settings"]
```

Turning the toggle off **removes** the entry entirely (not just marks it disabled), so the app
disappears from Task Manager → Startup apps.

---

## 5. Scheduler and pause

At most **one timer** is running at a time: either the timer for the next reminder, or the
timer for the end of a pause. `reschedule()` always clears both before deciding which one to
start, so calling it repeatedly is safe.

```mermaid
flowchart TD
  A["reschedule()"] --> B["Clear the reminder and<br/>resume timers"]
  B --> C{"Timed pause already<br/>expired? (e.g. while<br/>the app was closed)"}
  C -- "Yes" --> D["Clear pausedUntil<br/>save settings"] --> E
  C -- "No" --> E{"pausedUntil?"}
  E -- "indefinite" --> F["No timer<br/>wait for Resume"]
  E -- "timestamp" --> G["Start the resume timer<br/>for the end of the pause"]
  E -- "null (active)" --> H["nextAlertAt = now + interval<br/>start the reminder timer"]
  F --> R["refreshUI()"]
  G --> R
  H --> R
  G -. "pause ends" .-> RES["resumeAlerts()"] --> A
  H -. "timer fires" .-> P["createPopup()"] --> A
```

Reminder states and what moves between them:

```mermaid
stateDiagram-v2
  [*] --> Active
  Active --> Active: Timer fires → popup → next timer
  Active --> PausedTimed: Pause 30 min / 1 h / 2 h
  Active --> PausedIndefinite: Pause until I resume
  PausedTimed --> Active: Pause ends or Resume
  PausedIndefinite --> Active: Resume
  Active --> Active: Interval changed → restart timer
```

The status shown in the tray, tooltip and settings window is derived from this state:
`Next reminder at 14:30`, `Paused until 15:00`, or `Paused`.

Pause state is saved, so it survives a restart: a timed pause that ended while the app was
closed is cleared at the next start.

---

## 6. Reminder popup

The popup is a small frameless, transparent, always-on-top window. It **never takes focus**,
so it doesn't interrupt your typing, and it closes itself after 6 seconds.

```mermaid
sequenceDiagram
  participant T as Timer / tray / settings
  participant M as Main process
  participant P as Popup window

  T->>M: createPopup()
  alt A popup is already open
    M-->>T: ignore
  else No popup open
    M->>P: create (frameless, transparent, always on top, not focusable)
    M->>P: load index.html?sound=1 or 0
    P-->>M: ready-to-show
    M->>P: showInactive() (no focus steal)
    P->>P: play animation, play sound if sound=1
    Note over M,P: after 6 seconds
    M->>P: close()
    P-->>M: closed (reference cleared)
  end
```

A popup can come from three places: the scheduler, **Show reminder now** in the tray, or the
test button in the settings window.

---

## 7. Settings window and IPC

There is only ever one settings window. Opening it again shows and focuses the existing one.
Closing it **hides** it; the app keeps running in the tray. It's only really destroyed when
you quit.

The window has no OS frame: the page draws its own title bar (drag region, **Minimize** and
**Close to tray** buttons) and asks the main process to resize the window to its content
(`window:fit`), so it grows when the pause menu opens. The countdown ring is updated every
second in the renderer from `nextAlertAt`, without extra IPC.

```mermaid
flowchart TD
  A["showSettings()<br/>tray · second launch · macOS Dock activate"] --> B{"Window exists?"}
  B -- "Yes" --> C["Restore if minimized<br/>show + focus"]
  B -- "No" --> D["Create window (hidden)<br/>with preload.js"] --> E["ready-to-show → show"]
  E --> F["User closes the window"]
  C --> F
  F --> G{"Quitting?"}
  G -- "No" --> H["Cancel close, hide window"]
  G -- "Yes" --> I["Window destroyed"]
```

The renderer talks to the main process through request/response IPC channels, and the main
process pushes `state:changed` whenever anything changes, including changes made from the
tray:

| `window.api` function | IPC channel      | Effect                                    |
| --------------------- | ---------------- | ----------------------------------------- |
| `getState()`          | `state:get`      | Returns the current state                 |
| `setSettings(patch)`  | `settings:set`   | `updateSettings(patch)`                   |
| `pause(minutes)`      | `alerts:pause`   | Timed pause, or indefinite when `null`    |
| `resume()`            | `alerts:resume`  | Resume alerts                             |
| `testAlert()`         | `alerts:test`    | Show the popup now                        |
| `minimizeWindow()`    | `window:minimize`| Minimize the settings window              |
| `closeWindow()`       | `window:close`   | Close (hide to tray) the settings window  |
| `fitWindow(height)`   | `window:fit`     | Resize the window to its content height   |
| `onStateChanged(cb)`  | `state:changed`  | Push from main; returns an unsubscribe function |

Example: changing the interval in the settings window.

```mermaid
sequenceDiagram
  actor U as User
  participant S as Settings window
  participant B as preload.js
  participant M as Main process
  participant F as settings.json
  participant T as Tray

  U->>S: click the "45m" preset
  S->>B: api.setSettings({ intervalMinutes: 45 })
  B->>M: invoke "settings:set"
  M->>M: clamp to 1–480, update settings
  M->>F: saveSettings()
  M->>M: reschedule() (new timer)
  M->>T: update menu + tooltip
  M-->>S: push "state:changed"
  M-->>B: return getState()
  B-->>S: render(state)
```

`render(state)` redraws the whole settings UI from the state. It doesn't overwrite the interval
field while you're typing in it, and it re-reads the state every 30 seconds to keep the status
text current.

---

## 8. Tray menu

The menu is rebuilt from the current state after every change.

```mermaid
flowchart LR
  M["Tray menu"] --> S["Status (read-only)<br/>e.g. Next reminder at 14:30"]
  M --> N["Show reminder now"]
  M --> I["Interval ▸<br/>Every 15 / 30 / 45 / 60 / 90 / 120 min<br/>(+ a custom value if set)"]
  M --> P{"Paused?"}
  P -- "No" --> PA["Pause alerts ▸<br/>For 30 minutes · 1 hour · 2 hours<br/>Until I resume"]
  P -- "Yes" --> PR["Resume alerts"]
  M --> A["Start with system ☑<br/>(disabled in development)"]
  M --> ST["Settings…"]
  M --> Q["Quit"]
```

On Windows, left-clicking the tray icon also opens the settings window. The tooltip shows
`Water Reminder — <status>`.

---

## 9. Sleep, wake and quit

Timers don't run reliably while the computer sleeps. On wake, the app restarts the schedule, so
the next reminder comes one full interval after wake, not in a burst.

```mermaid
flowchart TD
  A(["System wakes from sleep"]) --> B["powerMonitor 'resume'"] --> C["reschedule()"]

  Q(["Quit from the tray"]) --> Q1["before-quit: isQuitting = true"]
  Q1 --> Q2["Settings window really closes"]
  Q2 --> Q3(["Process exits"])

  W(["Last window closed"]) --> W1["window-all-closed: keep running"]
```

---

## 10. Install and uninstall

| System          | Install                         | Uninstall                                                    |
| --------------- | ------------------------------- | ------------------------------------------------------------ |
| Windows         | NSIS installer (`.exe`), per user, optional install folder, Desktop and Start menu shortcuts, launches when finished | Apps → Installed apps. Also removes the startup entry (`build/installer.nsh`) and app data |
| Linux (`.deb`)  | `sudo apt install ./….deb`      | `sudo apt remove water-reminder`                             |
| Linux (AppImage)| `chmod +x` and run              | Delete the file and `~/.config/autostart/water-reminder.desktop` |
| macOS (`.dmg`)  | Drag to Applications (unsigned: right-click → Open the first time) | Quit and move to Trash        |

```mermaid
flowchart TD
  A(["Run installer"]) --> B["Install app"] --> C["Launch app"]
  C --> D["First run: defaults,<br/>register start with system"]
  D --> E["Settings window opens"]

  U(["Uninstall on Windows"]) --> U1["Remove app files"]
  U1 --> U2["Delete Run and StartupApproved<br/>registry values 'WaterReminder'"]
  U2 --> U3["Delete app data<br/>(settings.json)"]
```

---

## 11. Build and release pipeline

Installers are built by GitHub Actions (`.github/workflows/release.yml`) when a `vX.Y.Z` tag is
pushed. The tag must match `version` in `package.json`.

```mermaid
flowchart TD
  A(["git push origin vX.Y.Z"]) --> B["release job<br/>create draft release<br/>(once, avoids upload races)"]
  B --> W["build · windows-latest<br/>NSIS .exe"]
  B --> L["build · ubuntu-latest<br/>.deb + .AppImage"]
  B --> M["build · macos-latest<br/>universal .dmg"]
  W --> U["Upload installers<br/>to the draft release"]
  L --> U
  M --> U
  U --> C{"All three builds<br/>succeeded?"}
  C -- "Yes" --> P["publish job<br/>publish as latest release"]
  C -- "No" --> D["Release stays a draft"]
  P --> S(["Download links on the website<br/>and README point to it"])
```

Running the workflow manually from the **Actions** tab skips the release and publish jobs and
only uploads the installers as workflow artifacts.
