// The sprite is 32x30 pixel-art cells drawn at 5x. The extra height above the
// cat is emote headroom, and the cat's paws sit on the very last row, so the
// element's bottom edge is the floor.
const DEFAULTS = Object.freeze({
  catWidth: 160,
  catHeight: 150,
  walkSpeed: 86,
  runSpeed: 190,
  gravity: 1450,
  jumpSpeed: 570,
  throwScale: 1.15,
  maxThrowSpeed: 1300,
  speechHoldMs: 3800
});

export class CatEngine {
  constructor({ width, height, random = Math.random, now = 0, options = {} }) {
    this.options = { ...DEFAULTS, ...options };
    this.random = random;
    this.width = width;
    this.height = height;
    this.x = Math.max(0, width * 0.16);
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    this.direction = 1;
    this.state = "idle";
    this.onGround = true;
    this.dragging = false;
    this.paused = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.lastPointer = null;
    this.nextDecisionAt = now + 900;
    this.happyUntil = 0;

    // { text, until } while a speech bubble is showing, otherwise null.
    this.speech = null;
    this.speechConfig = { enabled: false, gapSeconds: 75, phrases: [] };
    this.nextSpeechAt = Infinity;
  }

  configureSpeech({ enabled, gapSeconds, phrases }, now) {
    this.speechConfig = {
      enabled: Boolean(enabled),
      gapSeconds: Number(gapSeconds) > 0 ? Number(gapSeconds) : 75,
      phrases: Array.isArray(phrases) ? phrases.filter(Boolean) : []
    };

    if (!this.speechConfig.enabled || this.speechConfig.phrases.length === 0) {
      this.speech = null;
      this.nextSpeechAt = Infinity;
      return;
    }

    // Say something reasonably soon after being switched on, then settle into
    // the configured rhythm.
    this.nextSpeechAt = Math.min(this.nextSpeechAt, now + 4000);
  }

  scheduleNextSpeech(now) {
    // Spread the gap either side of the configured average so it never feels
    // metronomic.
    const gap = this.speechConfig.gapSeconds * 1000;
    this.nextSpeechAt = now + gap * (0.6 + this.random() * 0.8);
  }

  say(text, now) {
    if (!text) return false;
    this.speech = { text, until: now + this.options.speechHoldMs };
    this.scheduleNextSpeech(this.speech.until);
    return true;
  }

  sayRandom(now) {
    const { phrases } = this.speechConfig;
    if (phrases.length === 0) return false;
    return this.say(phrases[Math.floor(this.random() * phrases.length)], now);
  }

  // Runs on every frame regardless of state so a bubble always expires, even if
  // the cat is paused or being dragged mid-sentence.
  updateSpeech(now) {
    if (this.speech && now >= this.speech.until) this.speech = null;
    if (!this.speechConfig.enabled || this.speechConfig.phrases.length === 0) return;
    if (this.speech || now < this.nextSpeechAt) return;

    // Hold off while he is busy or asleep rather than talking over it, and try
    // again shortly.
    if (
      this.paused ||
      this.dragging ||
      !this.onGround ||
      this.state === "sleep" ||
      this.state === "roll"
    ) {
      this.nextSpeechAt = now + 2000;
      return;
    }

    this.sayRandom(now);
  }

  get groundY() {
    return Math.max(0, this.height - this.options.catHeight);
  }

  setViewport(width, height) {
    this.width = width;
    this.height = height;
    this.x = clamp(this.x, 0, this.maxX);
    if (this.onGround) this.y = this.groundY;
  }

  get maxX() {
    return Math.max(0, this.width - this.options.catWidth);
  }

  pause() {
    this.paused = true;
    this.state = "idle";
    this.vx = 0;
    this.vy = 0;
  }

  resume(now) {
    this.paused = false;
    this.nextDecisionAt = now + 350;
  }

  reset(now) {
    this.x = clamp(this.width * 0.5 - this.options.catWidth * 0.5, 0, this.maxX);
    this.y = this.groundY;
    this.vx = 0;
    this.vy = 0;
    this.direction = this.random() > 0.5 ? 1 : -1;
    this.state = "happy";
    this.onGround = true;
    this.dragging = false;
    this.happyUntil = now + 1100;
    this.nextDecisionAt = now + 1400;
  }

  jump(now) {
    if (this.dragging || !this.onGround || this.paused) return false;
    this.state = "jump";
    this.onGround = false;
    this.vx = this.direction * this.options.walkSpeed * 1.6;
    this.vy = -this.options.jumpSpeed;
    this.nextDecisionAt = now + 1200;
    return true;
  }

  pet(now) {
    if (this.paused) return;
    this.state = "happy";
    this.vx = 0;
    this.happyUntil = now + 1250;
    this.nextDecisionAt = this.happyUntil + 400;
    if (this.speechConfig.enabled) this.sayRandom(now);
  }

  beginDrag(pointerX, pointerY, now) {
    if (this.paused) return false;
    this.dragging = true;
    this.onGround = false;
    this.state = "drag";
    this.dragOffsetX = pointerX - this.x;
    this.dragOffsetY = pointerY - this.y;
    this.vx = 0;
    this.vy = 0;
    this.lastPointer = { x: pointerX, y: pointerY, now };
    return true;
  }

  dragTo(pointerX, pointerY, now) {
    if (!this.dragging) return;
    const elapsed = Math.max(8, now - this.lastPointer.now) / 1000;
    const limit = this.options.maxThrowSpeed;
    this.vx = clamp((pointerX - this.lastPointer.x) / elapsed, -limit, limit);
    this.vy = clamp((pointerY - this.lastPointer.y) / elapsed, -limit, limit);
    this.x = clamp(pointerX - this.dragOffsetX, -this.options.catWidth * 0.35, this.maxX + this.options.catWidth * 0.35);
    this.y = clamp(pointerY - this.dragOffsetY, -this.options.catHeight * 0.35, this.groundY);
    this.direction = this.vx === 0 ? this.direction : Math.sign(this.vx);
    this.lastPointer = { x: pointerX, y: pointerY, now };
  }

  endDrag(now, { toss = true } = {}) {
    if (!this.dragging) return;
    this.dragging = false;
    this.lastPointer = null;

    if (toss) {
      this.vx *= this.options.throwScale;
      this.vy *= this.options.throwScale;
      this.state = this.vy < 0 ? "jump" : "fall";
      this.onGround = false;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.y = this.groundY;
      this.onGround = true;
      this.state = "idle";
    }

    this.nextDecisionAt = now + 1100;
  }

  step(seconds, now) {
    const dt = clamp(seconds, 0, 0.05);
    this.updateSpeech(now);
    if (this.paused || this.dragging || dt === 0) return;

    if (this.happyUntil > now) {
      this.state = "happy";
      return;
    }

    if (!this.onGround) {
      this.vy += this.options.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // There was no ceiling: a hard upward throw simply left the screen. Bounce
      // him off the top instead, losing most of the energy so he drops back
      // quickly.
      if (this.y < 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) * 0.35;
      }

      if (this.x < 0 || this.x > this.maxX) {
        this.x = clamp(this.x, 0, this.maxX);
        this.vx *= -0.58;
        if (Math.abs(this.vx) > 8) this.direction = Math.sign(this.vx);
      }

      if (this.y >= this.groundY) {
        this.y = this.groundY;

        if (Math.abs(this.vy) > 300) {
          this.vy *= -0.3;
          this.vx *= 0.72;
          this.state = "jump";
        } else {
          this.vy = 0;
          this.vx = 0;
          this.onGround = true;
          this.state = "idle";
          this.nextDecisionAt = now + 700;
        }
      } else {
        this.state = this.vy < 0 ? "jump" : "fall";
      }

      return;
    }

    if (this.state === "walk" || this.state === "run") {
      const speed = this.state === "run" ? this.options.runSpeed : this.options.walkSpeed;
      this.x += speed * this.direction * dt;

      if (this.x <= 0 || this.x >= this.maxX) {
        this.x = clamp(this.x, 0, this.maxX);
        this.direction *= -1;
        this.nextDecisionAt = Math.max(this.nextDecisionAt, now + 900);
      }
    }

    if (now >= this.nextDecisionAt) this.chooseNextBehavior(now);
  }

  chooseNextBehavior(now) {
    const roll = this.random();
    this.vx = 0;
    this.vy = 0;

    if (roll < 0.09) {
      this.state = "idle";
      this.nextDecisionAt = now + range(this.random, 1400, 3000);
    } else if (roll < 0.16) {
      this.state = "sit";
      this.nextDecisionAt = now + range(this.random, 2400, 5000);
    } else if (roll < 0.21) {
      this.state = "groom";
      this.nextDecisionAt = now + range(this.random, 1900, 3400);
    } else if (roll < 0.26) {
      this.state = "lick";
      this.nextDecisionAt = now + range(this.random, 2200, 3800);
    } else if (roll < 0.31) {
      this.state = "roll";
      this.nextDecisionAt = now + range(this.random, 2600, 4400);
    } else if (roll < 0.35) {
      this.state = "stretch";
      this.nextDecisionAt = now + range(this.random, 1300, 2100);
    } else if (roll < 0.44) {
      this.state = "sleep";
      this.nextDecisionAt = now + range(this.random, 4500, 8500);
    } else if (roll < 0.76) {
      this.state = "walk";
      if (this.random() < 0.3) this.direction *= -1;
      this.nextDecisionAt = now + range(this.random, 2600, 5200);
    } else if (roll < 0.93) {
      this.state = "run";
      if (this.random() < 0.2) this.direction *= -1;
      this.nextDecisionAt = now + range(this.random, 1600, 3200);
    } else {
      this.jump(now);
    }
  }
}

export function createSeededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function range(random, minimum, maximum) {
  return minimum + random() * (maximum - minimum);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

