const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

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
});

// log de erro (ajuda MUITO)
io.engine.on("connection_error", (err) => {
  console.log("Erro conexão:", err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Rodando na porta", PORT);
});
