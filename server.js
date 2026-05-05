const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const {
  criarEstadoInicial,
  distribuirCartas,
  jogarCarta
} = require("./gameCore");
const app = express();
const server = http.createServer(app);

let mesas = {};
// servir frontend
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// socket corrigido
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  socket.on("criar_mesa", () => {
    const mesaId = "mesa-" + Date.now();

    mesas[mesaId] = {
      estado: criarEstadoInicial(),
      jogadores: []
    };

    socket.join(mesaId);
    socket.mesaId = mesaId;

    socket.emit("mesa_criada", mesaId);
  });

  socket.on("entrar_mesa", (mesaId) => {
    const mesa = mesas[mesaId];
    if (!mesa) return;

    const jogadorIndex = mesa.jogadores.length;

    mesa.jogadores.push(socket.id);

    socket.join(mesaId);
    socket.mesaId = mesaId;

    // 🔥 envia estado atual
    socket.emit("game_state", mesa.estado);

    if (mesa.jogadores.length >= 2) {
      distribuirCartas(mesa.estado);
      io.to(mesaId).emit("game_state", mesa.estado);
    }
  });

  socket.on("play_card", ({ index }) => {
    const mesaId = socket.mesaId;
    if (!mesaId) return;

    const mesa = mesas[mesaId];
    if (!mesa) return;

    const jogador = mesa.jogadores.indexOf(socket.id);
    if (jogador === -1) return;

    // 🔥 valida turno
    if (mesa.estado.turno !== jogador) return;

    jogarCarta(mesa.estado, jogador, index);

    io.to(mesaId).emit("game_state", mesa.estado);
  });
});