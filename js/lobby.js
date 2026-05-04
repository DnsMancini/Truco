const MATCH_CONFIG = {
  jogadoresPorMesa: 4,
  tempoMaximoEsperaMs: 30000,
  intervaloMatchmakingMs: 1000,
};

const filaGlobal = [];
const jogadoresEmMesa = new Set();
let jogadorLocal = null;
let mesaAtual = null;
let contadorMesa = 0;
let matchmakingIntervalo = null;

function gerarIdUnicoMesa() {
  contadorMesa += 1;
  return `mesa-${Date.now()}-${contadorMesa}`;
}

function criarJogadorHumano(nome) {
  return {
    id: `humano-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nome,
    tipo: "humano",
    entrouNaFilaEm: Date.now(),
  };
}

function criarBots(quantidade) {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: `bot-${Date.now()}-${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
    nome: `Bot ${i + 1}`,
    tipo: "bot",
  }));
}

function jogadorJaEstaNaFilaOuMesa(jogadorId) {
  const naFila = filaGlobal.some((jogador) => jogador.id === jogadorId);
  return naFila || jogadoresEmMesa.has(jogadorId);
}

function entrarNaFilaGlobal() {
  if (!jogadorLocal) {
    jogadorLocal = criarJogadorHumano("Você");
  }

  if (mesaAtual) {
    mostrarStatusLobby(`Você já está na ${mesaAtual.id}. A partida já começou.`);
    return;
  }

  if (jogadorJaEstaNaFilaOuMesa(jogadorLocal.id)) {
    mostrarStatusLobby("Você já está na fila global. Aguardando jogadores...");
    return;
  }

  jogadorLocal.entrouNaFilaEm = Date.now();
  filaGlobal.push(jogadorLocal);
  mostrarStatusLobby("Você entrou na fila global. Procurando mesa...");
  renderizarLobby();
}

function montarMesa(participantes) {
  const humanos = participantes.filter((j) => j.tipo === "humano");
  humanos.forEach((jogador) => jogadoresEmMesa.add(jogador.id));

  const falta = MATCH_CONFIG.jogadoresPorMesa - participantes.length;
  const bots = falta > 0 ? criarBots(falta) : [];

  return {
    id: gerarIdUnicoMesa(),
    jogadores: [...participantes, ...bots],
    criadaEm: Date.now(),
  };
}

function iniciarPartidaDaMesa(mesa) {
  if (!jogadorLocal) return;

  const jogadorNaMesa = mesa.jogadores.some((j) => j.id === jogadorLocal.id);
  if (!jogadorNaMesa) return;

  mesaAtual = mesa;

  const lobby = document.getElementById("lobby");
  const gameWrapper = document.getElementById("gameWrapper");

  lobby.style.display = "none";
  gameWrapper.classList.remove("game-hidden");

  mostrar(`Partida iniciada automaticamente na ${mesa.id}.`);
  iniciar();
}

function processarMatchmaking() {
  if (!filaGlobal.length) {
    renderizarLobby();
    return;
  }

  const agora = Date.now();
  const primeiroDaFila = filaGlobal[0];
  const esperaPrimeiro = agora - primeiroDaFila.entrouNaFilaEm;

  if (filaGlobal.length >= MATCH_CONFIG.jogadoresPorMesa) {
    const participantes = filaGlobal.splice(0, MATCH_CONFIG.jogadoresPorMesa);
    const mesa = montarMesa(participantes);
    iniciarPartidaDaMesa(mesa);
    renderizarLobby();
    return;
  }

  if (esperaPrimeiro >= MATCH_CONFIG.tempoMaximoEsperaMs) {
    const participantes = filaGlobal.splice(0, MATCH_CONFIG.jogadoresPorMesa);
    const mesa = montarMesa(participantes);
    iniciarPartidaDaMesa(mesa);
  }

  renderizarLobby();
}

function formatarTempoRestante() {
  if (!jogadorLocal) return "";
  const entrada = filaGlobal.find((j) => j.id === jogadorLocal.id);
  if (!entrada) return "";

  const restanteMs = Math.max(
    0,
    MATCH_CONFIG.tempoMaximoEsperaMs - (Date.now() - entrada.entrouNaFilaEm)
  );
  const segundos = Math.ceil(restanteMs / 1000);
  return `${segundos}s`;
}

function mostrarStatusLobby(texto) {
  const status = document.getElementById("statusLobby");
  if (status) status.textContent = texto;
}

function renderizarLobby() {
  const lista = document.getElementById("listaMesas");
  if (!lista) return;

  const naFila = jogadorLocal && filaGlobal.some((j) => j.id === jogadorLocal.id);
  const tempoRestante = naFila ? formatarTempoRestante() : null;

  lista.innerHTML = `
    <div class="matchmaking-card">
      <p><strong>Fila global:</strong> ${filaGlobal.length} jogador(es) humano(s)</p>
      <p><strong>Tempo máximo de espera:</strong> 30s</p>
      ${
        naFila
          ? `<p><strong>Seu tempo restante:</strong> ${tempoRestante}</p>`
          : ""
      }
      <button class="mesa-item" type="button" onclick="entrarNaFilaGlobal()" ${
        naFila || mesaAtual ? "disabled" : ""
      }>
        ${mesaAtual ? "Partida em andamento" : naFila ? "Na fila global" : "Entrar na fila global"}
      </button>
    </div>
  `;
}

function iniciarMatchmakingContinuo() {
  if (matchmakingIntervalo) return;

  matchmakingIntervalo = setInterval(
    processarMatchmaking,
    MATCH_CONFIG.intervaloMatchmakingMs
  );
}

window.addEventListener("load", () => {
  renderizarLobby();
  iniciarMatchmakingContinuo();
});
