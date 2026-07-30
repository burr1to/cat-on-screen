const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kairoSettings", {
  read: () => ipcRenderer.invoke("settings:read"),
  write: (patch) => ipcRenderer.invoke("settings:write", patch),
  reset: () => ipcRenderer.invoke("settings:reset"),
  limits: () => ipcRenderer.invoke("settings:limits"),
  close: () => ipcRenderer.send("settings:close"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  // Keeps the panel honest if something else changes a setting, e.g. the tray
  // toggling "always on top" while this window is open.
  onChanged(callback) {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on("cat:settings", listener);
    return () => ipcRenderer.removeListener("cat:settings", listener);
  }
});
