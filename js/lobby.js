const MATCH_CONFIG = {
  jogadoresPorMesa: 4,
  tempoMaximoEsperaMs: 30000,
  intervaloMatchmakingMs: 1000,
};
const filaGlobal = [];
const jogadoresEmMesa = new Set();
const mesasEmAndamento = [];
let jogadorLocal = null;
let mesaAtual = null;
let contadorMesa = 0;
let matchmakingIntervalo = null;
let fluxoEntradaTardiaAtivo = false;

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
  participantes.filter((j)=>j.tipo==="humano").forEach((j)=>jogadoresEmMesa.add(j.id));
  const bots = criarBots(Math.max(0, MATCH_CONFIG.jogadoresPorMesa - participantes.length));
  return { id:gerarIdUnicoMesa(), jogadores:[...participantes,...bots], criadaEm:Date.now(), emAndamento:true, placar:[0,0], rodadaAtual:1 };
}
function criarResumoMesa(mesa) {
  const jogadores = mesa.jogadores.map((j)=>`${j.nome} (${j.tipo === "bot" ? "BOT" : "Humano"})`).join("\n");
  return `Mesa ${mesa.id}\n\nJogadores:\n${jogadores}\n\nPlacar: Nós ${mesa.placar[0]} x ${mesa.placar[1]} Eles\nRodada atual: ${mesa.rodadaAtual}`;
}
function procurarMesaElegivelEntradaTardia() { return mesasEmAndamento.find((m)=>m.jogadores.some((j)=>j.tipo==="bot") && m.jogadores.filter((j)=>j.tipo==="humano").length < MATCH_CONFIG.jogadoresPorMesa); }
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
  const mesa = procurarMesaElegivelEntradaTardia();
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
      mostrarStatusLobby("Entrada tardia recusada. Buscando outra mesa elegível...");
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
  lista.innerHTML = `<div class="matchmaking-card"><p><strong>Fila global:</strong> ${filaGlobal.length} jogador(es) humano(s)</p><p><strong>Mesas em jogo:</strong> ${mesasEmAndamento.length}</p><p><strong>Tempo máximo de espera:</strong> 30s</p>${naFila?`<p><strong>Seu tempo restante:</strong> ${formatarTempoRestante()}</p>`:""}<button class="mesa-item" type="button" onclick="entrarNaFilaGlobal()" ${naFila || mesaAtual ? "disabled" : ""}>${mesaAtual ? "Partida em andamento" : naFila ? "Na fila global" : "Entrar na fila global"}</button></div>`;
}
function iniciarMatchmakingContinuo(){ if(matchmakingIntervalo) return; matchmakingIntervalo = setInterval(processarMatchmaking, MATCH_CONFIG.intervaloMatchmakingMs); }
window.addEventListener("load", ()=>{ renderizarLobby(); iniciarMatchmakingContinuo(); });
