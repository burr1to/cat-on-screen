import assert from "node:assert/strict";
import test from "node:test";

import { normalise, DEFAULTS, LIMITS } from "../src/settings.cjs";

test("garbage in the settings file falls back to defaults instead of throwing", () => {
  for (const input of [null, undefined, 42, "nope", [], { scale: "big" }]) {
    const settings = normalise(input);
    assert.equal(settings.scale, DEFAULTS.scale);
    assert.ok(settings.phrases.length > 0);
  }
});

test("numeric settings are clamped to their limits", () => {
  assert.equal(normalise({ scale: 99 }).scale, LIMITS.scale.max);
  assert.equal(normalise({ scale: -5 }).scale, LIMITS.scale.min);
  assert.equal(
    normalise({ speechGapSeconds: 100000 }).speechGapSeconds,
    LIMITS.speechGapSeconds.max
  );
  assert.equal(normalise({ floorOffset: 9999 }).floorOffset, LIMITS.floorOffset.max);
});

test("a null floor offset means auto, and a number is kept", () => {
  assert.equal(normalise({}).floorOffset, null);
  assert.equal(normalise({ floorOffset: null }).floorOffset, null);
  assert.equal(normalise({ floorOffset: 64 }).floorOffset, 64);
});

test("phrases are trimmed, blanks dropped, and an empty list restores defaults", () => {
  const settings = normalise({ phrases: ["  Meow  ", "", "   ", "Hello", 7, null] });
  assert.deepEqual(settings.phrases, ["Meow", "Hello"]);

  assert.deepEqual(normalise({ phrases: [] }).phrases, [...DEFAULTS.phrases]);
  assert.deepEqual(normalise({ phrases: ["", "  "] }).phrases, [...DEFAULTS.phrases]);
});

test("phrase count and length are bounded", () => {
  const many = Array.from({ length: 500 }, (_, index) => `line ${index}`);
  assert.equal(normalise({ phrases: many }).phrases.length, LIMITS.phrases.max);

  const long = normalise({ phrases: ["x".repeat(400)] }).phrases[0];
  assert.equal(long.length, LIMITS.phrases.length);
});

test("automatic updates are on by default and can be turned off", () => {
  assert.equal(DEFAULTS.autoUpdate, true);
  assert.equal(normalise({}).autoUpdate, true);
  assert.equal(normalise({ autoUpdate: false }).autoUpdate, false);
  // Junk should not silently disable updates.
  assert.equal(normalise({ autoUpdate: "no" }).autoUpdate, true);
});
