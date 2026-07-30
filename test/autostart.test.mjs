import assert from "node:assert/strict";
import test from "node:test";
import os from "node:os";
import path from "node:path";

import {
  autostartFile,
  launchTarget,
  desktopEntry
} from "../src/autostart.cjs";

test("a portable Windows build registers the real exe, not its temp copy", () => {
  // A portable build unpacks into %TEMP% and runs from there, so execPath would
  // point at a directory that is gone by the next login.
  const target = launchTarget({
    env: { PORTABLE_EXECUTABLE_FILE: "D:\\Apps\\Kairo.exe" },
    execPath: "C:\\Users\\me\\AppData\\Local\\Temp\\1A2B\\Kairo.exe",
    isPackaged: true
  });

  assert.equal(target.path, "D:\\Apps\\Kairo.exe");
  assert.deepEqual(target.args, []);
});

test("an AppImage registers the AppImage file itself", () => {
  const target = launchTarget({
    env: { APPIMAGE: "/home/me/Apps/Kairo.AppImage" },
    execPath: "/tmp/.mount_Kairo123/kairo",
    isPackaged: true
  });

  assert.equal(target.path, "/home/me/Apps/Kairo.AppImage");
});

test("an ordinary packaged build registers its own executable", () => {
  const target = launchTarget({
    env: {},
    execPath: "/opt/kairo/kairo",
    isPackaged: true
  });

  assert.equal(target.path, "/opt/kairo/kairo");
  assert.deepEqual(target.args, []);
});

test("running from source also passes the app directory", () => {
  const target = launchTarget({
    env: {},
    execPath: "/project/node_modules/electron/dist/electron",
    appPath: "/project",
    isPackaged: false
  });

  assert.deepEqual(target.args, ["/project"], "Electron needs to be told what to open");
});

test("the desktop entry is valid and quotes paths with spaces", () => {
  const entry = desktopEntry({ path: "/home/me/My Apps/Kairo.AppImage", args: [] });

  assert.match(entry, /^\[Desktop Entry\]/);
  assert.match(entry, /Type=Application/);
  assert.match(entry, /Exec="\/home\/me\/My Apps\/Kairo\.AppImage"/);
  assert.match(entry, /X-GNOME-Autostart-enabled=true/);
});

test("the autostart location follows XDG_CONFIG_HOME when it is set", () => {
  assert.equal(
    autostartFile({ XDG_CONFIG_HOME: "/custom/config" }),
    path.join("/custom/config", "autostart", "kairo.desktop")
  );

  assert.equal(
    autostartFile({}),
    path.join(os.homedir(), ".config", "autostart", "kairo.desktop")
  );
});
