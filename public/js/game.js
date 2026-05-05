import socket from "./socket.js";
import { state } from "./state.js";

export function iniciarJogo(estado) {
  console.log("iniciando jogo", estado);

  renderizarMesa(estado);
}

export function jogarCarta(index) {
  socket.emit("play_card", { index });
}

socket.on("game_state", ({ estado }) => {
  renderizarMesa(estado);
});