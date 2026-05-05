 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/public/js/script.js b/public/js/script.js
index dd08477751b5eee8f236420be248a98b4c74838e..85d08e9afb6eb346798450da3827fa96b2a174d3 100644
--- a/public/js/script.js
+++ b/public/js/script.js
@@ -1,89 +1,85 @@
 const socket = window.socket;
 
 const statusLobby = document.getElementById("statusLobby");
 const listaMesas = document.getElementById("listaMesas");
 const gameWrapper = document.getElementById("gameWrapper");
 const lobby = document.getElementById("lobby");
 const maoEl = document.getElementById("mao");
 const mesaCartasEl = document.getElementById("mesaCartas");
 const mensagemEl = document.getElementById("mensagem");
 const placarEl = document.getElementById("placar");
 
-let latestState = null;
-let filaSolicitada = false;
-
 function entrarFila() {
-  if (filaSolicitada) return;
-  filaSolicitada = true;
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
-  latestState = state;
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
-  if (!latestState) return;
   mensagemEl.textContent = "Um jogador saiu da mesa.";
 });
 
+socket.on("acao_invalida", ({ motivo }) => {
+  mensagemEl.textContent = motivo || "Ação inválida.";
+});
+
 window.pedirTruco = () => {};
 window.correr = () => {};
 
 socket.on("connect", () => {
-  filaSolicitada = false;
   entrarFila();
 });
 
EOF
)