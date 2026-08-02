# Release notes

## 0.2.1 — 2 August 2026

### Fixed

- Made movement smooth and substantially lighter on Windows by keeping Kairo's
  transparent work-area window stationary and animating the cat inside it at
  the display refresh rate. Empty pixels remain click-through, while Kairo can
  still be petted, dragged, and thrown.
- Kept Linux on its existing small-window path, where native window movement is
  already efficient and avoids Wayland click-through limitations.

### Notes

- This is a Windows-only release. Linux users can remain on 0.2.0; its runtime
  path is unchanged.

## 0.2.0 — 1 August 2026

### Added

- Ten new things for Kairo to do: loafing, licking, kneading, scratching behind
  an ear, yawning, drinking, perking up at a noise, slow blinking, crouching and
  wiggling before a pounce, and chasing a bug.
- A shake-off when he lands hard, after a throw or a real drop.

### Changed

- Redrawn coat: a deeper grey base, with the old lighter tone kept as an accent
  on the muzzle, paws and tail tip, and a yellow glint in the eyes.

### Fixed

- Cut Kairo's processor and graphics usage substantially, most noticeably on
  Windows. The overlay repainted on every display frame whether or not anything
  had changed, so a sleeping cat cost roughly as much as a running one -- and on
  Windows each of those repaints is a desktop compositing pass, 60 to 144 times
  a second. Painting now happens only when something has actually changed, and
  at most 30 times a second, which is the rate his window already moved at.
  Specifically:
  - The emote layer was cleared on every frame, including in the twenty states
    that have no emote to draw.
  - His position, state and facing were written to the page every frame even
    when unchanged, and his position was written twice per frame.
  - The speech bubble was re-measured every frame, forcing the browser to
    recalculate layout each time, for a bubble whose size only changes when its
    text does.
  - The main process asked the operating system for the display list on every
    position update, thirty times a second.
  - Clicking Kairo read a pixel back off the graphics card, stalling the frame
    it happened on. Hit testing now uses a mask built when a pose is first
    drawn.

### Notes

- None of the performance work changes how Kairo looks or behaves: every pose
  was checked to paint identical pixels, and clicks land on exactly the same
  pixels as before.
- If it is Kairo's memory use rather than his processor use that bothers you,
  this release will not change it. That is Electron's baseline cost, not the
  cat's.

## 0.1.3 — 31 July 2026

### Fixed

- Reduced desktop resource usage by coalescing native window movement and
  allowing hidden Kairo windows to be throttled.

## 0.1.2 — 31 July 2026

Maintenance release.

### Fixed

- Updated the Linux CI setup to fetch Electron before fixing the Chromium
  sandbox helper permissions, making the overlay and drag checks reliable on
  GitHub-hosted runners.

There are no user-facing behavior changes in this release.

## 0.1.1 — 30 July 2026

First packaged Kairo release.

### Added

- A transparent desktop cat for Windows and Linux.
- Autonomous walking, running, sitting, grooming, stretching, rolling, napping,
  jumping, and idle behavior.
- Petting, dragging, throwing, pausing, jumping, and returning Kairo to the
  center of the screen.
- Speech bubbles with editable phrases and configurable timing.
- Settings for size, position, startup, always-on-top behavior, and updates.
- Windows and Linux login startup support.
- Automatic updates for the Windows installer and Linux AppImage.
- Windows installer, portable Windows executable, and Linux AppImage builds.
- Automated behavior tests, overlay smoke tests, drag checks, and release builds
  through GitHub Actions.

### Notes

- The portable Windows executable cannot update itself; use the installer for
  automatic updates.
- Kairo walks along the bottom edge of the primary monitor. Walking across
  application windows is outside the scope of this release.
