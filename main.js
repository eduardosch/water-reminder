const { app, BrowserWindow, Tray, Menu } = require("electron");
const path = require("path");

let tray = null;
let popupWindow = null;

function log(message) {
  const now = new Date();
  const timestamp = now.toLocaleString("pt-BR");
  console.log(`[${timestamp}] ${message}`);
}

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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  popupWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Auto-close after 6 seconds
  setTimeout(() => {
    if (popupWindow) {
      popupWindow.close();
      popupWindow = null;
    }
  }, 6000);
}

// Create tray and timer
function createTray() {
  tray = new Tray(path.join(__dirname, "icon.png")); // add any small icon
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Now",
      click: createPopup,
    },
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);
  tray.setToolTip("Hydration Reminder");
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  log("app started");
  createTray();

  // Show popup every 10 minutes (600000 ms)
  setInterval(createPopup, 600000);

  // For testing, show immediately once
  createPopup();
});

app.on("window-all-closed", (e) => e.preventDefault());
