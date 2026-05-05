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
  statusLobby.textContent = `Na fila... posição ${posicao}`;
});

socket.on("mesa_criada", ({ mesaId }) => {
  statusLobby.textContent = `Mesa criada: ${mesaId}`;
});

socket.on("game_state", (state) => {
  render(state);
});

socket.on("player_left", () => {
  if (!latestState) return;
  mensagemEl.textContent = "Um jogador saiu da mesa.";
});

window.pedirTruco = () => {};
window.correr = () => {};

entrarFila();
