const { app, BrowserWindow, nativeImage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.whenReady().then(() => {
  const sourcePath = path.join(__dirname, "..", "assets", "tray-cat.svg");
  const outputPath = path.join(__dirname, "..", "assets", "app-icon.png");
  const window = new BrowserWindow({
    width: 512,
    height: 512,
    show: true,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false
  });

  window.webContents.once("did-finish-load", async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const icon = await window.webContents.capturePage();
      fs.writeFileSync(outputPath, icon.toPNG());
      if (nativeImage.createFromPath(outputPath).isEmpty()) {
        throw new Error("the generated PNG could not be loaded by Electron");
      }
      console.log(`App icon written to ${outputPath}`);
    } catch (error) {
      console.error(`Could not render ${sourcePath}: ${error.message}`);
      process.exitCode = 1;
    } finally {
      app.quit();
    }
  });

  window.loadFile(sourcePath);
});
