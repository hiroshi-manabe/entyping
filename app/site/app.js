const STORAGE_KEY = "entyping.datasetUrl";
const OPEN_UNITS_STORAGE_KEY = "entyping.openUnits";
const LOCAL_DATASET_PATH = "/content/new_crown1/content.json";

const datasetForm = document.querySelector("#dataset-form");
const datasetUrlInput = document.querySelector("#dataset-url");
const datasetStatus = document.querySelector("#dataset-status");
const resetSourceButton = document.querySelector("#reset-source");
const contentsSummary = document.querySelector("#contents-summary");
const contentsList = document.querySelector("#contents-list");
const selectedPart = document.querySelector("#selected-part");
const selectedPartLabel = document.querySelector("#selected-part-label");
const hero = document.querySelector(".hero");
const contentsHeader = document.querySelector(".contents-header");
const practiceScreen = document.querySelector("#practice-screen");
const backToContentsButton = document.querySelector("#back-to-contents");
const practiceContext = document.querySelector("#practice-context");
const practiceTitle = document.querySelector("#practice-title");
const practiceProgressText = document.querySelector("#practice-progress-text");
const practiceProgressBar = document.querySelector("#practice-progress-bar");
const playAudioButton = document.querySelector("#play-audio");
const targetText = document.querySelector("#target-text");
const typingInput = document.querySelector("#typing-input");
const typingFeedback = document.querySelector("#typing-feedback");
const mistakeCount = document.querySelector("#mistake-count");
const accuracyValue = document.querySelector("#accuracy-value");
const translationText = document.querySelector("#translation-text");
const studyNoteText = document.querySelector("#study-note-text");
const previousItemButton = document.querySelector("#prev-item");
const nextItemButton = document.querySelector("#next-item");

let activeDatasetUrl = "";
let activeAudio = null;
let practiceSession = null;

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

function loadOpenUnitsByContent() {
  const raw = window.localStorage.getItem(OPEN_UNITS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadOpenUnitIds(contentId) {
  const saved = loadOpenUnitsByContent()[contentId];
  return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : null;
}

function saveOpenUnitIds(contentId, openUnitIds) {
  const saved = loadOpenUnitsByContent();
  saved[contentId] = [...openUnitIds];
  window.localStorage.setItem(OPEN_UNITS_STORAGE_KEY, JSON.stringify(saved));
}

function getOpenUnitIdsFromDom() {
  if (!contentsList) {
    return [];
  }
  return [...contentsList.querySelectorAll(".unit-card[open]")]
    .map((details) => details.dataset.unitId)
    .filter(Boolean);
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

function normalizeTypingCharacters(value) {
  return value
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"');
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

function showContentsView() {
  if (hero) {
    hero.hidden = false;
  }
  if (contentsHeader) {
    contentsHeader.hidden = false;
  }
  if (contentsList) {
    contentsList.hidden = false;
  }
  if (practiceScreen) {
    practiceScreen.hidden = true;
  }
  if (activeAudio) {
    activeAudio.pause();
  }
}

function showPracticeView() {
  if (hero) {
    hero.hidden = true;
  }
  if (contentsHeader) {
    contentsHeader.hidden = true;
  }
  if (contentsList) {
    contentsList.hidden = true;
  }
  if (practiceScreen) {
    practiceScreen.hidden = false;
  }
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

  startPractice(unit, part);
}

function getCurrentItem() {
  return practiceSession?.items[practiceSession.currentIndex] ?? null;
}

function setTypingFeedback(message, state) {
  if (!typingFeedback) {
    return;
  }
  typingFeedback.textContent = message;
  typingFeedback.dataset.state = state;
}

function createTypingState(item) {
  return {
    displayText: item.text,
    expectedText: normalizeTypingCharacters(item.text),
    cursorIndex: 0,
  };
}

function getCurrentTypingState() {
  return practiceSession?.typingState ?? null;
}

function getTypedPrefix(state) {
  return state.expectedText.slice(0, state.cursorIndex);
}

function getSessionAccuracy() {
  if (!practiceSession?.totalKeys) {
    return 100;
  }
  return Math.round((practiceSession.correctKeys / practiceSession.totalKeys) * 100);
}

function getKeyLabel(char) {
  if (char === " ") {
    return "space";
  }
  return char;
}

function renderSessionStats() {
  if (mistakeCount) {
    mistakeCount.textContent = String(practiceSession?.mistakes ?? 0);
  }
  if (accuracyValue) {
    accuracyValue.textContent = `${getSessionAccuracy()}%`;
  }
}

function renderTargetCharacters() {
  const state = getCurrentTypingState();
  if (!state || !targetText) {
    return;
  }

  targetText.textContent = "";
  for (const [index, char] of [...state.displayText].entries()) {
    const span = makeElement("span", { text: char === " " ? "\u00a0" : char });
    span.classList.add("target-char");
    if (char === " ") {
      span.classList.add("target-space");
    }
    if (index < state.cursorIndex) {
      span.classList.add("is-correct");
    } else if (index === state.cursorIndex) {
      span.classList.add("is-current");
    } else {
      span.classList.add("is-pending");
    }
    targetText.append(span);
  }
}

function renderTypingState() {
  const state = getCurrentTypingState();
  if (!state) {
    return;
  }
  if (typingInput) {
    typingInput.value = getTypedPrefix(state);
  }
  renderTargetCharacters();
  renderSessionStats();
}

function isTypingComplete() {
  const state = getCurrentTypingState();
  return Boolean(state && state.cursorIndex >= state.expectedText.length);
}

function playCurrentAudio() {
  const item = getCurrentItem();
  if (!item?.audio_url) {
    return;
  }

  if (activeAudio) {
    activeAudio.pause();
  }
  activeAudio = new Audio(resolveAudioUrl(activeDatasetUrl, item.audio_url));
  activeAudio.play().catch(() => {
    setTypingFeedback("Audio is ready. Press Play Audio.", "neutral");
  });
}

function renderPracticeItem({ playAudio = false } = {}) {
  const item = getCurrentItem();
  if (!practiceSession || !item) {
    return;
  }

  const itemNumber = practiceSession.currentIndex + 1;
  const total = practiceSession.items.length;
  const progress = Math.round((itemNumber / total) * 100);

  practiceContext.textContent = formatPartContext(practiceSession.unit, practiceSession.part);
  practiceTitle.textContent = practiceSession.part.label ?? "Practice";
  practiceProgressText.textContent = `${itemNumber} / ${total}`;
  practiceProgressBar.style.width = `${progress}%`;
  practiceSession.typingState = createTypingState(item);
  translationText.textContent = item.ja || "-";
  studyNoteText.textContent = item.study_note || "-";
  typingInput.value = "";
  typingInput.disabled = false;
  typingInput.readOnly = true;
  previousItemButton.disabled = practiceSession.currentIndex === 0;
  nextItemButton.textContent = practiceSession.currentIndex === total - 1 ? "Finish" : "Next";
  setTypingFeedback("", "neutral");
  renderTypingState();
  typingInput.focus();

  if (playAudio) {
    playCurrentAudio();
  }
}

function startPractice(unit, part) {
  const items = Array.isArray(part.items) ? part.items : [];
  if (!items.length) {
    setStatus(`${part.label} has no practice items.`, "missing");
    return;
  }

  practiceSession = {
    unit,
    part,
    items,
    currentIndex: 0,
    mistakes: 0,
    correctKeys: 0,
    totalKeys: 0,
  };
  showPracticeView();
  renderPracticeItem({ playAudio: true });
}

function goToNextItem() {
  if (!practiceSession) {
    return;
  }
  if (practiceSession.currentIndex >= practiceSession.items.length - 1) {
    showContentsView();
    setStatus(`Finished ${practiceSession.part.label}.`, "ok");
    practiceSession = null;
    return;
  }
  practiceSession.currentIndex += 1;
  renderPracticeItem({ playAudio: true });
}

function handleTypingKeydown(event) {
  const state = getCurrentTypingState();
  if (!state || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (isTypingComplete()) {
      goToNextItem();
    }
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    if (state.cursorIndex > 0) {
      state.cursorIndex -= 1;
      setTypingFeedback("", "neutral");
      renderTypingState();
    }
    return;
  }

  if (event.key.length !== 1) {
    return;
  }

  event.preventDefault();
  if (isTypingComplete()) {
    return;
  }

  const expectedChar = state.expectedText[state.cursorIndex];
  const typedChar = normalizeTypingCharacters(event.key);
  practiceSession.totalKeys += 1;

  if (typedChar === expectedChar) {
    state.cursorIndex += 1;
    practiceSession.correctKeys += 1;
    if (isTypingComplete()) {
      setTypingFeedback("Item complete. Press Enter or Next.", "correct");
    } else {
      setTypingFeedback("", "neutral");
    }
  } else {
    practiceSession.mistakes += 1;
    setTypingFeedback(`Expected "${getKeyLabel(expectedChar)}".`, "incorrect");
  }

  renderTypingState();
}

function goToPreviousItem() {
  if (!practiceSession || practiceSession.currentIndex === 0) {
    return;
  }
  practiceSession.currentIndex -= 1;
  renderPracticeItem({ playAudio: true });
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
    text: "Start",
  });
  action.type = "button";
  action.addEventListener("click", () => handlePartSelect(unit, part));

  row.append(body, action);
  return row;
}

function renderUnit(unit, index, openUnitIds, contentId) {
  const details = makeElement("details", { className: "unit-card" });
  details.dataset.unitId = unit.id;
  details.open = openUnitIds.has(unit.id);
  details.addEventListener("toggle", () => {
    saveOpenUnitIds(contentId, getOpenUnitIdsFromDom());
  });

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
  const validUnitIds = new Set(units.map((unit) => unit.id).filter(Boolean));
  const savedOpenUnitIds = loadOpenUnitIds(data.content.id);
  const initialOpenUnitIds = savedOpenUnitIds
    ? savedOpenUnitIds.filter((unitId) => validUnitIds.has(unitId))
    : [units[0]?.id].filter(Boolean);
  const openUnitIds = new Set(initialOpenUnitIds);

  contentsSummary.textContent = `${data.content.title ?? data.content.id}: ${units.length} units, ${partCount} parts, ${itemCount} items.`;
  selectedPart.hidden = true;
  selectedPartLabel.textContent = "-";
  showContentsView();

  contentsList.innerHTML = "";
  for (const [index, unit] of units.entries()) {
    contentsList.append(renderUnit(unit, index, openUnitIds, data.content.id));
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
  backToContentsButton?.addEventListener("click", () => {
    showContentsView();
    practiceSession = null;
  });
  playAudioButton?.addEventListener("click", playCurrentAudio);
  typingInput?.addEventListener("keydown", handleTypingKeydown);
  nextItemButton?.addEventListener("click", () => {
    if (isTypingComplete()) {
      goToNextItem();
    } else {
      setTypingFeedback("Finish typing the sentence first.", "incorrect");
    }
  });
  previousItemButton?.addEventListener("click", goToPreviousItem);

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
