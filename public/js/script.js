const socket = window.trucoSocket;

const statusLobby = document.getElementById("statusLobby");
const listaMesas = document.getElementById("listaMesas");
const gameWrapper = document.getElementById("gameWrapper");
const lobby = document.getElementById("lobby");
const maoEl = document.getElementById("mao");
const mesaCartasEl = document.getElementById("mesaCartas");
const mensagemEl = document.getElementById("mensagem");
const placarEl = document.getElementById("placar");

let latestState = null;

function entrarFila() {
  statusLobby.textContent = "Entrando na fila...";
  console.log("[frontend] emit entrar_fila");
  socket.emit("entrar_fila");
}

function mostrarJogo() {
  lobby.style.display = "none";
  gameWrapper.classList.remove("game-hidden");
}

function renderMao(state) {
  maoEl.innerHTML = "";
  state.minhaMao.forEach((carta, idx) => {
    const btn = document.createElement("button");
    btn.textContent = carta;
    btn.className = "carta-mao";
    btn.disabled = state.turno !== state.jogadorIndex;
    btn.onclick = () => socket.emit("play_card", { index: idx });
    maoEl.appendChild(btn);
  });
}

function renderMesa(state) {
  mesaCartasEl.innerHTML = "";
  state.cartasMesa.forEach((carta, idx) => {
    const slot = document.createElement("div");
    slot.className = "carta-mesa";
    slot.textContent = carta || `P${idx + 1}`;
    mesaCartasEl.appendChild(slot);
  });
}

function renderInfo(state) {
  const minhaVez = state.turno === state.jogadorIndex;
  mensagemEl.textContent = minhaVez ? "Sua vez" : `Vez do jogador ${state.turno + 1}`;
  placarEl.textContent = `Mesa ${state.mesaId} • Rodada ${state.rodada}`;

  listaMesas.innerHTML = state.players
    .map((p, idx) => `<div>Jogador ${idx + 1}: ${p.cartasRestantes} cartas</div>`)
    .join("");
}

function render(state) {
  latestState = state;
  mostrarJogo();
  renderMao(state);
  renderMesa(state);
  renderInfo(state);
}

socket.on("fila_atualizada", ({ posicao }) => {
  console.log("[frontend] fila_atualizada", { posicao });
  statusLobby.textContent = `Na fila... posição ${posicao}`;
});

socket.on("mesa_criada", ({ mesaId }) => {
  console.log("[frontend] mesa_criada", { mesaId });
  statusLobby.textContent = `Mesa criada: ${mesaId}`;
});

socket.on("game_state", (state) => {
  console.log("[frontend] game_state recebido", { mesaId: state?.mesaId, turno: state?.turno, rodada: state?.rodada, jogadorIndex: state?.jogadorIndex });
  render(state);
});

socket.on("player_left", () => {
  console.log("[frontend] player_left recebido");
  if (!latestState) return;
  mensagemEl.textContent = "Um jogador saiu da mesa.";
});

window.pedirTruco = () => {};
window.correr = () => {};

socket.on("connect", () => {
  console.log("[frontend] socket conectado; chamando entrarFila", socket.id);
  entrarFila();
});

socket.on("disconnect", (reason) => {
  console.warn("[frontend] socket desconectado", reason);
});

if (socket.connected) {
  console.log("[frontend] socket já conectado; chamando entrarFila imediato");
  entrarFila();
}
