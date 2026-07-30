// Auto-update, wrapped so main.cjs does not have to care about the details.
//
// Two things are worth knowing before changing anything here:
//
// 1. Updating requires an *installed* app. A portable Windows .exe unpacks into
//    %TEMP% and runs from there -- there is nothing on disk to replace, so
//    electron-updater cannot help. That build is detected and updating is
//    reported as unsupported rather than failing repeatedly in the background.
// 2. Running from source has no update channel at all, so this stays quiet in
//    development instead of hammering the GitHub API on every launch.

const FIRST_CHECK_DELAY_MS = 12_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// Why updating cannot work here, or null if it can.
function unsupportedReason({ isPackaged, env = process.env }) {
  if (!isPackaged) return "Kairo is running from source, so it updates when you rebuild it.";
  if (env.PORTABLE_EXECUTABLE_FILE) {
    return "This is the portable build, which cannot update itself. Use the installer to get updates.";
  }
  return null;
}

function createUpdater({ app, onStatus = () => {} }) {
  const reason = unsupportedReason({ isPackaged: app.isPackaged });

  let autoUpdater = null;
  let timer = null;
  let enabled = true;
  let status = reason
    ? { state: "unsupported", message: reason }
    : { state: "idle", message: "" };

  function publish(next) {
    status = { ...next, version: app.getVersion() };
    onStatus(status);
  }

  function load() {
    if (autoUpdater || reason) return autoUpdater;

    // Required lazily: pulling it in during development would be dead weight.
    ({ autoUpdater } = require("electron-updater"));

    autoUpdater.autoDownload = true;
    // Applied on quit rather than interrupting whatever the user is doing.
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = null;

    autoUpdater.on("checking-for-update", () =>
      publish({ state: "checking", message: "Looking for a new version..." })
    );
    autoUpdater.on("update-not-available", () =>
      publish({ state: "current", message: "Kairo is up to date." })
    );
    autoUpdater.on("update-available", (info) =>
      publish({ state: "downloading", message: `Downloading ${info?.version ?? "update"}...` })
    );
    autoUpdater.on("download-progress", (progress) =>
      publish({
        state: "downloading",
        message: `Downloading update... ${Math.round(progress?.percent ?? 0)}%`
      })
    );
    autoUpdater.on("update-downloaded", (info) =>
      publish({
        state: "ready",
        message: `Version ${info?.version ?? ""} is ready. It installs when Kairo quits.`.trim()
      })
    );
    autoUpdater.on("error", (error) =>
      // A failed check is not worth bothering anyone about; it will try again.
      publish({ state: "error", message: `Could not check for updates: ${error?.message ?? error}` })
    );

    return autoUpdater;
  }

  async function check({ silent = true } = {}) {
    if (reason) {
      publish({ state: "unsupported", message: reason });
      return false;
    }

    if (!enabled && silent) return false;

    try {
      await load().checkForUpdates();
      return true;
    } catch (error) {
      publish({ state: "error", message: `Could not check for updates: ${error.message}` });
      return false;
    }
  }

  return {
    get status() {
      return { ...status, version: app.getVersion() };
    },

    get supported() {
      return reason === null;
    },

    // Called whenever the setting changes, including at startup.
    setEnabled(next) {
      enabled = Boolean(next);
      if (timer) clearInterval(timer);
      timer = null;
      if (!enabled || reason) return;

      timer = setInterval(() => check({ silent: true }), CHECK_INTERVAL_MS);
      setTimeout(() => check({ silent: true }), FIRST_CHECK_DELAY_MS);
    },

    // From the tray, so it reports back even when automatic checks are off.
    checkNow() {
      return check({ silent: false });
    },

    installNow() {
      if (reason || status.state !== "ready") return false;
      load().quitAndInstall();
      return true;
    },

    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { createUpdater, unsupportedReason, CHECK_INTERVAL_MS };
