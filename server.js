 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server.js b/server.js
index d1d549cc865ee3ea1303af5aed529ed0015f81c0..b8be51553a3ac34ad06dfc76ff6a538f1b6c7463 100644
--- a/server.js
+++ b/server.js
@@ -1,126 +1,152 @@
 const express = require("express");
 const http = require("http");
 const path = require("path");
 const { Server } = require("socket.io");
 const { criarEstadoInicial, distribuirCartas, jogarCarta } = require("./gamecore");
 
 const app = express();
 const server = http.createServer(app);
 
 const corsOrigin = process.env.CORS_ORIGIN
   ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
   : "*";
 
 const io = new Server(server, {
+  path: process.env.SOCKET_IO_PATH || "/socket.io",
+  transports: ["websocket", "polling"],
   cors: {
     origin: corsOrigin,
     methods: ["GET", "POST"],
     credentials: false
   }
 });
 
 app.use(express.static(path.join(__dirname, "public")));
 app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
 
 const fila = [];
 const mesas = new Map();
 let seqMesa = 1;
 
-function snapshotMesa(mesa, socketId) {
+function montarEstadoPublico(mesa, socketId) {
   const jogadorIndex = mesa.players.findIndex((p) => p.id === socketId);
   return {
     mesaId: mesa.id,
     jogadorIndex,
     turno: mesa.state.turno,
     rodada: mesa.state.rodada,
     cartasMesa: mesa.state.cartasMesa,
     players: mesa.players.map((p, idx) => ({
       id: p.id,
       nome: `Jogador ${idx + 1}`,
-      cartasRestantes: mesa.state.maoJogadores[idx].length
+      cartasRestantes: mesa.state.maoJogadores[idx]?.length ?? 0
     })),
     minhaMao: jogadorIndex >= 0 ? mesa.state.maoJogadores[jogadorIndex] : [],
     historico: mesa.state.historico.slice(-8)
   };
 }
 
 function emitirEstadoMesa(mesa) {
   mesa.players.forEach((p) => {
-    p.socket.emit("game_state", snapshotMesa(mesa, p.id));
+    p.socket.emit("game_state", montarEstadoPublico(mesa, p.id));
   });
 }
 
+function limparFila() {
+  for (let i = fila.length - 1; i >= 0; i -= 1) {
+    if (!fila[i] || !fila[i].connected || fila[i].data.mesaId) {
+      fila.splice(i, 1);
+    }
+  }
+}
+
 function criarMesaSePossivel() {
+  limparFila();
+
   while (fila.length >= 4) {
     const selecionados = fila.splice(0, 4);
+    if (selecionados.some((s) => !s.connected)) {
+      limparFila();
+      continue;
+    }
+
     const mesaId = `mesa-${seqMesa++}`;
     const state = criarEstadoInicial();
     distribuirCartas(state);
 
     const mesa = {
       id: mesaId,
       players: selecionados.map((socket) => ({ id: socket.id, socket })),
       state
     };
 
     mesas.set(mesaId, mesa);
 
     mesa.players.forEach((p) => {
       p.socket.data.mesaId = mesaId;
       p.socket.join(mesaId);
-      p.socket.emit("mesa_criada", {
-        mesaId,
-        jogadorIndex: mesa.players.findIndex((j) => j.id === p.id),
-        jogadores: mesa.players.map((j) => j.id)
-      });
+    });
+
+    io.to(mesaId).emit("mesa_criada", {
+      mesaId,
+      jogadores: mesa.players.map((j) => j.id)
     });
 
     emitirEstadoMesa(mesa);
   }
 }
 
 io.on("connection", (socket) => {
   socket.on("entrar_fila", () => {
     if (socket.data.mesaId) return;
     if (fila.some((s) => s.id === socket.id)) return;
 
     fila.push(socket);
     socket.emit("fila_atualizada", { posicao: fila.length });
     criarMesaSePossivel();
   });
 
   socket.on("play_card", ({ index }) => {
     const mesaId = socket.data.mesaId;
     if (!mesaId || !mesas.has(mesaId)) return;
 
     const mesa = mesas.get(mesaId);
     const jogadorIndex = mesa.players.findIndex((p) => p.id === socket.id);
     if (jogadorIndex < 0) return;
-    if (mesa.state.turno !== jogadorIndex) return;
+
+    if (mesa.state.turno !== jogadorIndex) {
+      socket.emit("acao_invalida", { motivo: "Nao e seu turno." });
+      return;
+    }
 
     const ok = jogarCarta(mesa.state, jogadorIndex, index);
-    if (!ok) return;
+    if (!ok) {
+      socket.emit("acao_invalida", { motivo: "Jogada invalida." });
+      return;
+    }
 
     emitirEstadoMesa(mesa);
   });
 
   socket.on("disconnect", () => {
     const filaIdx = fila.findIndex((s) => s.id === socket.id);
     if (filaIdx !== -1) fila.splice(filaIdx, 1);
 
     const mesaId = socket.data.mesaId;
     if (!mesaId || !mesas.has(mesaId)) return;
 
     const mesa = mesas.get(mesaId);
     mesa.players = mesa.players.filter((p) => p.id !== socket.id);
 
     io.to(mesaId).emit("player_left", { socketId: socket.id });
 
-    if (mesa.players.length === 0) mesas.delete(mesaId);
+    if (mesa.players.length === 0) {
+      mesas.delete(mesaId);
+    }
   });
 });
 
 const PORT = Number(process.env.PORT) || 3000;
 server.listen(PORT, () => {
   console.log(`🚀 Server rodando na porta ${PORT}`);
 });
 
EOF
)