const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { criarEstadoInicial, distribuirCartas, jogarCarta } = require("./gamecore");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

const fila = [];
const mesas = new Map();
let seqMesa = 1;

function snapshotMesa(mesa, socketId) {
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
      cartasRestantes: mesa.state.maoJogadores[idx].length
    })),
    minhaMao: jogadorIndex >= 0 ? mesa.state.maoJogadores[jogadorIndex] : [],
    historico: mesa.state.historico.slice(-8)
  };
}

function emitirEstadoMesa(mesa) {
  mesa.players.forEach((p) => {
    p.socket.emit("game_state", snapshotMesa(mesa, p.id));
  });
}

function criarMesaSePossivel() {
  while (fila.length >= 4) {
    const selecionados = fila.splice(0, 4);
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
      p.socket.emit("mesa_criada", {
        mesaId,
        jogadorIndex: mesa.players.findIndex((j) => j.id === p.id),
        jogadores: mesa.players.map((j) => j.id)
      });
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
    if (mesa.state.turno !== jogadorIndex) return;

    const ok = jogarCarta(mesa.state, jogadorIndex, index);
    if (!ok) return;

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

    if (mesa.players.length === 0) {
      mesas.delete(mesaId);
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Server rodando em http://localhost:3000");
});
