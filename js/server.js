const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let playersOnline = 0;

io.on("connection", (socket) => {
  playersOnline++;

  console.log("conectou:", socket.id);

  io.emit("players_online", playersOnline);

  socket.on("disconnect", () => {
    playersOnline--;
    io.emit("players_online", playersOnline);
  });
});

app.get("/", (req, res) => {
  res.send("Truco backend rodando");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT);
console.log("Servidor rodando na porta", PORT);
