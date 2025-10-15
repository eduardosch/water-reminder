# 💧 Water Reminder

**Water Reminder** is a lightweight cross-platform desktop application built with [Electron](https://www.electronjs.org/).  
It helps you maintain a healthy hydration routine by sending periodic reminders to drink water — directly from your desktop.

---

## 🧭 Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Building for Distribution](#building-for-distribution)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 💡 Introduction

**Water Reminder** runs quietly in your system tray and periodically notifies you to drink water.  
It’s designed for simplicity, minimal system resources, and cross-platform compatibility.

Built with **Electron**, it combines the power of web technologies (HTML, CSS, JS) with desktop functionality.

---

## ✨ Features

- 🕑 Periodic hydration reminders with customizable intervals
- 🔔 Native desktop notifications and sound alerts
- 🪟 Lightweight Electron interface
- 💻 Cross-platform (Windows, macOS, Linux)
- 🎨 Custom icons and UI styling
- 📦 Packaged installers for all major platforms

---

## ⚙️ Installation

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/)
- [Electron](https://www.electronjs.org/) (automatically installed via dependencies)

### Steps

1. **Clone or download** this repository.

   ```bash
   git clone https://github.com/yourusername/water-reminder.git
   cd water-reminder
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the app in development mode**
   ```bash
   npm start
   ```

---

## 🚀 Usage

Once launched, the app will appear in your system tray or taskbar.

- The app will automatically remind you at regular intervals.
- You can mute or close the app from the tray icon.
- Notifications play a sound (`renderer/assets/sounds/notification.wav`) and display a small popup.

---

## 🏗️ Building for Distribution

You can package the app for your operating system using [electron-builder](https://www.electron.build/):

```bash
npm run dist
```

This will create a build under the `dist/` folder with the following targets:

| Platform | Output Format      |
| -------- | ------------------ |
| Windows  | NSIS, Portable EXE |
| macOS    | DMG                |
| Linux    | AppImage           |

---

## 📁 Project Structure

```
water-reminder/
├── main.js                  # Main Electron process
├── package.json             # Project metadata and scripts
├── icon.png                 # App icon
├── renderer/
│   ├── index.html           # Frontend HTML
│   ├── style.css            # App styling
│   └── assets/
│       ├── fonts/           # Custom fonts
│       ├── images/          # Clock animation
│       └── sounds/          # Notification sounds
└── .gitignore
```

---

## 🔧 Configuration

Currently, configuration is done directly in the source files.  
You can modify reminder intervals or sound options inside `main.js` or `renderer/index.html` depending on your logic.

---

## 🩹 Troubleshooting

| Issue                     | Solution                                                        |
| ------------------------- | --------------------------------------------------------------- |
| Notifications not showing | Ensure system notifications are enabled.                        |
| Sound not playing         | Check if your OS allows Electron apps to play audio.            |
| App not launching         | Run `npm install` again or delete `node_modules` and reinstall. |
| Build errors              | Make sure `electron-builder` is properly installed.             |

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
