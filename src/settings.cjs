const fs = require("node:fs");
const path = require("node:path");

// Everything Kairo says by default. Users can replace the whole list from the
// settings window, so this is only a starting point.
const DEFAULT_PHRASES = Object.freeze([
  "Meow",
  "meow?",
  "mrrrow~",
  "purrrr",
  "Have a good day!",
  "I love you",
  "You are doing great",
  "Remember to drink water",
  "Take a little break?",
  "Stretch your legs!",
  "I believe in you",
  "You've got this",
  "Don't forget to blink",
  "Sit up straight!",
  "Nap time soon?",
  "You're my favourite human"
]);

const DEFAULTS = Object.freeze({
  scale: 5,
  speechEnabled: true,
  speechGapSeconds: 75,
  phrases: DEFAULT_PHRASES,
  // null means "work it out from the display", which is right almost everywhere.
  floorOffset: null,
  alwaysOnTop: true
});

const LIMITS = Object.freeze({
  scale: { min: 3, max: 8 },
  speechGapSeconds: { min: 10, max: 600 },
  floorOffset: { min: 0, max: 400 },
  phrases: { max: 200, length: 120 }
});

function clampNumber(value, { min, max }, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

// The settings file is plain JSON a user may well hand-edit, so treat every
// field as untrusted and fall back to the default rather than throwing.
function normalise(raw) {
  const input = raw && typeof raw === "object" ? raw : {};

  let phrases = Array.isArray(input.phrases)
    ? input.phrases
        .filter((phrase) => typeof phrase === "string")
        .map((phrase) => phrase.trim().slice(0, LIMITS.phrases.length))
        .filter(Boolean)
        .slice(0, LIMITS.phrases.max)
    : [];

  if (phrases.length === 0) phrases = [...DEFAULTS.phrases];

  return {
    scale: clampNumber(input.scale, LIMITS.scale, DEFAULTS.scale),
    speechEnabled:
      typeof input.speechEnabled === "boolean" ? input.speechEnabled : DEFAULTS.speechEnabled,
    speechGapSeconds: clampNumber(
      input.speechGapSeconds,
      LIMITS.speechGapSeconds,
      DEFAULTS.speechGapSeconds
    ),
    phrases,
    floorOffset:
      input.floorOffset === null || input.floorOffset === undefined
        ? null
        : clampNumber(input.floorOffset, LIMITS.floorOffset, 0),
    alwaysOnTop:
      typeof input.alwaysOnTop === "boolean" ? input.alwaysOnTop : DEFAULTS.alwaysOnTop
  };
}

function createStore(directory) {
  const file = path.join(directory, "settings.json");
  let current = normalise(read());

  function read() {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      // Missing or corrupt file simply means "use the defaults".
      return null;
    }
  }

  return {
    file,
    get() {
      return { ...current, phrases: [...current.phrases] };
    },
    update(patch) {
      current = normalise({ ...current, ...patch });

      try {
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`);
      } catch (error) {
        console.warn(`Could not save settings: ${error.message}`);
      }

      return this.get();
    },
    reset() {
      return this.update({ ...DEFAULTS, phrases: [...DEFAULTS.phrases] });
    }
  };
}

module.exports = { createStore, normalise, DEFAULTS, DEFAULT_PHRASES, LIMITS };
