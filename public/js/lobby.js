import socket from "./socket.js";
import { state } from "./state.js";
import { iniciarJogo } from "./game.js";

export function entrarNaFila() {
  socket.emit("entrar_fila");
  state.naFila = true;
}

socket.on("mesa_criada", ({ mesaId, estado }) => {
  console.log("mesa criada:", mesaId);

  state.mesaAtual = estado;

  iniciarJogo(estado);
});