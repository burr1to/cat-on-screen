import assert from "node:assert/strict";
import test from "node:test";

import { CatEngine, createSeededRandom } from "../src/cat-engine.mjs";

test("seeded random produces a repeatable sequence", () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);
  assert.deepEqual(
    [first(), first(), first(), first()],
    [second(), second(), second(), second()]
  );
});

test("walking moves the cat and turns it around at the screen edge", () => {
  const engine = new CatEngine({ width: 500, height: 400, random: () => 0.5 });
  engine.state = "walk";
  engine.nextDecisionAt = 100_000;
  const initialX = engine.x;

  engine.step(0.05, 10);
  assert.ok(engine.x > initialX);

  engine.x = engine.maxX - 1;
  engine.direction = 1;
  engine.step(0.05, 20);
  assert.equal(engine.x, engine.maxX);
  assert.equal(engine.direction, -1);
});

test("jump applies gravity and returns the cat to the floor", () => {
  const engine = new CatEngine({ width: 700, height: 500, random: () => 0.5 });
  assert.equal(engine.jump(0), true);
  assert.equal(engine.onGround, false);

  for (let frame = 0; frame < 240 && !engine.onGround; frame += 1) {
    engine.step(1 / 60, frame * (1000 / 60));
  }

  assert.equal(engine.onGround, true);
  assert.equal(engine.y, engine.groundY);
  assert.equal(engine.state, "idle");
});

test("dragging and throwing carries pointer velocity into a fall", () => {
  const engine = new CatEngine({ width: 800, height: 600, random: () => 0.5 });
  engine.beginDrag(engine.x + 50, engine.y + 40, 0);
  engine.dragTo(engine.x + 170, engine.y - 40, 100);
  const draggedX = engine.x;
  engine.endDrag(110);

  assert.equal(engine.dragging, false);
  assert.ok(engine.vx > 0);
  assert.ok(engine.vy < 0);

  engine.step(0.05, 160);
  assert.ok(engine.x > draggedX);
  assert.equal(engine.state, "jump");
});

test("idle behaviours are reachable and none of them drift the cat", () => {
  const seen = new Set();

  for (let step = 0; step < 1000; step += 1) {
    const engine = new CatEngine({ width: 900, height: 600, random: () => step / 1000 });
    engine.chooseNextBehavior(0);
    seen.add(engine.state);

    if (engine.onGround && engine.state !== "walk" && engine.state !== "run") {
      const startX = engine.x;
      engine.step(0.05, 10);
      assert.equal(engine.x, startX, `state "${engine.state}" moved the cat sideways`);
    }
  }

  for (const state of [
    "idle",
    "sit",
    "groom",
    "lick",
    "roll",
    "stretch",
    "sleep",
    "walk",
    "run",
    "jump"
  ]) {
    assert.ok(seen.has(state), `behaviour "${state}" is never chosen`);
  }
});

test("reset and viewport changes keep the cat on screen", () => {
  const engine = new CatEngine({ width: 1000, height: 700, random: () => 0.9 });
  engine.reset(0);
  assert.equal(engine.state, "happy");
  assert.ok(engine.x >= 0 && engine.x <= engine.maxX);
  assert.equal(engine.y, engine.groundY);

  engine.setViewport(420, 300);
  assert.ok(engine.x >= 0 && engine.x <= engine.maxX);
  assert.equal(engine.y, engine.groundY);
});


test("speech appears on a randomised schedule and expires on its own", () => {
  const engine = new CatEngine({ width: 900, height: 600, random: () => 0.5 });
  engine.configureSpeech({ enabled: true, gapSeconds: 20, phrases: ["Meow", "Hello"] }, 0);

  let firstSpokeAt = null;
  for (let time = 0; time < 60_000 && firstSpokeAt === null; time += 100) {
    engine.step(0.1, time);
    if (engine.speech) firstSpokeAt = time;
  }

  assert.ok(firstSpokeAt !== null, "Kairo never said anything");
  assert.ok(engine.speech.text.length > 0);

  // The bubble must clear itself even if nothing else happens.
  engine.step(0.1, firstSpokeAt + engine.options.speechHoldMs + 1);
  assert.equal(engine.speech, null);
});

test("speech stays off when disabled or when there is nothing to say", () => {
  const engine = new CatEngine({ width: 900, height: 600, random: () => 0.5 });

  engine.configureSpeech({ enabled: false, gapSeconds: 1, phrases: ["Meow"] }, 0);
  for (let time = 0; time < 30_000; time += 100) engine.step(0.1, time);
  assert.equal(engine.speech, null);

  engine.configureSpeech({ enabled: true, gapSeconds: 1, phrases: [] }, 0);
  for (let time = 0; time < 30_000; time += 100) engine.step(0.1, time);
  assert.equal(engine.speech, null);
});

test("a sleeping or dragged cat does not talk", () => {
  for (const setup of [
    (engine) => {
      engine.state = "sleep";
      engine.nextDecisionAt = Number.POSITIVE_INFINITY;
    },
    (engine) => engine.beginDrag(engine.x + 10, engine.y + 10, 0)
  ]) {
    const engine = new CatEngine({ width: 900, height: 600, random: () => 0.5 });
    engine.configureSpeech({ enabled: true, gapSeconds: 1, phrases: ["Meow"] }, 0);
    setup(engine);

    for (let time = 0; time < 20_000; time += 100) engine.step(0.1, time);
    assert.equal(engine.speech, null);
  }
});

test("petting gets a reply", () => {
  const engine = new CatEngine({ width: 900, height: 600, random: () => 0.5 });
  engine.configureSpeech({ enabled: true, gapSeconds: 600, phrases: ["I love you"] }, 0);

  engine.pet(1000);
  assert.equal(engine.speech.text, "I love you");
  assert.equal(engine.state, "happy");
});
