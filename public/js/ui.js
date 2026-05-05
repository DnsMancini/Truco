export function renderizarMesa(estado) {
  const el = document.getElementById("game");
  el.innerHTML = `
    <h3>Rodada: ${estado.rodada}</h3>
  `;
}

export function renderLobby(filaSize) {
  document.getElementById("lobbyStatus").innerText =
    `Jogadores na fila: ${filaSize}`;
}