const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];
const NOMES = ["Você", "Bot 1 [BOT]", "Parceiro", "Bot 2 [BOT]"];

function getValorCarta(c) {
  return c.slice(0, -1);
}

function getNaipe(c) {
  return c.slice(-1);
}

function getManilha() {
  let idx = VAL.indexOf(getValorCarta(vira));
  return VAL[(idx + 1) % VAL.length];
}

function forcaCarta(c) {
  let v = getValorCarta(c);
  let n = getNaipe(c);
  if (v === getManilha()) {
    const ordem = ["♦", "♠", "♥", "♣"];
    return 100 + ordem.indexOf(n);
  }
  return VAL.indexOf(v);
}

function randomInt(maxExclusive) {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    const limite = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    let valor;

    do {
      window.crypto.getRandomValues(array);
      valor = array[0];
    } while (valor >= limite);

    return valor % maxExclusive;
  }

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

function getClasseNaipe(carta) {
  const naipe = getNaipe(carta);
  return naipe === "♥" || naipe === "♦" ? "naipe-vermelho" : "naipe-preto";
}

function formatarCarta(carta) {
  return `<span class="${getClasseNaipe(carta)}">${getValorCarta(carta)}${getNaipe(carta)}</span>`;
}

function renderCartaFrente(carta) {
  return `
    <div class="top-left">
      ${formatarCarta(carta)}
    </div>
    <div class="center">
      ${formatarCarta(carta)}
    </div>
    <div class="bottom-right">
      ${formatarCarta(carta)}
    </div>
  `;
}
