// Kairo is drawn as hand-authored pixel art. Every pose is a stack of small
// bitmap parts placed on a 32x30 pixel grid, so animation is whole-pixel
// translation only -- nothing is ever rotated or scaled, which is what keeps
// the pixel grid crisp at any zoom.
//
// The top CAT_TOP rows are headroom for floating emotes; the cat itself always
// occupies the bottom 24 rows, with its paws on the very last row.

export const SPRITE_WIDTH = 32;
export const SPRITE_HEIGHT = 30;
export const CAT_TOP = 6;
export const SCALE = 5;

// A deeper grey coat with the old tone kept as a lighter accent on the muzzle,
// paws and tail tip -- enough to give him some shape without going back to a
// patchy two-colour cat.
const PALETTE = {
  o: "#2d2f33", // outline
  m: "#55585c", // fur, base coat
  l: "#6f7276", // fur, light accent
  p: "#a3808a", // inner ear
  b: "#b4868f", // blush
  n: "#8a636a", // nose
  e: "#23252a", // eye
  g: "#f2c94c", // eye glint, yellow
  h: "#cf5c72", // heart
  z: "#3f4247", // sleep letters
  c: "#3f6fb5", // collar
  C: "#5b8bd0", // collar, lit edge
  y: "#d9a63c", // bell
  Y: "#f2cf73", // bell, lit edge
  t: "#c0757f" // tongue
};

// Rows are written left to right, facing right. "." is transparent.
const PARTS = {
  head: [
    // Ears: a single dark pixel for the tip, with the inner ear widening below
    // it and tapering back into the fur at the skull line, so the pink reads as
    // an opening rather than a flat band across the forehead.
    "..o........o..",
    ".opo......opo.",
    ".oppo....oppo.",
    "omppmoooomppmo",
    "ommmmmmmmmmmmo",
    "ommmmmmmmmmmmo",
    "ommmmmmmmmmmmo",
    "ommmmmmmmmmmmo",
    "ommmmmmmmmmmmo",
    "ommmmmmmmmmmmo",
    "obbmllnnllmbbo",
    "ombmlollolmbmo",
    ".ommlloollmmo.",
    "..omllllllmo..",
    "...oommmmoo...",
    ".....oooo....."
  ],

  // Eye overlays sit at head-local (2, 6).
  eyesOpen: ["ge......ge", "ee......ee", "ee......ee"],
  eyesLine: ["oo......oo"],
  eyesArch: [".o......o.", "o.o....o.o"],

  body: [
    ".....oooooooooo.....",
    "...oommmmmmmmmmoo...",
    "..ommmmmmmmmmmmmmoo.",
    ".ommmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmo.",
    ".ommmmmmmmmmmmmmmo..",
    "..ommmmmmmmmmmmmo...",
    "...ooooooooooooo...."
  ],

  // Sitting needs its own silhouette: haunch planted at the rear, chest rising
  // to the shoulders. Offsetting the standing body cannot express that.
  bodySit: [
    "........ooooooo..",
    "......oommmmmmmoo",
    ".....ommmmmmmmmmo",
    "....ommmmmmmmmmmo",
    "...ommmmmmmmmmmmo",
    "..ommmmmmmmmmmmmo",
    "..ommmmmmmmmmmmmo",
    ".ommmmmmmmmmmmmmo",
    ".ommmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmo.",
    ".ooooooooooooooo."
  ],

  leg: ["ommo.", "ommo.", "olllo", "ooooo"],
  legFold: [".ooooo.", "ommmmmo", "ommmmmo", ".ooooo."],
  legTuck: ["olllo", "ooooo"],
  legPaw: [".oo.", "ollo", "ollo", "oooo"],

  // Every tail ends on rows 15-17 at columns 6-7, which is where the rump
  // outline sits, so the base is always tucked behind the body.
  tailMid: [
    "..ooo...",
    ".ollo...",
    ".ollo...",
    "ommmo...",
    "ommmo...",
    ".ommmo..",
    ".ommmmo.",
    "..ommmmo",
    "..ommmmo",
    "...ooooo"
  ],
  tailUp: [
    "..ooo...",
    ".ollo...",
    ".ollo...",
    "ollmo...",
    "ommmo...",
    "ommmo...",
    "ommmo...",
    "ommmmo..",
    "ommmmo..",
    ".ommmmo.",
    ".ommmmo.",
    "..ommmmo",
    "..ommmmo",
    "...ooooo"
  ],
  tailLow: [
    "..oooooooo",
    ".ollmmmmmm",
    "ollmmmmmmm",
    ".ommmmmmmm",
    "..oooooooo"
  ],

  // Belly-up: a low wide blob on the ground, with paws poking up out of it. Drawn
  // after the paws so their roots are hidden.
  bodyRoll: [
    "...oooooooooooooo.....",
    ".oommmmmmmmmmmmmmoo...",
    "ommmmmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmmmo",
    "ommmmmmmmmmmmmmmmmmmmo",
    ".ommmmmmmmmmmmmmmmmmo.",
    "..oooooooooooooooooo.."
  ],
  pawUp: [".o.", "omo", "omo", "omo", "omo"],

  tongue: [".t.", "ttt"],

  // Sits across the base of the head, keeping the head's own outline pixels at
  // either end so the silhouette is unbroken.
  collar: [".cCCCCCCc.", "...cccc..."],
  bell: [".oo.", "oYyo", "oyyo", ".oo."],

  // Yawn: replaces the closed mouth on the muzzle, at head-local (5, 10).
  mouthOpen: [".oo.", "otto", "otto", ".oo."],

  // A hind leg brought up to the ear.
  legScratch: [".oo.", "ollo", "ollo", "ommo", "ommo", ".oo."],

  // Something small and irritating for him to chase.
  bug: [".l.l.", "..o..", ".l.l."],

  heart: [".h.h.", "hhhhh", ".hhh.", "..h.."],
  zed: ["zzzz", "...z", "..z.", ".z..", "zzzz"]
};

// The collar rides the head rather than being listed in every pose, so it cannot
// drift out of position and any new pose gets it for free. Offsets are relative
// to the head layer's own origin.
const COLLAR_OFFSET = Object.freeze({ x: 2, y: 13 });
const BELL_OFFSET = Object.freeze({ x: 4, y: 14 });

// Sideways nudge per pose, so the bell swings while he is on the move and hangs
// still when he is not -- the jingle, drawn rather than heard.
const BELL_SWING = Object.freeze({
  walkSpread: 1,
  walkCross: -1,
  runReach: 1,
  runGather: -1,
  jump: 1,
  fall: -1,
  dragA: 1,
  dragB: -1,
  happyUp: -1,
  happyDown: 1
});

// A pose is an ordered layer stack: [part, x, y]. Later layers paint over
// earlier ones, which is how the head hides the body seam and how a raised paw
// lands in front of the muzzle.
const POSES = {
  stand: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 2],
    ["eyesOpen", 18, 8]
  ],
  standBreathe: [
    ["tailUp", 0, 5],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 1],
    ["eyesOpen", 18, 7]
  ],
  standBlink: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 2],
    ["eyesLine", 18, 9]
  ],

  walkSpread: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 8, 20],
    ["leg", 18, 20],
    ["head", 16, 2],
    ["eyesOpen", 18, 8]
  ],
  walkPass: [
    ["tailUp", 0, 5],
    ["body", 6, 9],
    ["leg", 10, 19],
    ["leg", 16, 19],
    ["head", 16, 1],
    ["eyesOpen", 18, 7]
  ],
  walkCross: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 12, 20],
    ["leg", 15, 20],
    ["head", 16, 2],
    ["eyesOpen", 18, 8]
  ],

  runReach: [
    ["tailMid", 0, 8],
    ["body", 6, 10],
    ["leg", 8, 20],
    ["leg", 20, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  runGather: [
    ["tailUp", 0, 3],
    ["body", 6, 8],
    ["leg", 11, 19],
    ["leg", 16, 19],
    ["head", 16, 1],
    ["eyesOpen", 18, 7]
  ],

  sit: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  sitBlink: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesLine", 18, 10]
  ],
  sitTail: [
    ["tailLow", 2, 19],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],

  groomLow: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 4],
    ["eyesArch", 18, 11],
    ["legPaw", 20, 16]
  ],
  groomHigh: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesArch", 18, 10],
    ["legPaw", 20, 15]
  ],

  stretch: [
    ["tailUp", 0, 4],
    ["body", 6, 10],
    ["leg", 9, 20],
    ["head", 16, 5],
    ["eyesArch", 18, 12],
    ["leg", 19, 20]
  ],
  stretchDeep: [
    ["tailUp", 0, 3],
    ["body", 6, 10],
    ["leg", 9, 20],
    ["head", 16, 6],
    ["eyesArch", 18, 13],
    ["leg", 20, 20]
  ],

  sleep: [
    ["tailLow", 0, 17],
    ["body", 6, 12],
    ["head", 16, 8],
    ["eyesLine", 18, 15]
  ],
  sleepTwitch: [
    ["tailLow", 0, 18],
    ["body", 6, 12],
    ["head", 16, 8],
    ["eyesLine", 18, 15]
  ],

  jump: [
    ["tailUp", 0, 4],
    ["body", 6, 9],
    ["legTuck", 10, 21],
    ["legTuck", 17, 21],
    ["head", 16, 2],
    ["eyesOpen", 18, 8]
  ],
  fall: [
    ["tailUp", 0, 5],
    ["body", 6, 9],
    ["leg", 8, 20],
    ["leg", 19, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],

  dragA: [
    ["tailLow", 0, 14],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 18, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  dragB: [
    ["tailLow", 0, 15],
    ["body", 6, 9],
    ["leg", 11, 20],
    ["leg", 16, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],

  // Rolled onto his back, paws in the air, having a lovely time.
  rollA: [
    ["tailLow", 0, 19],
    ["pawUp", 9, 14],
    ["pawUp", 14, 12],
    ["bodyRoll", 5, 17],
    ["head", 16, 8],
    ["eyesArch", 18, 15]
  ],
  rollB: [
    ["tailLow", 0, 19],
    ["pawUp", 10, 13],
    ["pawUp", 13, 13],
    ["bodyRoll", 5, 17],
    ["head", 16, 8],
    ["eyesArch", 18, 15]
  ],

  // Head turned back over his own shoulder, tongue out. Sitting body, but the
  // head sits lower and further back than in sit, which is what sells it.
  lickA: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 15, 7],
    ["eyesArch", 17, 14],
    ["tongue", 20, 20]
  ],
  lickB: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 15, 8],
    ["eyesArch", 17, 15],
    ["tongue", 20, 22]
  ],

  // Loaf: paws folded away underneath, body on the ground, but wide awake --
  // which is what separates it from sleeping.
  loaf: [
    ["tailLow", 0, 17],
    ["body", 6, 12],
    ["head", 16, 4],
    ["eyesOpen", 18, 10]
  ],
  loafBreathe: [
    ["tailLow", 0, 17],
    ["body", 6, 12],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  loafBlink: [
    ["tailLow", 0, 17],
    ["body", 6, 12],
    ["head", 16, 4],
    ["eyesLine", 18, 11]
  ],

  // About to pounce: low to the ground, tail flat, rear end wiggling.
  crouchLeft: [
    ["tailLow", 0, 16],
    ["body", 6, 11],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 4],
    ["eyesOpen", 18, 10]
  ],
  crouchRight: [
    ["tailLow", 1, 16],
    ["body", 7, 11],
    ["leg", 10, 20],
    ["leg", 17, 20],
    ["head", 16, 4],
    ["eyesOpen", 18, 10]
  ],

  // Making biscuits: front paws working alternately.
  kneadLeft: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legPaw", 18, 19],
    ["head", 16, 3],
    ["eyesArch", 18, 10],
    ["legPaw", 22, 17]
  ],
  kneadRight: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legPaw", 18, 17],
    ["head", 16, 3],
    ["eyesArch", 18, 10],
    ["legPaw", 22, 19]
  ],

  // Heard something.
  perk: [
    ["tailUp", 0, 3],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 1],
    ["eyesOpen", 18, 7]
  ],
  perkTail: [
    ["tailUp", 1, 3],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 1],
    ["eyesOpen", 18, 7]
  ],

  // A slow, deliberate blink -- how a cat says it likes you.
  standArch: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 2],
    ["eyesArch", 18, 9]
  ],
  standArchLow: [
    ["tailMid", 0, 8],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 3],
    ["eyesArch", 18, 10]
  ],

  // Shaking himself off after a landing.
  shakeLeft: [
    ["tailMid", 0, 8],
    ["body", 5, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 15, 2],
    ["eyesLine", 17, 9]
  ],
  shakeRight: [
    ["tailUp", 1, 6],
    ["body", 7, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 17, 2],
    ["eyesLine", 19, 9]
  ],

  // Head right down, tongue out.
  drinkDown: [
    ["tailLow", 0, 14],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 7],
    ["eyesArch", 18, 14],
    ["tongue", 21, 22]
  ],
  drinkUp: [
    ["tailLow", 0, 14],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 6],
    ["eyesArch", 18, 13],
    ["tongue", 21, 20]
  ],

  // A proper jaw-cracking yawn, sitting down.
  yawnStart: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesLine", 18, 10]
  ],
  yawnWide: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 3],
    ["eyesLine", 18, 10],
    ["mouthOpen", 21, 13]
  ],

  // Hind leg up behind the ear.
  scratchUp: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 4],
    ["eyesLine", 18, 11],
    ["legScratch", 14, 6]
  ],
  scratchDown: [
    ["tailLow", 2, 18],
    ["bodySit", 9, 9],
    ["legTuck", 20, 22],
    ["head", 16, 4],
    ["eyesLine", 18, 11],
    ["legScratch", 14, 8]
  ],

  // Watching something fly about, then springing at it.
  chaseWatch: [
    ["tailLow", 0, 16],
    ["body", 6, 11],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  chaseWiggle: [
    ["tailUp", 0, 6],
    ["body", 7, 11],
    ["leg", 10, 20],
    ["leg", 17, 20],
    ["head", 16, 3],
    ["eyesOpen", 18, 9]
  ],
  chasePounce: [
    ["tailUp", 0, 3],
    ["body", 6, 8],
    ["legTuck", 10, 20],
    ["legTuck", 17, 20],
    ["head", 16, 0],
    ["eyesOpen", 18, 6]
  ],

  happyUp: [
    ["tailUp", 0, 3],
    ["body", 6, 8],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 1],
    ["eyesArch", 18, 8]
  ],
  happyDown: [
    ["tailUp", 0, 5],
    ["body", 6, 9],
    ["leg", 9, 20],
    ["leg", 17, 20],
    ["head", 16, 2],
    ["eyesArch", 18, 9]
  ]
};

// Each entry loops through poses at a fixed rate. Timing is derived from the
// clock rather than a per-state counter so state changes never stall a cycle.
const ANIMATIONS = {
  idle: { fps: 1.6, poses: ["stand", "standBreathe", "stand", "standBlink"] },
  walk: { fps: 7, poses: ["walkSpread", "walkPass", "walkCross", "walkPass"] },
  run: { fps: 11, poses: ["runReach", "runGather"] },
  sit: { fps: 1.1, poses: ["sit", "sitTail", "sitBlink", "sitTail"] },
  groom: { fps: 3.4, poses: ["groomLow", "groomHigh"] },
  stretch: { fps: 1.4, poses: ["stretch", "stretchDeep"] },
  sleep: { fps: 0.5, poses: ["sleep", "sleepTwitch"] },
  roll: { fps: 2.2, poses: ["rollA", "rollB"] },
  loaf: { fps: 0.9, poses: ["loaf", "loafBreathe", "loaf", "loafBlink"] },
  crouch: { fps: 5, poses: ["crouchLeft", "crouchRight"] },
  knead: { fps: 3, poses: ["kneadLeft", "kneadRight"] },
  perk: { fps: 1.4, poses: ["perk", "perkTail"] },
  blink: { fps: 0.8, poses: ["stand", "standArch", "standArchLow", "standArch"] },
  shake: { fps: 9, poses: ["shakeLeft", "shakeRight"] },
  drink: { fps: 3.2, poses: ["drinkDown", "drinkUp"] },
  yawn: { fps: 1.6, poses: ["yawnStart", "yawnWide", "yawnWide", "yawnStart"] },
  scratch: { fps: 7, poses: ["scratchUp", "scratchDown"] },
  chase: { fps: 3, poses: ["chaseWatch", "chaseWiggle", "chaseWatch", "chasePounce"] },
  lick: { fps: 3.6, poses: ["lickA", "lickB"] },
  jump: { fps: 1, poses: ["jump"] },
  fall: { fps: 1, poses: ["fall"] },
  drag: { fps: 2.6, poses: ["dragA", "dragB"] },
  happy: { fps: 6.5, poses: ["happyUp", "happyDown"] }
};

// Emotes are drawn unflipped, so their column is chosen per facing direction.
const EMOTES = {
  happy: {
    part: "heart",
    period: 1150,
    count: 3,
    columns: [16, 21, 26],
    rise: [8, -3]
  },
  chase: {
    part: "bug",
    period: 2200,
    count: 1,
    columns: [20],
    rise: [10, 2]
  },
  sleep: {
    part: "zed",
    period: 2600,
    count: 3,
    columns: [18, 23, 27],
    rise: [12, 0]
  }
};

export function partSize(name) {
  const rows = PARTS[name];
  return { width: rows[0].length, height: rows.length };
}

function paintPart(context, name, x, y) {
  const rows = PARTS[name];

  for (let row = 0; row < rows.length; row += 1) {
    const line = rows[row];
    let runKey = ".";
    let runStart = 0;

    // Pixel art is mostly flat runs of one colour, so a row is filled a run at a
    // time. The one-pixel-at-a-time version set fillStyle and issued a fillRect
    // for every single pixel, which is the bulk of the cost of drawing an emote.
    for (let column = 0; column <= line.length; column += 1) {
      const key = column < line.length ? line[column] : ".";
      if (key === runKey) continue;

      if (runKey !== ".") {
        context.fillStyle = PALETTE[runKey];
        context.fillRect(x + runStart, y + row, column - runStart, 1);
      }

      runKey = key;
      runStart = column;
    }
  }
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// The single place the layer stack of a pose is expanded, so the painter and the
// hit-test mask below can never disagree about where the collar and bell land.
function forEachLayer(name, offsetY, visit) {
  for (const [part, x, y] of POSES[name]) {
    visit(part, x, y + offsetY);

    // Immediately after the head, so it covers the chin but still sits behind a
    // raised grooming paw.
    if (part === "head") {
      visit("collar", x + COLLAR_OFFSET.x, y + COLLAR_OFFSET.y + offsetY);
      visit("bell", x + BELL_OFFSET.x + (BELL_SWING[name] ?? 0), y + BELL_OFFSET.y + offsetY);
    }
  }
}

// The single place a pose is turned into pixels. Exported so tooling draws Kairo
// exactly the way the app does -- a harness that reimplements this loop silently
// misses anything added here, like the collar.
export function paintPose(context, name, offsetY = 0) {
  forEachLayer(name, offsetY, (part, x, y) => paintPart(context, part, x, y));
}

// Which pixels of a pose are painted at all, walked from the same layer stack.
// Hit testing used to read the pixel back off the canvas, and getImageData on a
// GPU-backed canvas forces a readback that stalls the frame it happens on. Every
// palette colour is fully opaque, so a flag per cell answers the same question.
function maskForPose(name) {
  const mask = new Uint8Array(SPRITE_WIDTH * SPRITE_HEIGHT);

  forEachLayer(name, CAT_TOP, (part, x, y) => {
    const rows = PARTS[part];

    for (let row = 0; row < rows.length; row += 1) {
      const line = rows[row];
      const pixelY = y + row;
      if (pixelY < 0 || pixelY >= SPRITE_HEIGHT) continue;

      for (let column = 0; column < line.length; column += 1) {
        const pixelX = x + column;
        if (line[column] === "." || pixelX < 0 || pixelX >= SPRITE_WIDTH) continue;
        mask[pixelY * SPRITE_WIDTH + pixelX] = 1;
      }
    }
  });

  return mask;
}

// Poses are composited once and reused, so a frame costs a single blit.
function bakePose(name) {
  const canvas = createCanvas(SPRITE_WIDTH, SPRITE_HEIGHT);
  paintPose(canvas.getContext("2d"), name, CAT_TOP);
  return { canvas, mask: maskForPose(name) };
}

export function createSprite({ catCanvas, emoteCanvas }) {
  const baked = new Map();
  const catContext = catCanvas.getContext("2d");
  const emoteContext = emoteCanvas.getContext("2d");
  let lastPose = null;
  // What the emote layer currently shows, as a comparable key. Null means the
  // layer is already blank.
  let lastEmoteKey = null;

  function bakedPose(name) {
    let entry = baked.get(name);
    if (!entry) {
      entry = bakePose(name);
      baked.set(name, entry);
    }
    return entry;
  }

  function poseFor(state, now) {
    const animation = ANIMATIONS[state] ?? ANIMATIONS.idle;
    const index =
      Math.floor((now / 1000) * animation.fps) % animation.poses.length;
    return animation.poses[index];
  }

  function drawEmotes(state, direction, now) {
    const emote = EMOTES[state];

    // Most states have no emote at all. Clearing the layer anyway marked it
    // dirty on every frame, so the compositor repainted a blank canvas over the
    // desktop for the whole time Kairo was doing anything but sleeping, being
    // happy or chasing something.
    if (!emote) {
      if (lastEmoteKey !== null) {
        emoteContext.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
        lastEmoteKey = null;
      }
      return;
    }

    const { width } = partSize(emote.part);
    const draws = [];
    let key = state;

    for (let index = 0; index < emote.count; index += 1) {
      const phase =
        ((now + (index * emote.period) / emote.count) % emote.period) /
        emote.period;
      if (phase > 0.86) continue;

      const eased = phase / 0.86;
      const [from, to] = emote.rise;
      const y = Math.round(from + (to - from) * eased);
      const drift = Math.round(Math.sin(eased * Math.PI * 1.5) * 1.4);
      let x = emote.columns[index] + drift;

      // This layer is never mirrored, so a left-facing cat needs its emote
      // columns reflected by hand to stay beside the head.
      if (direction === -1) x = SPRITE_WIDTH - x - width;

      // Rounded to the 8 bits the canvas stores anyway, so two frames that would
      // land on the same pixels compare equal instead of repainting.
      const alpha =
        Math.round((eased < 0.18 ? eased / 0.18 : 1 - eased * 0.75) * 255) / 255;

      draws.push({ x, y, alpha });
      key += `|${x},${y},${alpha}`;
    }

    if (key === lastEmoteKey) return;
    lastEmoteKey = key;

    emoteContext.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);

    for (const draw of draws) {
      emoteContext.globalAlpha = draw.alpha;
      paintPart(emoteContext, emote.part, draw.x, draw.y);
    }

    emoteContext.globalAlpha = 1;
  }

  return {
    render(state, direction, now) {
      const pose = poseFor(state, now);

      if (pose !== lastPose) {
        catContext.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
        catContext.drawImage(bakedPose(pose).canvas, 0, 0);
        lastPose = pose;
      }

      drawEmotes(state, direction, now);
    },

    // Used for hit testing so clicks on the transparent headroom fall through.
    isOpaqueAt(x, y) {
      if (x < 0 || y < 0 || x >= SPRITE_WIDTH || y >= SPRITE_HEIGHT) return false;
      if (!lastPose) return false;
      return bakedPose(lastPose).mask[y * SPRITE_WIDTH + x] === 1;
    }
  };
}

export const SPRITE_DATA = {
  PALETTE,
  PARTS,
  POSES,
  ANIMATIONS,
  EMOTES,
  COLLAR_OFFSET,
  BELL_OFFSET,
  BELL_SWING
};
