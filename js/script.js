const NOMES_PADRAO = ["Você", "Bot 1 [BOT]", "Parceiro", "Bot 2 [BOT]"];

const state = {
  roomId: null,
  meuIndex: 0,
  players: [...NOMES_PADRAO],
  hands: [[], [], [], []],
  table: [],
  turn: 0,
  round: 1,
  score: [0, 0],
  trucoPending: null,
  valorMao: 1,
};

function cardLabel(card) {
  if (!card) return "?";
  if (typeof card === "string") return card;
  const rank = card.rank ?? card.value ?? "?";
  const suit = card.suit ?? "";
  return `${rank}${suit}`;
}

function cardKey(card) {
  if (!card || typeof card !== "object") return String(card);
  return `${card.rank ?? ""}-${card.suit ?? ""}-${card.power ?? ""}`;
}

function mostrar(msg) {
  const el = document.getElementById("mensagem");
  if (el) el.textContent = msg || "";
}

function atualizarPlacar() {
  const el = document.getElementById("placar");
  if (el) el.textContent = `Nós ${state.score[0] ?? 0} x ${state.score[1] ?? 0} Eles`;
}

function renderMesa() {
  const el = document.getElementById("mesaCartas");
  if (!el) return;
  el.innerHTML = "";

  state.table.forEach(({ player, card }) => {
    const c = document.createElement("div");
    c.className = "carta";
    c.innerHTML = `<strong>${NOMES_PADRAO[player] ?? `Jogador ${player}`}</strong><br>${cardLabel(card)}`;
    el.appendChild(c);
  });
}

function renderMaoJogador() {
  const maoEl = document.getElementById("mao");
  if (!maoEl) return;
  maoEl.innerHTML = "";

  const minhaMao = state.hands[state.meuIndex] || [];
  minhaMao.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carta";
    btn.textContent = cardLabel(card);
    btn.disabled = state.turn !== state.meuIndex;
    btn.onclick = () => {
      socket.emit("play_card", { roomId: state.roomId, card });
    };
    maoEl.appendChild(btn);
  });
}

function renderBots() {
  const hand1 = document.getElementById("hand1");
  const hand2 = document.getElementById("hand2");
  const hand3 = document.getElementById("hand3");

  const counts = [1, 2, 3].map((playerIndex) => (state.hands[playerIndex] || []).length);
  if (hand1) hand1.textContent = `Cartas: ${counts[0]}`;
  if (hand2) hand2.textContent = `Cartas: ${counts[1]}`;
  if (hand3) hand3.textContent = `Cartas: ${counts[2]}`;
}

function render() {
  atualizarPlacar();
  renderMesa();
  renderMaoJogador();
  renderBots();

  const meuTurno = state.turn === state.meuIndex;
  mostrar(meuTurno ? "Sua vez" : `Vez de ${NOMES_PADRAO[state.turn] ?? `Jogador ${state.turn}`}`);
}

function aplicarEstado(statePayload) {
  if (!statePayload || typeof statePayload !== "object") return;

  state.roomId = statePayload.roomId ?? state.roomId;
  state.players = statePayload.players ?? state.players;
  state.hands = statePayload.hands ?? state.hands;
  state.table = statePayload.table ?? statePayload.mesa ?? [];
  state.turn = typeof statePayload.turn === "number" ? statePayload.turn : (statePayload.turno ?? state.turn);
  state.round = statePayload.round ?? statePayload.rodada ?? state.round;
  state.score = statePayload.score ?? statePayload.pontos ?? state.score;
  state.trucoPending = statePayload.trucoPending ?? null;
  state.valorMao = statePayload.valorMao ?? state.valorMao;

  render();
}

function pedirTruco() {
  socket.emit("request_truco");
}

function correr() {
  socket.emit("respond_truco", { action: "correr" });
}

const socket = io();

socket.on("connect", () => {
  mostrar("Conectado.");
});

socket.on("room_joined", ({ roomId }) => {
  state.roomId = roomId;
});

socket.on("game_start", (initialState) => {
  aplicarEstado(initialState);
});

socket.on("game_state", (gameState) => {
  aplicarEstado(gameState);
});

socket.on("room_update", ({ players }) => {
  if (Array.isArray(players)) {
    state.players = players;
  }
});

socket.on("disconnect", () => {
  mostrar("Desconectado do servidor.");
});

window.pedirTruco = pedirTruco;
window.correr = correr;
window.aplicarEstado = aplicarEstado;
window.render = render;
