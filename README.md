# Kairo

Kairo is a grey pixel-art desktop cat for Windows and Linux. He wanders around
the bottom of the screen, reacts when petted, and can be dragged or thrown.

## Run Kairo

```bash
npm install
npm start
```

Kairo appears at the bottom of the primary monitor. Use the tray icon to pause
him, call him back to the center, make him jump, open Settings, change whether
he stays on top, or quit.

Click Kairo to pet him. Drag and release him to throw him; he lands and shakes
it off.

## Features

- Autonomous walking, running, sitting, loafing, grooming, licking, kneading,
  scratching behind an ear, yawning, drinking, perking up, slow blinking,
  crouching and wiggling before a pounce, chasing a bug, stretching, rolling,
  napping, jumping, and idle animations.
- A shake-off after landing from a throw or a real drop.
- Speech bubbles with editable phrases and configurable timing.
- Size, position, always-on-top, startup, and update settings.
- Windows login startup and Linux desktop autostart.
- Automatic updates for installed Windows and Linux builds.
- Transparent, non-focusable desktop window that keeps the rest of the desktop
  usable.

## Physics mechanics

Kairo uses a small, deterministic motion model in `src/cat-engine.mjs`:

- Walking and running move him along the floor at separate speeds.
- Jumps and throws use velocity, gravity, and a capped maximum throw speed.
- The pointer velocity at release becomes Kairo's throw velocity.
- The floor catches him; screen edges reverse horizontal velocity with some
  energy loss, and the top edge bounces him back into view.
- While dragging, the cat window follows Kairo and keeps the sprite aligned with
  the window. The window stays small instead of covering the whole desktop.
- Pausing freezes motion. Calling Kairo back places him safely at the center of
  the screen.

## Sprites and artwork

Kairo is hand-authored pixel art in `src/cat-sprite.mjs`. The sprite is a
32×30-pixel grid rendered at a whole-number scale, so movement and animation
stay crisp rather than becoming blurry.

Small bitmap parts are composed into named poses for walking, running, jumping,
dragging, and the other actions. The blue collar and bell are attached to the
head layer and the bell shifts slightly between poses to swing during movement.
Hearts and sleep letters are rendered as separate emotes.

Open these files in a browser to inspect the artwork:

- `harness.html` — every cat pose
- `harness-emotes.html` — hearts and sleep letters

The tray icon is generated from the sprite's head. Regenerate the packaged icon
after changing the artwork:

```bash
npm run assets:icon
```

## Settings

Open **Settings...** from the tray icon. Changes apply immediately and are saved
in Electron's per-user data directory.

- **Size** — choose a whole-number pixel-art scale.
- **Talking** — enable speech, set its frequency, and edit one phrase per line.
- **Position** — adjust the floor offset when a dock or taskbar covers Kairo.
- **Updates** — enable automatic updates or check for one manually.
- **Startup** — launch Kairo when you log in.
- **Always on top** — keep Kairo above other windows.

The portable Windows build does not self-update. Use the Windows installer when
automatic updates are needed.

## Development checks

```bash
npm test                  # behavior, sprite, settings, startup, and updater tests
npm run test:overlay      # transparent overlay smoke test under Xvfb
npm run test:drag         # drag behavior under Xvfb
npm run test:visual       # sandbox screenshot under Xvfb
```

Build locally with:

```bash
npm run dist:linux
```

On Windows, use `npm run dist:windows`. From Linux, use the Docker/Wine helper:

```bash
./scripts/build-windows-docker.sh
```

Build output is written to `release/`. Releases are built by GitHub Actions when
a `v*` tag is pushed. See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the project
release history.

## Current scope

Kairo currently walks along the usable bottom edge of the primary monitor.
Walking across arbitrary application windows is planned for a later iteration.
