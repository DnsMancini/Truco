const somDistribuir = new Audio("audio/Distribuicaocartas.mp3");
const somJogarCarta = new Audio("audio/jogarcarta.mp3");
let direcao = -1; // -1 = anti-horário
let ultimoTimeQuePediuTruco = null;
let starter = 0;
let estadoTruco = "normal"; // normal | aguardando
let jogoAtivo = true;
let botPlayTimeout = null;
let botPlayActive = false;
let distribuindo = false;
let jogoEncerrado = false;

function tocar(audio, volume = 1) {
  audio.pause();
  audio.currentTime = 0;

  audio.volume = volume;

  audio.play().catch(() => {});
}

const somTruco = new Audio("audio/Truco.mp3");
const somSeis = new Audio("audio/Seis.mp3");
const somNove = new Audio("audio/Nove.mp3");
const somDoze = new Audio("audio/Doze.mp3");

let podeJogar = true;
let pontos = [0, 0]; // [nos, eles]

const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];
const NOMES = ["Você", "Bot 1", "Parceiro", "Bot 2"];

/* 🔥 TRUCO */
const trucoValores = [1, 3, 6, 9, 12];
let nivelTruco = 0;
let valorMao = 1;

function pedirTruco() {
  let meuTime = getTime(0);

  if (turno !== 0) {
    mostrar("Só pode pedir truco na sua vez!");
    return;
  }

  if (estadoTruco !== "normal") return;

  if (ultimoTimeQuePediuTruco === meuTime) {
    mostrar("Aguarde o adversário responder!");
    return;
  }

  if (nivelTruco >= 4) return;

  estadoTruco = "aguardando";
  atualizarTrucoStatus("Truco chamado! Valor " + trucoValores[nivelTruco]);

  if (nivelTruco === 0) {
    tocar(somTruco);
    valorMao = 3;
  } else if (nivelTruco === 1) {
    tocar(somSeis);
    valorMao = 6;
  } else if (nivelTruco === 2) {
    tocar(somNove);
    valorMao = 9;
  } else if (nivelTruco === 3) {
    tocar(somDoze);
    valorMao = 12;
  }

  nivelTruco++;
  ultimoTimeQuePediuTruco = meuTime;

  mostrar("TRUCO! Agora vale " + valorMao);

  setTimeout(() => {
    // 🔥 simulação simples de resposta do bot
    let aceita = Math.random() > 0.3;

    if (aceita) {
      mostrar("Aceitaram!");
      estadoTruco = "normal";
      atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
    } else {
      mostrar("Eles correram!");
      pontos[meuTime] += valorMao;
      atualizarPlacar();
      botPlayActive = false;
      if (botPlayTimeout) {
        clearTimeout(botPlayTimeout);
        botPlayTimeout = null;
      }
      atualizarTrucoStatus("Truco recusado");
      setTimeout(iniciar, 1500);
    }
  }, 800);
}

function atualizarTrucoStatus(msg) {
  document.getElementById("trucoStatus").innerText = msg;
}

function getMaoStatusLabel() {
  if (pontos[0] === 11 && pontos[1] === 11) return "Mão-de-ferro";
  if (pontos[0] === 11 || pontos[1] === 11) return "Mão-de-onze";
  return "";
}

let baralho = [],
  maos = [[], [], [], []],
  mesa = [],
  turno = 0,
  vira = "";
let rodada = 1,
  resultadoRodadas = [],
  vencedorRodadaJogador = [],
  primeiroTurno = 0;
let cartaVencedoraIndex = -1;

function getTime(j) {
  return j % 2 === 0 ? 0 : 1;
}
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

function getValor(c) {
  return c.slice(0, -1);
}

function getNaipe(c) {
  return c.slice(-1);
}

function distribuir() {
  let totalCartas = 12;
  let entregues = 0;

  let delay = 0;

  for (let i = 0; i < 3; i++) {
    for (let p = 0; p < 4; p++) {
      setTimeout(() => {
        let carta = baralho.pop();
        maos[p].push(carta);

        criarAnimacaoCarta(p, carta);
        tocar(somDistribuir, 0.4);

        entregues++;

        // 🔥 SÓ TERMINA QUANDO TODAS FORAM ENTREGUES
        if (entregues === totalCartas) {
          setTimeout(() => {
            render();

            distribuindo = false; // se você estiver usando flag

            atualizarControleJogador();

            if (turno !== 0) {
              botPlayTimeout = setTimeout(botPlay, 600);
            }
          }, 600);
        }
      }, delay);

      delay += 120;
    }
  }
}

function getPosicaoMao(player) {
  if (player === 0) {
    return {
      top: "85%",
      left: "50%",
      transform: "translate(-50%, 0) scale(0.8)",
    };
  }

  if (player === 1) {
    return {
      top: "50%",
      left: "5%",
      transform: "translate(0, -50%) rotate(90deg) scale(0.7)",
    };
  }

  if (player === 2) {
    return {
      top: "5%",
      left: "50%",
      transform: "translate(-50%, 0) scale(0.7)",
    };
  }

  return {
    top: "50%",
    left: "90%",
    transform: "translate(0, -50%) rotate(90deg) scale(0.7)",
  };
}

function criarAnimacaoCarta(player, cartaValor) {
  let mesa = document.querySelector(".mesa");

  let el = document.createElement("div");
  el.className = "carta animar";
  el.classList.add("virada");
  el.innerText = "";
  mesa.appendChild(el);

  let destino = getPosicaoMao(player);

  setTimeout(() => {
    el.classList.add("entrando");

    el.style.top = destino.top;
    el.style.left = destino.left;
    el.style.transform = destino.transform;
  }, 50);

  setTimeout(() => {
    el.remove();
  }, 600);
}

function getClasseNaipe(carta) {
  const naipe = getNaipe(carta);
  return naipe === "♥" || naipe === "♦" ? "naipe-vermelho" : "naipe-preto";
}

function formatarCarta(carta) {
  return `<span class="${getClasseNaipe(carta)}">${getValorCarta(carta)}${getNaipe(carta)}</span>`;
}

function render() {
  document.getElementById("mao").innerHTML = maos[0]
    .map((c, i) => {
      let rot = Math.random() * 20 - 10;

      return `
      <div class="carta playerCard"
           onclick="jogar(${i})"
           style="--rot:${rot}deg;">
        
        <div class="top-left">
          ${formatarCarta(c)}
        </div>

        <div class="center">
          ${formatarCarta(c)}
        </div>

        <div class="bottom-right">
          ${formatarCarta(c)}
        </div>

      </div>
      `;
    })
    .join("");

  document.getElementById("hand1").innerHTML = maos[1]
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");

  document.getElementById("hand2").innerHTML = maos[2]
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");

  document.getElementById("hand3").innerHTML = maos[3]
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");
}

function jogar(i) {
  if (distribuindo) return;

  if (!jogoAtivo || !podeJogar || estadoTruco !== "normal") return;

  if (!podeJogar) return;

  podeJogar = false;

  mesa.push({ j: 0, c: maos[0].splice(i, 1)[0] });
  renderMesa();
  tocar(somJogarCarta, 0.7);

  turno = (turno + direcao + 4) % 4;

  if (botPlayTimeout) {
    clearTimeout(botPlayTimeout);
    botPlayTimeout = null;
  }
  botPlayActive = false;

  botPlayTimeout = setTimeout(botPlay, 600);
  render();
}
function ordenar(mao, desc = true) {
  return [...mao].sort((a, b) =>
    desc ? forcaCarta(b) - forcaCarta(a) : forcaCarta(a) - forcaCarta(b),
  );
}

function botEscolherCarta(j) {
  let mao = maos[j];
  let melhor = ordenar(mao, true);
  let pior = ordenar(mao, false);

  if (mesa.length) {
    let melhorMesa = mesa.reduce((a, b) =>
      forcaCarta(a.c) > forcaCarta(b.c) ? a : b,
    );
    if (getTime(melhorMesa.j) === getTime(j)) {
      return pior[0];
    }
  }
  return melhor[0];
}

function botPlay() {
  if (distribuindo) return;

  if (!jogoAtivo || estadoTruco !== "normal") return;

  if (mesa.length >= 4) {
    botPlayActive = false;
    setTimeout(resolver, 500);
    return;
  }

  if (turno === 0) {
    botPlayActive = false;
    atualizarControleJogador();
    return;
  }

  if (!maos[turno] || maos[turno].length === 0) {
    botPlayActive = false;
    setTimeout(resolver, 500);
    return;
  }

  if (botPlayActive) return;
  botPlayActive = true;

  try {
    let carta = botEscolherCarta(turno);

    if (!carta) throw new Error("Sem carta");

    maos[turno].splice(maos[turno].indexOf(carta), 1);
    mesa.push({ j: turno, c: carta });

    tocar(somJogarCarta, 0.7);

    render();
    renderMesa();

    turno = (turno + direcao + 4) % 4;
  } catch (e) {
    console.log("Erro botPlay:", e);
  } finally {
    botPlayActive = false;
  }

  botPlayTimeout = setTimeout(botPlay, 800);
}

function renderMesa() {
  document.getElementById("mesaCartas").innerHTML = mesa
    .map(
      (m, i) => `
      <div class="cartaMesa c${m.j} ${i === cartaVencedoraIndex ? "vencedor" : ""}">
        
        <div class="top-left">
          ${formatarCarta(m.c)}
        </div>

        <div class="center">
          ${formatarCarta(m.c)}
        </div>

        <div class="bottom-right">
          ${formatarCarta(m.c)}
        </div>

      </div>
    `,
    )
    .join("");
}

function mostrar(msg) {
  let el = document.getElementById("mensagem");
  el.innerText = msg;
  el.style.display = "block";
  setTimeout(() => {
    el.style.display = "none";
  }, 2500);
}

function resolver() {
  let maior = -1;
  let vencedores = [];
  cartaVencedoraIndex = -1;

  mesa.forEach((m, i) => {
    let f = forcaCarta(m.c);

    if (f > maior) {
      maior = f;
      vencedores = [m];
      cartaVencedoraIndex = i;
    } else if (f === maior) {
      vencedores.push(m);
    }
  });

  if (vencedores.length > 1) {
    resultadoRodadas.push("empate");
    vencedorRodadaJogador.push(null);
    mostrar("Empate (amarrado)");
    cartaVencedoraIndex = -1;
  } else {
    let j = vencedores[0].j;

    resultadoRodadas.push(getTime(j));
    vencedorRodadaJogador.push(j);

    mostrar(NOMES[j] + " venceu a rodada");

    primeiroTurno = j;
  }

  atualizarHistorico();
  renderMesa();

  setTimeout(() => {
    // limpa mesa
    mesa = [];
    document.getElementById("mesaCartas").innerHTML = "";
    cartaVencedoraIndex = -1;
    botPlayActive = false;
    if (botPlayTimeout) {
      clearTimeout(botPlayTimeout);
      botPlayTimeout = null;
    }

    // próxima rodada começa com quem ganhou a vaza
    turno = primeiroTurno;

    // 🔥 FIM DA MÃO
    if (verificarFimMao()) {
      let time = getTime(primeiroTurno);

      if (jogoEncerrado) return;

      pontos[time] += valorMao;
      atualizarPlacar();

      mostrar(
        (time === 0 ? "Nós" : "Eles") + " ganharam " + valorMao + " ponto(s)",
      );
      if (pontos[0] >= 12 || pontos[1] >= 12) {
        jogoEncerrado = true;

        let vitoria = pontos[0] >= 12;

        mostrarTelaFinal(vitoria);

        setTimeout(() => {
          pontos = [0, 0];
          jogoEncerrado = false;
          atualizarPlacar();
          iniciar();
        }, 3000);

        return;
      }

      // próximo starter (rotação horário)
      starter = (starter + direcao + 4) % 4;

      setTimeout(() => {
        jogoAtivo = false;
        iniciar();
      }, 200);
      return;
    }

    // próxima rodada
    rodada++;

    render();
    renderMesa();

    atualizarControleJogador();

    // Inicia bot se não for turno do jogador
    setTimeout(() => {
      botPlayActive = false;
      botPlay();
    }, 300);
  }, 2000);
}

function verificarFimMao() {
  if (rodada === 1) return false;

  let [r1, r2, r3] = resultadoRodadas;

  if (r1 !== "empate" && r1 === r2) return true;
  if (r1 !== "empate" && r2 === "empate") return true;
  if (r1 === "empate" && r2 !== "empate") return true;

  if (rodada === 3) return true;

  return false;
}
function correr() {
  mostrar("Você correu!");

  setTimeout(() => {
    let adversario = 1;

    if (jogoEncerrado) return;

    pontos[adversario] += valorMao;

    atualizarPlacar();

    mostrar("Eles ganharam " + valorMao + " ponto(s)");

    if (pontos[adversario] >= 12) {
      mostrar("Eles venceram o jogo!");
      pontos = [0, 0];
      atualizarPlacar();
    }

    mesa = [];
    document.getElementById("mesaCartas").innerHTML = "";
    botPlayActive = false;
    if (botPlayTimeout) {
      clearTimeout(botPlayTimeout);
      botPlayTimeout = null;
    }

    setTimeout(iniciar, 1500);
  }, 1000);
}

function atualizarPlacar() {
  let label = getMaoStatusLabel();
  let html = "Nós: " + pontos[0] + " x " + pontos[1] + " Eles";
  if (label) html += "<span>" + label + "</span>";
  document.getElementById("placar").innerHTML = html;
  if (label) mostrar(label + "!");
}

function iniciar() {
  tocar(somDistribuir, 0.7);

  distribuindo = true; // 🔥 bloqueia jogo durante deal

  estadoTruco = "normal";
  ultimoTimeQuePediuTruco = null;
  botPlayActive = false;
  jogoAtivo = false;

  if (botPlayTimeout) {
    clearTimeout(botPlayTimeout);
    botPlayTimeout = null;
  }
  baralho = criarBaralho();
  maos = [[], [], [], []];
  mesa = [];
  document.getElementById("mesaCartas").innerHTML = "";
  cartaVencedoraIndex = -1;
  turno = starter;
  rodada = 1;
  resultadoRodadas = [];
  vencedorRodadaJogador = [];
  primeiroTurno = 0;
  ultimoTimeQuePediuTruco = null;
  jogoAtivo = true;

  atualizarControleJogador();

  nivelTruco = 0;
  valorMao = 1;

  atualizarTrucoStatus("Nenhum truco");

  vira = baralho.pop();
  document.getElementById("vira").innerText = vira;

  distribuir();
  atualizarPlacar();
  document.getElementById("historicoRodadas").innerText = "";

  // Inicia o turno do bot se o starter não for o jogador
  if (starter !== 0) {
    botPlayTimeout = setTimeout(botPlay, 300);
  }
}

function atualizarControleJogador() {
  podeJogar = turno === 0 && mesa.length < 4 && estadoTruco === "normal";
}

function atualizarHistorico() {
  let html = "";

  resultadoRodadas.forEach((r, i) => {
    let texto = "";

    if (r === 0) {
      texto = "✔ Nós";
    } else if (r === 1) {
      texto = "✖ Eles";
    } else {
      texto = "➖ Empate";
    }

    html += i + 1 + "ª: " + texto + " | ";
  });

  document.getElementById("historicoRodadas").innerText = html;
}

function mostrarTelaFinal(vitoria) {
  let tela = document.getElementById("telaFinal");
  let texto = document.getElementById("textoFinal");

  if (vitoria) {
    texto.innerText = "🔥 VOCÊ VENCEU!";
    texto.style.color = "#00ff88";
  } else {
    texto.innerText = "💀 VOCÊ PERDEU!";
    texto.style.color = "#ff4444";
  }

  tela.classList.add("show");

  setTimeout(() => {
    tela.classList.remove("show");
  }, 2500);
}

function proximoTurno() {
  turno = (turno + direcao + 4) % 4;
}

function ajustarEscala() {
  const mesa = document.querySelector(".mesa");

  const w = window.innerWidth;
  const h = window.innerHeight;

  const base = 664;

  const scale = Math.min(w / base, h / base) * 0.95;

  mesa.style.transform = `scale(${scale})`;
  mesa.style.transformOrigin = "center center";
}

window.addEventListener("resize", ajustarEscala);
window.addEventListener("load", ajustarEscala);

iniciar();
