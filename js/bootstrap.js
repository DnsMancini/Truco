const PROD_SOCKET_URL = "https://truco-naooo.onrender.com";
const socketEndpoint = window.TRUCO_SOCKET_URL || PROD_SOCKET_URL;

const socket = io(socketEndpoint, {
  transports: ["websocket"],
  withCredentials: false,
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
    navigator.serviceWorker.register("/service-worker.js");
  });
}
