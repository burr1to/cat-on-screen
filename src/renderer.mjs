import { CatEngine, createSeededRandom } from "./cat-engine.mjs";
import { createSprite, SPRITE_WIDTH, SPRITE_HEIGHT, SCALE } from "./cat-sprite.mjs";

const parameters = new URLSearchParams(window.location.search);
const isPreview = parameters.get("preview") === "1";
const isDebug = parameters.get("debug") === "1";
const seed = Number(parameters.get("seed") || Date.now());
const catElement = document.querySelector("#cat");
const stateLabel = document.querySelector(".state-label");
const bubbleElement = document.querySelector("#bubble");
const bubbleTextElement = document.querySelector("#bubble-text");

document.body.classList.toggle("preview", isPreview);
document.body.classList.toggle("debug", isDebug);

const sprite = createSprite({
  catCanvas: document.querySelector("#cat-canvas"),
  emoteCanvas: document.querySelector("#emote-canvas")
});

const engine = new CatEngine({
  width: window.innerWidth,
  height: window.innerHeight,
  random: createSeededRandom(seed),
  now: performance.now()
});

if (isPreview) {
  engine.x = 540;
  engine.direction = 1;
  engine.state = "walk";
  engine.nextDecisionAt = performance.now() + 5000;
}

let previousTime = performance.now();
let pointerStart = null;
let scale = SCALE;
let shownSpeech = null;

// Everything that touches the DOM or a canvas runs at this rate rather than at
// the display's refresh rate. Nothing can appear faster than this anyway: the
// window is only moved 30 times a second, and the quickest sprite animation is
// 11 frames a second. Painting more often only costs a compositing pass over the
// desktop -- which on Windows is DWM work on a transparent always-on-top window,
// and is where most of Kairo's CPU went on a 60Hz or 144Hz screen.
const RENDER_INTERVAL_MS = 1000 / 30;
let lastRenderAt = -Infinity;
let lastWindowPosition = null;

// What the DOM was last told. Writing an identical value still invalidates style
// and layout for the element, so every write below is gated on a change.
let lastTransform = null;
let lastState = null;
let lastDirection = null;
let lastBubbleTransform = null;
let bubbleSize = null;

// The window is only as big as Kairo plus bubble room, and he is pinned to the
// bottom of it. Everything above him is bubble space.
let stage = {
  world: { width: window.innerWidth, height: window.innerHeight },
  window: { width: Math.max(SPRITE_WIDTH * SCALE, 210), height: SPRITE_HEIGHT * SCALE + 84 },
  origin: { x: 0, y: 0 }
};

// Where the head sits inside the sprite, so the bubble can point at it rather
// than at the middle of the cat.
const HEAD_CENTRE_CELL = 22.5;

function catTopInWindow() {
  return stage.window.height - engine.options.catHeight;
}

// Preview mode has no following window -- it is one big scene, so Kairo is placed
// by his stage position exactly as he used to be. In the real overlay he is
// pinned inside his own small window and the window does the travelling.
function catOrigin() {
  if (isPreview) return { x: engine.x, y: engine.y };
  // Centred, because the window is wider than he is to leave bubble room.
  return {
    x: Math.round((stage.window.width - engine.options.catWidth) / 2),
    y: catTopInWindow()
  };
}

function pageWidth() {
  return isPreview ? window.innerWidth : stage.window.width;
}

// Must be 1. Kairo's window follows him, so clientX is measured against a frame
// of reference that moves with him: his own motion cancels exactly half of the
// cursor's, and a drag tracks at half speed. It is tempting to scale that back
// up, but the measurement loop is only stable at a gain of 1 -- simulating the
// loop at 2 sends him to 4.9e12 px, and at 10 to 8.3e40. Every previous attempt
// to recover full speed was some form of gain > 1, which is why he shot to the
// top of the screen.
//
// Half speed is the price of a window that never resizes, and therefore never
// flickers or throws him across the screen. Full speed needs a stationary
// window covering the drag area; see the README.
const DRAG_GAIN = 1;

// Dragging cannot trust any global pointer coordinate here.
//
// Kairo's window is moved every frame to follow him, and Wayland does not tell a
// client where the cursor is on screen -- under XWayland those coordinates can
// come back window-relative. Both ways of using them failed in practice:
// absolute screenX fed his own position back into itself and he accelerated away
// from the cursor, and movementX (which Chromium derives from the same numbers)
// went to nearly zero while the window chased the pointer, so he would not drag
// at all.
//
// Dragging reads clientX/clientY directly. Those are window-relative, and the
// window follows Kairo, so his own motion cancels part of the cursor's: the
// measured movement comes out smaller than the real one. DRAG_GAIN scales it
// back up. The loop is stable -- it converges on a fixed ratio rather than
// running away -- so this trades a little precision for a window that never
// resizes, and therefore never flickers or jumps him across the screen.
let dragPointer = null;

// Where the press landed, in both stage and window coordinates. A drag is
// measured as a displacement from here.
let dragGrab = null;

function applyScale(nextScale) {
  scale = nextScale;
  const width = SPRITE_WIDTH * scale;
  const height = SPRITE_HEIGHT * scale;
  catElement.style.width = `${width}px`;
  catElement.style.height = `${height}px`;
  engine.options.catWidth = width;
  engine.options.catHeight = height;
  engine.setViewport(stage.world.width, stage.world.height);
  // The bubble's max-width is a share of the window, so a resize can change how
  // a line wraps.
  bubbleSize = null;
  layOutCat();
}

function layOutCat() {
  const origin = catOrigin();
  const transform = `translate3d(${Math.round(origin.x)}px, ${Math.round(origin.y)}px, 0)`;
  if (transform === lastTransform) return;

  catElement.style.transform = transform;
  lastTransform = transform;
}

function updateBubble() {
  const speech = engine.speech;

  if (!speech) {
    if (shownSpeech !== null) {
      bubbleElement.hidden = true;
      shownSpeech = null;
      bubbleSize = null;
      lastBubbleTransform = null;
    }
    return;
  }

  if (speech.text !== shownSpeech) {
    bubbleTextElement.textContent = speech.text;
    bubbleElement.hidden = false;
    shownSpeech = speech.text;
    // Restart the pop animation for each new line.
    bubbleElement.style.animation = "none";
    void bubbleElement.offsetWidth;
    bubbleElement.style.animation = "";
    bubbleSize = null;
  }

  // Reading offsetWidth forces the browser to finish layout there and then.
  // Measuring per frame did that for every frame of the four seconds a line is
  // up; the box only changes when the text or the window does, so measure then.
  if (!bubbleSize) {
    bubbleSize = {
      width: bubbleElement.offsetWidth,
      height: bubbleElement.offsetHeight
    };
  }

  const { width, height } = bubbleSize;
  const origin = catOrigin();
  const headOffset =
    engine.direction === 1
      ? HEAD_CENTRE_CELL * scale
      : engine.options.catWidth - HEAD_CENTRE_CELL * scale;

  // Must stay inside the page, which in the real overlay is the window -- outside
  // it the bubble is simply clipped away.
  const left = Math.round(
    Math.min(Math.max(origin.x + headOffset - width / 2, 0), Math.max(0, pageWidth() - width))
  );
  const top = Math.round(Math.max(0, origin.y - height - 2));
  const transform = `translate3d(${left}px, ${top}px, 0)`;

  if (transform === lastBubbleTransform) return;
  bubbleElement.style.transform = transform;
  lastBubbleTransform = transform;
}

function updateView(now) {
  const elapsed = (now - previousTime) / 1000;
  previousTime = now;

  // The simulation is cheap and stays on every frame, so physics is unchanged;
  // it is the painting below that is capped.
  engine.step(elapsed, now);

  // The tolerance keeps a 30Hz screen from dropping every other frame to jitter.
  if (now - lastRenderAt >= RENDER_INTERVAL_MS - 1) {
    lastRenderAt = now;
    draw(now);
  }

  window.requestAnimationFrame(updateView);
}

function draw(now) {
  if (engine.state !== lastState) {
    catElement.dataset.state = engine.state;
    stateLabel.textContent = engine.state;
    lastState = engine.state;
  }

  if (engine.direction !== lastDirection) {
    catElement.dataset.direction = String(engine.direction);
    lastDirection = engine.direction;
  }

  layOutCat();
  sprite.render(engine.state, engine.direction, now);
  updateBubble();

  if (isPreview) return;

  const origin = catOrigin();
  const position = { x: engine.x - origin.x, y: engine.y - origin.y };
  const changed =
    !lastWindowPosition ||
    position.x !== lastWindowPosition.x ||
    position.y !== lastWindowPosition.y;

  if (changed) {
    window.desktopPet?.placeWindow(position);
    lastWindowPosition = position;
  }
}

// The sprite is much smaller than its element box -- the headroom above the cat
// exists only so emotes have somewhere to float. Ignore presses that land on
// transparent pixels so they reach whatever is on the desktop underneath.
function hitsCat(event) {
  const bounds = catElement.getBoundingClientRect();
  let column = Math.floor(((event.clientX - bounds.left) / bounds.width) * SPRITE_WIDTH);
  const row = Math.floor(((event.clientY - bounds.top) / bounds.height) * SPRITE_HEIGHT);

  if (engine.direction === -1) column = SPRITE_WIDTH - 1 - column;

  return sprite.isOpaqueAt(column, row);
}

catElement.addEventListener("pointerdown", (event) => {
  if (!hitsCat(event)) return;

  // Anchor the virtual pointer to where inside him the press landed. This is the
  // only measurement taken, and it is element-relative, so it cannot be thrown
  // off by where the window happens to be.
  const bounds = catElement.getBoundingClientRect();
  const point = {
    x: engine.x + (event.clientX - bounds.left),
    y: engine.y + (event.clientY - bounds.top)
  };

  if (!engine.beginDrag(point.x, point.y, performance.now())) return;
  dragPointer = { ...point };
  dragGrab = { stage: { ...point }, client: { x: event.clientX, y: event.clientY } };
  pointerStart = {
    x: point.x,
    y: point.y,
    time: performance.now()
  };
  catElement.setPointerCapture(event.pointerId);
  event.preventDefault();
});

catElement.addEventListener("pointermove", (event) => {
  if (!engine.dragging || !dragGrab) return;

  dragPointer = {
    x: dragGrab.stage.x + (event.clientX - dragGrab.client.x) * DRAG_GAIN,
    y: dragGrab.stage.y + (event.clientY - dragGrab.client.y) * DRAG_GAIN
  };
  engine.dragTo(dragPointer.x, dragPointer.y, performance.now());
});

function finishPointer(event) {
  if (!engine.dragging || !pointerStart) return;

  const point = dragPointer ?? pointerStart;
  const distance = Math.hypot(point.x - pointerStart.x, point.y - pointerStart.y);
  const duration = performance.now() - pointerStart.time;
  const wasTap = distance < 7 && duration < 360;

  engine.endDrag(performance.now(), { toss: !wasTap });
  if (wasTap) engine.pet(performance.now());
  pointerStart = null;
  dragPointer = null;
  dragGrab = null;
}

catElement.addEventListener("pointerup", finishPointer);
catElement.addEventListener("pointercancel", finishPointer);

catElement.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    engine.pet(performance.now());
    event.preventDefault();
  }
});

window.addEventListener("resize", () => {
  bubbleSize = null;
  layOutCat();
});

window.desktopPet?.onStage((next) => {
  if (!next) return;
  stage = { ...stage, ...next };
  lastWindowPosition = null;
  bubbleSize = null;
  engine.setViewport(stage.world.width, stage.world.height);
  layOutCat();
});

window.desktopPet?.onSettings((settings) => {
  if (!settings) return;
  if (settings.scale !== scale) applyScale(settings.scale);
  engine.configureSpeech(
    {
      enabled: settings.speechEnabled,
      gapSeconds: settings.speechGapSeconds,
      phrases: settings.phrases
    },
    performance.now()
  );
});

window.desktopPet?.onCommand(({ command }) => {
  const now = performance.now();

  if (command === "pause") engine.pause();
  if (command === "resume") engine.resume(now);
  if (command === "reset") engine.reset(now);
  if (command === "jump") engine.jump(now);
});

window.__KAIRO_TEST__ = {
  engine,
  get stage() {
    return stage;
  },
  get spriteScale() {
    return scale;
  },
  snapshot() {
    return {
      x: engine.x,
      y: engine.y,
      state: engine.state,
      direction: engine.direction,
      onGround: engine.onGround,
      scale,
      // Proves the settings pipeline reached the renderer, not just that the
      // engine booted.
      phrases: engine.speechConfig.phrases.length,
      speaking: engine.speech?.text ?? null
    };
  }
};

layOutCat();
window.requestAnimationFrame(updateView);
