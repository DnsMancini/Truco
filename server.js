const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const {
  criarEstadoInicial,
  distribuirCartas,
  jogarCarta
} = require("./gamecore");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const FILA = [];
const MESAS = {};

// -----------------------------
// MATCHMAKING AUTOMÁTICO
// -----------------------------
function tentarFormarMesa() {
  if (FILA.length < 4) return;

  const mesaId = "mesa-" + Date.now();

  const jogadores = FILA.splice(0, 4);

  const estado = criarEstadoInicial();

  MESAS[mesaId] = {
    estado,
    jogadores: jogadores.map(s => ({
      id: s.id,
      socket: s
    }))
  };

  // entra na sala
  jogadores.forEach((s) => {
    s.join(mesaId);
    s.mesaId = mesaId;
  });

  // distribui cartas
  distribuirCartas(estado);

  console.log("🎮 Mesa criada:", mesaId);

  io.to(mesaId).emit("mesa_criada", {
    mesaId,
    estado,
    jogadores: MESAS[mesaId].jogadores.map(j => j.id)
  });
}

// -----------------------------
// SOCKET CONNECT
// -----------------------------
io.on("connection", (socket) => {
  console.log("🔌 Conectado:", socket.id);

  // ENTRAR NA FILA
  socket.on("entrar_fila", () => {
    if (FILA.find(s => s.id === socket.id)) return;

    FILA.push(socket);

    console.log("📥 entrou na fila:", socket.id);

    tentarFormarMesa();
  });

  // JOGAR CARTA
  socket.on("play_card", ({ index }) => {
    const mesaId = socket.mesaId;
    if (!mesaId) return;

    const mesa = MESAS[mesaId];
    if (!mesa) return;

    const jogadorIndex = mesa.jogadores.findIndex(j => j.id === socket.id);
    if (jogadorIndex === -1) return;

    // 🔒 valida turno no servidor
    if (mesa.estado.turno !== jogadorIndex) return;

    jogarCarta(mesa.estado, jogadorIndex, index);

    io.to(mesaId).emit("game_state", {
      estado: mesa.estado
    });
  });

  // DESCONECTAR
  socket.on("disconnect", () => {
    console.log("❌ Desconectou:", socket.id);

    // remove da fila
    const idx = FILA.findIndex(s => s.id === socket.id);
    if (idx !== -1) FILA.splice(idx, 1);

    // remove da mesa
    const mesaId = socket.mesaId;
    if (mesaId && MESAS[mesaId]) {
      MESAS[mesaId].jogadores =
        MESAS[mesaId].jogadores.filter(j => j.id !== socket.id);

      io.to(mesaId).emit("player_left", socket.id);
    }
  });
});

// -----------------------------
server.listen(3000, () => {
  console.log("🚀 Server rodando em http://localhost:3000");
});