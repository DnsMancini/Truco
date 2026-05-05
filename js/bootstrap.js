const DEFAULT_SOCKET_URL = window.location.origin;
const PROD_SOCKET_URL = "https://truco-naooo.onrender.com";

const querySocketUrl = new URLSearchParams(window.location.search).get("socketUrl");
if (querySocketUrl) {
  localStorage.setItem("truco_socket_url", querySocketUrl);
}

const socketEndpoint =
  window.TRUCO_SOCKET_URL ||
  localStorage.getItem("truco_socket_url") ||
  (window.location.hostname.endsWith("github.io") ? PROD_SOCKET_URL : DEFAULT_SOCKET_URL);

const socket = io(socketEndpoint, {
  transports: ["polling", "websocket"],
  path: "/socket.io",
  withCredentials: false,
  reconnectionAttempts: 5,
  timeout: 10000,
});


const reconnectSocketKey = "truco_previous_socket_id";

socket.on("connect", () => {
  const previousSocketId = localStorage.getItem(reconnectSocketKey);
  if (previousSocketId) {
    socket.emit("rejoin_game", { previousSocketId });
  }

  localStorage.setItem(reconnectSocketKey, socket.id);
});

socket.on("players_online", (n) => {
  console.log("Players online:", n);
});


socket.on("connect_error", (error) => {
  console.warn("[socket] connect_error:", error?.message || error);
  console.warn("[socket] endpoint usado:", socketEndpoint);
  if (window.location.hostname.endsWith("github.io") && !localStorage.getItem("truco_socket_url")) {
    console.warn('[socket] Defina um backend válido com ?socketUrl=https://SEU-BACKEND.onrender.com');
  }
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.log("[socket] reconnect_attempt:", attempt);
});

const somDistribuir = new Audio("audio/Distribuicaocartas.mp3");
const somJogarCarta = new Audio("audio/jogarcarta.mp3");
const somTruco = new Audio("audio/Truco.mp3");
const somSeis = new Audio("audio/Seis.mp3");
const somNove = new Audio("audio/Nove.mp3");
const somDoze = new Audio("audio/Doze.mp3");

const tg = window.Telegram?.WebApp;
const isTelegram = !!tg;
const isMobile = tg?.platform !== "tdesktop";

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#000000");
  tg.setBackgroundColor("#000000");
}

function atualizarOrientacaoLayout() {
  const emRetrato = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("orientacao-vertical", emRetrato);
}

function tocar(audio, volume = 1) {
  audio.pause();
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

window.addEventListener("resize", atualizarOrientacaoLayout);
window.addEventListener("load", atualizarOrientacaoLayout);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = new URL("./service-worker.js", window.location.href);
    navigator.serviceWorker.register(swUrl.href);
  });
}
