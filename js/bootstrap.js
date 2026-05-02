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

function ajustarEscala() {
  const gameWrapper = document.getElementById("gameWrapper");
  const emRetrato = window.matchMedia("(orientation: portrait)").matches;

  if (emRetrato) {
    gameWrapper.style.transform = "none";
    gameWrapper.style.transformOrigin = "center center";
    return;
  }

  const baseWidth = 420;
  const scale = Math.min(window.innerWidth / baseWidth, 1);

  gameWrapper.style.transform = `scale(${scale})`;
  gameWrapper.style.transformOrigin = "top center";
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

window.addEventListener("resize", ajustarEscala);
window.addEventListener("load", ajustarEscala);
window.addEventListener("resize", atualizarOrientacaoLayout);
window.addEventListener("load", atualizarOrientacaoLayout);
