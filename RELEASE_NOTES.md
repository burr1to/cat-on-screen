# Release notes

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
