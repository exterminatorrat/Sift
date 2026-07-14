"use strict";

const state = {
  bootstrap: null,
  currentCase: null,
  currentCaseId: null,
  requestToken: 0,
  responseValid: false,
  executionMetricsValid: true,
  busy: false,
  acknowledged: false,
  toastTimer: null
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  void initialize();
});

function bindElements() {
  for (const id of [
    "runId",
    "passNumber",
    "progressText",
    "modelLabel",
    "modelFingerprint",
    "promptFingerprint",
    "schemaFingerprint",
    "configFingerprint",
    "sessionReminderText",
    "sessionAcknowledgement",
    "sessionAcknowledgementText",
    "remainingText",
    "progressBar",
    "queueList",
    "loadingState",
    "errorState",
    "errorMessage",
    "retryButton",
    "caseView",
    "casePosition",
    "caseName",
    "caseId",
    "caseStatus",
    "caseImages",
    "pageCount",
    "promptContentOrder",
    "menuPageLabel",
    "profileJson",
    "userPrompt",
    "copyProfileButton",
    "copyPromptButton",
    "savedAt",
    "jsonStatus",
    "rawJson",
    "latencyMs",
    "inputTokens",
    "outputTokens",
    "thinkingTokens",
    "previousButton",
    "nextButton",
    "saveButton",
    "toast"
  ]) {
    elements[id] = document.getElementById(id);
  }
}

function bindEvents() {
  elements.retryButton.addEventListener("click", () => void initialize());
  elements.sessionAcknowledgement.addEventListener("change", () => {
    state.acknowledged = elements.sessionAcknowledgement.checked;
    storeAcknowledgement(state.acknowledged);
    updateSaveButton();
  });
  elements.queueList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-case-id]");
    if (button) void loadCase(button.dataset.caseId);
  });
  elements.rawJson.addEventListener("input", validateResponse);
  for (const id of ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"]) {
    elements[id].addEventListener("input", validateExecutionMetrics);
  }
  elements.saveButton.addEventListener("click", () => void saveResponse());
  elements.previousButton.addEventListener("click", () => void moveCase(-1));
  elements.nextButton.addEventListener("click", () => void moveCase(1));
  elements.copyProfileButton.addEventListener("click", () => {
    void copyText(elements.profileJson.textContent, "Profile copied");
  });
  elements.copyPromptButton.addEventListener("click", () => {
    void copyText(elements.userPrompt.textContent, "User prompt copied");
  });
}

async function initialize() {
  setScreen("loading");
  try {
    await refreshBootstrap();
    const initialCaseId = state.bootstrap.status.nextCaseId ?? state.bootstrap.queue[0]?.id;
    if (!initialCaseId) throw new Error("The prepared run has no cases.");
    await loadCase(initialCaseId);
    setScreen("case");
  } catch (error) {
    showFatal(error);
  }
}

async function refreshBootstrap() {
  const bootstrap = await apiJson("/api/bootstrap");
  state.bootstrap = bootstrap;
  renderRun();
  renderQueue();
}

function renderRun() {
  const { run, status } = state.bootstrap;
  elements.runId.textContent = run.runId;
  elements.passNumber.textContent = String(run.pass);
  elements.progressText.textContent = `${status.completedCases} / ${status.totalCases}`;
  elements.modelLabel.textContent = run.modelLabel;
  elements.modelFingerprint.textContent = run.fingerprints.model;
  elements.promptFingerprint.textContent = run.fingerprints.prompt;
  elements.schemaFingerprint.textContent = run.fingerprints.schema;
  elements.configFingerprint.textContent = run.fingerprints.config;
  elements.sessionReminderText.textContent = run.freshSessionReminder;
  elements.sessionAcknowledgementText.textContent = "Open a case to confirm its fresh AI Studio chat";
  elements.sessionAcknowledgement.checked = false;
  elements.remainingText.textContent = status.remainingCases === 0
    ? "Pass complete"
    : `${status.remainingCases} ${status.remainingCases === 1 ? "case" : "cases"} remaining`;
  elements.progressBar.max = Math.max(status.totalCases, 1);
  elements.progressBar.value = status.completedCases;
  elements.progressBar.textContent = `${status.completedCases} of ${status.totalCases}`;
  document.title = `${run.runId} - pass ${run.pass} - Sift manual AI evals`;
}

function renderQueue() {
  elements.queueList.replaceChildren();
  for (const item of state.bootstrap.queue) {
    const listItem = document.createElement("li");
    listItem.className = "queue-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `queue-button${item.completed ? " is-complete" : ""}`;
    button.dataset.caseId = item.id;
    button.setAttribute("aria-current", String(item.id === state.currentCaseId));
    button.setAttribute("aria-label", `${item.position}. ${item.name}. ${item.completed ? "Completed" : "Pending"}`);

    const index = document.createElement("span");
    index.className = "queue-index";
    index.textContent = String(item.position).padStart(2, "0");

    const copy = document.createElement("span");
    copy.className = "queue-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const id = document.createElement("span");
    id.textContent = item.id;
    copy.append(name, id);

    const status = document.createElement("span");
    status.className = "queue-state";
    status.textContent = item.completed ? "Done" : "Open";

    button.append(index, copy, status);
    listItem.append(button);
    elements.queueList.append(listItem);
  }
}

async function loadCase(caseId) {
  if (!caseId) return;
  const token = ++state.requestToken;
  state.busy = true;
  updateSaveButton();
  try {
    const detail = await apiJson(`/api/cases/${encodeURIComponent(caseId)}`);
    if (token !== state.requestToken) return;
    state.currentCaseId = caseId;
    state.currentCase = detail;
    state.acknowledged = detail.completed
      ? Boolean(detail.freshSessionAcknowledgedAt)
      : readAcknowledgement();
    renderQueue();
    renderCase(detail);
    setScreen("case");
  } catch (error) {
    if (token === state.requestToken) {
      showToast(errorMessage(error), true);
      if (!state.currentCase) throw error;
    }
  } finally {
    if (token === state.requestToken) {
      state.busy = false;
      updateSaveButton();
      updateNavigation();
    }
  }
}

function renderCase(detail) {
  const queueItem = state.bootstrap.queue.find((item) => item.id === detail.id);
  elements.casePosition.textContent = queueItem
    ? `Case ${queueItem.position} of ${state.bootstrap.queue.length}`
    : "Prepared case";
  elements.caseName.textContent = detail.name;
  elements.caseId.textContent = detail.id;
  elements.caseStatus.textContent = detail.completed ? "Saved" : "Pending";
  elements.caseStatus.classList.toggle("is-complete", detail.completed);
  const images = normalizeCaseImages(detail);
  renderCaseImages(detail, images);
  const pageSequence = images
    .map((image) => `page ${image.pageNumber} image, page ${image.pageNumber} label`)
    .join(", ");
  elements.promptContentOrder.textContent = detail.promptContentOrder === "image_first"
    ? `Order: ${pageSequence}, user prompt`
    : `Order: user prompt, ${pageSequence}`;
  elements.menuPageLabel.textContent = images
    .map((image) => `Page ${image.pageNumber}: ${image.label}`)
    .join("\n");
  elements.profileJson.textContent = JSON.stringify(detail.profile, null, 2);
  elements.userPrompt.textContent = detail.userPrompt;
  elements.rawJson.value = detail.rawResponse ?? "";
  elements.rawJson.readOnly = detail.completed;
  renderExecutionMetrics(detail.executionMetrics, detail.completed);
  elements.sessionAcknowledgementText.textContent = `I started a fresh AI Studio chat for ${detail.id}`;
  elements.sessionAcknowledgement.checked = state.acknowledged;
  elements.sessionAcknowledgement.disabled = detail.completed;
  elements.savedAt.textContent = detail.completed && detail.submittedAt
    ? `Saved ${formatTimestamp(detail.submittedAt)}`
    : "Not yet saved";
  elements.saveButton.textContent = detail.completed ? "Response saved" : "Save response";
  validateResponse();
  validateExecutionMetrics();
  updateNavigation();
}

function normalizeCaseImages(detail) {
  if (Array.isArray(detail.images) && detail.images.length > 0) {
    return detail.images.map((image, index) => ({
      pageNumber: Number.isSafeInteger(image.pageNumber) ? image.pageNumber : index + 1,
      label: typeof image.label === "string" && image.label.trim()
        ? image.label.trim()
        : `Menu page ${index + 1} of ${detail.images.length}`,
      imageUrl: image.imageUrl
    }));
  }
  if (typeof detail.imageUrl === "string" && detail.imageUrl) {
    return [{
      pageNumber: 1,
      label: detail.menuPageLabel ?? "Menu page 1 of 1",
      imageUrl: detail.imageUrl
    }];
  }
  return [];
}

function renderCaseImages(detail, images) {
  elements.caseImages.replaceChildren();
  elements.caseImages.dataset.pageCount = String(images.length);
  elements.pageCount.textContent = `${images.length} ${images.length === 1 ? "page" : "pages"}`;

  for (const image of images) {
    const figure = document.createElement("figure");
    figure.className = "image-viewer";

    const caption = document.createElement("figcaption");
    caption.textContent = image.label;

    const frame = document.createElement("div");
    frame.className = "image-frame";
    const element = document.createElement("img");
    element.src = image.imageUrl;
    element.alt = `${detail.name}, menu page ${image.pageNumber} of ${images.length}`;
    frame.append(element);

    figure.append(caption, frame);
    elements.caseImages.append(figure);
  }
}

function validateResponse() {
  const raw = elements.rawJson.value.trim();
  elements.jsonStatus.classList.remove("is-valid", "is-invalid");
  if (!raw) {
    state.responseValid = false;
    elements.jsonStatus.textContent = "Paste JSON to validate";
  } else {
    try {
      JSON.parse(raw);
      state.responseValid = true;
      elements.jsonStatus.textContent = state.currentCase?.completed ? "Saved JSON" : "Valid JSON";
      elements.jsonStatus.classList.add("is-valid");
    } catch (error) {
      state.responseValid = false;
      elements.jsonStatus.textContent = `Invalid JSON: ${errorMessage(error)}`;
      elements.jsonStatus.classList.add("is-invalid");
    }
  }
  updateSaveButton();
}

function renderExecutionMetrics(metrics, completed) {
  const values = metrics ?? {};
  for (const id of ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"]) {
    elements[id].value = values[id] ?? "";
    elements[id].readOnly = completed;
  }
}

function validateExecutionMetrics() {
  state.executionMetricsValid = true;
  for (const id of ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"]) {
    const input = elements[id];
    const raw = input.value.trim();
    const valid = raw === "" || (/^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)));
    input.setAttribute("aria-invalid", String(!valid));
    if (!valid) state.executionMetricsValid = false;
  }
  updateSaveButton();
}

function readExecutionMetrics() {
  const metrics = {};
  for (const id of ["latencyMs", "inputTokens", "outputTokens", "thinkingTokens"]) {
    const raw = elements[id].value.trim();
    if (raw !== "") metrics[id] = Number(raw);
  }
  return Object.keys(metrics).length > 0 ? metrics : null;
}

function updateSaveButton() {
  const completed = state.currentCase?.completed === true;
  elements.saveButton.disabled = Boolean(
    state.busy ||
    completed ||
    !state.currentCase ||
    !state.responseValid ||
    !state.executionMetricsValid ||
    !state.acknowledged
  );
}

function updateNavigation() {
  const currentIndex = state.bootstrap.queue.findIndex((item) => item.id === state.currentCaseId);
  elements.previousButton.disabled = state.busy || currentIndex <= 0;
  elements.nextButton.disabled = state.busy || currentIndex < 0 || currentIndex >= state.bootstrap.queue.length - 1;
}

async function moveCase(offset) {
  const currentIndex = state.bootstrap.queue.findIndex((item) => item.id === state.currentCaseId);
  const target = state.bootstrap.queue[currentIndex + offset];
  if (target) await loadCase(target.id);
}

async function saveResponse() {
  if (!state.currentCase || state.busy) return;
  if (!state.acknowledged) {
    showToast("Confirm the fresh AI Studio session before saving.", true);
    return;
  }
  validateResponse();
  if (!state.responseValid) {
    showToast("The pasted response is not valid raw JSON.", true);
    return;
  }

  state.busy = true;
  updateSaveButton();
  const savedCaseId = state.currentCase.id;
  try {
    const result = await apiJson("/api/responses", {
      method: "POST",
      body: JSON.stringify({
        caseId: savedCaseId,
        pass: state.bootstrap.run.pass,
        fingerprints: state.bootstrap.run.fingerprints,
        rawJson: elements.rawJson.value,
        freshSessionAcknowledged: true,
        executionMetrics: readExecutionMetrics()
      })
    });
    await refreshBootstrap();
    showToast(result.duplicate ? "Response already checkpointed" : "Response checkpointed");
    await loadCase(result.status.nextCaseId ?? savedCaseId);
  } catch (error) {
    showToast(errorMessage(error), true);
  } finally {
    state.busy = false;
    updateSaveButton();
  }
}

async function apiJson(url, options = {}) {
  if (!/^\/(?!\/)/.test(url)) {
    throw new Error("Only same-origin API paths are allowed.");
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    },
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error"
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Workbench returned HTTP ${response.status} without JSON.`);
  }
  if (!response.ok) {
    throw new Error(payload.error ?? `Workbench returned HTTP ${response.status}.`);
  }
  return payload;
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = value;
    temporary.setAttribute("readonly", "");
    temporary.className = "visually-hidden";
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    showToast(copied ? successMessage : "Could not copy text", !copied);
  }
}

function acknowledgementKey() {
  if (!state.bootstrap || !state.currentCaseId) return null;
  return [
    "sift-manual-ai-eval",
    state.bootstrap.run.runId,
    `pass-${state.bootstrap.run.pass}`,
    `case-${state.currentCaseId}`,
    state.bootstrap.run.fingerprints.config
  ].join(":");
}

function readAcknowledgement() {
  const key = acknowledgementKey();
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === "acknowledged";
  } catch {
    return false;
  }
}

function storeAcknowledgement(value) {
  const key = acknowledgementKey();
  if (!key) return;
  try {
    if (value) sessionStorage.setItem(key, "acknowledged");
    else sessionStorage.removeItem(key);
  } catch {
    // The reminder remains visible even when session storage is unavailable.
  }
}

function setScreen(screen) {
  elements.loadingState.hidden = screen !== "loading";
  elements.errorState.hidden = screen !== "error";
  elements.caseView.hidden = screen !== "case";
}

function showFatal(error) {
  elements.errorMessage.textContent = errorMessage(error);
  setScreen("error");
}

function showToast(message, isError = false) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.hidden = false;
  state.toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
