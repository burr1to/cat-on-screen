const { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const { createStore, LIMITS } = require("./settings.cjs");
const autostart = require("./autostart.cjs");
const { createUpdater } = require("./updater.cjs");

const captureArgument = process.argv.find((argument) => argument.startsWith("--capture="));
const capturePath = captureArgument?.slice("--capture=".length);
const isCaptureMode = Boolean(capturePath);
const isSmokeTest = process.argv.includes("--smoke-test");
const isAutomatedTest = isCaptureMode || isSmokeTest;

if (isAutomatedTest) {
  app.disableHardwareAcceleration();
}

// Wayland gives a client no way to carve out a click-through region: a surface
// either takes pointer input or it does not, and both setShape and
// setIgnoreMouseEvents are silently ignored there. A full-screen transparent
// overlay therefore swallows every click meant for the desktop below it. Running
// through XWayland restores X11 shaped-window support, which is the only way
// this overlay can share a screen with other apps. Pass --wayland to opt out and
// run as a native Wayland client (the cat will block input).
const isWaylandSession =
  process.platform === "linux" &&
  (process.env.XDG_SESSION_TYPE === "wayland" || Boolean(process.env.WAYLAND_DISPLAY));

// Ozone picks its platform before this file is executed, so appendSwitch() is
// far too late -- the flag has to be on the real command line. Relaunch once
// with it, which also covers packaged builds where we do not control argv.
// The guard on --ozone-platform makes the relaunch a one-shot.
if (
  isWaylandSession &&
  !isAutomatedTest &&
  process.env.DISPLAY &&
  !process.argv.includes("--wayland") &&
  !process.argv.some((argument) => argument.startsWith("--ozone-platform="))
) {
  // Spawned by hand rather than with app.relaunch(). An AppImage runs from a
  // temporary mount that is torn down when this process exits, and relaunching
  // through Electron left the replacement dying silently with no window. A
  // detached child starts immediately, before any of that teardown, and the
  // AppImage file itself is a stable thing to launch.
  const command = process.env.APPIMAGE || process.execPath;
  const args = process.argv.slice(1).concat("--ozone-platform=x11");

  try {
    require("node:child_process")
      .spawn(command, args, { detached: true, stdio: "ignore" })
      .unref();
    app.exit(0);
  } catch (error) {
    // Better to run without XWayland than not to run at all.
    console.warn(`Could not restart under XWayland: ${error.message}`);
  }
}

// Mirrors the sprite grid in cat-sprite.mjs, which this file cannot import
// because it is CJS. Window size is derived from the configured scale.
const SPRITE_CELLS = Object.freeze({ width: 32, height: 30 });

// Room above the cat for a speech bubble. The window has to contain the bubble,
// so this is the price paid in dead space -- keep it tight.
const BUBBLE_SPACE = 84;

const CAT_START_FRACTION = 0.16;

// A little wider than the cat at small scales, so a speech bubble still has room
// to be readable -- the bubble lives in this window and is clipped by it.
const MIN_WINDOW_WIDTH = 210;

function clampRange(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

// Asking the OS for the display list is not free, and the clamp below runs on
// every position update -- 30 times a second while Kairo is on the move. The
// answer only changes when a display does, and every one of those raises an
// event that clears this.
let cachedWorkArea = null;

function primaryWorkArea() {
  if (!cachedWorkArea) cachedWorkArea = screen.getPrimaryDisplay().workArea;
  return cachedWorkArea;
}

function windowSizeFor(scale) {
  return {
    width: Math.max(SPRITE_CELLS.width * scale, MIN_WINDOW_WIDTH),
    height: SPRITE_CELLS.height * scale + BUBBLE_SPACE
  };
}

// The area Kairo may walk in, in screen coordinates. His floor is the bottom of
// this box, which is why the dock inset shrinks it rather than moving the window.
function stageFor() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  cachedWorkArea = workArea;
  const scale = store?.get().scale ?? 5;
  const size = windowSizeFor(scale);

  return {
    origin: { x: workArea.x, y: workArea.y },
    world: {
      width: workArea.width,
      height: Math.max(size.height, workArea.height - floorInsetFor(display))
    },
    window: size
  };
}

// Kairo stands on the bottom edge of his window, so that edge has to be the top
// of the taskbar. Windows and most desktops report panels through workArea and
// need no help. Some Linux docks (Pop!_OS, Dash to Dock, anything set to
// overlay or auto-hide) reserve nothing, so workArea covers the whole screen and
// the cat's paws end up hidden behind the dock. When a display reserves nothing
// at all we assume an overlay panel and lift the floor; --floor=<px> overrides.
const OVERLAY_DOCK_INSET = 40;

function floorInsetFor(display) {
  const override = process.argv.find((argument) => argument.startsWith("--floor="));
  if (override) return Math.max(0, Math.floor(Number(override.slice("--floor=".length)) || 0));

  const saved = store?.get().floorOffset;
  if (typeof saved === "number") return saved;

  const reservesNothing =
    display.workArea.y === display.bounds.y &&
    display.workArea.height === display.bounds.height;

  return reservesNothing ? OVERLAY_DOCK_INSET : 0;
}

let catWindow = null;
let settingsWindow = null;
let stageOrigin = { x: 0, y: 0 };
let updater = null;
let tray = null;
let store = null;
let isPaused = false;
let isAlwaysOnTop = true;
const WINDOW_MOVE_INTERVAL_MS = 1000 / 30;
let catWindowSize = { width: 0, height: 0 };
let pendingWindowPosition = null;
let appliedWindowPosition = null;
let windowMoveTimer = null;
let lastWindowMoveAt = 0;

function flushWindowPosition() {
  windowMoveTimer = null;
  if (!catWindow || !pendingWindowPosition) return;

  const elapsed = Date.now() - lastWindowMoveAt;
  if (elapsed < WINDOW_MOVE_INTERVAL_MS) {
    windowMoveTimer = setTimeout(flushWindowPosition, WINDOW_MOVE_INTERVAL_MS - elapsed);
    return;
  }

  const position = pendingWindowPosition;
  pendingWindowPosition = null;

  if (!appliedWindowPosition || position.x !== appliedWindowPosition.x || position.y !== appliedWindowPosition.y) {
    catWindow.setPosition(position.x, position.y, false);
    appliedWindowPosition = position;
    lastWindowMoveAt = Date.now();
  }

  if (pendingWindowPosition && !windowMoveTimer) {
    windowMoveTimer = setTimeout(flushWindowPosition, WINDOW_MOVE_INTERVAL_MS);
  }
}

function requestWindowPosition(x, y) {
  pendingWindowPosition = { x, y };
  if (!windowMoveTimer) flushWindowPosition();
}

function setWindowPositionImmediately(x, y) {
  if (!catWindow) return;

  if (windowMoveTimer) {
    clearTimeout(windowMoveTimer);
    windowMoveTimer = null;
  }

  pendingWindowPosition = null;
  catWindow.setPosition(x, y, false);
  appliedWindowPosition = { x, y };
  lastWindowMoveAt = Date.now();
}

function createCatWindow() {
  // A full-screen transparent overlay is the obvious way to build a desktop pet
  // and the wrong one: it covers the panel, every title bar and every close
  // button, and the only thing that would save it -- an X11 input shape -- is not
  // honoured by every compositor (Wayland ignores it outright). So the window is
  // only as large as Kairo plus his speech bubble, and it is moved as he walks.
  // A window that is not over the panel cannot swallow clicks on the panel,
  // whatever the compositor does.
  const stage = stageFor();
  const bounds = isCaptureMode
    ? { x: 0, y: 0, width: 960, height: 600 }
    : {
        x: stage.origin.x + Math.floor(stage.world.width * CAT_START_FRACTION),
        y: stage.origin.y + stage.world.height - stage.window.height,
        width: stage.window.width,
        height: stage.window.height
      };

  catWindow = new BrowserWindow({
    ...bounds,
    title: "Kairo",
    frame: false,
    transparent: !isCaptureMode,
    backgroundColor: isCaptureMode ? "#D9E5EF" : "#00000000",
    alwaysOnTop: !isCaptureMode,
    skipTaskbar: !isCaptureMode,
    // This one flag does the heavy lifting for an overlay. Left focusable, an
    // always-on-top window takes the keyboard (every keystroke goes to the cat
    // instead of the app being used), and the window manager treats it as an
    // ordinary app: accent border, a slot in the tiling layout, and an entry in
    // the dock and window switcher. skipTaskbar alone does not achieve that --
    // some window managers ignore it. Verified on COSMIC: with this set the
    // window is unfocused and absent from _NET_CLIENT_LIST.
    //
    // Deliberately not paired with a `type` hint. "notification" also keeps the
    // window manager away, but compositors commonly force notification windows
    // click-through so they cannot steal a click -- which stops Kairo being
    // clickable at all.
    focusable: isCaptureMode,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  catWindowSize = { width: bounds.width, height: bounds.height };
  appliedWindowPosition = { x: bounds.x, y: bounds.y };

  catWindow.setMenu(null);

  if (!isCaptureMode && process.platform !== "win32") {
    catWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  catWindow.loadFile(path.join(__dirname, "index.html"), {
    query: {
      preview: isCaptureMode ? "1" : "0",
      seed: isCaptureMode ? "23" : String(Date.now())
    }
  });

  catWindow.once("ready-to-show", () => {
    if (isCaptureMode) {
      catWindow.show();
      return;
    }

    catWindow.showInactive();
    catWindow.setAlwaysOnTop(isAlwaysOnTop, "floating");
  });

  catWindow.on("closed", () => {
    if (windowMoveTimer) clearTimeout(windowMoveTimer);
    windowMoveTimer = null;
    pendingWindowPosition = null;
    catWindow = null;
  });

  if (isCaptureMode) {
    catWindow.webContents.once("did-finish-load", async () => {
      const resolvedCapturePath = path.resolve(capturePath);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        const image = await catWindow.webContents.capturePage();
        fs.mkdirSync(path.dirname(resolvedCapturePath), { recursive: true });
        fs.writeFileSync(resolvedCapturePath, image.toPNG());
        console.log(`Sandbox screenshot written to ${resolvedCapturePath}`);
      } catch (error) {
        console.error(`Sandbox screenshot failed: ${error.message}`);
        process.exitCode = 1;
      } finally {
        app.quit();
      }
    });
  }

  if (isSmokeTest) {
    catWindow.webContents.once("did-finish-load", async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const snapshot = await catWindow.webContents.executeJavaScript(
          "window.__KAIRO_TEST__.snapshot()"
        );
        console.log(`Overlay smoke test passed: ${JSON.stringify(snapshot)}`);
      } catch (error) {
        console.error(`Overlay smoke test failed: ${error.message}`);
        process.exitCode = 1;
      } finally {
        app.quit();
      }
    });
  }
}

function sendCommand(command, payload = {}) {
  catWindow?.webContents.send("cat:command", { command, ...payload });
}

function launchTargetForThisApp() {
  return autostart.launchTarget({
    execPath: process.execPath,
    appPath: app.getAppPath(),
    isPackaged: app.isPackaged
  });
}

function launchesAtLogin() {
  if (process.platform === "linux") return autostart.isEnabledLinux();

  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

function setLaunchesAtLogin(enabled) {
  const target = launchTargetForThisApp();

  if (process.platform === "linux") {
    autostart.setEnabledLinux(enabled, target);
    return;
  }

  try {
    app.setLoginItemSettings({ openAtLogin: enabled, path: target.path, args: target.args });
  } catch (error) {
    console.warn(`Could not change the login item: ${error.message}`);
  }
}

function publishSettings() {
  const settings = {
    ...store.get(),
    launchAtLogin: launchesAtLogin(),
    update: updater?.status ?? { state: "idle", message: "", version: app.getVersion() }
  };
  catWindow?.webContents.send("cat:settings", settings);
  settingsWindow?.webContents.send("cat:settings", settings);

  isAlwaysOnTop = settings.alwaysOnTop;
  catWindow?.setAlwaysOnTop(isAlwaysOnTop, "floating");
  updater?.setEnabled(settings.autoUpdate);
  publishStage();
  updateTrayMenu();
}

// The renderer works in stage coordinates and has no idea how big the screen is,
// so it has to be told -- on startup, when the scale changes, and when displays
// change.
function publishStage() {
  if (!catWindow || isCaptureMode) return;

  const stage = stageFor();
  stageOrigin = stage.origin;

  if (catWindowSize.width !== stage.window.width || catWindowSize.height !== stage.window.height) {
    catWindow.setSize(stage.window.width, stage.window.height, false);
    catWindowSize = { width: stage.window.width, height: stage.window.height };
  }

  // `full` must be sent explicitly, not left out: the renderer merges stage
  // updates, so an omitted flag would leave a previous `full: true` in place and
  // the window would stay stage-sized and stop following him.
  catWindow.webContents.send("cat:stage", {
    world: stage.world,
    window: stage.window,
    origin: stage.origin
  });
}

// Drops the window back in the middle of the screen from the main process, so it
// works even if the renderer is not currently painting.
function recentreWindow() {
  if (!catWindow || isCaptureMode) return;

  const stage = stageFor();
  setWindowPositionImmediately(
    stage.origin.x + Math.round((stage.world.width - stage.window.width) / 2),
    stage.origin.y + stage.world.height - stage.window.height
  );
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 360,
    minHeight: 480,
    title: "Kairo settings",
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: "#f1f3f5",
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// Only shows an update entry when there is something to say about it.
function updateMenuItems() {
  const state = updater?.status?.state;

  if (state === "ready") {
    return [
      {
        label: "Restart to finish updating",
        click: () => updater?.installNow()
      }
    ];
  }

  if (!updater?.supported) return [];

  return [
    {
      label: state === "checking" || state === "downloading" ? "Updating..." : "Check for updates",
      enabled: state !== "checking" && state !== "downloading",
      click: () => updater?.checkNow()
    }
  ];
}

function updateTrayMenu() {
  if (!tray) return;

  const menu = Menu.buildFromTemplate([
    {
      label: "Pause Kairo",
      type: "checkbox",
      checked: isPaused,
      click: (menuItem) => {
        isPaused = menuItem.checked;
        sendCommand(isPaused ? "pause" : "resume");
        updateTrayMenu();
      }
    },
    {
      label: "Call Kairo back",
      click: () => {
        recentreWindow();
        sendCommand("reset");
      }
    },
    {
      label: "Make Kairo jump",
      click: () => sendCommand("jump")
    },
    { type: "separator" },
    {
      label: "Settings...",
      click: () => openSettingsWindow()
    },
    ...updateMenuItems(),
    {
      label: "Always on top",
      type: "checkbox",
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        isAlwaysOnTop = menuItem.checked;
        catWindow?.setAlwaysOnTop(isAlwaysOnTop, "floating");
        store?.update({ alwaysOnTop: isAlwaysOnTop });
        updateTrayMenu();
      }
    },
    {
      label: "Start when I log in",
      type: "checkbox",
      checked: launchesAtLogin(),
      click: (menuItem) => {
        setLaunchesAtLogin(menuItem.checked);
        publishSettings();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      accelerator: "CommandOrControl+Q",
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(menu);
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(
    path.join(__dirname, "..", "assets", "app-icon.png")
  );

  if (trayIcon.isEmpty()) {
    console.warn("The tray icon could not be loaded; the tray menu is unavailable.");
    return;
  }

  tray = new Tray(trayIcon.resize({ width: 20, height: 20 }));
  tray.setToolTip("Kairo");
  tray.on("click", () => {
    recentreWindow();
    sendCommand("reset");
  });
  updateTrayMenu();
}

// Called with where the window should be, in stage coordinates. The renderer
// may produce frames faster than the desktop window manager needs to move, so
// requestWindowPosition coalesces them before touching the native window.
ipcMain.on("cat:frame", (event, frame) => {
  if (event.sender !== catWindow?.webContents || isCaptureMode) return;
  if (!frame || !Number.isFinite(frame.x) || !Number.isFinite(frame.y)) return;

  const area = primaryWorkArea();

  // Belt and braces for the freeze described above: whatever the engine asks
  // for, keep a strip of the window on screen so it can never become invisible
  // and get its animation frames throttled away.
  const margin = 60;
  const x = clampRange(
    stageOrigin.x + Math.round(frame.x),
    area.x - catWindowSize.width + margin,
    area.x + area.width - margin
  );
  const y = clampRange(
    stageOrigin.y + Math.round(frame.y),
    area.y - catWindowSize.height + margin,
    area.y + area.height - margin
  );

  requestWindowPosition(x, y);
});

ipcMain.on("cat:settings-request", (event) => {
  if (BrowserWindow.fromWebContents(event.sender) !== catWindow) return;
  publishSettings();
  publishStage();
});

function settingsPayload() {
  return {
    ...store.get(),
    launchAtLogin: launchesAtLogin(),
    update: updater?.status ?? { state: "idle", message: "", version: app.getVersion() }
  };
}

ipcMain.handle("settings:read", () => settingsPayload());
ipcMain.handle("update:check", () => updater?.checkNow() ?? false);
ipcMain.handle("update:install", () => updater?.installNow() ?? false);
ipcMain.handle("settings:limits", () => LIMITS);

ipcMain.handle("settings:write", (_event, patch) => {
  const incoming = patch ?? {};

  // Not a stored setting -- it is applied to the OS and read back from it.
  if (typeof incoming.launchAtLogin === "boolean") {
    setLaunchesAtLogin(incoming.launchAtLogin);
  }

  store.update(incoming);
  publishSettings();
  return settingsPayload();
});

ipcMain.handle("settings:reset", () => {
  store.reset();
  publishSettings();
  // Restoring defaults deliberately leaves the login item alone: it is a system
  // preference, not part of Kairo's appearance.
  return settingsPayload();
});

ipcMain.on("settings:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

const hasSingleInstanceLock = isAutomatedTest || app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => sendCommand("reset"));

  app.whenReady().then(() => {
    const displaysChanged = () => {
      cachedWorkArea = null;
      publishStage();
    };

    screen.on("display-metrics-changed", displaysChanged);
    screen.on("display-added", displaysChanged);
    screen.on("display-removed", displaysChanged);
    store = createStore(app.getPath("userData"));
    isAlwaysOnTop = store.get().alwaysOnTop;
    updater = createUpdater({
      app,
      onStatus: () => {
        // Keep the tray label and any open settings panel in step.
        updateTrayMenu();
        settingsWindow?.webContents.send("cat:settings", settingsPayload());
      }
    });
    createCatWindow();
    if (!isAutomatedTest) createTray();
  });
}

app.on("window-all-closed", () => {
  if (isAutomatedTest || process.platform !== "darwin") app.quit();
});
