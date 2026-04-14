const STORAGE_KEY = "entyping.datasetUrl";
const LOCAL_DATASET_PATH = "/content/new_crown1/content.json";

const datasetForm = document.querySelector("#dataset-form");
const datasetUrlInput = document.querySelector("#dataset-url");
const datasetStatus = document.querySelector("#dataset-status");
const resetSourceButton = document.querySelector("#reset-source");
const datasetSummary = document.querySelector("#dataset-summary");
const summaryContentId = document.querySelector("#summary-content-id");
const summaryUnits = document.querySelector("#summary-units");
const summaryParts = document.querySelector("#summary-parts");
const summaryItems = document.querySelector("#summary-items");
const summaryFirstUnit = document.querySelector("#summary-first-unit");
const summaryFirstPart = document.querySelector("#summary-first-part");
const summaryAudioUrl = document.querySelector("#summary-audio-url");

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

function hideSummary() {
  if (datasetSummary) {
    datasetSummary.hidden = true;
  }
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

function renderSummary(datasetUrl, data) {
  const { firstUnit, firstPart, firstItem } = getFirstItem(data);
  const resolvedAudioUrl = resolveAudioUrl(datasetUrl, firstItem.audio_url);

  summaryContentId.textContent = data.content.id;
  summaryUnits.textContent = String(data.unit_count ?? data.units.length);
  summaryParts.textContent = String(data.part_count ?? 0);
  summaryItems.textContent = String(data.item_count ?? 0);
  summaryFirstUnit.textContent = firstUnit?.label ?? "-";
  summaryFirstPart.textContent = firstPart?.label ?? "-";
  summaryAudioUrl.textContent = resolvedAudioUrl;
  datasetSummary.hidden = false;
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

async function loadDataset(datasetUrl, { save = true } = {}) {
  const normalizedUrl = new URL(datasetUrl, window.location.href).toString();
  setStatus(`Loading dataset from ${normalizedUrl} ...`, "loading");

  const response = await fetch(normalizedUrl, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load dataset: HTTP ${response.status}`);
  }

  const data = await response.json();
  validateDataset(data);
  renderSummary(normalizedUrl, data);

  if (save) {
    saveDatasetUrl(normalizedUrl);
  }

  setStatus(
    `Loaded ${data.content.id} (${data.unit_count} units, ${data.part_count} parts, ${data.item_count} items).`,
    "ok"
  );
  if (datasetUrlInput) {
    datasetUrlInput.value = normalizedUrl;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  hideSummary();

  const candidateUrl = datasetUrlInput?.value.trim();
  if (!candidateUrl) {
    setStatus("Enter a dataset JSON URL first.", "missing");
    return;
  }

  try {
    await loadDataset(candidateUrl, { save: true });
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to load dataset.", "missing");
  }
}

function handleReset() {
  clearDatasetUrl();
  hideSummary();
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
    setStatus("Enter a dataset JSON URL to begin.", "missing");
    return;
  }

  try {
    await loadDataset(initialUrl, { save: Boolean(savedUrl) });
  } catch (error) {
    hideSummary();
    setStatus(error instanceof Error ? error.message : "Failed to load dataset.", "missing");
  }
}

bootstrap();
