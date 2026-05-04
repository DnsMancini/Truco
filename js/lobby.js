const mesasDisponiveis = [
  { id: 1, nome: "Mesa 1", aposta: "Casual", jogadores: "2/4" },
  { id: 2, nome: "Mesa 2", aposta: "Intermediária", jogadores: "3/4" },
  { id: 3, nome: "Mesa 3", aposta: "Competitiva", jogadores: "1/4" },
  { id: 4, nome: "Mesa 4", aposta: "Rankeada", jogadores: "4/4" },
];

function entrarNaMesa(mesaId) {
  const lobby = document.getElementById("lobby");
  const gameWrapper = document.getElementById("gameWrapper");

  lobby.style.display = "none";
  gameWrapper.classList.remove("game-hidden");

  const mesa = mesasDisponiveis.find((item) => item.id === mesaId);
  mostrar(`Entrando na ${mesa?.nome || "mesa"}...`);
  iniciar();
}

function renderizarMesas() {
  const lista = document.getElementById("listaMesas");
  if (!lista) return;

  lista.innerHTML = mesasDisponiveis
    .map((mesa) => `
      <button class="mesa-item" type="button" onclick="entrarNaMesa(${mesa.id})">
        <strong>${mesa.nome}</strong>
        <span>${mesa.aposta}</span>
        <small>${mesa.jogadores} jogadores</small>
      </button>
    `)
    .join("");
}

window.addEventListener("load", renderizarMesas);
