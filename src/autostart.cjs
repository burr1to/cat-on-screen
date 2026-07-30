const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Launching at login is the operating system's business, not ours: Windows keeps
// it in the registry and Linux desktops read a .desktop file from the autostart
// directory. Electron's setLoginItemSettings only covers Windows and macOS, so
// Linux is handled here by hand.
//
// The OS is the single source of truth for whether this is on. It is deliberately
// not mirrored into settings.json, because the two would drift the moment a user
// changed it from their desktop's own startup-applications screen.

const ENTRY_NAME = "kairo.desktop";

function autostartDirectory(env = process.env) {
  const base = env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "autostart");
}

function autostartFile(env = process.env) {
  return path.join(autostartDirectory(env), ENTRY_NAME);
}

// Which command the OS should run. Getting this wrong is the classic autostart
// bug: a portable Windows build unpacks itself into %TEMP% and runs from there,
// so process.execPath points at a directory that will not exist next time you
// log in. electron-builder exposes the real file it was launched from, and
// AppImage does the same, so prefer those.
function launchTarget({ env = process.env, execPath, appPath, isPackaged } = {}) {
  if (env.PORTABLE_EXECUTABLE_FILE) {
    return { path: env.PORTABLE_EXECUTABLE_FILE, args: [] };
  }

  if (env.APPIMAGE) {
    return { path: env.APPIMAGE, args: [] };
  }

  if (isPackaged) {
    return { path: execPath, args: [] };
  }

  // Running from source: Electron itself needs telling which app to open.
  return { path: execPath, args: [appPath] };
}

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function desktopEntry(target) {
  const command = [target.path, ...target.args].map(quote).join(" ");

  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Kairo",
    "Comment=A small pixel-art cat that lives on your desktop",
    `Exec=${command}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    ""
  ].join("\n");
}

function isEnabledLinux(env = process.env) {
  try {
    return fs.existsSync(autostartFile(env));
  } catch {
    return false;
  }
}

function setEnabledLinux(enabled, target, env = process.env) {
  const file = autostartFile(env);

  try {
    if (!enabled) {
      fs.rmSync(file, { force: true });
      return true;
    }

    fs.mkdirSync(autostartDirectory(env), { recursive: true });
    fs.writeFileSync(file, desktopEntry(target));
    return true;
  } catch (error) {
    console.warn(`Could not change the login item: ${error.message}`);
    return false;
  }
}

module.exports = {
  ENTRY_NAME,
  autostartDirectory,
  autostartFile,
  launchTarget,
  desktopEntry,
  isEnabledLinux,
  setEnabledLinux
};
