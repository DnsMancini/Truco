const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];

function getValorCarta(c) {
  return c.slice(0, -1);
}

function getNaipe(c) {
  return c.slice(-1);
}

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
  let b = [];
  for (let n of NAIPES) {
    for (let v of VAL) {
      b.push(v + n);
    }
  }
  return embaralharFisherYates(b);
}

module.exports = {
  criarBaralho,
  getValorCarta,
  getNaipe
};