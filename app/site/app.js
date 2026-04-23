const STORAGE_KEY = "entyping.datasetUrl";
const LOCAL_DATASET_PATH = "/content/new_crown1/content.json";

const datasetForm = document.querySelector("#dataset-form");
const datasetUrlInput = document.querySelector("#dataset-url");
const datasetStatus = document.querySelector("#dataset-status");
const resetSourceButton = document.querySelector("#reset-source");
const contentsSummary = document.querySelector("#contents-summary");
const contentsList = document.querySelector("#contents-list");
const selectedPart = document.querySelector("#selected-part");
const selectedPartLabel = document.querySelector("#selected-part-label");

let activeDatasetUrl = "";

function isLocalDevelopmentHost() {
  const host = window.location.hostname;
  return host === "127.0.0.1" || host === "localhost";
}

function getDefaultDatasetUrl() {
  return new URL(LOCAL_DATASET_PATH, window.location.origin).toString();
}

function setStatus(message, state) {
  if (!datasetStatus) {
    return;
  }
  datasetStatus.textContent = message;
  datasetStatus.dataset.state = state;
}

function loadSavedDatasetUrl() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function saveDatasetUrl(url) {
  window.localStorage.setItem(STORAGE_KEY, url);
}

function clearDatasetUrl() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function getPartItemCount(part) {
  return Array.isArray(part.items) ? part.items.length : 0;
}

function getDatasetCounts(data) {
  const units = Array.isArray(data.units) ? data.units : [];
  const partCount = units.reduce((count, unit) => count + (unit.parts?.length ?? 0), 0);
  const itemCount = units.reduce(
    (count, unit) =>
      count +
      (unit.parts ?? []).reduce(
        (partTotal, part) => partTotal + getPartItemCount(part),
        0
      ),
    0
  );
  return { units, partCount, itemCount };
}

function getFirstItem(data) {
  const firstUnit = data.units?.[0];
  const firstPart = firstUnit?.parts?.[0];
  const firstItem = firstPart?.items?.[0];
  return { firstUnit, firstPart, firstItem };
}

function validateDataset(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Response was not a JSON object.");
  }
  if (!data.content || typeof data.content.id !== "string") {
    throw new Error("Dataset is missing content.id.");
  }
  if (!Array.isArray(data.units)) {
    throw new Error("Dataset is missing units.");
  }
  const { firstItem } = getFirstItem(data);
  if (!firstItem) {
    throw new Error("Dataset does not contain any items.");
  }
  if (typeof firstItem.audio_url !== "string" || !firstItem.audio_url) {
    throw new Error("Dataset items are missing audio_url.");
  }
}

function resolveAudioUrl(datasetUrl, audioUrl) {
  return new URL(audioUrl, datasetUrl).toString();
}

function makeElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) {
    element.className = options.className;
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  return element;
}

function renderEmptyState(message) {
  if (!contentsList) {
    return;
  }
  contentsList.innerHTML = "";
  contentsList.append(
    makeElement("div", {
      className: "empty-state",
      text: message,
    })
  );
}

function formatPartContext(unit, part) {
  return [unit.label, part.label].filter(Boolean).join(" / ");
}

function handlePartSelect(unit, part) {
  if (!selectedPart || !selectedPartLabel) {
    return;
  }

  selectedPart.hidden = false;
  selectedPartLabel.textContent = `${formatPartContext(unit, part)} (${getPartItemCount(part)} items)`;

  const firstItem = part.items?.[0];
  if (firstItem?.audio_url) {
    const audioUrl = resolveAudioUrl(activeDatasetUrl, firstItem.audio_url);
    setStatus(`Selected ${part.label}. First audio resolves to ${audioUrl}`, "ok");
  } else {
    setStatus(`Selected ${part.label}.`, "ok");
  }
}

function renderPartRow(unit, part) {
  const row = makeElement("article", { className: "part-row" });

  const body = makeElement("div", { className: "part-body" });
  const label = makeElement("h3", { text: part.label ?? "Part" });
  const meta = makeElement("p", {
    className: "part-meta",
    text: `${getPartItemCount(part)} items`,
  });
  body.append(label, meta);

  const action = makeElement("button", {
    className: "part-action",
    text: "Choose part",
  });
  action.type = "button";
  action.addEventListener("click", () => handlePartSelect(unit, part));

  row.append(body, action);
  return row;
}

function renderUnit(unit, index) {
  const details = makeElement("details", { className: "unit-card" });
  if (index === 0) {
    details.open = true;
  }

  const partCount = unit.parts?.length ?? 0;
  const itemCount = (unit.parts ?? []).reduce(
    (total, part) => total + getPartItemCount(part),
    0
  );

  const summary = makeElement("summary", { className: "unit-summary" });
  const titleGroup = makeElement("span", { className: "unit-title-group" });
  titleGroup.append(
    makeElement("span", { className: "unit-kicker", text: `Unit ${index + 1}` }),
    makeElement("span", { className: "unit-title", text: unit.label ?? "Untitled" })
  );
  const counts = makeElement("span", {
    className: "unit-counts",
    text: `${partCount} parts / ${itemCount} items`,
  });
  summary.append(titleGroup, counts);

  const parts = makeElement("div", { className: "part-list" });
  for (const part of unit.parts ?? []) {
    parts.append(renderPartRow(unit, part));
  }

  details.append(summary, parts);
  return details;
}

function renderContents(data) {
  if (!contentsList || !contentsSummary) {
    return;
  }

  const { units, partCount, itemCount } = getDatasetCounts(data);
  contentsSummary.textContent = `${data.content.title ?? data.content.id}: ${units.length} units, ${partCount} parts, ${itemCount} items.`;
  selectedPart.hidden = true;
  selectedPartLabel.textContent = "-";

  contentsList.innerHTML = "";
  for (const [index, unit] of units.entries()) {
    contentsList.append(renderUnit(unit, index));
  }
}

async function loadDataset(datasetUrl, { save = true } = {}) {
  const normalizedUrl = new URL(datasetUrl, window.location.href).toString();
  activeDatasetUrl = normalizedUrl;
  setStatus(`Loading dataset from ${normalizedUrl} ...`, "loading");

  const response = await fetch(normalizedUrl, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load dataset: HTTP ${response.status}`);
  }

  const data = await response.json();
  validateDataset(data);
  renderContents(data);

  if (save) {
    saveDatasetUrl(normalizedUrl);
  }

  const { units, partCount, itemCount } = getDatasetCounts(data);
  setStatus(
    `Loaded ${data.content.id} (${units.length} units, ${partCount} parts, ${itemCount} items).`,
    "ok"
  );
  if (datasetUrlInput) {
    datasetUrlInput.value = normalizedUrl;
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const candidateUrl = datasetUrlInput?.value.trim();
  if (!candidateUrl) {
    setStatus("Enter a dataset JSON URL first.", "missing");
    return;
  }

  try {
    await loadDataset(candidateUrl, { save: true });
  } catch (error) {
    renderEmptyState("Dataset could not be loaded. Check the settings URL.");
    setStatus(error instanceof Error ? error.message : "Failed to load dataset.", "missing");
  }
}

function handleReset() {
  clearDatasetUrl();
  activeDatasetUrl = "";
  renderEmptyState("Dataset contents will appear here after loading.");
  if (contentsSummary) {
    contentsSummary.textContent = "Load a dataset to show available units and parts.";
  }
  if (selectedPart) {
    selectedPart.hidden = true;
  }
  if (datasetUrlInput) {
    datasetUrlInput.value = isLocalDevelopmentHost() ? getDefaultDatasetUrl() : "";
  }
  setStatus("Saved dataset source cleared.", "missing");
}

async function bootstrap() {
  if (!datasetForm || !datasetUrlInput || !resetSourceButton) {
    return;
  }

  datasetForm.addEventListener("submit", handleSubmit);
  resetSourceButton.addEventListener("click", handleReset);

  const savedUrl = loadSavedDatasetUrl();
  const initialUrl = savedUrl || (isLocalDevelopmentHost() ? getDefaultDatasetUrl() : "");
  datasetUrlInput.value = initialUrl;

  if (!initialUrl) {
    setStatus("Open settings and enter a dataset JSON URL to begin.", "missing");
    return;
  }

  try {
    await loadDataset(initialUrl, { save: Boolean(savedUrl) });
  } catch (error) {
    renderEmptyState("Dataset could not be loaded. Check the settings URL.");
    setStatus(error instanceof Error ? error.message : "Failed to load dataset.", "missing");
  }
}

bootstrap();
