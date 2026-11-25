const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  powerMonitor,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const APP_ID = "com.eduardoschroder.waterreminder";
const LOGIN_ITEM_NAME = "WaterReminder"; // Windows Run key name (also removed by build/installer.nsh)
const HIDDEN_ARG = "--hidden";
const INTERVAL_PRESETS = [15, 30, 45, 60, 90, 120];
const PAUSE_PRESETS = [
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
];
const MIN_INTERVAL = 1;
const MAX_INTERVAL = 480;
const POPUP_DURATION_MS = 6000;

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

let tray = null;
let popupWindow = null;
let settingsWindow = null;
let isQuitting = false;
let alertTimer = null;
let resumeTimer = null;
let nextAlertAt = null;

function log(message) {
  const now = new Date();
  const timestamp = now.toLocaleString("pt-BR");
  console.log(`[${timestamp}] ${message}`);
}

// ---------------------------------------------------------------------------
// Settings store (JSON file in userData)
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  intervalMinutes: 30,
  autoStart: true,
  soundEnabled: true,
  // null = active, number = paused until timestamp (ms), "indefinite" = paused until resumed
  pausedUntil: null,
};

let settings = { ...DEFAULT_SETTINGS };
let isFirstRun = false;

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    if (err.code !== "ENOENT") log(`could not read settings: ${err.message}`);
    isFirstRun = err.code === "ENOENT";
    settings = { ...DEFAULT_SETTINGS };
  }
  settings.intervalMinutes = clampInterval(settings.intervalMinutes);
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch (err) {
    log(`could not save settings: ${err.message}`);
  }
}

function clampInterval(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.intervalMinutes;
  return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, n));
}

// ---------------------------------------------------------------------------
// Start with system
// ---------------------------------------------------------------------------

function autoStartSupported() {
  // In development the executable is electron itself; don't register that.
  return app.isPackaged;
}

function linuxAutostartFile() {
  return path.join(os.homedir(), ".config", "autostart", "water-reminder.desktop");
}

function windowsLoginOptions() {
  return { name: LOGIN_ITEM_NAME, path: process.execPath, args: [HIDDEN_ARG] };
}

function isAutoStartEnabledInOS() {
  if (isWin) return app.getLoginItemSettings(windowsLoginOptions()).executableWillLaunchAtLogin;
  if (isMac) return app.getLoginItemSettings().openAtLogin;
  if (isLinux) return fs.existsSync(linuxAutostartFile());
  return false;
}

function applyAutoStart(enabled) {
  if (!autoStartSupported()) return;
  try {
    if (isWin) {
      // openAtLogin: false deletes the Run registry value, so the app disappears
      // from Task Manager > Startup apps instead of just being marked "Disabled".
      app.setLoginItemSettings({ ...windowsLoginOptions(), openAtLogin: enabled });
    } else if (isMac) {
      app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
    } else if (isLinux) {
      const file = linuxAutostartFile();
      if (enabled) {
        const exec = process.env.APPIMAGE || process.execPath;
        const entry = [
          "[Desktop Entry]",
          "Type=Application",
          "Name=Water Reminder",
          "Comment=Reminds you to drink water",
          `Exec="${exec}" ${HIDDEN_ARG}`,
          "Terminal=false",
          "X-GNOME-Autostart-enabled=true",
          "",
        ].join("\n");
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, entry);
      } else if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    log(`start with system ${enabled ? "enabled" : "disabled"}`);
  } catch (err) {
    log(`could not update start with system: ${err.message}`);
  }
}

function syncAutoStart() {
  if (!autoStartSupported()) return;
  if (isFirstRun) {
    applyAutoStart(settings.autoStart);
    return;
  }
  // Respect changes made outside the app (Task Manager, System Settings, deleting the file).
  const osState = isAutoStartEnabledInOS();
  if (osState !== settings.autoStart) {
    log(`start with system changed outside the app -> ${osState}`);
    settings.autoStart = osState;
    saveSettings();
  }
}

function wasStartedHidden() {
  if (process.argv.includes(HIDDEN_ARG)) return true;
  if (isMac && app.isPackaged) return app.getLoginItemSettings().wasOpenedAtLogin;
  return false;
}

// ---------------------------------------------------------------------------
// Scheduler & pause
// ---------------------------------------------------------------------------

function isPaused() {
  const p = settings.pausedUntil;
  return p === "indefinite" || (typeof p === "number" && p > Date.now());
}

function reschedule() {
  clearTimeout(alertTimer);
  clearTimeout(resumeTimer);
  alertTimer = null;
  resumeTimer = null;
  nextAlertAt = null;

  const p = settings.pausedUntil;
  if (typeof p === "number" && p <= Date.now()) {
    settings.pausedUntil = null; // timed pause expired (e.g. while the app was closed)
    saveSettings();
  }

  if (settings.pausedUntil === "indefinite") {
    // nothing scheduled until the user resumes
  } else if (typeof settings.pausedUntil === "number") {
    resumeTimer = setTimeout(() => {
      log("pause ended");
      resumeAlerts();
    }, settings.pausedUntil - Date.now());
  } else {
    const ms = settings.intervalMinutes * 60 * 1000;
    nextAlertAt = Date.now() + ms;
    alertTimer = setTimeout(() => {
      createPopup();
      reschedule();
    }, ms);
  }
  refreshUI();
}

function pauseAlerts(minutes) {
  settings.pausedUntil = minutes ? Date.now() + minutes * 60 * 1000 : "indefinite";
  saveSettings();
  log(minutes ? `alerts paused for ${minutes} min` : "alerts paused until resumed");
  reschedule();
}

function resumeAlerts() {
  settings.pausedUntil = null;
  saveSettings();
  log("alerts resumed");
  reschedule();
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusText() {
  if (settings.pausedUntil === "indefinite") return "Paused";
  if (isPaused()) return `Paused until ${formatTime(settings.pausedUntil)}`;
  if (nextAlertAt) return `Next reminder at ${formatTime(nextAlertAt)}`;
  return "Active";
}

function getState() {
  return {
    settings: { ...settings },
    paused: isPaused(),
    status: statusText(),
    nextAlertAt,
    autoStartSupported: autoStartSupported(),
    intervalPresets: INTERVAL_PRESETS,
    pausePresets: PAUSE_PRESETS,
    minInterval: MIN_INTERVAL,
    maxInterval: MAX_INTERVAL,
  };
}

function refreshUI() {
  updateTray();
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("state:changed", getState());
  }
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

function createPopup() {
  if (popupWindow) return; // prevent multiple
  log("creating popup window");

  popupWindow = new BrowserWindow({
    width: 300,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  popupWindow.loadFile(path.join(__dirname, "renderer", "index.html"), {
    query: { sound: settings.soundEnabled ? "1" : "0" },
  });
  popupWindow.once("ready-to-show", () => popupWindow && popupWindow.showInactive());
  popupWindow.on("closed", () => {
    popupWindow = null;
  });

  setTimeout(() => {
    if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();
  }, POPUP_DURATION_MS);
}

function showSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.show();
    settingsWindow.focus();
    if (isMac) app.focus({ steal: true });
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 690,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    show: false,
    title: "Water Reminder",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, "renderer", "settings.html"));
  settingsWindow.once("ready-to-show", () => {
    settingsWindow.show();
    if (isMac) app.focus({ steal: true });
  });

  // Closing the window keeps the app running in the tray.
  settingsWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      settingsWindow.hide();
    }
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function trayIcon() {
  const image = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
  if (isMac) return image.resize({ height: 18 });
  if (isWin) return image.resize({ width: 32, height: 32 });
  return image.resize({ width: 24, height: 24 });
}

function buildTrayMenu() {
  const paused = isPaused();
  const intervals = INTERVAL_PRESETS.includes(settings.intervalMinutes)
    ? INTERVAL_PRESETS
    : [...INTERVAL_PRESETS, settings.intervalMinutes].sort((a, b) => a - b);

  const pauseItem = paused
    ? { label: "Resume alerts", click: resumeAlerts }
    : {
        label: "Pause alerts",
        submenu: [
          ...PAUSE_PRESETS.map((p) => ({ label: `For ${p.label}`, click: () => pauseAlerts(p.minutes) })),
          { type: "separator" },
          { label: "Until I resume", click: () => pauseAlerts(null) },
        ],
      };

  return Menu.buildFromTemplate([
    { label: statusText(), enabled: false },
    { type: "separator" },
    { label: "Show reminder now", click: createPopup },
    {
      label: "Interval",
      submenu: intervals.map((m) => ({
        label: `Every ${m} min`,
        type: "radio",
        checked: m === settings.intervalMinutes,
        click: () => updateSettings({ intervalMinutes: m }),
      })),
    },
    pauseItem,
    {
      label: "Start with system",
      type: "checkbox",
      checked: settings.autoStart,
      enabled: autoStartSupported(),
      click: (item) => updateSettings({ autoStart: item.checked }),
    },
    { type: "separator" },
    { label: "Settings…", click: showSettings },
    { label: "Quit", click: () => app.quit() },
  ]);
}

function updateTray() {
  if (!tray) return;
  tray.setContextMenu(buildTrayMenu());
  tray.setToolTip(`Water Reminder — ${statusText()}`);
}

function createTray() {
  tray = new Tray(trayIcon());
  if (isWin) tray.on("click", showSettings);
  updateTray();
}

// ---------------------------------------------------------------------------
// Settings updates & IPC
// ---------------------------------------------------------------------------

function updateSettings(patch) {
  let needsReschedule = false;

  if (patch.intervalMinutes !== undefined) {
    const value = clampInterval(patch.intervalMinutes);
    if (value !== settings.intervalMinutes) {
      settings.intervalMinutes = value;
      needsReschedule = true;
      log(`interval set to ${value} min`);
    }
  }
  if (patch.soundEnabled !== undefined) settings.soundEnabled = Boolean(patch.soundEnabled);
  if (patch.autoStart !== undefined) {
    settings.autoStart = Boolean(patch.autoStart);
    applyAutoStart(settings.autoStart);
  }

  saveSettings();
  if (needsReschedule) reschedule();
  else refreshUI();
  return getState();
}

function registerIpc() {
  ipcMain.handle("state:get", () => getState());
  ipcMain.handle("settings:set", (_e, patch) => updateSettings(patch || {}));
  ipcMain.handle("alerts:pause", (_e, minutes) => {
    pauseAlerts(minutes ? Number(minutes) : null);
    return getState();
  });
  ipcMain.handle("alerts:resume", () => {
    resumeAlerts();
    return getState();
  });
  ipcMain.handle("alerts:test", () => {
    createPopup();
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

if (isLinux) app.commandLine.appendSwitch("enable-transparent-visuals");
if (isWin) app.setAppUserModelId(APP_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showSettings());

  app.whenReady().then(() => {
    log("app started");
    if (isMac && app.dock) app.dock.hide();

    loadSettings();
    syncAutoStart();
    saveSettings();
    registerIpc();
    createTray();
    reschedule();

    powerMonitor.on("resume", () => {
      log("system resumed from sleep");
      reschedule();
    });

    if (!wasStartedHidden()) showSettings();
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  // Keep running in the tray when all windows are closed.
  app.on("window-all-closed", (e) => e.preventDefault());

  // macOS: clicking the app in Finder/Launchpad while running opens settings.
  app.on("activate", () => showSettings());
}
