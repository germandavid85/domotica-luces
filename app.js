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

function markCard(card, status, message) {
  card.classList.remove("is-working", "is-error", "is-ok");
  if (status) card.classList.add(status);
  card.querySelector(".light-status").textContent = message;
}

function sendGetBeacon(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const image = new Image();
    const done = () => resolve();
    const timeout = setTimeout(done, timeoutMs);

    image.onload = () => {
      clearTimeout(timeout);
      done();
    };
    image.onerror = () => {
      clearTimeout(timeout);
      done();
    };
    image.src = `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
  });
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

  await sendGetBeacon(url);
  markCard(card, "is-ok", "Comando enviado");
  connectionDot.className = "connection-dot is-ok";
}

function toggleZone(zone, card) {
  sendCommand(zone, "switch", card);
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
} else {
  baseUrlLabel.textContent = "Sin configurar";
  openSettings(true);
}
