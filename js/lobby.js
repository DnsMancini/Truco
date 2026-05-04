const MATCH_CONFIG = {
  jogadoresPorMesa: 4,
  tempoMaximoEsperaMs: 30000,
  intervaloMatchmakingMs: 1000,
  intervaloHeartbeatOnlineMs: 5000,
  janelaAtividadeOnlineMs: 15000,
};

const CHAVE_PRESENCA_ONLINE = "truco-online-presenca-v1";
const ID_CONEXAO_LOCAL = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const servidorMatchmaking = {
  totalTempoEsperaMs: 0,
  totalPartidasFormadas: 0,
  jogadoresOnline: 0,
};
const filaGlobal = [];
const jogadoresEmMesa = new Set();
const mesasEmAndamento = [];
let jogadorLocal = null;
let mesaAtual = null;
let contadorMesa = 0;
let matchmakingIntervalo = null;
let fluxoEntradaTardiaAtivo = false;

function registrarTempoDeEspera(jogador, momentoEntradaMesaMs = Date.now()) {
  if (!jogador?.entrouNaFilaEm) return;
  const esperaMs = Math.max(0, momentoEntradaMesaMs - jogador.entrouNaFilaEm);
  servidorMatchmaking.totalTempoEsperaMs += esperaMs;
  servidorMatchmaking.totalPartidasFormadas += 1;
}

function obterTempoMedioEsperaSegundos() {
  if (!servidorMatchmaking.totalPartidasFormadas) return 0;
  return (
    servidorMatchmaking.totalTempoEsperaMs /
    servidorMatchmaking.totalPartidasFormadas /
    1000
  );
}

function obterPresencasAtivas() {
  const agora = Date.now();
  try {
    const bruto = localStorage.getItem(CHAVE_PRESENCA_ONLINE);
    const presencas = bruto ? JSON.parse(bruto) : {};
    return Object.fromEntries(
      Object.entries(presencas).filter(
        ([, ultimoPing]) => agora - Number(ultimoPing) <= MATCH_CONFIG.janelaAtividadeOnlineMs,
      ),
    );
  } catch (_erro) {
    return {};
  }
}

function publicarPresencaLocal() {
  const presencasAtivas = obterPresencasAtivas();
  presencasAtivas[ID_CONEXAO_LOCAL] = Date.now();
  localStorage.setItem(CHAVE_PRESENCA_ONLINE, JSON.stringify(presencasAtivas));
  servidorMatchmaking.jogadoresOnline = Object.keys(presencasAtivas).length;
}

function atualizarJogadoresOnline() {
  const presencasAtivas = obterPresencasAtivas();
  servidorMatchmaking.jogadoresOnline = Object.keys(presencasAtivas).length;
}

function removerPresencaLocal() {
  const presencasAtivas = obterPresencasAtivas();
  delete presencasAtivas[ID_CONEXAO_LOCAL];
  localStorage.setItem(CHAVE_PRESENCA_ONLINE, JSON.stringify(presencasAtivas));
}

function gerarIdUnicoMesa() { contadorMesa += 1; return `mesa-${Date.now()}-${contadorMesa}`; }
function criarJogadorHumano(nome) { return { id:`humano-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, nome, tipo:"humano", entrouNaFilaEm:Date.now() }; }
function criarBots(q) { return Array.from({ length:q }, (_,i)=>({ id:`bot-${Date.now()}-${i+1}-${Math.random().toString(36).slice(2,7)}`, nome:`Bot ${i+1} [BOT]`, tipo:"bot" })); }
function jogadorJaEstaNaFilaOuMesa(id) { return filaGlobal.some((j)=>j.id===id) || jogadoresEmMesa.has(id); }

function entrarNaFilaGlobal() {
  if (!jogadorLocal) jogadorLocal = criarJogadorHumano("Você");
  if (mesaAtual) return mostrarStatusLobby(`Você já está na ${mesaAtual.id}.`);
  if (jogadorJaEstaNaFilaOuMesa(jogadorLocal.id)) return mostrarStatusLobby("Você já está na fila.");
  jogadorLocal.entrouNaFilaEm = Date.now();
  filaGlobal.push(jogadorLocal);
  mostrarStatusLobby("Você entrou na fila global. Procurando mesa...");
  renderizarLobby();
}

function montarMesa(participantes) {
  const humanos = participantes.filter((j)=>j.tipo==="humano");
  if (!humanos.length) return null;
  const momentoEntradaMesa = Date.now();
  humanos.forEach((jogador) => registrarTempoDeEspera(jogador, momentoEntradaMesa));
  humanos.forEach((j)=>jogadoresEmMesa.add(j.id));
  const bots = criarBots(Math.max(0, MATCH_CONFIG.jogadoresPorMesa - participantes.length));
  return { id:gerarIdUnicoMesa(), jogadores:[...participantes,...bots], criadaEm:momentoEntradaMesa, emAndamento:true, placar:[0,0], rodadaAtual:1, janelaEntradaTardiaAberta:true, sugestoesEntradaTardiaRecusadas:new Set() };
}
function criarResumoMesa(mesa) {
  const jogadores = mesa.jogadores.map((j)=>`${j.nome} (${j.tipo === "bot" ? "BOT" : "Humano"})`).join("\n");
  return `Mesa ${mesa.id}\n\nJogadores:\n${jogadores}\n\nPlacar: Nós ${mesa.placar[0]} x ${mesa.placar[1]} Eles\nRodada atual: ${mesa.rodadaAtual}`;
}
function podeReceberEntradaTardia(mesa) {
  return Boolean(mesa && mesa.janelaEntradaTardiaAberta);
}
function procurarMesaElegivelEntradaTardia() {
  return mesasEmAndamento.find((m)=>
    podeReceberEntradaTardia(m) &&
    m.jogadores.some((j)=>j.tipo==="bot") &&
    m.jogadores.filter((j)=>j.tipo==="humano").length < MATCH_CONFIG.jogadoresPorMesa
  );
}
function retirarJogadorDaFila(id){ const i=filaGlobal.findIndex((j)=>j.id===id); if(i!==-1) filaGlobal.splice(i,1); }
function substituirBotPorHumano(mesa,humano){ const i=mesa.jogadores.findIndex((j)=>j.tipo==="bot"); if(i===-1) return false; mesa.jogadores.splice(i,1,humano); jogadoresEmMesa.add(humano.id); mostrar(`${humano.nome} entrou na mesa ${mesa.id}.`); return true; }

function abrirModalEntradaTardia(mesa, onEscolha) {
  const modal = document.getElementById("modalEntradaTardia");
  const resumo = document.getElementById("modalEntradaResumo");
  const btnAceitar = document.getElementById("btnModalAceitar");
  const btnRecusar = document.getElementById("btnModalRecusar");
  const btnBots = document.getElementById("btnModalBots");
  if (!modal || !resumo || !btnAceitar || !btnRecusar || !btnBots) return onEscolha("recusar");
  resumo.textContent = criarResumoMesa(mesa);
  modal.classList.remove("oculto");
  const fechar = (tipo) => { modal.classList.add("oculto"); btnAceitar.onclick = null; btnRecusar.onclick = null; btnBots.onclick = null; onEscolha(tipo); };
  btnAceitar.onclick = () => fechar("aceitar");
  btnRecusar.onclick = () => fechar("recusar");
  btnBots.onclick = () => fechar("bots");
}

function iniciarPartidaDaMesa(mesa) {
  if (!mesa) return;
  mesa.janelaEntradaTardiaAberta = false;
  if (!jogadorLocal) return;
  if (!mesa.jogadores.some((j)=>j.id===jogadorLocal.id)) return;
  mesaAtual = mesa;
  if (!mesasEmAndamento.some((m)=>m.id===mesa.id)) mesasEmAndamento.push(mesa);
  if (typeof atualizarJogadoresDaMesaUI === "function") atualizarJogadoresDaMesaUI(mesa.jogadores);
  document.getElementById("lobby").style.display = "none";
  document.getElementById("gameWrapper").classList.remove("game-hidden");
  mostrar(`Partida iniciada na ${mesa.id}.`);
  iniciar();
}

function processarEntradaTardiaParaJogadorLocal() {
  if (!jogadorLocal || fluxoEntradaTardiaAtivo || mesaAtual) return false;
  if (jogadoresEmMesa.has(jogadorLocal.id)) return false;
  const mesa = procurarMesaElegivelEntradaTardia();
  if (mesa?.sugestoesEntradaTardiaRecusadas?.has(jogadorLocal.id)) return false;
  if (!mesa) return false;
  fluxoEntradaTardiaAtivo = true;
  abrirModalEntradaTardia(mesa, (escolha) => {
    if (escolha === "aceitar") {
      retirarJogadorDaFila(jogadorLocal.id);
      if (substituirBotPorHumano(mesa, jogadorLocal)) {
        mostrarStatusLobby("Entrada tardia confirmada. Entrando na partida...");
        iniciarPartidaDaMesa(mesa);
      } else {
        mostrarStatusLobby("Sem bot disponível. Voltando para a fila automaticamente.");
        jogadorLocal.entrouNaFilaEm = Date.now();
        filaGlobal.push(jogadorLocal);
      }
    } else if (escolha === "bots") {
      retirarJogadorDaFila(jogadorLocal.id);
      const mesaBots = montarMesa([jogadorLocal]);
      mesasEmAndamento.push(mesaBots);
      mostrarStatusLobby("Modo contra bots selecionado.");
      iniciarPartidaDaMesa(mesaBots);
    } else {
      mesa.sugestoesEntradaTardiaRecusadas ??= new Set();
      mesa.sugestoesEntradaTardiaRecusadas.add(jogadorLocal.id);
      retirarJogadorDaFila(jogadorLocal.id);
      mostrarStatusLobby("Entrada tardia recusada. Você foi removido(a) da sugestão atual e da fila.");
    }
    fluxoEntradaTardiaAtivo = false;
    renderizarLobby();
  });
  return true;
}

function processarMatchmaking() {
  if (!filaGlobal.length) return renderizarLobby();
  if (processarEntradaTardiaParaJogadorLocal()) return;
  const esperaPrimeiro = Date.now() - filaGlobal[0].entrouNaFilaEm;
  if (filaGlobal.length >= MATCH_CONFIG.jogadoresPorMesa || esperaPrimeiro >= MATCH_CONFIG.tempoMaximoEsperaMs) {
    const participantes = filaGlobal.splice(0, MATCH_CONFIG.jogadoresPorMesa);
    const mesa = montarMesa(participantes);
    if (!mesa) {
      mostrarStatusLobby("Não foi possível iniciar mesa sem jogador humano.");
      return renderizarLobby();
    }
    mesasEmAndamento.push(mesa);
    iniciarPartidaDaMesa(mesa);
  }
  renderizarLobby();
}

function formatarTempoRestante() {
  if (!jogadorLocal) return "";
  const entrada = filaGlobal.find((j)=>j.id===jogadorLocal.id);
  if (!entrada) return "";
  return `${Math.ceil(Math.max(0, MATCH_CONFIG.tempoMaximoEsperaMs - (Date.now()-entrada.entrouNaFilaEm))/1000)}s`;
}
function mostrarStatusLobby(texto){ const status=document.getElementById("statusLobby"); if(status) status.textContent=texto; }
function renderizarLobby(){
  const lista=document.getElementById("listaMesas"); if(!lista) return;
  const naFila = jogadorLocal && filaGlobal.some((j)=>j.id===jogadorLocal.id);
  const tempoMedioEspera = obterTempoMedioEsperaSegundos().toFixed(1);
  lista.innerHTML = `<div class="matchmaking-card"><p><strong>Fila global:</strong> ${filaGlobal.length} jogador(es) humano(s)</p><p><strong>Mesas em jogo:</strong> ${mesasEmAndamento.length}</p><p><strong>Tempo máximo de espera:</strong> 30s</p><p><strong>Tempo médio de espera:</strong> ${tempoMedioEspera} segundos</p><p><strong>Jogadores online:</strong> ${servidorMatchmaking.jogadoresOnline}</p>${naFila?`<p><strong>Seu tempo restante:</strong> ${formatarTempoRestante()}</p>`:""}<button class="mesa-item" type="button" onclick="entrarNaFilaGlobal()" ${naFila || mesaAtual ? "disabled" : ""}>${mesaAtual ? "Partida em andamento" : naFila ? "Na fila global" : "Entrar na fila global"}</button></div>`;
}
function iniciarMatchmakingContinuo(){ if(matchmakingIntervalo) return; matchmakingIntervalo = setInterval(processarMatchmaking, MATCH_CONFIG.intervaloMatchmakingMs); }
window.addEventListener("storage", (evento) => {
  if (evento.key !== CHAVE_PRESENCA_ONLINE) return;
  atualizarJogadoresOnline();
  renderizarLobby();
});
window.addEventListener("beforeunload", removerPresencaLocal);
window.addEventListener("load", ()=>{
  publicarPresencaLocal();
  setInterval(() => {
    publicarPresencaLocal();
    renderizarLobby();
  }, MATCH_CONFIG.intervaloHeartbeatOnlineMs);
  renderizarLobby();
  iniciarMatchmakingContinuo();
});
