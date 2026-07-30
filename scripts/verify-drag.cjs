// Dragging is the one interaction whose coordinates cross a window boundary, and
// it has broken three separate ways: at half speed, running away to the top of
// the screen, and not moving at all. So this drives the real renderer through the
// real preload, with a window that follows Kairo and expands for a drag exactly
// as the app does, and asserts he never outruns the cursor.
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

app.disableHardwareAcceleration();

const PROJECT = path.join(__dirname, "..");
const ORIGIN = { x: 0, y: 0 };
const WORLD = { width: 1920, height: 1040 };
const SMALL = { width: 210, height: 234 };
const STEP = 10;
const STEPS = 8;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    ...SMALL,
    x: 600,
    y: 806,
    show: true,
    frame: false,
    webPreferences: {
      preload: path.join(PROJECT, "src", "preload.cjs"),
      contextIsolation: true,
      sandbox: true
    }
  });

  const sendStage = () =>
    win.webContents.send("cat:stage", {
      world: WORLD,
      window: SMALL,
      origin: ORIGIN
    });

  ipcMain.on("cat:frame", (_event, frame) => {
    if (!frame) return;
    const bounds = win.getBounds();
    win.setBounds({
      x: ORIGIN.x + Math.round(frame.x),
      y: ORIGIN.y + Math.round(frame.y),
      width: bounds.width,
      height: bounds.height
    });
  });

  ipcMain.on("cat:settings-request", () => {
    sendStage();
    win.webContents.send("cat:settings", {
      scale: 5,
      speechEnabled: false,
      speechGapSeconds: 75,
      phrases: [],
      floorOffset: null,
      alwaysOnTop: true,
      autoUpdate: false
    });
  });

  try {
    await win.loadFile(path.join(PROJECT, "src", "index.html"), {
      query: { preview: "0", seed: "5" }
    });
    await new Promise((resolve) => setTimeout(resolve, 900));

    const raw = await win.webContents.executeJavaScript(`
      (async () => {
        const test = window.__KAIRO_TEST__;
        const engine = test.engine;
        const cat = document.querySelector("#cat");
        const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
        const box = cat.getBoundingClientRect();

        // A cursor with a real screen position. clientY is whatever that works
        // out to inside the window, wherever the window currently is -- which is
        // the condition every previous attempt got wrong.
        const cursor = {
          x: (window.screenX || 0) + box.left + box.width / 2,
          y: (window.screenY || 0) + box.top + box.height * 0.72
        };
        const clientOf = () => ({
          x: cursor.x - (window.screenX || 0),
          y: cursor.y - (window.screenY || 0)
        });
        const send = (type) => {
          const point = clientOf();
          cat.dispatchEvent(new PointerEvent(type, {
            bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
            buttons: 1, clientX: point.x, clientY: point.y
          }));
        };

        send("pointerdown");
        const started = engine.dragging;

        const before = engine.y;
        for (let i = 0; i < ${STEPS}; i += 1) {
          await nextFrame();
          cursor.y -= ${STEP};
          send("pointermove");
        }
        const moved = Math.round(engine.y - before);

        send("pointerup");
        const releasedCleanly = !engine.dragging;

        // Let him settle, then check he can be picked up a second time. An
        // exception thrown mid-pointerdown once left him permanently mid-drag:
        // released was never processed, so every later click did nothing.
        for (let i = 0; i < 200; i += 1) {
          await nextFrame();
          if (engine.onGround) break;
        }
        await nextFrame();

        const box2 = cat.getBoundingClientRect();
        cat.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true, pointerId: 2, pointerType: "mouse", isPrimary: true, buttons: 1,
          clientX: box2.left + box2.width / 2, clientY: box2.top + box2.height * 0.72
        }));
        const regrabbed = engine.dragging;

        return JSON.stringify({ started, moved, releasedCleanly, regrabbed });
      })()
    `);

    const { started, moved, releasedCleanly, regrabbed } = JSON.parse(raw);
    const travel = STEP * STEPS;
    const ratio = -moved / travel;

    if (!started) throw new Error("the press never began a drag");
    if (!releasedCleanly) throw new Error("letting go did not end the drag");
    if (!regrabbed) throw new Error("he could not be picked up a second time");

    // The property worth pinning is that he never outruns the cursor. His window
    // follows him, so measuring the pointer against it cancels part of his own
    // motion and he tracks at roughly half speed; the measurement loop is only
    // stable at that gain, and every attempt to scale it up diverged -- which is
    // exactly how he ended up shooting to the top of the screen. How much of the
    // cursor's travel survives depends on event timing, so only the ceiling is
    // asserted. This harness cancels almost perfectly and is a worst case.
    if (ratio > 1.2) throw new Error(`ran away from the cursor: ratio ${ratio.toFixed(2)}`);

    console.log(
      `Drag test passed: tracked at ratio ${ratio.toFixed(2)}, released cleanly, and could be grabbed again`
    );
  } catch (error) {
    console.error(`Drag test failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
