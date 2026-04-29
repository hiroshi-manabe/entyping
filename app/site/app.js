const STORAGE_KEY = "entyping.datasetUrl";
const OPEN_UNITS_STORAGE_KEY = "entyping.openUnits";
const PART_PROGRESS_STORAGE_KEY = "entyping.partProgress";
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
const typingCard = document.querySelector(".typing-card");
const targetText = document.querySelector("#target-text");
const typingInput = document.querySelector("#typing-input");
const typingFeedback = document.querySelector("#typing-feedback");
const mistakeCount = document.querySelector("#mistake-count");
const accuracyValue = document.querySelector("#accuracy-value");
const translationText = document.querySelector("#translation-text");
const studyNoteText = document.querySelector("#study-note-text");
const previousItemButton = document.querySelector("#prev-item");
const nextItemButton = document.querySelector("#next-item");
const completionOverlay = document.querySelector("#completion-overlay");
const completionTitle = document.querySelector("#completion-title");
const completionSummary = document.querySelector("#completion-summary");
const completionItems = document.querySelector("#completion-items");
const completionMistakes = document.querySelector("#completion-mistakes");
const completionAccuracy = document.querySelector("#completion-accuracy");
const nextPartButton = document.querySelector("#next-part");
const retryPartButton = document.querySelector("#retry-part");
const completionBackButton = document.querySelector("#completion-back");

let activeDatasetUrl = "";
let activeDataset = null;
let activeAudio = null;
let practiceSession = null;
let mistakeFlashTimer = null;

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

function loadPartProgressByContent() {
  const raw = window.localStorage.getItem(PART_PROGRESS_STORAGE_KEY);
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

function savePartProgressByContent(progressByContent) {
  window.localStorage.setItem(PART_PROGRESS_STORAGE_KEY, JSON.stringify(progressByContent));
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

function getRouteId(entity) {
  return entity?.id ?? null;
}

function encodeRoutePart(value) {
  return encodeURIComponent(value);
}

function getContentsHash() {
  return "#/";
}

function getPracticeHash(unit, part) {
  const unitId = getRouteId(unit);
  const partId = getRouteId(part);
  if (!unitId || !partId) {
    return null;
  }
  return `#/practice/${encodeRoutePart(unitId)}/${encodeRoutePart(partId)}`;
}

function parseRoute() {
  const hash = window.location.hash || getContentsHash();
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) {
    return { name: "contents" };
  }
  if (parts[0] === "practice" && parts.length >= 3) {
    return {
      name: "practice",
      unitId: decodeURIComponent(parts[1]),
      partId: decodeURIComponent(parts[2]),
    };
  }
  return { name: "contents" };
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

function getActiveContentId() {
  return activeDataset?.content?.id ?? "";
}

function getPartProgressKey(unit, part) {
  return [unit.id ?? unit.label ?? "unit", part.id ?? part.label ?? "part"].join("/");
}

function getPartProgress(unit, part) {
  const contentId = getActiveContentId();
  if (!contentId) {
    return null;
  }
  const progressByContent = loadPartProgressByContent();
  const contentProgress = progressByContent[contentId];
  if (!contentProgress || typeof contentProgress !== "object") {
    return null;
  }
  return contentProgress[getPartProgressKey(unit, part)] ?? null;
}

function formatLastPracticed(isoTimestamp) {
  if (!isoTimestamp) {
    return "";
  }

  const practicedDate = new Date(isoTimestamp);
  if (Number.isNaN(practicedDate.getTime())) {
    return "";
  }

  const today = new Date();
  const practicedDay = practicedDate.toDateString();
  const todayDay = today.toDateString();
  if (practicedDay === todayDay) {
    return "Today";
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (practicedDay === yesterday.toDateString()) {
    return "Yesterday";
  }

  return practicedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getPartProgressBadges(progress) {
  const labels = [];
  if (!progress) {
    return labels;
  }

  labels.push(`Completed ${progress.completedCount ?? 0}x`);
  if (typeof progress.bestAccuracy === "number") {
    labels.push(`Best ${progress.bestAccuracy}%`);
  }
  if (typeof progress.bestMistakes === "number") {
    labels.push(`Fewest mistakes ${progress.bestMistakes}`);
  }

  const lastPracticed = formatLastPracticed(progress.lastPracticedAt);
  if (lastPracticed) {
    labels.push(lastPracticed);
  }
  return labels;
}

function saveCurrentPartProgress() {
  if (!practiceSession) {
    return;
  }

  const contentId = getActiveContentId();
  if (!contentId) {
    return;
  }

  const progressByContent = loadPartProgressByContent();
  const contentProgress =
    progressByContent[contentId] && typeof progressByContent[contentId] === "object"
      ? progressByContent[contentId]
      : {};
  const progressKey = getPartProgressKey(practiceSession.unit, practiceSession.part);
  const previous = contentProgress[progressKey] ?? {};
  const accuracy = getSessionAccuracy();
  const mistakes = practiceSession.mistakes;

  contentProgress[progressKey] = {
    attempts: (previous.attempts ?? 0) + 1,
    completedCount: (previous.completedCount ?? 0) + 1,
    bestAccuracy:
      typeof previous.bestAccuracy === "number"
        ? Math.max(previous.bestAccuracy, accuracy)
        : accuracy,
    bestMistakes:
      typeof previous.bestMistakes === "number"
        ? Math.min(previous.bestMistakes, mistakes)
        : mistakes,
    lastPracticedAt: new Date().toISOString(),
  };
  progressByContent[contentId] = contentProgress;
  savePartProgressByContent(progressByContent);
}

function showContentsView() {
  document.body.dataset.screen = "contents";
  if (completionOverlay) {
    completionOverlay.hidden = true;
  }
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
  document.body.dataset.screen = "practice";
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

function showPracticeItemPanels() {
  if (completionOverlay) {
    completionOverlay.hidden = true;
  }
}

function showCompletionPanel() {
  if (completionOverlay) {
    completionOverlay.hidden = false;
  }
}

function isCompletionDialogOpen() {
  return Boolean(completionOverlay && !completionOverlay.hidden);
}

function getCompletionFocusableElements() {
  if (!completionOverlay) {
    return [];
  }
  return [...completionOverlay.querySelectorAll("button, [href], input, select, textarea, [tabindex]")]
    .filter((element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      return !element.disabled && element.tabIndex >= 0 && !element.hidden;
    });
}

function focusFirstCompletionAction() {
  const [firstElement] = getCompletionFocusableElements();
  firstElement?.focus({ preventScroll: true });
}

function getPracticePartEntries() {
  const entries = [];
  for (const unit of activeDataset?.units ?? []) {
    for (const part of unit.parts ?? []) {
      if (getPartItemCount(part) > 0) {
        entries.push({ unit, part });
      }
    }
  }
  return entries;
}

function getCurrentPracticePartIndex(entries) {
  if (!practiceSession) {
    return -1;
  }
  return entries.findIndex(
    ({ unit, part }) => unit === practiceSession.unit && part === practiceSession.part
  );
}

function getNextPracticePart() {
  const entries = getPracticePartEntries();
  const currentIndex = getCurrentPracticePartIndex(entries);
  if (currentIndex < 0) {
    return null;
  }
  return entries[currentIndex + 1] ?? null;
}

function updateNextPartAction() {
  if (!nextPartButton) {
    return;
  }

  const nextPart = getNextPracticePart();
  nextPartButton.hidden = !nextPart;
  nextPartButton.disabled = !nextPart;
  nextPartButton.title = nextPart ? formatPartContext(nextPart.unit, nextPart.part) : "";
}

function findPracticePart(unitId, partId) {
  for (const unit of activeDataset?.units ?? []) {
    if (getRouteId(unit) !== unitId) {
      continue;
    }
    for (const part of unit.parts ?? []) {
      if (getRouteId(part) === partId && getPartItemCount(part) > 0) {
        return { unit, part };
      }
    }
  }
  return null;
}

function navigateToHash(nextHash) {
  if (window.location.hash === nextHash) {
    applyRoute();
    return;
  }
  window.location.hash = nextHash;
}

function navigateToContents() {
  navigateToHash(getContentsHash());
}

function navigateToPractice(unit, part) {
  const nextHash = getPracticeHash(unit, part);
  if (!nextHash) {
    startPractice(unit, part);
    return;
  }
  navigateToHash(nextHash);
}

function setSelectedPartStatus(unit, part) {
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

function handlePartSelect(unit, part) {
  navigateToPractice(unit, part);
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
    mistakeFlash: false,
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

function getSessionAccuracyLabel() {
  return `${getSessionAccuracy()}%`;
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
    accuracyValue.textContent = getSessionAccuracyLabel();
  }
}

function getInitialTargetTextScale(text) {
  const length = [...text].length;
  if (length >= 70) {
    return 0.62;
  }
  if (length >= 56) {
    return 0.7;
  }
  if (length >= 44) {
    return 0.78;
  }
  if (length >= 34) {
    return 0.88;
  }
  return 1;
}

function fitTargetTextToBox() {
  if (!targetText) {
    return;
  }

  const state = getCurrentTypingState();
  if (!state) {
    return;
  }

  let scale = getInitialTargetTextScale(state.displayText);
  targetText.style.setProperty("--target-text-scale", String(scale));

  const hasOverflow = () =>
    targetText.scrollHeight > targetText.clientHeight + 1 ||
    targetText.scrollWidth > targetText.clientWidth + 1;

  while (scale > 0.52 && hasOverflow()) {
    scale = Math.max(0.52, scale - 0.04);
    targetText.style.setProperty("--target-text-scale", String(scale));
  }
}

function scheduleTargetTextFit() {
  window.requestAnimationFrame(fitTargetTextToBox);
}

function createTargetChar(char, index, state) {
  const span = makeElement("span", { text: char === " " ? "\u00a0" : char });
  span.classList.add("target-char");
  if (char === " ") {
    span.classList.add("target-space");
  }
  if (index < state.cursorIndex) {
    span.classList.add("is-correct");
  } else if (index === state.cursorIndex) {
    span.classList.add("is-current");
    if (state.mistakeFlash) {
      span.classList.add("is-mistake");
    }
  } else {
    span.classList.add("is-pending");
  }
  return span;
}

function renderTargetCharacters() {
  const state = getCurrentTypingState();
  if (!state || !targetText) {
    return;
  }

  targetText.textContent = "";
  targetText.style.setProperty("--target-text-scale", "1");

  const chars = [...state.displayText];
  let word = null;

  for (const [index, char] of chars.entries()) {
    if (char === " ") {
      word = null;
      targetText.append(createTargetChar(char, index, state));
      continue;
    }

    if (!word) {
      word = makeElement("span", { className: "target-word" });
      targetText.append(word);
    }
    word.append(createTargetChar(char, index, state));
  }

  scheduleTargetTextFit();
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

function isEditableTarget(target) {
  if (!(target instanceof Element) || target === typingInput) {
    return false;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable]"));
}

function focusTypingInput() {
  if (!practiceSession || practiceSession.completed || !typingInput || practiceScreen?.hidden) {
    return;
  }
  typingInput.focus({ preventScroll: true });
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
    setTypingFeedback("Audio is ready. Press the speaker button.", "neutral");
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

  practiceSession.completed = false;
  showPracticeItemPanels();
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
  focusTypingInput();

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
    completed: false,
  };
  showPracticeView();
  renderPracticeItem({ playAudio: true });
}

function showCompletionView() {
  if (!practiceSession) {
    return;
  }

  practiceSession.completed = true;
  practiceSession.typingState = null;
  if (mistakeFlashTimer) {
    window.clearTimeout(mistakeFlashTimer);
    mistakeFlashTimer = null;
  }

  const partContext = formatPartContext(practiceSession.unit, practiceSession.part);
  const itemCount = practiceSession.items.length;
  practiceContext.textContent = partContext;
  practiceTitle.textContent = "Complete";
  practiceProgressText.textContent = `${itemCount} / ${itemCount}`;
  practiceProgressBar.style.width = "100%";
  renderSessionStats();

  if (completionTitle) {
    completionTitle.textContent = `${practiceSession.part.label ?? "Part"} complete`;
  }
  if (completionSummary) {
    completionSummary.textContent = `You finished ${partContext}.`;
  }
  if (completionItems) {
    completionItems.textContent = String(itemCount);
  }
  if (completionMistakes) {
    completionMistakes.textContent = String(practiceSession.mistakes);
  }
  if (completionAccuracy) {
    completionAccuracy.textContent = getSessionAccuracyLabel();
  }
  saveCurrentPartProgress();
  updateNextPartAction();

  showCompletionPanel();
  focusFirstCompletionAction();
  setStatus(`Finished ${practiceSession.part.label}.`, "ok");
}

function goToNextItem() {
  if (!practiceSession) {
    return;
  }
  if (practiceSession.currentIndex >= practiceSession.items.length - 1) {
    showCompletionView();
    return;
  }
  practiceSession.currentIndex += 1;
  renderPracticeItem({ playAudio: true });
}

function handleDebugShortcut(event) {
  if (
    !isLocalDevelopmentHost() ||
    !practiceSession ||
    practiceSession.completed ||
    practiceScreen?.hidden ||
    isCompletionDialogOpen() ||
    event.key.toLowerCase() !== "j" ||
    !event.ctrlKey ||
    !event.shiftKey ||
    event.metaKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  showCompletionView();
}

function handleTypingKeydown(event) {
  if (
    !practiceSession ||
    practiceScreen?.hidden ||
    isCompletionDialogOpen() ||
    isEditableTarget(event.target)
  ) {
    return;
  }

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
    state.mistakeFlash = false;
    if (mistakeFlashTimer) {
      window.clearTimeout(mistakeFlashTimer);
      mistakeFlashTimer = null;
    }
    state.cursorIndex += 1;
    practiceSession.correctKeys += 1;
    if (isTypingComplete()) {
      setTypingFeedback("Item complete. Press Enter or Next.", "correct");
    } else {
      setTypingFeedback("", "neutral");
    }
  } else {
    practiceSession.mistakes += 1;
    state.mistakeFlash = true;
    if (mistakeFlashTimer) {
      window.clearTimeout(mistakeFlashTimer);
    }
    mistakeFlashTimer = window.setTimeout(() => {
      state.mistakeFlash = false;
      renderTypingState();
      mistakeFlashTimer = null;
    }, 180);
    setTypingFeedback(`Expected "${getKeyLabel(expectedChar)}".`, "incorrect");
  }

  renderTypingState();
}

function goToPreviousItem() {
  if (!practiceSession || practiceSession.completed || practiceSession.currentIndex === 0) {
    return;
  }
  practiceSession.currentIndex -= 1;
  renderPracticeItem({ playAudio: true });
}

function showContentsRoute() {
  practiceSession = null;
  if (activeDataset) {
    renderContents(activeDataset);
  } else {
    showContentsView();
  }
}

function returnToContents() {
  navigateToContents();
}

function retryCurrentPart() {
  if (!practiceSession) {
    return;
  }
  startPractice(practiceSession.unit, practiceSession.part);
}

function startNextPart() {
  const nextPart = getNextPracticePart();
  if (!nextPart) {
    return;
  }
  setStatus(`Started ${formatPartContext(nextPart.unit, nextPart.part)}.`, "ok");
  navigateToPractice(nextPart.unit, nextPart.part);
}

function applyRoute() {
  const route = parseRoute();
  if (route.name === "contents") {
    showContentsRoute();
    return;
  }

  if (!activeDataset) {
    setStatus("Load a dataset before opening a practice route.", "missing");
    return;
  }

  const nextPracticePart = findPracticePart(route.unitId, route.partId);
  if (!nextPracticePart) {
    setStatus("Practice route not found. Returning to contents.", "missing");
    navigateToContents();
    return;
  }

  setSelectedPartStatus(nextPracticePart.unit, nextPracticePart.part);
  startPractice(nextPracticePart.unit, nextPracticePart.part);
}

function handleCompletionDialogKeydown(event) {
  if (!isCompletionDialogOpen()) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    returnToContents();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = getCompletionFocusableElements();
  if (!focusableElements.length) {
    event.preventDefault();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (!completionOverlay?.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus({ preventScroll: true });
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus({ preventScroll: true });
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus({ preventScroll: true });
  }
}

function renderPartRow(unit, part) {
  const row = makeElement("article", { className: "part-row" });

  const body = makeElement("div", { className: "part-body" });
  const label = makeElement("h3", { text: part.label ?? "Part" });
  const meta = makeElement("div", { className: "part-meta" });
  const badges = [`${getPartItemCount(part)} items`, ...getPartProgressBadges(getPartProgress(unit, part))];
  for (const badge of badges) {
    meta.append(makeElement("span", { className: "part-badge", text: badge }));
  }
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
  activeDataset = null;
  setStatus(`Loading dataset from ${normalizedUrl} ...`, "loading");

  const response = await fetch(normalizedUrl, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load dataset: HTTP ${response.status}`);
  }

  const data = await response.json();
  validateDataset(data);
  activeDataset = data;
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
  applyRoute();
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
  activeDataset = null;
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
  backToContentsButton?.addEventListener("click", returnToContents);
  playAudioButton?.addEventListener("click", () => {
    playCurrentAudio();
    window.requestAnimationFrame(focusTypingInput);
  });
  typingCard?.addEventListener("pointerdown", () => {
    window.requestAnimationFrame(focusTypingInput);
  });
  practiceScreen?.addEventListener("pointerdown", () => {
    window.requestAnimationFrame(focusTypingInput);
  });
  document.addEventListener("keydown", handleDebugShortcut);
  document.addEventListener("keydown", handleTypingKeydown);
  nextItemButton?.addEventListener("click", () => {
    if (isTypingComplete()) {
      goToNextItem();
    } else {
      setTypingFeedback("Finish typing the sentence first.", "incorrect");
      window.requestAnimationFrame(focusTypingInput);
    }
  });
  previousItemButton?.addEventListener("click", goToPreviousItem);
  nextPartButton?.addEventListener("click", startNextPart);
  retryPartButton?.addEventListener("click", retryCurrentPart);
  completionBackButton?.addEventListener("click", returnToContents);
  window.addEventListener("hashchange", applyRoute);
  document.addEventListener("keydown", handleCompletionDialogKeydown);

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
