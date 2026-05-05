diff --git a/public/js/lobby.js b/public/js/lobby.js
index f3c261561c224f6f4f0f803113601b41df8251f5..67ec19c165d30bb6a7bce231b8970b6b0fe0607f 100644
--- a/public/js/lobby.js
+++ b/public/js/lobby.js
@@ -1,53 +1,68 @@
+const socket = io();
 const MATCH_CONFIG = {
   jogadoresPorMesa: 4,
   tempoMaximoEsperaMs: 30000,
   intervaloMatchmakingMs: 1000,
   intervaloHeartbeatOnlineMs: 5000,
   janelaAtividadeOnlineMs: 15000,
 };
 
 const CHAVE_PRESENCA_ONLINE = "truco-online-presenca-v1";
 const CHAVE_MESAS_GLOBAIS = "truco-online-mesas-v1";
 const CHAVE_EVENTO_MESA_CRIADA = "truco-online-evento-mesa-criada-v1";
 const CHAVE_EVENTO_PLAYER_JOINED_TABLE = "truco-online-evento-player-joined-table-v1";
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
 const salasSocketLocal = new Set(["queue"]);
+let renderTimeout = null;
+let matchmakingLock = false;
+
+function renderizarLobbySeguro() {
+  clearTimeout(renderTimeout);
+  renderTimeout = setTimeout(renderizarLobby, 50);
+}
+
+function adicionarNaFila(jogador) {
+  if (!filaGlobal.some((itemFila) => itemFila.id === jogador.id)) {
+    filaGlobal.push(jogador);
+  }
+}
+
 
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
@@ -115,53 +130,53 @@ function criarMesaNoBackend(participantes) {
   if (!mesa) return null;
   console.log("[backend] mesa criada e salva no estado global:", mesa.id);
   mesasEmAndamento.push(mesa);
   salvarMesasNoEstadoGlobal();
   emitirEventoMesaCriada(mesa);
   return mesa;
 }
 
 function gerarIdUnicoMesa() { contadorMesa += 1; return `mesa-${Date.now()}-${contadorMesa}`; }
 function criarJogadorHumano(nome) { return { id:`humano-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, nome, tipo:"humano", entrouNaFilaEm:Date.now() }; }
 function criarBots(q) { return Array.from({ length:q }, (_,i)=>({ id:`bot-${Date.now()}-${i+1}-${Math.random().toString(36).slice(2,7)}`, nome:`Bot ${i+1} [BOT]`, tipo:"bot" })); }
 function jogadorJaEstaNaFilaOuMesa(id) { return filaGlobal.some((j)=>j.id===id) || jogadoresEmMesa.has(id); }
 
 const LOBBY_ENTRADA_DESATIVADA = false;
 const INICIAR_DIRETO_NA_MESA = false;
 
 function entrarNaFilaGlobal() {
   if (LOBBY_ENTRADA_DESATIVADA) {
     mostrarStatusLobby("Lobby de entrada temporariamente desativado.");
     return;
   }
   if (!jogadorLocal) jogadorLocal = criarJogadorHumano("Você");
   if (mesaAtual) return mostrarStatusLobby(`Você já está na ${mesaAtual.id}.`);
   if (jogadorJaEstaNaFilaOuMesa(jogadorLocal.id)) return mostrarStatusLobby("Você já está na fila.");
   jogadorLocal.entrouNaFilaEm = Date.now();
-  filaGlobal.push(jogadorLocal);
+  adicionarNaFila(jogadorLocal);
   mostrarStatusLobby("Você entrou na fila global. Procurando mesa...");
-  renderizarLobby();
+  renderizarLobbySeguro();
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
@@ -246,183 +261,209 @@ function iniciarPartidaDaMesa(mesa) {
   if (typeof atualizarJogadoresDaMesaUI === "function") atualizarJogadoresDaMesaUI(mesa.jogadores);
   document.getElementById("lobby").style.display = "none";
   document.getElementById("gameWrapper").classList.remove("game-hidden");
   mostrar(`Partida iniciada na ${mesa.id}.`);
   iniciar();
 }
 
 function obterNomesJogadoresMesaAtual() {
   if (!mesaAtual?.jogadores?.length) return ["Você", "Bot 1 [BOT]", "Parceiro", "Bot 2 [BOT]"];
   return mesaAtual.jogadores.map((j) => j.nome);
 }
 
 function finalizarMesaNoServidor({ buscarNovaPartida = false } = {}) {
   if (!mesaAtual || !jogadorLocal) return;
   const mesaId = mesaAtual.id;
   const iMesa = mesasEmAndamento.findIndex((m) => m.id === mesaId);
   if (iMesa !== -1) mesasEmAndamento.splice(iMesa, 1);
   jogadoresEmMesa.delete(jogadorLocal.id);
   socketLeave(mesaId);
   mesaAtual = null;
   const telaFinal = document.getElementById("telaFinal");
   if (telaFinal) telaFinal.classList.remove("show");
   document.getElementById("gameWrapper").classList.add("game-hidden");
   document.getElementById("lobby").style.display = "flex";
   salvarMesasNoEstadoGlobal();
-  renderizarLobby();
+  renderizarLobbySeguro();
   if (buscarNovaPartida) {
     entrarNaFilaGlobal();
     socketJoin("queue");
     mostrarStatusLobby("Buscando nova partida automaticamente...");
   } else {
     socketJoin("queue");
     mostrarStatusLobby("Você voltou para o lobby.");
   }
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
       const resultadoEntrada = aceitarEntradaTardiaNoServidor(mesa.id, jogadorLocal, ID_CONEXAO_LOCAL);
       if (resultadoEntrada.ok) {
         mostrarStatusLobby("Entrada tardia confirmada. Entrando na partida...");
         iniciarPartidaDaMesa(resultadoEntrada.mesa);
       } else {
         mostrarStatusLobby(`${resultadoEntrada.motivo} Voltando para a fila automaticamente.`);
         jogadorLocal.entrouNaFilaEm = Date.now();
-        filaGlobal.push(jogadorLocal);
+        adicionarNaFila(jogadorLocal);
         socketJoin("queue");
       }
     } else if (escolha === "bots") {
       retirarJogadorDaFila(jogadorLocal.id);
       const mesaBots = criarMesaNoBackend([jogadorLocal]);
       if (!mesaBots) return;
       mostrarStatusLobby("Modo contra bots selecionado.");
       iniciarPartidaDaMesa(mesaBots);
     } else {
       mesa.sugestoesEntradaTardiaRecusadas ??= new Set();
       mesa.sugestoesEntradaTardiaRecusadas.add(jogadorLocal.id);
       retirarJogadorDaFila(jogadorLocal.id);
       mostrarStatusLobby("Entrada tardia recusada. Você foi removido(a) da sugestão atual e da fila.");
     }
     fluxoEntradaTardiaAtivo = false;
-    renderizarLobby();
+    renderizarLobbySeguro();
   });
   return true;
 }
 
 function processarMatchmaking() {
-  if (!filaGlobal.length) return renderizarLobby();
-  if (processarEntradaTardiaParaJogadorLocal()) return;
-  const esperaPrimeiro = Date.now() - filaGlobal[0].entrouNaFilaEm;
-  if (filaGlobal.length >= MATCH_CONFIG.jogadoresPorMesa || esperaPrimeiro >= MATCH_CONFIG.tempoMaximoEsperaMs) {
+  if (matchmakingLock) return;
+  matchmakingLock = true;
+
+  try {
+    if (!filaGlobal.length) {
+      renderizarLobbySeguro();
+      return;
+    }
+
+    if (processarEntradaTardiaParaJogadorLocal()) return;
+
+    const esperaPrimeiro = Date.now() - filaGlobal[0].entrouNaFilaEm;
+    const deveCriarMesa =
+      filaGlobal.length >= MATCH_CONFIG.jogadoresPorMesa ||
+      esperaPrimeiro >= MATCH_CONFIG.tempoMaximoEsperaMs;
+
+    if (!deveCriarMesa) {
+      renderizarLobbySeguro();
+      return;
+    }
+
     const participantes = filaGlobal.splice(0, MATCH_CONFIG.jogadoresPorMesa);
     const mesa = criarMesaNoBackend(participantes);
+
+    if (socket?.connected) {
+      socket.emit("criar_mesa", { participantes });
+    }
+
     if (!mesa) {
       mostrarStatusLobby("Não foi possível iniciar mesa sem jogador humano.");
-      return renderizarLobby();
+      renderizarLobbySeguro();
+      return;
     }
+
     iniciarPartidaDaMesa(mesa);
+    renderizarLobbySeguro();
+  } finally {
+    matchmakingLock = false;
   }
-  renderizarLobby();
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
   lista.innerHTML = `<div class="matchmaking-card"><p><strong>Fila global:</strong> ${filaGlobal.length} jogador(es) humano(s)</p><p><strong>Mesas em jogo:</strong> ${mesasEmAndamento.length}</p><p><strong>Tempo máximo de espera:</strong> 30s</p><p><strong>Tempo médio de espera:</strong> ${tempoMedioEspera} segundos</p><p><strong>Jogadores online:</strong> ${servidorMatchmaking.jogadoresOnline}</p>${naFila?`<p><strong>Seu tempo restante:</strong> ${formatarTempoRestante()}</p>`:""}<button class="mesa-item" type="button" onclick="entrarNaFilaGlobal()" ${LOBBY_ENTRADA_DESATIVADA || naFila || mesaAtual ? "disabled" : ""}>${LOBBY_ENTRADA_DESATIVADA ? "Entrada temporariamente desativada" : mesaAtual ? "Partida em andamento" : naFila ? "Na fila global" : "Entrar na fila global"}</button></div>`;
 }
 function iniciarMatchmakingContinuo(){ if(matchmakingIntervalo) return; matchmakingIntervalo = setInterval(processarMatchmaking, MATCH_CONFIG.intervaloMatchmakingMs); }
 window.addEventListener("storage", (evento) => {
   if (evento.key === CHAVE_PRESENCA_ONLINE) {
     atualizarJogadoresOnline();
-    renderizarLobby();
+    renderizarLobbySeguro();
     return;
   }
 
   if (evento.key === CHAVE_MESAS_GLOBAIS) {
     carregarMesasDoEstadoGlobal();
-    renderizarLobby();
+    renderizarLobbySeguro();
     return;
   }
 
   if (evento.key === CHAVE_EVENTO_MESA_CRIADA && evento.newValue) {
     try {
       const payload = JSON.parse(evento.newValue);
       if (payload?.origem === ID_CONEXAO_LOCAL) return;
       const mesaRecebida = hidratarMesa(payload.mesa);
       const jaExiste = mesasEmAndamento.some((m) => m.id === mesaRecebida.id);
       if (!jaExiste) {
         mesasEmAndamento.push(mesaRecebida);
         salvarMesasNoEstadoGlobal();
       }
       console.log("[frontend] evento mesa_criada recebido:", mesaRecebida.id);
-      renderizarLobby();
+      renderizarLobbySeguro();
     } catch (_erro) {
       // ignorar payload inválido
     }
   }
 
   if (evento.key === CHAVE_EVENTO_PLAYER_JOINED_TABLE && evento.newValue) {
     try {
       const payload = JSON.parse(evento.newValue);
       if (payload?.origem === ID_CONEXAO_LOCAL) return;
       const mesaRecebida = hidratarMesa(payload.mesa);
       console.log("[frontend] evento player_joined_table recebido:", mesaRecebida.id, payload?.jogador?.id);
       sincronizarMesaNoServidor(mesaRecebida);
       if (jogadorLocal?.id && mesaRecebida.jogadores.some((j) => j.id === jogadorLocal.id)) {
         iniciarPartidaDaMesa(mesaRecebida);
       }
-      renderizarLobby();
+      renderizarLobbySeguro();
     } catch (_erro) {
       // ignorar payload inválido
     }
   }
 });
 window.addEventListener("beforeunload", removerPresencaLocal);
 
 let appLobbyInicializado = false;
 
 function inicializarLobbyApp() {
   if (appLobbyInicializado) return;
   appLobbyInicializado = true;
 
   carregarMesasDoEstadoGlobal();
   publicarPresencaLocal();
   setInterval(() => {
     carregarMesasDoEstadoGlobal();
     publicarPresencaLocal();
-    renderizarLobby();
+    renderizarLobbySeguro();
   }, MATCH_CONFIG.intervaloHeartbeatOnlineMs);
 
   if (INICIAR_DIRETO_NA_MESA) {
     const lobby = document.getElementById("lobby");
     const gameWrapper = document.getElementById("gameWrapper");
     if (lobby) lobby.style.display = "none";
     if (gameWrapper) gameWrapper.classList.remove("game-hidden");
     iniciar();
     return;
   }
 
-  renderizarLobby();
+  renderizarLobbySeguro();
   iniciarMatchmakingContinuo();
 }
 
 if (document.readyState === "loading") {
   window.addEventListener("DOMContentLoaded", inicializarLobbyApp, { once: true });
 } else {
   inicializarLobbyApp();
 }
