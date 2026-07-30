const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPet", {
  platform: process.platform,
  // Where the window should sit, in stage coordinates, once per frame.
  placeWindow(frame) {
    ipcRenderer.send("cat:frame", frame);
  },
  onStage(callback) {
    const listener = (_event, stage) => callback(stage);
    ipcRenderer.on("cat:stage", listener);
    return () => ipcRenderer.removeListener("cat:stage", listener);
  },
  onCommand(callback) {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("cat:command", listener);
    return () => ipcRenderer.removeListener("cat:command", listener);
  },
  onSettings(callback) {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on("cat:settings", listener);
    // Ask for the current values straight away rather than waiting for a change.
    ipcRenderer.send("cat:settings-request");
    return () => ipcRenderer.removeListener("cat:settings", listener);
  }
});
