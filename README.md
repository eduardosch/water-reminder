# 💧 Water Reminder

**Water Reminder** is a lightweight cross-platform desktop application built with [Electron](https://www.electronjs.org/).  
It helps you maintain a healthy hydration routine by sending periodic reminders to drink water — directly from your desktop.

---

## 🧭 Table of Contents

- [Introduction](#introduction)
- [Download](#download)
- [Features](#features)
- [Usage](#usage)
- [Uninstalling](#uninstalling)
- [Development](#development)
- [Building & Releasing](#building--releasing)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 💡 Introduction

**Water Reminder** runs quietly in your system tray and periodically reminds you to drink water.
It's designed for simplicity, minimal system resources, and cross-platform compatibility.

---

## 📥 Download

You **don't** need Node.js, npm or Electron — the installers include everything.

Get the latest version from the **[Releases page](https://github.com/eduardosch/water-reminder/releases/latest)**:

| System  | File                                      | How to install                                                                                   |
| ------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Windows | `WaterReminder-Setup-x.y.z.exe`           | Run the installer. If SmartScreen warns, click **More info → Run anyway** (the app is unsigned). |
| Linux   | `WaterReminder-x.y.z-amd64.deb`           | `sudo apt install ./WaterReminder-x.y.z-amd64.deb` (Ubuntu/Debian)                               |
| Linux   | `WaterReminder-x.y.z-x86_64.AppImage`     | `chmod +x` the file and run it (any distro)                                                      |
| macOS   | `WaterReminder-x.y.z-mac-universal.dmg`   | Drag to Applications. The app is unsigned — see below.                                           |

**macOS first launch:** right-click the app → **Open** → **Open**. If macOS says the app "is damaged", run:

```bash
xattr -cr "/Applications/Water Reminder.app"
```

---

## ✨ Features

- 🕑 Choose how often to be reminded (1–480 minutes, with quick presets)
- ⏸️ Pause alerts for 30 min / 1 h / 2 h or until you resume
- 🚀 Starts with the system (optional), straight to the tray
- 🧺 Lives in the system tray / menu bar — closing the window keeps it running
- 🔔 Popup animation with optional sound
- 💻 Windows, Linux and macOS

---

## 🚀 Usage

- On first launch the **settings window** opens. Pick an interval, toggle **Start with system** and **Play sound**.
- Closing the window keeps the app running in the **system tray** (menu bar on macOS).
- The **tray menu** shows the next reminder time and lets you:
  - Show a reminder now
  - Change the interval
  - Pause alerts (30 min, 1 h, 2 h, until you resume) / Resume alerts
  - Toggle Start with system
  - Open Settings… or Quit
- On Windows, left-clicking the tray icon opens the settings.
- When started with the system, the app goes straight to the tray without opening a window.
- Turning **Start with system** off removes the startup entry completely (Task Manager → Startup apps on Windows, Login Items on macOS, `~/.config/autostart` on Linux). If you disable it from the OS instead, the app picks that up and won't re-add it.

Settings are saved in:

| System  | Location                                              |
| ------- | ----------------------------------------------------- |
| Windows | `%APPDATA%\Water Reminder\settings.json`              |
| Linux   | `~/.config/Water Reminder/settings.json`              |
| macOS   | `~/Library/Application Support/Water Reminder/settings.json` |

---

## 🗑️ Uninstalling

- **Windows:** Settings → Apps → Installed apps (or *Add or remove programs*) → **Water Reminder** → Uninstall. This also removes the startup entry and saved settings.
- **Linux (.deb):** `sudo apt remove water-reminder`
- **Linux (AppImage):** delete the file (and `~/.config/autostart/water-reminder.desktop` if present).
- **macOS:** quit from the menu bar and move the app to the Trash.

---

## ⚙️ Development

Requires [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/eduardosch/water-reminder.git
cd water-reminder
pnpm install
pnpm start
```

"Start with system" is disabled in development mode so it never registers the dev Electron binary.

---

## 🏗️ Building & Releasing

### Automatic (recommended)

The GitHub Actions workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) builds the Windows, Linux and macOS installers on GitHub's runners — no Mac or Linux machine required.

1. Bump `version` in `package.json` and commit.
2. Tag and push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The workflow uploads the installers to a draft release and publishes it automatically once all three platforms build successfully. If a build fails, the release stays a draft.

You can also run the workflow manually from the **Actions** tab; it then only uploads the installers as workflow artifacts.

### Local

```bash
pnpm dist:win     # Windows NSIS installer (run on Windows)
pnpm dist:linux   # AppImage + .deb (run on Linux or WSL)
pnpm dist:mac     # .dmg (run on macOS)
```

Output goes to `dist/`.

> On Windows, if the build fails with *"Cannot create symbolic link"*, enable **Developer Mode** (Settings → System → For developers) or run the terminal as administrator once.

---

## 📁 Project Structure

```
water-reminder/
├── main.js                  # Main process: tray, scheduler, pause, autostart, windows
├── preload.js               # Safe bridge between settings window and main process
├── package.json             # Metadata, scripts and electron-builder config
├── pnpm-workspace.yaml      # Allows Electron's install script to run
├── icon.png                 # App / tray icon
├── build/
│   └── installer.nsh        # Windows uninstaller extras (removes startup entry)
├── .github/workflows/
│   └── release.yml          # Builds & publishes installers
└── renderer/
    ├── index.html, popup.js, style.css           # Reminder popup
    ├── settings.html, settings.js, settings.css  # Settings window
    └── assets/              # Font, animation, sound
```

---

## 🩹 Troubleshooting

| Issue                                  | Solution                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| No tray icon on Linux (GNOME)          | Install the *AppIndicator and KStatusNotifierItem Support* extension.                             |
| Sound not playing                      | Check **Play sound** in settings and your system volume.                                          |
| Popup has a black background on Linux  | Your desktop has no compositor; transparency needs one.                                           |
| macOS says the app is damaged          | `xattr -cr "/Applications/Water Reminder.app"`                                                    |
| Reminder didn't fire after sleep       | The timer restarts when the computer wakes up, so the next reminder comes one interval after wake. |

---

## 🤝 Contributing

Contributions are welcome!  
To contribute:

1. Fork this repo
2. Create a new branch
3. Commit your changes
4. Submit a Pull Request

---

## 🪪 License

This project is licensed under the [MIT License](LICENSE).

---

### 👤 Author

Created by Eduardo Schröder.  
Inspired by the importance of staying hydrated and maintaining good health!
