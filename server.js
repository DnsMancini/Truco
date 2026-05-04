const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const ROOM_SIZE = 4;
const TEAM_INDEX = {
  0: 0,
  1: 1,
  2: 0,
  3: 1
};

const TRUCO_STEPS = [1, 3, 6, 9, 12];

let playersOnline = 0;
let roomCounter = 1;

// rooms -> { id, players: [], game: {} }
const rooms = new Map();

// socketId -> roomId
const socketToRoom = new Map();

const disconnectedPlayers = new Map();
// socket.id -> { roomId, timeout }

function nextTrucoValue(currentValue) {
  const idx = TRUCO_STEPS.indexOf(currentValue);
  if (idx === -1 || idx === TRUCO_STEPS.length - 1) return TRUCO_STEPS[TRUCO_STEPS.length - 1];
  return TRUCO_STEPS[idx + 1];
}

function newHandState(starter = 0, points = [0, 0]) {
  return {
    mesa: [],
    turno: starter,
    starter,
    pontos: [...points],
    rodada: 1,
    resultadoRodadas: [],
    valorMao: 1,
    trucoNivel: 0,
    trucoPending: null,
    lastTrucoTeam: null,
    playerCards: [[], [], [], []],
    started: true
  };
}

function resetHand(game, starter) {
  game.mesa = [];
  game.turno = starter;
  game.starter = starter;
  game.rodada = 1;
  game.resultadoRodadas = [];
  game.valorMao = 1;
  game.trucoNivel = 0;
  game.trucoPending = null;
  game.lastTrucoTeam = null;
  game.playerCards = [[], [], [], []];
  game.started = true;
}

function getPublicGameState(game) {
  return {
    mesa: game.mesa,
    turno: game.turno,
    starter: game.starter,
    pontos: game.pontos,
    rodada: game.rodada,
    resultadoRodadas: game.resultadoRodadas,
    valorMao: game.valorMao,
    trucoNivel: game.trucoNivel,
    trucoPending: game.trucoPending,
    lastTrucoTeam: game.lastTrucoTeam
  };
}

function resolveRoundWinner(mesa) {
  const ordered = [...mesa].sort((a, b) => b.card.power - a.card.power);
  const highestPower = ordered[0].card.power;
  const highestCards = ordered.filter(entry => entry.card.power === highestPower);
  if (highestCards.length > 1) return null;
  return highestCards[0].player;
}

function resolveHandWinner(resultadoRodadas) {
  const wins = [0, 0];
  for (const winner of resultadoRodadas) {
    if (winner === null) continue;
    wins[TEAM_INDEX[winner]] += 1;
  }

  if (wins[0] >= 2) return 0;
  if (wins[1] >= 2) return 1;

  if (resultadoRodadas.length < 3) return null;

  if (wins[0] > wins[1]) return 0;
  if (wins[1] > wins[0]) return 1;

  const firstWinner = resultadoRodadas.find(w => w !== null);
  if (firstWinner !== undefined) return TEAM_INDEX[firstWinner];

  return TEAM_INDEX[resultadoRodadas[0] ?? 0];
}

function broadcastGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;
  io.to(roomId).emit("game_state", getPublicGameState(room.game));
}

function playBotTurnIfNeeded(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;

  const game = room.game;
  const playerId = room.players[game.turno];
  if (!playerId || !playerId.startsWith("bot-")) return;

  const botIndex = game.turno;
  const botHand = game.playerCards[botIndex];
  if (!Array.isArray(botHand) || botHand.length === 0) return;

  const card = botHand.shift();
  game.mesa.push({ player: botIndex, card });

  if (game.mesa.length === ROOM_SIZE) {
    const winnerPlayer = resolveRoundWinner(game.mesa);
    game.resultadoRodadas.push(winnerPlayer);

    const handWinnerTeam = resolveHandWinner(game.resultadoRodadas);

    io.to(roomId).emit("round_result", {
      rodada: game.rodada,
      winnerPlayer,
      winnerTeam: winnerPlayer === null ? null : TEAM_INDEX[winnerPlayer]
    });

    if (handWinnerTeam !== null) {
      game.pontos[handWinnerTeam] += game.valorMao;
      io.to(roomId).emit("hand_result", {
        winnerTeam: handWinnerTeam,
        valorMao: game.valorMao,
        pontos: game.pontos
      });

      const nextStarter = (game.starter + 1) % ROOM_SIZE;
      room.game = newHandState(nextStarter, game.pontos);
    } else {
      game.rodada += 1;
      game.starter = winnerPlayer === null ? game.starter : winnerPlayer;
      game.turno = game.starter;
      game.mesa = [];
    }
  } else {
    game.turno = (game.turno + 1) % ROOM_SIZE;
  }

  broadcastGameState(roomId);
  setTimeout(() => playBotTurnIfNeeded(roomId), 450);
}

function replaceWithBot(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return;

  const index = room.players.indexOf(socketId);
  if (index === -1) return;

  const botId = `bot-${roomId}-${index}`;

  room.players[index] = botId;
  socketToRoom.delete(socketId);

  if (room.game) {
    if (!room.game.playerCards[index]) {
      room.game.playerCards[index] = [];
    }
  }

  io.to(roomId).emit("player_replaced_by_bot", {
    oldPlayer: socketId,
    botId,
    index
  });

  io.to(roomId).emit("room_update", {
    roomId,
    players: room.players,
    playersCount: room.players.length,
    maxPlayers: ROOM_SIZE,
    isFull: room.players.length === ROOM_SIZE
  });

  broadcastGameState(roomId);
  setTimeout(() => playBotTurnIfNeeded(roomId), 250);
}



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

  socket.on("rejoin_game", ({ previousSocketId } = {}) => {
    if (!previousSocketId) return;

    const saved = disconnectedPlayers.get(previousSocketId);
    if (!saved) return;

    clearTimeout(saved.timeout);

    const room = rooms.get(saved.roomId);
    if (!room) {
      disconnectedPlayers.delete(previousSocketId);
      return;
    }

    const oldIndex = room.players.indexOf(previousSocketId);
    if (oldIndex === -1) {
      disconnectedPlayers.delete(previousSocketId);
      return;
    }

    room.players[oldIndex] = socket.id;

    socketToRoom.set(socket.id, saved.roomId);
    socket.join(saved.roomId);

    disconnectedPlayers.delete(previousSocketId);

    const game = room.game;
    if (game) {
      game.playerCards[oldIndex] = game.playerCards[oldIndex] || [];
      socket.emit("game_sync", game);
      broadcastGameState(saved.roomId);
    }

    io.to(saved.roomId).emit("player_reconnected", {
      playerId: socket.id
    });

    io.to(saved.roomId).emit("room_update", {
      roomId: saved.roomId,
      players: room.players,
      playersCount: room.players.length,
      maxPlayers: ROOM_SIZE,
      isFull: room.players.length === ROOM_SIZE
    });
  });

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
    room.game = newHandState(0);

    io.to(roomId).emit("game_start", {
      players: room.players,
      turno: 0
    });

    broadcastGameState(roomId);
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
    if (playerIndex === -1) return;

    if (!card || typeof card.power !== "number") return;

    // valida turno
    if (room.game.turno !== playerIndex) return;

    // valida posse da carta, se o servidor tiver mão registrada
    const serverHand = room.game.playerCards[playerIndex];
    if (Array.isArray(serverHand) && serverHand.length > 0) {
      const cardInHandIndex = serverHand.findIndex(c =>
        c.suit === card.suit && c.rank === card.rank && c.power === card.power
      );
      if (cardInHandIndex === -1) return;
      serverHand.splice(cardInHandIndex, 1);
    }

    // adiciona carta na mesa
    room.game.mesa.push({
      player: playerIndex,
      card
    });

    // rodada termina com 4 cartas
    if (room.game.mesa.length === ROOM_SIZE) {
      const winnerPlayer = resolveRoundWinner(room.game.mesa);
      room.game.resultadoRodadas.push(winnerPlayer);

      const handWinnerTeam = resolveHandWinner(room.game.resultadoRodadas);

      io.to(roomId).emit("round_result", {
        rodada: room.game.rodada,
        winnerPlayer,
        winnerTeam: winnerPlayer === null ? null : TEAM_INDEX[winnerPlayer]
      });

      if (handWinnerTeam !== null) {
        room.game.pontos[handWinnerTeam] += room.game.valorMao;
        io.to(roomId).emit("hand_result", {
          winnerTeam: handWinnerTeam,
          valorMao: room.game.valorMao,
          pontos: room.game.pontos
        });

        const nextStarter = (room.game.starter + 1) % ROOM_SIZE;
        room.game = newHandState(nextStarter, room.game.pontos);
      } else {
        room.game.rodada += 1;
        room.game.starter = winnerPlayer === null ? room.game.starter : winnerPlayer;
        room.game.turno = room.game.starter;
        room.game.mesa = [];
      }
    } else {
      // troca turno dentro da rodada
      room.game.turno = (room.game.turno + 1) % ROOM_SIZE;
    }

    // envia estado completo atualizado
    broadcastGameState(roomId);
  });

  socket.on("request_truco", () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.game) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return;

    if (room.game.turno !== playerIndex) return;
    if (room.game.trucoPending) return;
    if (room.game.trucoNivel >= 4) return;

    const requestingTeam = TEAM_INDEX[playerIndex];
    if (room.game.lastTrucoTeam === requestingTeam) return;

    room.game.trucoNivel += 1;
    room.game.valorMao = TRUCO_STEPS[room.game.trucoNivel];
    room.game.lastTrucoTeam = requestingTeam;
    room.game.trucoPending = {
      requestedBy: playerIndex,
      requestedByTeam: requestingTeam,
      respondersTeam: 1 - requestingTeam
    };

    broadcastGameState(roomId);
  });

  socket.on("respond_truco", ({ action }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.game) return;
    if (!room.game.trucoPending) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return;

    const playerTeam = TEAM_INDEX[playerIndex];
    const pending = room.game.trucoPending;
    if (playerTeam !== pending.respondersTeam) return;

    if (action === "aceitar") {
      room.game.trucoPending = null;
      broadcastGameState(roomId);
      return;
    }

    if (action === "aumentar") {
      if (room.game.trucoNivel >= 4) return;
      room.game.trucoNivel += 1;
      room.game.valorMao = TRUCO_STEPS[room.game.trucoNivel];
      room.game.lastTrucoTeam = playerTeam;
      room.game.trucoPending = {
        requestedBy: playerIndex,
        requestedByTeam: playerTeam,
        respondersTeam: 1 - playerTeam
      };
      broadcastGameState(roomId);
      return;
    }

    if (action === "correr") {
      const winnerTeam = pending.requestedByTeam;
      const pontosGanhos = TRUCO_STEPS[Math.max(room.game.trucoNivel - 1, 0)];
      room.game.pontos[winnerTeam] += pontosGanhos;

      io.to(roomId).emit("hand_result", {
        winnerTeam,
        valorMao: pontosGanhos,
        pontos: room.game.pontos
      });

      const nextStarter = (room.game.starter + 1) % ROOM_SIZE;
      resetHand(room.game, nextStarter);
      broadcastGameState(roomId);
    }
  });

  // =========================
  // DESCONECTAR
  // =========================
  socket.on("disconnect", () => {
    playersOnline = Math.max(playersOnline - 1, 0);

    const roomId = socketToRoom.get(socket.id);
    if (!roomId) {
      io.emit("players_online", playersOnline);
      return;
    }

    const timeout = setTimeout(() => {
      replaceWithBot(roomId, socket.id);
      disconnectedPlayers.delete(socket.id);
    }, 30000);

    disconnectedPlayers.set(socket.id, {
      roomId,
      timeout
    });

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
