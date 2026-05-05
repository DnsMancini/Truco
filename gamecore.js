const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function embaralharFisherYates(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function criarBaralho() {
  const b = [];
  for (const n of NAIPES) {
    for (const v of VAL) {
      b.push(v + n);
    }
  }
  return embaralharFisherYates(b);
}

function criarEstadoInicial() {
  return {
    turno: 0,
    rodada: 1,
    maoJogadores: [[], [], [], []],
    cartasMesa: [null, null, null, null],
    historico: []
  };
}

function distribuirCartas(estado) {
  const baralho = criarBaralho();
  estado.maoJogadores = [[], [], [], []];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      estado.maoJogadores[j].push(baralho.pop());
    }
  }
  estado.cartasMesa = [null, null, null, null];
  estado.turno = 0;
}

function jogarCarta(estado, jogadorIndex, indexCarta) {
  const mao = estado.maoJogadores[jogadorIndex];
  if (!mao || indexCarta < 0 || indexCarta >= mao.length) return false;

  const [carta] = mao.splice(indexCarta, 1);
  estado.cartasMesa[jogadorIndex] = carta;
  estado.historico.push({ jogadorIndex, carta, rodada: estado.rodada });

  estado.turno = (estado.turno + 1) % 4;
  const todosJogaram = estado.cartasMesa.every(Boolean);
  if (todosJogaram) {
    estado.rodada += 1;
    estado.cartasMesa = [null, null, null, null];
    if (estado.maoJogadores.every((m) => m.length === 0)) {
      distribuirCartas(estado);
      estado.rodada = 1;
    }
  }

  return true;
}

module.exports = {
  criarBaralho,
  criarEstadoInicial,
  distribuirCartas,
  jogarCarta
};
