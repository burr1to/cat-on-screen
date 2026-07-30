import assert from "node:assert/strict";
import test from "node:test";

import { unsupportedReason } from "../src/updater.cjs";

test("an installed build can update itself", () => {
  assert.equal(unsupportedReason({ isPackaged: true, env: {} }), null);
});

test("the portable Windows build reports that it cannot update", () => {
  // It runs from a copy of itself in %TEMP%, so there is nothing to replace.
  const reason = unsupportedReason({
    isPackaged: true,
    env: { PORTABLE_EXECUTABLE_FILE: "D:\\Apps\\Kairo.exe" }
  });

  assert.match(reason, /portable/i);
  assert.match(reason, /installer/i, "should point the user at the build that does update");
});

test("running from source never tries to update", () => {
  const reason = unsupportedReason({ isPackaged: false, env: {} });
  assert.match(reason, /source/i);
});
