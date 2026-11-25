const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getState: () => ipcRenderer.invoke("state:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  pause: (minutes) => ipcRenderer.invoke("alerts:pause", minutes),
  resume: () => ipcRenderer.invoke("alerts:resume"),
  testAlert: () => ipcRenderer.invoke("alerts:test"),
  onStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("state:changed", listener);
    return () => ipcRenderer.removeListener("state:changed", listener);
  },
});
