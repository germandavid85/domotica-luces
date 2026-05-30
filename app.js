const STORAGE_KEYS = {
  baseUrl: "domoticaLuces.baseUrl",
  mode: "domoticaLuces.mode",
};

const DEFAULT_PANEL = "http://192.168.1.100";

const ZONES = [
  { id: 1, name: "Sala principal", icon: "🛏" },
  { id: 2, name: "Habitación auxiliar", icon: "🛌" },
  { id: 3, name: "Pasillo", icon: "🚪" },
  { id: 4, name: "Estudio", icon: "💻" },
  { id: 5, name: "Cocina", icon: "🍳" },
  { id: 6, name: "Comedor", icon: "🍽" },
  { id: 7, name: "Sala", icon: "🛋" },
  { id: 8, name: "Balcón", icon: "🌇" },
];

const state = {
  baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || "",
  mode: localStorage.getItem(STORAGE_KEYS.mode) || "full",
  zones: new Map(),
};

const appShell = document.querySelector(".app-shell");
const baseUrlLabel = document.querySelector("#baseUrlLabel");
const connectionDot = document.querySelector("#connectionDot");
const lightsGrid = document.querySelector("#lightsGrid");
const template = document.querySelector("#lightCardTemplate");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const ipInput = document.querySelector("#ipInput");
const settingsButton = document.querySelector("#settingsButton");
const changeIpButton = document.querySelector("#changeIpButton");
const cancelSettingsButton = document.querySelector("#cancelSettingsButton");
const fullModeButton = document.querySelector("#fullModeButton");
const bigModeButton = document.querySelector("#bigModeButton");

function normalizeBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return new URL(withProtocol).origin;
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem(STORAGE_KEYS.mode, mode);
  appShell.classList.toggle("big-mode", mode === "big");
  fullModeButton.classList.toggle("is-active", mode === "full");
  bigModeButton.classList.toggle("is-active", mode === "big");
  fullModeButton.setAttribute("aria-pressed", String(mode === "full"));
  bigModeButton.setAttribute("aria-pressed", String(mode === "big"));
}

function saveBaseUrl(value) {
  const normalized = normalizeBaseUrl(value);
  state.baseUrl = normalized;
  localStorage.setItem(STORAGE_KEYS.baseUrl, normalized);
  baseUrlLabel.textContent = normalized;
  connectionDot.className = "connection-dot";
  refreshStatus();
  return normalized;
}

function openSettings(force = false) {
  ipInput.value = state.baseUrl || DEFAULT_PANEL;
  cancelSettingsButton.hidden = force;
  settingsDialog.showModal();
  requestAnimationFrame(() => ipInput.select());
}

function buildUrl(action, zone) {
  const paths = {
    on: "turn-on",
    off: "turn-off",
    switch: "switch",
  };
  const path = paths[action];
  return `${state.baseUrl}/api/v2/${path}/${zone}`;
}

async function fetchWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function sendNoCors(url) {
  return fetch(url, {
    method: "GET",
    mode: "no-cors",
    cache: "no-store",
  });
}

function markCard(card, status, message) {
  card.classList.remove("is-working", "is-error", "is-ok");
  if (status) card.classList.add(status);
  card.querySelector(".light-status").textContent = message;
}

function relayValueToBoolean(value) {
  if (value === 1 || value === "1" || value === true) return true;
  if (value === 0 || value === "0" || value === false) return false;
  return null;
}

function setZoneState(zone, isOn) {
  const card = lightsGrid.querySelector(`[data-zone="${zone}"]`);
  if (!card) return;

  if (typeof isOn === "boolean") {
    state.zones.set(zone, isOn);
  } else {
    state.zones.delete(zone);
  }

  const knownState = state.zones.get(zone);
  const status = card.querySelector(".light-status");
  const main = card.querySelector(".light-main");
  card.classList.toggle("is-on", knownState === true);
  card.classList.toggle("is-off", knownState === false);

  if (knownState === true) {
    status.textContent = "Encendida";
    main.setAttribute("aria-label", `Apagar ${ZONES[zone - 1].name}`);
  } else if (knownState === false) {
    status.textContent = "Apagada";
    main.setAttribute("aria-label", `Encender ${ZONES[zone - 1].name}`);
  } else {
    status.textContent = "Estado no confirmado";
    main.setAttribute("aria-label", `Alternar ${ZONES[zone - 1].name}`);
  }
}

function applyStatusPayload(payload) {
  for (const zone of ZONES) {
    const relay = payload?.relays?.[`r${zone.id}`];
    const zoneState = payload?.zones?.[`z${zone.id}`];
    setZoneState(zone.id, relayValueToBoolean(relay ?? zoneState));
  }
}

async function refreshStatus() {
  if (!state.baseUrl) return;

  try {
    const response = await fetchWithTimeout(`${state.baseUrl}/api/v2/status/relays`, 3500);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    applyStatusPayload(await response.json());
    connectionDot.className = "connection-dot is-ok";
  } catch (relayError) {
    try {
      const response = await fetchWithTimeout(`${state.baseUrl}/api/v2/status`, 3500);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      applyStatusPayload(await response.json());
      connectionDot.className = "connection-dot is-ok";
    } catch (statusError) {
      connectionDot.className = "connection-dot is-error";
      for (const zone of ZONES) setZoneState(zone.id, null);
    }
  }
}

async function sendCommand(zone, action, card) {
  if (!state.baseUrl) {
    openSettings(true);
    return;
  }

  const url = buildUrl(action, zone);
  const verb = action === "on" ? "Encendiendo" : action === "off" ? "Apagando" : "Alternando";
  markCard(card, "is-working", `${verb}...`);
  connectionDot.className = "connection-dot";

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    markCard(card, "is-ok", "Comando enviado");
    if (action === "on") setZoneState(zone, true);
    if (action === "off") setZoneState(zone, false);
    if (action === "switch") setZoneState(zone, null);
    refreshStatus();
    connectionDot.className = "connection-dot is-ok";
  } catch (error) {
    try {
      await sendNoCors(url);
      markCard(card, "is-ok", "Comando enviado");
      if (action === "on") setZoneState(zone, true);
      if (action === "off") setZoneState(zone, false);
      if (action === "switch") setZoneState(zone, null);
      connectionDot.className = "connection-dot is-ok";
    } catch (fallbackError) {
      markCard(card, "is-error", "No se pudo contactar el panel");
      connectionDot.className = "connection-dot is-error";
    }
  }
}

function toggleZone(zone, card) {
  const currentState = state.zones.get(zone);
  if (currentState === true) {
    sendCommand(zone, "off", card);
  } else if (currentState === false) {
    sendCommand(zone, "on", card);
  } else {
    sendCommand(zone, "switch", card);
  }
}

function renderLights() {
  lightsGrid.textContent = "";

  for (const zone of ZONES) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".light-card");
    const main = fragment.querySelector(".light-main");
    const icon = fragment.querySelector(".light-icon");
    const name = fragment.querySelector(".light-name");
    const zoneLabel = fragment.querySelector(".light-zone");
    const onButton = fragment.querySelector(".on-button");
    const offButton = fragment.querySelector(".off-button");

    card.dataset.zone = String(zone.id);
    icon.textContent = zone.icon;
    name.textContent = zone.name;
    zoneLabel.textContent = `Zona ${zone.id}`;
    main.setAttribute("aria-label", `Alternar ${zone.name}`);
    onButton.setAttribute("aria-label", `Encender ${zone.name}`);
    offButton.setAttribute("aria-label", `Apagar ${zone.name}`);

    main.addEventListener("click", () => toggleZone(zone.id, card));
    onButton.addEventListener("click", () => sendCommand(zone.id, "on", card));
    offButton.addEventListener("click", () => sendCommand(zone.id, "off", card));

    lightsGrid.appendChild(fragment);
  }
}

settingsButton.addEventListener("click", () => openSettings(false));
changeIpButton.addEventListener("click", () => openSettings(false));
cancelSettingsButton.addEventListener("click", () => settingsDialog.close());
fullModeButton.addEventListener("click", () => setMode("full"));
bigModeButton.addEventListener("click", () => setMode("big"));

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    saveBaseUrl(ipInput.value);
    settingsDialog.close();
  } catch (error) {
    ipInput.setCustomValidity("Escribe una IP o URL válida.");
    ipInput.reportValidity();
  }
});

ipInput.addEventListener("input", () => ipInput.setCustomValidity(""));

renderLights();
setMode(state.mode === "big" ? "big" : "full");
if (state.baseUrl) {
  baseUrlLabel.textContent = state.baseUrl;
  refreshStatus();
} else {
  baseUrlLabel.textContent = "Sin configurar";
  openSettings(true);
}
