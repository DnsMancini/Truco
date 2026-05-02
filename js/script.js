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
let maoDeOnzeAtiva = false;
let maoDeOnzeAceita = false;

const BOT_PLAY_DELAY = 900;
const BOT_PLAY_DELAY_AFTER_TRUCO = 1200;
const NEXT_HAND_DELAY = 1800;

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
let cartaCobertaPendenteIndex = null;
let longPressTimer = null;

const VAL = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const NAIPES = ["♠", "♥", "♦", "♣"];
const NOMES = ["Você", "Bot 1", "Parceiro", "Bot 2"];

/* 🔥 TRUCO */
const trucoValores = [1, 3, 6, 9, 12];
let nivelTruco = 0;
let valorMao = 1;

function getPontosRecusaTruco() {
  if (maoDeOnzeAtiva && maoDeOnzeAceita) return 3;

  const pontosPorRecusa = {
    3: 1,
    6: 3,
    9: 6,
    12: 9,
  };

  return pontosPorRecusa[valorMao] ?? 1;
}

function pedirTruco() {
  let meuTime = getTime(0);

  if (maoDeOnzeAtiva) {
    mostrar("Mão de 11: truco proibido! Você perdeu a partida.");
    encerrarPartidaPorPenalidade(1);
    return;
  }

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
    const adversarios = [1, 3].filter((idx) => maos[idx] && maos[idx].length);
    const botRespondente =
      adversarios.length > 1
        ? adversarios.reduce((a, b) =>
            calcularForcaMediaMao(maos[a]) >= calcularForcaMediaMao(maos[b]) ? a : b,
          )
        : adversarios[0] ?? 1;

    const resposta = botResponderTruco(botRespondente);

    if (resposta === "aceitar") {
      mostrar("Aceitaram!");
      estadoTruco = "normal";
      atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
      return;
    }

    mostrar("Eles correram!");
    estadoTruco = "normal";
    adicionarPontos(meuTime, getPontosRecusaTruco());
    botPlayActive = false;
    if (botPlayTimeout) {
      clearTimeout(botPlayTimeout);
      botPlayTimeout = null;
    }
    atualizarTrucoStatus("Truco recusado");
    setTimeout(iniciar, 1500);
  }, 800);
}

function atualizarTrucoStatus(msg) {
  const texto = msg.toLowerCase().startsWith("truco:") ? msg : `Truco: ${msg}`;
  document.getElementById("trucoStatus").innerText = texto;
}

function mostrarBalaoTruco(jogadorIdx, texto, onResposta) {
  const balao = document.getElementById("balaoTruco");
  const balaoTexto = document.getElementById("balaoTrucoTexto");
  const btnSim = document.getElementById("btnBalaoSim");
  const btnNao = document.getElementById("btnBalaoNao");
  const jogador = document.getElementById(`p${jogadorIdx}`);
  const mesaEl = document.querySelector(".mesa");

  if (!balao || !jogador || !mesaEl) {
    onResposta(false);
    return;
  }

  balaoTexto.innerText = texto;
  balao.classList.remove("oculto");

  const mesaRect = mesaEl.getBoundingClientRect();
  const jogadorRect = jogador.getBoundingClientRect();
  const topo = jogadorRect.top - mesaRect.top - 80;
  const esquerda = jogadorRect.left - mesaRect.left + jogadorRect.width / 2;

  balao.style.top = `${Math.max(8, topo)}px`;
  balao.style.left = `${esquerda}px`;
  balao.style.transform = "translateX(-50%)";

  const limpar = () => {
    btnSim.onclick = null;
    btnNao.onclick = null;
    balao.classList.add("oculto");
  };

  btnSim.onclick = () => {
    limpar();
    onResposta(true);
  };
  btnNao.onclick = () => {
    limpar();
    onResposta(false);
  };
}

function isMaoDeOnze() {
  return (
    (pontos[0] === 11 || pontos[1] === 11) && !(pontos[0] === 11 && pontos[1] === 11)
  );
}


function finalizarPartida(timeVencedor) {
  if (jogoEncerrado) return;
  jogoEncerrado = true;
  pontos[timeVencedor] = 12;
  atualizarPlacar();
  mostrarTelaFinal(timeVencedor === 0);

  setTimeout(() => {
    pontos = [0, 0];
    jogoEncerrado = false;
    atualizarPlacar();
    iniciar();
  }, 3000);
}

function adicionarPontos(time, valor) {
  if (jogoEncerrado) return;

  pontos[time] = Math.min(12, pontos[time] + valor);
  atualizarPlacar();

  if (pontos[time] >= 12) {
    finalizarPartida(time);
  }
}
function encerrarPartidaPorPenalidade(timeVencedor) {
  jogoEncerrado = true;
  pontos[timeVencedor] = 12;
  atualizarPlacar();
  mostrarTelaFinal(timeVencedor === 0);

  setTimeout(() => {
    pontos = [0, 0];
    jogoEncerrado = false;
    atualizarPlacar();
    iniciar();
  }, 3000);
}

function atualizarPainelRodada() {
  document.getElementById("infoRodada").innerText = `Rodada ${rodada} de 3`;
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
  primeiroTurno = starter;
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

            if (tratarDecisaoMaoDeOnze()) return;

            if (turno !== 0) {
              botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY);
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

function render() {
  const inclinacoesJogador = [-8, 0, 8];

  document.getElementById("mao").innerHTML = maos[0]
    .map((c, i) => {
      const rot = inclinacoesJogador[i] ?? 0;
      const pendente = cartaCobertaPendenteIndex === i ? "coberta-pendente" : "";

      return `
      <div class="carta playerCard ${pendente}"
           data-index="${i}"
           style="--rot:${rot}deg;">
        ${renderCartaFrente(c)}
      </div>
      `;
    })
    .join("");

  vincularLongPressCartaJogador();

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

  podeJogar = false;

  const jogadaCoberta = cartaCobertaPendenteIndex === i;

  if (cartaCobertaPendenteIndex !== null && cartaCobertaPendenteIndex !== i) {
    cartaCobertaPendenteIndex = null;
  }

  mesa.push({ j: 0, c: maos[0].splice(i, 1)[0], coberta: jogadaCoberta });
  cartaCobertaPendenteIndex = null;
  renderMesa();
  tocar(somJogarCarta, 0.7);

  turno = (turno + direcao + 4) % 4;

  if (botPlayTimeout) {
    clearTimeout(botPlayTimeout);
    botPlayTimeout = null;
  }
  botPlayActive = false;

  botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY);
  render();
}

function podePrepararCartaCoberta() {
  return turno === 0 && rodada > 1 && mesa.length < 4 && estadoTruco === "normal";
}

function alternarCartaCobertaPendente(i) {
  if (!podePrepararCartaCoberta()) {
    if (rodada === 1) mostrar("Não pode encobrir carta na primeira rodada.");
    return;
  }
  cartaCobertaPendenteIndex = cartaCobertaPendenteIndex === i ? null : i;
  render();
}

function vincularLongPressCartaJogador() {
  const cartas = document.querySelectorAll("#mao .playerCard");
  cartas.forEach((el) => {
    const idx = Number(el.dataset.index);
    let longPressAtivo = false;
    const iniciarPress = (event) => {
      longPressAtivo = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        longPressAtivo = true;
        alternarCartaCobertaPendente(idx);
      }, 450);
    };
    const cancelarPress = () => {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    };
    const cliqueCarta = (event) => {
      if (longPressAtivo) {
        event.preventDefault();
        longPressAtivo = false;
        return;
      }
      jogar(idx);
    };

    el.addEventListener("click", cliqueCarta);
    el.addEventListener("mousedown", iniciarPress);
    el.addEventListener("touchstart", iniciarPress, { passive: true });
    el.addEventListener("mouseup", cancelarPress);
    el.addEventListener("mouseleave", cancelarPress);
    el.addEventListener("touchend", cancelarPress);
    el.addEventListener("touchcancel", cancelarPress);
  });
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

  if (!mesa.length) return melhor[0];

  const cartaVencedoraMesa = mesa.reduce((atualVencedora, proxima) =>
    forcaCarta(proxima.c) > forcaCarta(atualVencedora.c) ? proxima : atualVencedora,
  );

  const meuTime = getTime(j);
  const timeVencedor = getTime(cartaVencedoraMesa.j);

  // Parceiro já está ganhando: descarta a carta mais fraca
  if (timeVencedor === meuTime) {
    return pior[0];
  }

  // Adversário está ganhando: joga a menor carta que vence a atual vencedora
  const forcaVencedora = forcaCarta(cartaVencedoraMesa.c);
  const menorCartaQueGanha = pior.find((c) => forcaCarta(c) > forcaVencedora);

  // Se não houver carta que ganhe, descarta a mais fraca
  return menorCartaQueGanha || pior[0];
}


function calcularForcaMediaMao(mao) {
  if (!mao || !mao.length) return 0;

  const valores = mao.map((c) => forcaCarta(c));
  const soma = valores.reduce((acc, v) => acc + v, 0);
  const melhor = Math.max(...valores);

  // Dá peso maior para a melhor carta e para média geral da mão
  return soma / valores.length + melhor * 0.35;
}

function botDevePedirTruco(j) {
  if (estadoTruco !== "normal" || maoDeOnzeAtiva || pontos[0] >= 11 || pontos[1] >= 11) return false;
  if (nivelTruco >= 4) return false;

  const meuTime = getTime(j);
  if (ultimoTimeQuePediuTruco === meuTime) return false;

  const forcaMao = calcularForcaMediaMao(maos[j]);
  const melhorCarta = Math.max(...maos[j].map((c) => forcaCarta(c)));
  const pontosTime = pontos[meuTime];
  const pontosOponente = pontos[1 - meuTime];

  // Situação agressiva: mão forte ou adversário muito perto de fechar o jogo
  const maoForte = forcaMao >= 7.4 || melhorCarta >= 100;
  const pressaoFinal = pontosOponente >= 10 && forcaMao >= 6.2;

  if (!(maoForte || pressaoFinal)) return false;

  // reduz frequência para não ficar chamando toda hora
  const chanceBase = 0.4 + Math.min(0.2, pontosTime / 20);
  return Math.random() < chanceBase;
}

function botResponderTruco(j) {
  const forcaMao = calcularForcaMediaMao(maos[j]);
  const melhorCarta = Math.max(...maos[j].map((c) => forcaCarta(c)));
  const pontosMeuTime = pontos[getTime(j)];
  const pontosRival = pontos[1 - getTime(j)];

  // mão forte: costuma aceitar
  if (melhorCarta >= 100 || forcaMao >= 7.8) {
    return "aceitar";
  }

  // mão média: aceita mais quando está atrás no placar
  if (forcaMao >= 6.2) {
    const precisaBuscar = pontosMeuTime < pontosRival;
    if (precisaBuscar || Math.random() < 0.6) return "aceitar";
    return "correr";
  }

  // mão fraca: geralmente corre
  return Math.random() < 0.2 ? "aceitar" : "correr";
}

function botPedirTruco(j) {
  if (maoDeOnzeAtiva || pontos[0] >= 11 || pontos[1] >= 11) return;

  const meuTime = getTime(j);

  estadoTruco = "aguardando";

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

  atualizarTrucoStatus("Bot pediu truco! Valor " + valorMao);
  mostrar(NOMES[j] + " pediu truco! Agora vale " + valorMao);

  // Se quem pediu foi seu parceiro, quem responde é o time adversário (bot),
  // não o jogador.
  if (meuTime === 0) {
    setTimeout(() => {
      const botAdversario = maos[1] && maos[1].length ? 1 : 3;
      const resposta = botResponderTruco(botAdversario);

      if (resposta === "aceitar") {
        estadoTruco = "normal";
        mostrar("Eles aceitaram!");
        atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
        botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY_AFTER_TRUCO);
        return;
      }

      estadoTruco = "normal";
      mostrar("Eles correram!");
      adicionarPontos(meuTime, getPontosRecusaTruco());
      atualizarTrucoStatus("Truco recusado");
      botPlayActive = false;

      if (botPlayTimeout) {
        clearTimeout(botPlayTimeout);
        botPlayTimeout = null;
      }

      setTimeout(iniciar, 1200);
    }, 250);
    return;
  }

  setTimeout(() => {
    mostrarBalaoTruco(
      j,
      `${NOMES[j]} pediu truco! Vale ${valorMao} pontos. Aceitar?`,
      (aceitar) => {
        if (aceitar) {
          estadoTruco = "normal";
          atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
          botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY_AFTER_TRUCO);
          return;
        }

        estadoTruco = "normal";
        mostrar("Você correu!");
        adicionarPontos(meuTime, getPontosRecusaTruco());
        atualizarTrucoStatus("Truco recusado");
        botPlayActive = false;

        if (botPlayTimeout) {
          clearTimeout(botPlayTimeout);
          botPlayTimeout = null;
        }

        setTimeout(iniciar, 1200);
      },
    );
  }, 250);
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

  if (botDevePedirTruco(turno)) {
    botPlayActive = false;
    botPedirTruco(turno);
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

  botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY);
}

function renderMesa() {
  document.getElementById("mesaCartas").innerHTML = mesa
    .map(
      (m, i) => `
      <div class="cartaMesa c${m.j} ${i === cartaVencedoraIndex ? "vencedor" : ""} ${i === mesa.length - 1 ? "entrando" : ""}">
        ${m.coberta ? `<div class="carta virada"></div>` : renderCartaFrente(m.c)}
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
    let f = m.coberta ? -1 : forcaCarta(m.c);

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
    primeiroTurno = mesa[0]?.j ?? primeiroTurno;
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
      let time = getTimeVencedorMao();

      if (jogoEncerrado) return;

      adicionarPontos(time, valorMao);

      mostrar(
        (time === 0 ? "Nós" : "Eles") + " ganharam " + valorMao + " ponto(s)",
      );
      if (jogoEncerrado) return;

      // próximo starter (rotação horário)
      starter = (starter + direcao + 4) % 4;

      setTimeout(() => {
        jogoAtivo = false;
        iniciar();
      }, NEXT_HAND_DELAY);
      return;
    }

    // próxima rodada
    rodada++;
    atualizarPainelRodada();

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

function getTimeVencedorMao() {
  const [r1, r2, r3] = resultadoRodadas;

  if (rodada === 3 && r3 === "empate" && r1 !== "empate") {
    return r1;
  }

  return getTime(primeiroTurno);
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
    const pontosDaCorrida =
      estadoTruco === "aguardando" ? getPontosRecusaTruco() : valorMao;

    if (jogoEncerrado) return;

    adicionarPontos(adversario, pontosDaCorrida);

    mostrar("Eles ganharam " + pontosDaCorrida + " ponto(s)");
    if (estadoTruco === "aguardando") {
      estadoTruco = "normal";
      atualizarTrucoStatus("Truco recusado");
    }

    if (jogoEncerrado) return;

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

function tratarDecisaoMaoDeOnze() {
  if (!maoDeOnzeAtiva) return false;

  if (pontos[0] === 11) {
    const vaiJogar = window.confirm(
      "Mão de 11: jogar valendo 3 pontos?\nCancelar = correr e perder 1 ponto.",
    );

    if (!vaiJogar) {
      mostrar("Você correu na mão de 11. Eles ganham 1 ponto.");
      adicionarPontos(1, 1);

      if (!jogoEncerrado) {
        setTimeout(iniciar, 1200);
      }
      return true;
    }

    maoDeOnzeAceita = true;
    mostrar("Mão de 11 aceita! Esta mão vale 3 pontos.");
    return false;
  }

  if (pontos[1] === 11) {
    const elesJogam = Math.random() > 0.35;

    if (!elesJogam) {
      mostrar("Eles correram na mão de 11. Nós ganhamos 1 ponto.");
      adicionarPontos(0, 1);

      if (!jogoEncerrado) {
        setTimeout(iniciar, 1200);
      }
      return true;
    }

    maoDeOnzeAceita = true;
    mostrar("Eles aceitaram a mão de 11! Esta mão vale 3 pontos.");
  }

  return false;
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
  cartaCobertaPendenteIndex = null;

  // Limpa cartas visíveis da mão anterior antes da nova distribuição
  document.getElementById("mao").innerHTML = "";
  document.getElementById("hand1").innerHTML = "";
  document.getElementById("hand2").innerHTML = "";
  document.getElementById("hand3").innerHTML = "";

  document.getElementById("mesaCartas").innerHTML = "";
  cartaVencedoraIndex = -1;
  turno = starter;
  rodada = 1;
  resultadoRodadas = [];
  vencedorRodadaJogador = [];
  primeiroTurno = starter;
  ultimoTimeQuePediuTruco = null;
  jogoAtivo = true;

  atualizarControleJogador();

  nivelTruco = 0;
  maoDeOnzeAtiva = isMaoDeOnze();
  maoDeOnzeAceita = false;
  valorMao = maoDeOnzeAtiva ? 3 : 1;

  atualizarTrucoStatus(maoDeOnzeAtiva ? "Mão de 11 (truco proibido)" : "Nenhum");
  atualizarPainelRodada();

  vira = baralho.pop();
  document.getElementById("vira").innerHTML = renderCartaFrente(vira);

  distribuir();
  atualizarPlacar();
  document.getElementById("historicoRodadas").innerText = "";

  // Inicia o turno do bot se o starter não for o jogador
  if (starter !== 0) {
    botPlayTimeout = setTimeout(botPlay, BOT_PLAY_DELAY);
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

    html += i + 1 + "ª: " + texto + "\n";
  });

  document.getElementById("historicoRodadas").innerText = html.trim();
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
  const isVertical = window.innerHeight > window.innerWidth;
  document.body.classList.toggle("orientacao-vertical", isVertical);

  if (isVertical) return;

  const mesa = document.querySelector(".mesa");
  if (!mesa) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // 664 da mesa + painéis laterais e folga de bordas
  const baseW = 1040;
  const baseH = 760;

  const scale = Math.min(w / baseW, h / baseH);

  mesa.style.transform = `scale(${scale})`;
  mesa.style.transformOrigin = "center center";
}

window.addEventListener("resize", ajustarEscala);
window.addEventListener("load", ajustarEscala);

iniciar();
