// Dragging is the one interaction whose coordinates cross a window boundary, and
// it broke silently once: the renderer used window-relative pointer positions
// while the engine works in screen-stage coordinates. Because Kairo's window
// follows him, that halved his travel and he could not be dragged across the
// whole screen. This asserts a pointer move of N pixels moves him N pixels.
const { app, BrowserWindow } = require("electron");
const path = require("node:path");

app.disableHardwareAcceleration();

const PROJECT = path.join(__dirname, "..");
const POINTER_TRAVEL = 600;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 210, height: 234, x: 400, y: 500, show: true });

  try {
    await win.loadFile(path.join(PROJECT, "src", "index.html"), {
      query: { preview: "0", seed: "5" }
    });
    await new Promise((resolve) => setTimeout(resolve, 700));

    const raw = await win.webContents.executeJavaScript(`
      (() => {
        const test = window.__KAIRO_TEST__;
        const engine = test.engine;
        engine.setViewport(1920, 1040);
        test.stage.origin = { x: 0, y: 0 };
        engine.x = 300;
        engine.y = engine.groundY;
        engine.state = "idle";

        const cat = document.querySelector("#cat");
        const box = cat.getBoundingClientRect();
        const clientX = box.left + box.width / 2;
        const clientY = box.top + box.height * 0.72;
        const make = (type, screenX) =>
          new PointerEvent(type, {
            bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true,
            buttons: 1, clientX, clientY, screenX, screenY: 800
          });

        cat.dispatchEvent(make("pointerdown", 900));
        const started = engine.dragging;
        const before = engine.x;
        cat.dispatchEvent(make("pointermove", 900 + ${POINTER_TRAVEL}));

        return JSON.stringify({ started, moved: Math.round(engine.x - before) });
      })()
    `);

    const { started, moved } = JSON.parse(raw);

    if (!started) throw new Error("the press never began a drag");
    if (moved !== POINTER_TRAVEL) {
      throw new Error(`pointer moved ${POINTER_TRAVEL}px but Kairo moved ${moved}px`);
    }

    console.log(`Drag test passed: ${POINTER_TRAVEL}px of pointer travel moved Kairo ${moved}px`);
  } catch (error) {
    console.error(`Drag test failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
