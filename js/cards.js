const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];
const NOMES = ["Você", "Bot 1", "Parceiro", "Bot 2"];

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

function criarBaralho() {
  let b = [];
  for (let n of NAIPES) {
    for (let v of VAL) {
      b.push(v + n);
    }
  }
  return b.sort(() => Math.random() - 0.5);
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
