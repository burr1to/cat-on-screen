const api = window.kairoSettings;

const fields = {
  scale: document.querySelector("#scale"),
  scaleValue: document.querySelector("#scale-value"),
  speechEnabled: document.querySelector("#speech-enabled"),
  speechGap: document.querySelector("#speech-gap"),
  speechGapValue: document.querySelector("#speech-gap-value"),
  phrases: document.querySelector("#phrases"),
  floorAuto: document.querySelector("#floor-auto"),
  floorOffset: document.querySelector("#floor-offset"),
  floorValue: document.querySelector("#floor-value"),
  alwaysOnTop: document.querySelector("#always-on-top"),
  launchAtLogin: document.querySelector("#launch-at-login"),
  autoUpdate: document.querySelector("#auto-update"),
  updateStatus: document.querySelector("#update-status"),
  checkUpdates: document.querySelector("#check-updates"),
  installUpdate: document.querySelector("#install-update"),
  version: document.querySelector("#version"),
  reset: document.querySelector("#reset"),
  close: document.querySelector("#close")
};

let applying = false;
let current = null;

function describeGap(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round((seconds / 60) * 10) / 10;
  return `${minutes}min`;
}

function describeUpdateState(state) {
  if (state === "current") return "Kairo is up to date.";
  if (state === "checking") return "Looking for a new version...";
  return "Updates are checked in the background.";
}

function render(settings) {
  applying = true;
  current = settings;

  fields.scale.value = String(settings.scale);
  fields.scaleValue.textContent = `${settings.scale}×`;

  fields.speechEnabled.checked = settings.speechEnabled;
  fields.speechGap.value = String(settings.speechGapSeconds);
  fields.speechGapValue.textContent = describeGap(settings.speechGapSeconds);
  fields.speechGap.disabled = !settings.speechEnabled;
  fields.phrases.disabled = !settings.speechEnabled;

  // Only overwrite the textarea when it does not already match, so the caret
  // does not jump while the user is typing.
  const joined = settings.phrases.join("\n");
  if (fields.phrases.value.trim() !== joined.trim()) fields.phrases.value = joined;

  const isAuto = settings.floorOffset === null;
  fields.floorAuto.checked = isAuto;
  fields.floorOffset.disabled = isAuto;
  fields.floorOffset.value = String(settings.floorOffset ?? 0);
  fields.floorValue.textContent = isAuto ? "auto" : `${settings.floorOffset}px`;

  fields.alwaysOnTop.checked = settings.alwaysOnTop;
  fields.launchAtLogin.checked = Boolean(settings.launchAtLogin);

  fields.autoUpdate.checked = Boolean(settings.autoUpdate);
  const update = settings.update ?? {};
  fields.version.textContent = update.version ? `v${update.version}` : "";
  fields.updateStatus.textContent = update.message || describeUpdateState(update.state);
  fields.autoUpdate.disabled = update.state === "unsupported";
  fields.checkUpdates.disabled =
    update.state === "unsupported" ||
    update.state === "checking" ||
    update.state === "downloading";
  fields.installUpdate.hidden = update.state !== "ready";

  applying = false;
}

// Only write when something genuinely changed. Rendering the panel sets every
// control programmatically, and a stray event during that must not be able to
// persist a value the user never touched.
function isNoOp(patch) {
  if (!current) return false;

  return Object.entries(patch).every(([key, value]) => {
    const existing = current[key];
    if (Array.isArray(existing) && Array.isArray(value)) {
      return existing.join("\n") === value.join("\n");
    }
    return existing === value;
  });
}

async function save(patch) {
  if (applying || isNoOp(patch)) return;
  render(await api.write(patch));
}

fields.scale.addEventListener("input", () => {
  fields.scaleValue.textContent = `${fields.scale.value}×`;
  save({ scale: Number(fields.scale.value) });
});

fields.speechEnabled.addEventListener("change", () => {
  save({ speechEnabled: fields.speechEnabled.checked });
});

fields.speechGap.addEventListener("input", () => {
  const seconds = Number(fields.speechGap.value);
  fields.speechGapValue.textContent = describeGap(seconds);
  save({ speechGapSeconds: seconds });
});

// Typing a phrase list should not write a file on every keystroke.
let phrasesTimer = null;
fields.phrases.addEventListener("input", () => {
  if (applying) return;
  if (phrasesTimer) clearTimeout(phrasesTimer);
  phrasesTimer = setTimeout(() => {
    save({ phrases: fields.phrases.value.split("\n") });
  }, 500);
});

fields.floorAuto.addEventListener("change", () => {
  save({
    floorOffset: fields.floorAuto.checked ? null : Number(fields.floorOffset.value)
  });
});

fields.floorOffset.addEventListener("input", () => {
  fields.floorValue.textContent = `${fields.floorOffset.value}px`;
  save({ floorOffset: Number(fields.floorOffset.value) });
});

fields.alwaysOnTop.addEventListener("change", () => {
  save({ alwaysOnTop: fields.alwaysOnTop.checked });
});

fields.launchAtLogin.addEventListener("change", () => {
  save({ launchAtLogin: fields.launchAtLogin.checked });
});

fields.autoUpdate.addEventListener("change", () => {
  save({ autoUpdate: fields.autoUpdate.checked });
});

fields.checkUpdates.addEventListener("click", async () => {
  fields.updateStatus.textContent = "Looking for a new version...";
  await api.checkForUpdates();
});

fields.installUpdate.addEventListener("click", () => api.installUpdate());

fields.reset.addEventListener("click", async () => {
  render(await api.reset());
});

fields.close.addEventListener("click", () => api.close());

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") api.close();
});

api.onChanged(render);
api.read().then(render);
