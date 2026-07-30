# Kairo

Kairo is an original grey pixel-art desktop pet. He walks, runs, sits, licks
himself, grooms a paw, rolls onto his back, stretches, naps, jumps, reacts to
clicks, and can be dragged and thrown. He wears a blue collar with a small bell
that swings as he moves, and every so often he says something in a little speech
bubble. He lives in a small transparent window that follows him around, so the
rest of the desktop stays usable.

## Running it

```bash
npm start
```

Kairo appears at the bottom of the screen and gets on with his day. Everything
else lives on the tray icon:

| Tray item | What it does |
| --- | --- |
| Pause Kairo | Freezes him where he stands |
| Call Kairo back | Drops him in the middle of the screen |
| Make Kairo jump | Exactly that |
| **Settings...** | Opens the settings panel (see below) |
| Always on top | Whether he sits above other windows |
| Start with Windows | Launch at login (Windows only) |
| Quit | |

Click him to pet him -- he perks up, throws a heart or two and usually says
something. Drag and release to throw him; he lands and shakes it off.

## What he does

Behaviour is picked at random in `CatEngine.chooseNextBehavior`, weighted so he
mostly wanders and occasionally does something else:

| Action | Roughly |
| --- | --- |
| walk | a third of the time |
| run | one in six |
| sit | one in fourteen |
| sleep | one in eleven |
| lick himself | one in twenty |
| roll onto his back | one in twenty |
| groom a paw | one in twenty |
| stretch | one in twenty-five |
| idle, jump | the rest |

Dragging, throwing, falling, being petted and speaking are reactions rather than
choices. He will not talk while asleep or on his back.

Throw strength comes straight from the pointer velocity at release, capped by
`maxThrowSpeed`. The stage also has a ceiling he bounces off, which is the one
addition to the original physics: without it a hard upward throw carried him off
the top of the screen, where Chromium throttled away the animation frames his
physics run on and froze him mid-air -- see the note above about
`backgroundThrottling`. Without either, a hard flick sent him several hundred pixels above the screen
and took a couple of seconds to come back -- and if his window left the screen
completely, Chromium throttled away the animation frames that his physics run on,
freezing him mid-air where even "Call Kairo back" could not reach him. That is
also why the cat window sets `backgroundThrottling: false`, why the main process
refuses to place the window fully off-screen, and why "Call Kairo back" moves the
window itself rather than only asking the renderer to.

## Settings

Tray icon -> **Settings...** opens a small panel. Changes apply immediately and
are saved to `settings.json` in Electron's per-user data directory.

- **Size** -- 3x to 8x. The artwork is pixel art, so only whole-number scales are
  offered; anything else would blur the grid.
- **Talking** -- turn speech on or off, set roughly how often he speaks, and edit
  the phrase list. One phrase per line, so you can make him say whatever you
  like. Leave the box empty to get the defaults back.
- **Position** -- lift him off the bottom edge if a taskbar or dock is covering
  his paws. Leave it on automatic unless it looks wrong.
- **Updates** -- on by default. See below.
- **Startup** -- open Kairo when you log in. Works on Windows and on Linux
  desktops, including Pop!_OS.
- **Always on top** -- same toggle as the tray.

The phrase list is treated as untrusted input: blank lines are dropped, entries
are trimmed and length-capped, and an empty list falls back to the defaults, so a
hand-edited `settings.json` cannot break the app.

### Opening at login

Off by default -- Kairo never adds himself to startup uninvited. Turn it on from
the settings panel or the tray.

This is the operating system's setting, not one of ours, so it is **not** stored
in `settings.json` and **not** touched by "Restore defaults". It is read back from
the OS every time the panel opens, which means it stays correct even if you
change it from your desktop's own startup-applications screen.

- **Windows** -- a login item, via `app.setLoginItemSettings`.
- **Linux** -- a `kairo.desktop` file in `~/.config/autostart` (or
  `$XDG_CONFIG_HOME/autostart`), which Electron cannot do for you; see
  `src/autostart.cjs`.

The command registered is chosen carefully. A portable Windows build unpacks
itself into `%TEMP%` and runs from there, so `process.execPath` points somewhere
that will not exist at your next login -- the real file is
`PORTABLE_EXECUTABLE_FILE`. An AppImage has the same problem and exposes
`APPIMAGE`. Both are preferred over `execPath`, and `test/autostart.test.mjs`
pins that behaviour.

## Automatic updates

Installed copies check GitHub Releases for a newer version, download it in the
background, and apply it the next time Kairo quits -- nothing interrupts you
mid-session. It is on by default and can be turned off under Updates in the
settings panel, which also has a **Check now** button and shows the current
version.

Checks happen 12 seconds after launch and then every 6 hours.

### Which builds can update themselves

| Build | Updates | Why |
| --- | --- | --- |
| `Kairo-Setup-<version>-x64.exe` | yes | installed, so there is something to replace |
| `Kairo-<version>-Linux-x86_64.AppImage` | yes | electron-updater replaces the AppImage in place |
| `Kairo-<version>-Windows-x64-portable.exe` | **no** | see below |
| running from source | no | update it with `git pull` |

**The portable Windows build cannot update itself**, and this is not a bug that
can be fixed: a portable exe unpacks a copy of itself into `%TEMP%` and runs from
there, so there is no installed application to replace. Kairo detects that build
and says so in the settings panel rather than failing quietly in the background.
Hand people the **Setup** installer if you want them to receive updates; the
portable exe is for quick throwaway testing, such as a VM.

The Windows installer is one-click and per-user, so it needs no administrator
rights and installs under `%LOCALAPPDATA%`.

### What a release must contain

`electron-builder` writes `latest.yml` (Windows) and `latest-linux.yml` (Linux)
next to the binaries. Those files are how an installed copy discovers a new
version, and `.blockmap` files let Windows download only the parts that changed.
The release workflow uploads all of them. A release with binaries but no
`latest*.yml` looks fine and updates nothing.

Because the updater resolves releases from `build.publish` in `package.json`,
that owner/repo must match wherever you actually publish.

## Artwork

Kairo is hand-authored pixel art living in `src/cat-sprite.mjs`. Small bitmap
parts (head, body, legs, tails) are stacked into named poses, and animation is
whole-pixel translation only, so the pixel grid stays crisp.

His collar and bell are not listed in each pose. They ride the head layer at a
fixed offset, so they cannot drift out of place and any new pose inherits them.
The bell is nudged a pixel to one side or the other per pose, which is what makes
it swing while he walks and hang still while he does not.

Poses are composited by the exported `paintPose`, which is the single place a pose
becomes pixels. Tooling must use it rather than re-walking the layer list --
`harness.html` originally had its own copy of that loop and silently drew a cat
with no collar.

To inspect the art while editing, open `harness.html` for a sheet of every pose
and `harness-emotes.html` for the floating hearts and sleep letters.

The tray icon in `assets/tray-cat.svg` is generated from the sprite's `head`
part, which keeps the icon and the on-screen cat the same character. Regenerate
the packaged PNG with:

```bash
npm run assets:icon
```

## Test safely on Linux

Install the project dependencies once:

```bash
npm install
```

Run the behavior tests:

```bash
npm test
```

Smoke-test the actual transparent, shaped overlay inside a virtual display:

```bash
npm run test:overlay
```

Check that dragging tracks the pointer one-to-one:

```bash
npm run test:drag
```

Render a sandbox screenshot without touching the real desktop:

```bash
npm run test:visual
```

The screenshot is written to `artifacts/linux-sandbox.png`. This runs Electron
inside a temporary virtual X display and exits automatically.

To try the real transparent overlay on the current Linux desktop:

```bash
npm start
```

### Why dragging tracks at half speed

Kairo's window follows him, so the coordinates a pointer event carries are
measured against a frame of reference that moves with him: his own motion
cancels part of the cursor's, and a drag tracks at roughly half speed.

Scaling that measurement back up does not work, and this is worth stating
plainly because it looks so obviously fixable. The measurement is a feedback
loop, and it is only stable at a gain of 1. Simulating it:

| gain | result |
| --- | --- |
| 1 | tracks at 0.50, stable |
| 2 | diverges to 4.9e12 px |
| 3 | 6.8e19 px |
| 10 | 8.3e40 px |

Several attempts at "reading the true cursor position" -- `event.screenX`,
`event.movementX`, `clientX + window.screenX` -- were all gain above 1 wearing a
different hat, and each one sent him shooting to the top of the screen. The
window geometry is not at fault: requested, actual and renderer-side bounds all
agree exactly, at every size.

Full-speed dragging is possible, but only with a window that does not move
during the drag, which means growing it to cover the drag area on mouse-down.
That works and was built, but resizing a transparent window makes the compositor
flash, and it must resize on every grab. Half speed with a window that never
resizes was the better trade.

`npm run test:drag` asserts the property that actually matters: he never outruns
the cursor. The exact ratio depends on event timing, so it is not asserted.

### How clicks reach the desktop

Kairo's window is **only as big as he is** (plus room above for a speech bubble),
and it is moved as he walks. That is the whole mechanism, and it is deliberate.

The obvious design is a full-screen transparent overlay with a hole cut in it, via
`setShape` on X11 or `setIgnoreMouseEvents`. Both were tried and both failed:

- **Wayland ignores them outright.** A surface either takes pointer input or it
  does not; there is no way for a client to carve out a click-through region. The
  app relaunches itself through XWayland to get X11 semantics back (see below).
- **Even on XWayland the input shape is not honoured here.** The *bounding* shape
  is applied and visibly tracks the cat, so it looks like it is working -- but
  clicks in the rest of the window are still swallowed, which means the panel and
  every title bar and close button stop responding. A shape you can inspect is not
  evidence of input passing through it.

A window that is not over the panel cannot swallow clicks on the panel, whatever
the compositor believes about shapes. So the window is ~210x234 out of a 1920x1080
screen, sits at the bottom, and never covers a title bar. Kairo is pinned at a
fixed spot inside it and **all of his movement is the window moving**, so the
sprite and the window can never disagree and jitter.

The cost is honest: the transparent margin around him -- the bubble headroom and a
little either side -- does still absorb clicks. It is a small box that follows him,
rather than the entire screen.

The Wayland relaunch is worth noting on its own: Ozone chooses its platform before
`main.cjs` runs, so `app.commandLine.appendSwitch("ozone-platform", "x11")` is
silently too late. The flag has to be on the real command line, which means
re-execing once at startup.

`focusable: false` matters as much as the geometry. Left focusable, an
always-on-top overlay takes the keyboard -- every keystroke goes to the cat
instead of the app being used, which feels exactly like the desktop having frozen.
It also stops the window manager treating the overlay as an ordinary app, which
otherwise gives it a frame, an accent border, a slot in the tiling layout, and an
entry in the dock and window switcher; `skipTaskbar` alone does not achieve that.

Deliberately *not* paired with a `type` hint. `type: "notification"` also keeps
the window manager away, but compositors commonly force notification windows
click-through precisely so they cannot steal a click -- which would stop Kairo
being clickable at all.

To check the geometry, watch the window follow him:

```bash
watch -n1 'xwininfo -id "$(xwininfo -root -tree | grep Kairo | head -1 | awk "{print \$1}")" | grep -E "Absolute|Width|Height"'
```

To opt out and run as a native Wayland client, pass `--wayland` -- but expect the
cat to block input across the whole screen.


### If Kairo stands too low

Kairo walks along the bottom edge of his window, which is normally the top of
the taskbar. Windows and most desktops report panel sizes through Electron's
`workArea`, so this lands correctly with no configuration.

Some Linux desktops report nothing. COSMIC on Pop!_OS, for example, does not
publish `_NET_WORKAREA` at all, so `workArea` covers the entire screen and
Kairo's paws end up hidden behind the dock. When a display reserves no space
whatsoever, the app assumes an overlay dock and lifts the floor by 40px. Set it
yourself under Position in the settings panel, or from the command line:

```bash
npm start -- --floor=64
```

Use `--floor=0` to stand on the very bottom edge of the screen.

## Releasing

Releases are built by GitHub Actions, not from a local `release/` folder -- that
directory is gitignored, so what ships is always built from what is committed.

Cut a release by tagging. `npm version` writes the new number into
`package.json`, commits it and creates the tag in one step:

```bash
npm version patch     # 0.1.0 -> 0.1.1   (fixes)
npm version minor     # 0.1.0 -> 0.2.0   (new behaviour)
git push --follow-tags
```

Pushing the tag triggers `.github/workflows/release.yml`, which:

1. builds on `windows-latest` and `ubuntu-latest` in parallel -- the Windows
   build is native, so it needs no Wine,
2. runs the behaviour tests first, so a failing tag cannot ship,
3. creates the GitHub release with generated notes and attaches
   `Kairo-<version>-Windows-x64.exe` and `Kairo-<version>-Linux-x86_64.AppImage`.

The version in the tag and the version in `package.json` are the same number
because `npm version` sets both, and electron-builder names the artifacts from
`package.json`. Tagging by hand instead will produce a release whose name and
binaries disagree.

If a build fails, fix it and re-run without touching the tag: **Actions ->
Release -> Run workflow**, and give it the existing tag. Binaries are replaced
rather than duplicated.

`.github/workflows/ci.yml` runs the tests, the overlay smoke test and the drag
test on every push to `main`, which is the cheap way to find out a release would
have failed before you tag it. It fixes the ownership of Electron's SUID sandbox
helper first: runners ship it unowned by root, and Electron aborts rather than
run unsandboxed.

Note that pushing commits does **not** produce a release. Only a `v*` tag does.

### Building locally instead

Build a Linux AppImage:

```bash
npm run dist:linux
```

Build a portable Windows x64 `.exe` from Linux:

```bash
./scripts/build-windows-docker.sh
```

This produces **both** Windows targets: the NSIS installer (which auto-updates)
and the portable exe (which cannot). `dist:windows` deliberately passes no target
on the command line -- `--win portable` would override `build.win.target` and
silently skip the installer, which is how the only auto-updating Windows build
went missing once.

Build directly on Windows with Node.js installed:

```powershell
npm ci
npm run dist:windows
```

Packages are written to `release/`.

## Current scope

This first version walks along the usable bottom edge of the primary monitor.
Walking and sleeping on top of arbitrary application windows requires a
Windows-specific window-enumeration layer and is intentionally left for the
next iteration.
