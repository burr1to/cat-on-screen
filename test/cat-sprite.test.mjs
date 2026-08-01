import assert from "node:assert/strict";
import test from "node:test";

import { CatEngine } from "../src/cat-engine.mjs";
import {
  SPRITE_DATA,
  SPRITE_WIDTH,
  SPRITE_HEIGHT,
  CAT_TOP,
  SCALE
} from "../src/cat-sprite.mjs";

const { PALETTE, PARTS, POSES, ANIMATIONS, EMOTES } = SPRITE_DATA;
const CAT_ROWS = SPRITE_HEIGHT - CAT_TOP;

test("the scaled sprite exactly fills the engine's cat box", () => {
  // The engine treats the element's bottom edge as the floor, so a mismatch here
  // makes the cat hover above the taskbar or sink below it.
  const { options } = new CatEngine({ width: 800, height: 600 });

  assert.equal(SPRITE_WIDTH * SCALE, options.catWidth);
  assert.equal(SPRITE_HEIGHT * SCALE, options.catHeight);
});

test("every pixel row is rectangular and uses a defined palette colour", () => {
  for (const [name, rows] of Object.entries(PARTS)) {
    const width = rows[0].length;

    rows.forEach((row, index) => {
      assert.equal(row.length, width, `${name} row ${index} is a ragged width`);

      for (const key of row) {
        assert.ok(
          key === "." || PALETTE[key],
          `${name} row ${index} uses undefined palette key "${key}"`
        );
      }
    });
  }
});

test("every pose layer references a real part and stays inside the sprite", () => {
  for (const [name, layers] of Object.entries(POSES)) {
    for (const [part, x, y] of layers) {
      const rows = PARTS[part];
      assert.ok(rows, `pose ${name} references unknown part "${part}"`);
      assert.ok(x >= 0 && x + rows[0].length <= SPRITE_WIDTH, `pose ${name} overflows horizontally`);
      assert.ok(y >= 0 && y + rows.length <= CAT_ROWS, `pose ${name} overflows vertically`);
    }
  }
});

test("animations and emotes reference poses and parts that exist", () => {
  for (const [state, animation] of Object.entries(ANIMATIONS)) {
    assert.ok(animation.fps > 0, `${state} needs a positive frame rate`);
    assert.ok(animation.poses.length > 0, `${state} needs at least one pose`);

    for (const pose of animation.poses) {
      assert.ok(POSES[pose], `animation ${state} references unknown pose "${pose}"`);
    }
  }

  for (const [state, emote] of Object.entries(EMOTES)) {
    assert.ok(PARTS[emote.part], `emote ${state} references unknown part "${emote.part}"`);
    assert.equal(
      emote.columns.length,
      emote.count,
      `emote ${state} needs one column per instance`
    );
  }
});

test("each engine state has an animation, and the cat always reaches the floor", () => {
  const states = [
    "idle",
    "walk",
    "run",
    "sit",
    "loaf",
    "groom",
    "lick",
    "knead",
    "scratch",
    "yawn",
    "drink",
    "perk",
    "blink",
    "crouch",
    "chase",
    "roll",
    "stretch",
    "shake",
    "sleep",
    "jump",
    "fall",
    "drag",
    "happy"
  ];

  for (const state of states) {
    assert.ok(ANIMATIONS[state], `state "${state}" has no animation`);
  }

  // Grounded poses must touch the last row, otherwise the cat floats above the
  // taskbar instead of standing on it.
  const grounded = [
    "stand",
    "walkSpread",
    "walkCross",
    "sit",
    "sleep",
    "groomLow",
    "lickA",
    "rollA",
    "loaf",
    "crouchLeft",
    "kneadLeft",
    "perk",
    "drinkDown",
    "yawnStart",
    "scratchUp",
    "chaseWatch"
  ];

  for (const name of grounded) {
    const lowest = Math.max(
      ...POSES[name].map(([part, , y]) => y + PARTS[part].length)
    );
    assert.equal(lowest, CAT_ROWS, `pose ${name} does not rest on the floor`);
  }
});
