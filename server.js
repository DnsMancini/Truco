const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const ROOM_SIZE = 4;

let playersOnline = 0;
let roomCounter = 1;

// rooms -> { id, players: [], game: {} }
const rooms = new Map();

// socketId -> roomId
const socketToRoom = new Map();


// =========================
// CRIAR SALA
// =========================
function createRoom() {
  const roomId = `room-${roomCounter++}`;

  rooms.set(roomId, {
    id: roomId,
    players: [],
    game: null
  });

  return roomId;
}

// =========================
// PROCURAR SALA DISPONÍVEL
// =========================
function findAvailableRoom() {
  for (const room of rooms.values()) {
    if (room.players.length < ROOM_SIZE) {
      return room.id;
    }
  }
  return createRoom();
}

// =========================
// REMOVER JOGADOR
// =========================
function removePlayer(socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter(id => id !== socket.id);

  socketToRoom.delete(socket.id);
  socket.leave(roomId);

  io.to(roomId).emit("room_update", {
    roomId,
    players: room.players,
    playersCount: room.players.length,
    maxPlayers: ROOM_SIZE,
    isFull: room.players.length === ROOM_SIZE
  });

  // se sala vazia, remove
  if (room.players.length === 0) {
    rooms.delete(roomId);
    io.emit("room_removed", { roomId });
  }
}


// =========================
// SOCKET.IO
// =========================
io.on("connection", (socket) => {
  playersOnline++;
  io.emit("players_online", playersOnline);

  // entrar em sala
  const roomId = findAvailableRoom();
  const room = rooms.get(roomId);

  room.players.push(socket.id);
  socketToRoom.set(socket.id, roomId);
  socket.join(roomId);

  socket.emit("room_joined", {
    roomId,
    players: room.players,
    playersCount: room.players.length,
    maxPlayers: ROOM_SIZE
  });

  io.to(roomId).emit("room_update", {
    roomId,
    players: room.players,
    playersCount: room.players.length,
    maxPlayers: ROOM_SIZE,
    isFull: room.players.length === ROOM_SIZE
  });

  // =========================
  // INICIAR JOGO (ETAPA 2)
  // =========================
  if (room.players.length === ROOM_SIZE && !room.game) {
    room.game = {
      mesa: [],
      turno: 0,
      started: true
    };

    io.to(roomId).emit("game_start", {
      players: room.players,
      turno: 0
    });
  }

  // =========================
  // JOGAR CARTA (ETAPA 2)
  // =========================
  socket.on("play_card", ({ card, index }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.game) return;

    const playerIndex = room.players.indexOf(socket.id);

    // valida turno
    if (room.game.turno !== playerIndex) return;

    // adiciona carta na mesa
    room.game.mesa.push({
      player: playerIndex,
      card
    });

    // troca turno (4 jogadores)
    room.game.turno = (room.game.turno + 1) % ROOM_SIZE;

    // envia estado atualizado
    io.to(roomId).emit("game_state", {
      mesa: room.game.mesa,
      turno: room.game.turno
    });

    io.to(roomId).emit("next_turn", {
      turno: room.game.turno
    });
  });

  // =========================
  // DESCONECTAR
  // =========================
  socket.on("disconnect", () => {
    playersOnline = Math.max(playersOnline - 1, 0);
    removePlayer(socket);
    io.emit("players_online", playersOnline);
  });
});


// =========================
// ROTAS HTTP
// =========================
app.get("/", (req, res) => {
  res.send("Truco backend rodando com salas + multiplayer");
});

app.get("/status", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    playersOnline,
    totalRooms: rooms.size
  });
});


// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});