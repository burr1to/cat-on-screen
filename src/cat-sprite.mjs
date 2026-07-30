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

// One flat grey coat -- same tone top and bottom. Shape reads from the dark
// outline alone, so the only other colours are the face accents.
const PALETTE = {
  o: "#2d2f33", // outline
  m: "#6f7276", // fur, everywhere
  p: "#a3808a", // inner ear
  b: "#b4868f", // blush
  n: "#8a636a", // nose
  e: "#23252a", // eye
  g: "#eef0f2", // eye glint
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
    "obbmmmnnmmmbbo",
    "ombmmommommbmo",
    ".ommmmoommmmo.",
    "..ommmmmmmmo..",
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

  leg: ["ommo.", "ommo.", "ommmo", "ooooo"],
  legFold: [".ooooo.", "ommmmmo", "ommmmmo", ".ooooo."],
  legTuck: ["ommmo", "ooooo"],
  legPaw: [".oo.", "ommo", "ommo", "oooo"],

  // Every tail ends on rows 15-17 at columns 6-7, which is where the rump
  // outline sits, so the base is always tucked behind the body.
  tailMid: [
    "..ooo...",
    ".ommo...",
    ".ommo...",
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
    ".ommo...",
    ".ommo...",
    "ommmo...",
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
    ".ommmmmmmm",
    "ommmmmmmmm",
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

    for (let column = 0; column < line.length; column += 1) {
      const key = line[column];
      if (key === ".") continue;
      context.fillStyle = PALETTE[key];
      context.fillRect(x + column, y + row, 1, 1);
    }
  }
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// The single place a pose is turned into pixels. Exported so tooling draws Kairo
// exactly the way the app does -- a harness that reimplements this loop silently
// misses anything added here, like the collar.
export function paintPose(context, name, offsetY = 0) {
  for (const [part, x, y] of POSES[name]) {
    paintPart(context, part, x, y + offsetY);

    // Immediately after the head, so it covers the chin but still sits behind a
    // raised grooming paw.
    if (part === "head") {
      paintPart(context, "collar", x + COLLAR_OFFSET.x, y + COLLAR_OFFSET.y + offsetY);
      paintPart(
        context,
        "bell",
        x + BELL_OFFSET.x + (BELL_SWING[name] ?? 0),
        y + BELL_OFFSET.y + offsetY
      );
    }
  }
}

// Poses are composited once and reused, so a frame costs a single blit.
function bakePose(name) {
  const canvas = createCanvas(SPRITE_WIDTH, SPRITE_HEIGHT);
  paintPose(canvas.getContext("2d"), name, CAT_TOP);
  return canvas;
}

export function createSprite({ catCanvas, emoteCanvas }) {
  const baked = new Map();
  const catContext = catCanvas.getContext("2d");
  const emoteContext = emoteCanvas.getContext("2d");
  let lastPose = null;

  function poseFor(state, now) {
    const animation = ANIMATIONS[state] ?? ANIMATIONS.idle;
    const index =
      Math.floor((now / 1000) * animation.fps) % animation.poses.length;
    return animation.poses[index];
  }

  function drawEmotes(state, direction, now) {
    emoteContext.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
    const emote = EMOTES[state];
    if (!emote) return;

    const { width } = partSize(emote.part);

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

      emoteContext.globalAlpha = eased < 0.18 ? eased / 0.18 : 1 - eased * 0.75;
      paintPart(emoteContext, emote.part, x, y);
    }

    emoteContext.globalAlpha = 1;
  }

  return {
    render(state, direction, now) {
      const pose = poseFor(state, now);

      if (pose !== lastPose) {
        if (!baked.has(pose)) baked.set(pose, bakePose(pose));
        catContext.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
        catContext.drawImage(baked.get(pose), 0, 0);
        lastPose = pose;
      }

      drawEmotes(state, direction, now);
    },

    // Used for hit testing so clicks on the transparent headroom fall through.
    isOpaqueAt(x, y) {
      if (x < 0 || y < 0 || x >= SPRITE_WIDTH || y >= SPRITE_HEIGHT) return false;
      return catContext.getImageData(x, y, 1, 1).data[3] > 8;
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
