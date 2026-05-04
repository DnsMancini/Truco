let direcao = -1; // -1 = anti-horário
let ultimoTimeQuePediuTruco = null;
let starter = 0;
let estadoTruco = "normal"; // normal | aguardando
let jogoAtivo = true;
let botPlayTimeout = null;
let botPlayActive = false;
let distribuindo = false;
let jogoEncerrado = false;
let negaAtiva = false;
let negaEstado = {
  ativo: false,
  fase: 0,
  vantagemTime: null,
};
let maoDeOnzeAtiva = false;
let maoDeOnzeAceita = false;
let maoDeFerroAtiva = false;
let botJaPediuTrucoNaMao = false;

const BOT_RESPONSE_DELAY_MIN = 800;
const BOT_RESPONSE_DELAY_MAX = 3000;
const NEXT_HAND_DELAY = 1800;

function getBotDelay() {
  return Math.floor(
    Math.random() * (BOT_RESPONSE_DELAY_MAX - BOT_RESPONSE_DELAY_MIN + 1) +
      BOT_RESPONSE_DELAY_MIN,
  );
}

let podeJogar = true;
let pontos = [0, 0]; // [nos, eles]
let cartaCobertaPendenteIndex = null;
let longPressTimer = null;
let turnoJogadorTimeout = null;
let turnoJogadorInterval = null;
let turnoJogadorTempoRestante = 30;

const TEMPO_TURNO_JOGADOR = 30;
const INICIO_EXIBICAO_CONTADOR = 10;

/* 🔥 TRUCO */
const trucoValores = [1, 3, 6, 9, 12];
let nivelTruco = 0;
let valorMao = 1;

function pedirTruco() {
  if (typeof socket !== "undefined") {
    socket.emit("request_truco");
    return;
  }

  // Fallback legado (não remover nesta etapa de migração segura).
  mostrar("Socket indisponível para pedir truco.");
}

function aceitarTruco() {
  if (typeof socket !== "undefined") {
    socket.emit("respond_truco", { action: "aceitar" });
    return;
  }
  // Fallback legado (não remover nesta etapa de migração segura).
  mostrar("Socket indisponível para aceitar truco.");
}

function correrTruco() {
  if (typeof socket !== "undefined") {
    socket.emit("respond_truco", { action: "correr" });
    return;
  }
  // Fallback legado (não remover nesta etapa de migração segura).
  mostrar("Socket indisponível para correr do truco.");
}

function aumentarTruco() {
  if (typeof socket !== "undefined") {
    socket.emit("respond_truco", { action: "aumentar" });
    return;
  }
  // Fallback legado (não remover nesta etapa de migração segura).
  mostrar("Socket indisponível para aumentar truco.");
}

function avancarStarterProximaMao() {
  starter = (starter + direcao + 4) % 4;
}

function atualizarTrucoStatus(msg) {
  const trucoStatus = document.getElementById("trucoStatus");
  if (trucoStatus) {
    trucoStatus.innerText = msg.replace(/^truco:\s*/i, "");
  }
}

function ocultarBalaoTruco() {
  const chamada = document.getElementById("chamadaTruco");
  const acoes = document.getElementById("acoesTruco");
  const btnAceitar = document.getElementById("btnAceitarTruco");
  const btnAumentar = document.getElementById("btnAumentarTruco");
  const btnCorrerTruco = document.getElementById("btnCorrerTruco");

  if (btnAceitar) btnAceitar.onclick = null;
  if (btnAumentar) btnAumentar.onclick = null;
  if (btnCorrerTruco) btnCorrerTruco.onclick = null;

  if (chamada) chamada.classList.add("oculto");
  if (acoes) acoes.classList.add("oculto");

  const btnTruco = document.getElementById("btnTruco");
  const btnCorrer = document.getElementById("btnCorrer");
  if (btnTruco) btnTruco.style.display = "";
  if (btnCorrer) btnCorrer.style.display = "";
}

function mostrarBalaoTruco(_jogadorIdx, texto, onResposta) {
  const chamada = document.getElementById("chamadaTruco");
  const acoes = document.getElementById("acoesTruco");
  const btnAceitar = document.getElementById("btnAceitarTruco");
  const btnAumentar = document.getElementById("btnAumentarTruco");
  const btnCorrerTruco = document.getElementById("btnCorrerTruco");
  const btnTruco = document.getElementById("btnTruco");
  const btnCorrer = document.getElementById("btnCorrer");

  if (!chamada || !acoes || !btnAceitar || !btnAumentar || !btnCorrerTruco) {
    onResposta(false);
    return;
  }

  if (btnTruco) btnTruco.style.display = "none";
  if (btnCorrer) btnCorrer.style.display = "none";

  chamada.textContent = texto || "TRUCO!";
  chamada.classList.remove("oculto");
  acoes.classList.remove("oculto");

  btnAceitar.onclick = () => {
    ocultarBalaoTruco();
    onResposta("aceitar");
  };

  btnAumentar.onclick = () => {
    ocultarBalaoTruco();
    onResposta("aumentar");
  };

  btnCorrerTruco.onclick = () => {
    ocultarBalaoTruco();
    onResposta("correr");
  };
}

function mostrarDecisaoMaoDeOnze(onResposta) {
  const chamada = document.getElementById("chamadaTruco");
  const acoes = document.getElementById("acoesTruco");
  const btnAceitar = document.getElementById("btnAceitarTruco");
  const btnAumentar = document.getElementById("btnAumentarTruco");
  const btnCorrerTruco = document.getElementById("btnCorrerTruco");
  const btnTruco = document.getElementById("btnTruco");
  const btnCorrer = document.getElementById("btnCorrer");

  if (!chamada || !acoes || !btnAceitar || !btnAumentar || !btnCorrerTruco) {
    onResposta(false);
    return;
  }

  if (btnTruco) btnTruco.style.display = "none";
  if (btnCorrer) btnCorrer.style.display = "none";

  chamada.textContent = "MÃO DE 11";
  chamada.classList.remove("oculto");
  acoes.classList.remove("oculto");

  btnAceitar.textContent = "Jogar";
  btnAumentar.textContent = "Correr";
  btnCorrerTruco.style.display = "none";

  btnAceitar.onclick = () => {
    ocultarBalaoTruco();
    btnCorrerTruco.style.display = "";
    onResposta(true);
  };

  btnAumentar.onclick = () => {
    ocultarBalaoTruco();
    btnCorrerTruco.style.display = "";
    onResposta(false);
  };
}

function isMaoDeOnze() {
  return (
    (pontos[0] === 11 || pontos[1] === 11) && !(pontos[0] === 11 && pontos[1] === 11)
  );
}

function isMaoDeFerro() {
  return pontos[0] === 11 && pontos[1] === 11;
}


function formatarResumoFinal() {
  const jogadores = typeof obterNomesJogadoresMesaAtual === "function"
    ? obterNomesJogadoresMesaAtual()
    : ["Você", "Bot 1 [BOT]", "Parceiro", "Bot 2 [BOT]"];
  return `Placar final: Nós ${pontos[0]} x ${pontos[1]} Eles\n\nJogadores da mesa:\n- ${jogadores.join("\n- ")}`;
}

function encerrarMesaAposResultado(buscarNova) {
  if (typeof finalizarMesaNoServidor !== "function") return;
  finalizarMesaNoServidor({ buscarNovaPartida: Boolean(buscarNova) });
}

function mostrarTelaFinal(vitoria) {
  let tela = document.getElementById("telaFinal");
  let texto = document.getElementById("textoFinal");
  let resumo = document.getElementById("resumoFinal");
  const btnLobby = document.getElementById("btnVoltarLobby");
  const btnNova = document.getElementById("btnBuscarNova");

  if (!tela || !texto || !resumo || !btnLobby || !btnNova) return;

  texto.innerText = vitoria ? "VOCÊ FOI O VENCEDOR 🏆" : "VOCÊ PERDEU 😢";
  texto.style.color = vitoria ? "#00ff88" : "#ff4444";
  resumo.textContent = formatarResumoFinal();

  btnLobby.onclick = () => encerrarMesaAposResultado(false);
  btnNova.onclick = () => encerrarMesaAposResultado(true);
  tela.classList.add("show");
}

function finalizarPartida(timeVencedor) {
  if (jogoEncerrado) return;
  jogoEncerrado = true;
  pontos[timeVencedor] = Math.max(12, pontos[timeVencedor]);
  atualizarPlacar();
  mostrar(`${timeVencedor === 0 ? "Nós" : "Eles"} fecharam em 12.`);
  mostrarTelaFinal(timeVencedor === 0);
}

function adicionarPontos(time, valor) {
  if (jogoEncerrado) return;
  pontos[time] += valor;
  atualizarPlacar();

  if (pontos[time] >= 12 && pontos[1 - time] < 12) {
    finalizarPartida(time);
  }
}
function encerrarPartidaPorPenalidade(timeVencedor) {
  if (jogoEncerrado) return;
  jogoEncerrado = true;
  pontos[timeVencedor] = 12;
  atualizarPlacar();
  mostrarTelaFinal(timeVencedor === 0);
}

function atualizarPainelRodada() {
  const infoRodada = document.getElementById("infoRodada");
  if (infoRodada) {
    infoRodada.innerText = `Rodada ${rodada} de 3`;
  }
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
              botPlayTimeout = setTimeout(botPlay, getBotDelay());
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
  let mesa = document.getElementById("game");

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

function render() {
  const inclinacoesJogador = [-8, 0, 8];

  const maoJogador = Array.isArray(maos[0]) ? maos[0] : []
  const maoEsquerda = Array.isArray(maos[1]) ? maos[1] : []
  const maoParceiro = Array.isArray(maos[2]) ? maos[2] : []
  const maoDireita = Array.isArray(maos[3]) ? maos[3] : []

  document.getElementById("mao").innerHTML = maoJogador
    .map((c, i) => {
      if (maoDeFerroAtiva) {
        return `<div class="carta playerCard virada" data-index="${i}"></div>`;
      }
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

  document.getElementById("hand1").innerHTML = maoEsquerda
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");

  document.getElementById("hand2").innerHTML = maoParceiro
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");

  document.getElementById("hand3").innerHTML = maoDireita
    .map(
      (c) => `
      <div class="carta virada"></div>
    `,
    )
    .join("");
}

function playCardSocket(card) {
  if (typeof socket === "undefined") return;
  socket.emit("play_card", { index: card.index });
}

function jogar(i) {
  if (distribuindo) return;

  if (!jogoAtivo || !podeJogar || estadoTruco !== "normal") return;

  podeJogar = false;

  const jogadaCoberta = cartaCobertaPendenteIndex === i;

  if (cartaCobertaPendenteIndex !== null && cartaCobertaPendenteIndex !== i) {
    cartaCobertaPendenteIndex = null;
  }

  const card = maos[0][i];
  if (!card) {
    podeJogar = true;
    atualizarControleJogador();
    return;
  }

  // Frontend não decide jogada: apenas envia ação ao backend.
  card.index = i;
  playCardSocket(card);
  cartaCobertaPendenteIndex = null;
  atualizarControleJogador();
}

function jogarCartaAleatoriaJogador() {
  if (!podeJogar || turno !== 0 || !maos[0] || maos[0].length === 0) return;
  const indiceAleatorio = Math.floor(Math.random() * maos[0].length);
  mostrar("Tempo esgotado! Carta jogada aleatoriamente.");
  jogar(indiceAleatorio);
}

function esconderContadorTurno() {
  const contadorEl = document.getElementById("contadorTurno");
  if (!contadorEl) return;
  contadorEl.classList.add("oculto");
  contadorEl.textContent = "";
}

function limparTimerTurnoJogador() {
  if (turnoJogadorTimeout) {
    clearTimeout(turnoJogadorTimeout);
    turnoJogadorTimeout = null;
  }
  if (turnoJogadorInterval) {
    clearInterval(turnoJogadorInterval);
    turnoJogadorInterval = null;
  }
  turnoJogadorTempoRestante = TEMPO_TURNO_JOGADOR;
  esconderContadorTurno();
}

function iniciarTimerTurnoJogador() {
  limparTimerTurnoJogador();
  turnoJogadorTempoRestante = TEMPO_TURNO_JOGADOR;

  turnoJogadorTimeout = setTimeout(() => {
    limparTimerTurnoJogador();
    jogarCartaAleatoriaJogador();
  }, TEMPO_TURNO_JOGADOR * 1000);

  turnoJogadorInterval = setInterval(() => {
    turnoJogadorTempoRestante -= 1;
    const contadorEl = document.getElementById("contadorTurno");
    if (!contadorEl) return;

    if (turnoJogadorTempoRestante <= INICIO_EXIBICAO_CONTADOR && turnoJogadorTempoRestante > 0) {
      contadorEl.classList.remove("oculto");
      contadorEl.textContent = `${turnoJogadorTempoRestante}`;
    } else if (turnoJogadorTempoRestante > INICIO_EXIBICAO_CONTADOR) {
      esconderContadorTurno();
    }
  }, 1000);
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

function botPlay() {
  // Arquitetura server-authoritative:
  // bots e progressão de turno ficam somente no backend.
  return;
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


function atualizarJogadoresDaMesaUI(jogadoresMesa) {
  if (!Array.isArray(jogadoresMesa) || jogadoresMesa.length !== 4) return;
  jogadoresMesa.forEach((jogador, idx) => {
    NOMES[idx] = jogador.nome;
    const playerEl = document.getElementById(`p${idx}`);
    if (playerEl) {
      const avatarEl = playerEl.querySelector(".avatar");
      playerEl.innerHTML = `${avatarEl ? avatarEl.outerHTML : ""}${jogador.nome}`;
    }
    mostrar(`${jogador.nome} ${jogador.tipo === "bot" ? "saiu" : "entrou"} na mesa.`);
  });
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
  // Arquitetura server-authoritative:
  // resolução de rodada/mão fica somente no backend.
  return;
}

function resolverLegadoLocal() {
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
      avancarStarterProximaMao();

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
  correrTruco();
}

function tratarDecisaoMaoDeOnze() {
  if (!maoDeOnzeAtiva) return false;

  if (pontos[0] === 11) {
    mostrar("Mão de 11: olhe suas cartas e escolha Jogar ou Correr.");
    mostrarDecisaoMaoDeOnze((vaiJogar) => {
      if (!vaiJogar) {
        mostrar("Você correu na mão de 11. Eles ganham 1 ponto.");
        adicionarPontos(1, 1);

        if (!jogoEncerrado) {
          avancarStarterProximaMao();
          setTimeout(iniciar, 1200);
        }
        return;
      }

      maoDeOnzeAceita = true;
      mostrar("Mão de 11 aceita! Esta mão vale 3 pontos.");
      atualizarControleJogador();

      if (turno !== 0) {
        botPlayTimeout = setTimeout(botPlay, getBotDelay());
      }
    });
    return true;
  }

  if (pontos[1] === 11) {
    const elesJogam = Math.random() > 0.35;

    if (!elesJogam) {
      mostrar("Eles correram na mão de 11. Nós ganhamos 1 ponto.");
      adicionarPontos(0, 1);

      if (!jogoEncerrado) {
        avancarStarterProximaMao();
        setTimeout(iniciar, 1200);
      }
      return true;
    }

    maoDeOnzeAceita = true;
    mostrar("Eles aceitaram a mão de 11! Esta mão vale 3 pontos.");
    atualizarControleJogador();

    if (turno !== 0) {
      botPlayTimeout = setTimeout(botPlay, getBotDelay());
    }
  }

  return false;
}

function atualizarPlacar() {
  let label = getMaoStatusLabel();
  let html = `
    <div class="placar-times">
      <div class="placar-time placar-time--nos">
        <div class="placar-time-nome">NÓS</div>
        <div class="placar-time-pontos">${pontos[0]}</div>
      </div>
      <div class="placar-time placar-time--eles">
        <div class="placar-time-nome">ELES</div>
        <div class="placar-time-pontos">${pontos[1]}</div>
      </div>
    </div>
  `;

  if (label) html += `<span class="placar-status">${label}</span>`;
  document.getElementById("placar").innerHTML = html;
  if (label) mostrar(label + "!");
}

function iniciar() {
  // Arquitetura server-authoritative:
  // frontend somente solicita estado/renderiza.
  jogoAtivo = true;
  socket.emit("request_state");
}

function podeJogarCarta() {
  return turno === 0;
}

function atualizarControleJogador() {
  podeJogar = !jogoEncerrado && podeJogarCarta() && mesa.length < 4 && estadoTruco === "normal";
  if (podeJogar) {
    iniciarTimerTurnoJogador();
  } else {
    limparTimerTurnoJogador();
  }
}

function atualizarHistorico() {
  const historico = document.getElementById("historicoRodadas");
  let html = "";

  for (let i = 0; i < 3; i++) {
    const resultado = resultadoRodadas[i];
    let classe = "bolinha-branca";
    let texto = `Rodada ${i + 1}: sem resultado`;

    if (resultado === "empate") {
      classe = "bolinha-ouro";
      texto = `Rodada ${i + 1}: empate`;
    } else if (resultado === 0) {
      classe = "bolinha-verde";
      texto = `Rodada ${i + 1}: você venceu`;
    } else if (resultado === 1) {
      classe = "bolinha-azul";
      texto = `Rodada ${i + 1}: adversário venceu`;
    }

    html += `<span class="bolinha-rodada ${classe}" title="${texto}" aria-label="${texto}"></span>`;
  }

  historico.innerHTML = html;
}

function proximoTurno() {
  turno = (turno + direcao + 4) % 4;
}


function normalizarMaos(hands) {
  if (!Array.isArray(hands)) return [[], [], [], []];
  return Array.from({ length: 4 }, (_, idx) => (Array.isArray(hands[idx]) ? [...hands[idx]] : []));
}

function normalizarMesa(table) {
  if (!Array.isArray(table)) return [];
  return table
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const jogador = typeof entry.j === "number" ? entry.j : entry.player;
      const carta = entry.c ?? entry.card;
      if (typeof jogador !== "number" || !carta) return null;
      return { j: jogador, c: carta, coberta: Boolean(entry.coberta) };
    })
    .filter(Boolean);
}

function aplicarEstadoDoJogo(state) {
  if (!state) return;

  if (Array.isArray(state.hands)) maos = normalizarMaos(state.hands);
  if (Array.isArray(state.table)) mesa = normalizarMesa(state.table);
  if (typeof state.turn === "number") turno = state.turn;

  if (Array.isArray(state.mesa)) mesa = normalizarMesa(state.mesa);
  if (typeof state.turno === "number") turno = state.turno;
  if (typeof state.starter === "number") starter = state.starter;
  if (Array.isArray(state.score)) pontos = state.score;
  if (Array.isArray(state.pontos)) pontos = state.pontos;
  if (typeof state.round === "number") rodada = state.round;
  if (typeof state.rodada === "number") rodada = state.rodada;
  if (Array.isArray(state.resultadoRodadas)) resultadoRodadas = state.resultadoRodadas;
  if (typeof state.valorMao === "number") valorMao = state.valorMao;
  if (typeof state.trucoNivel === "number") nivelTruco = state.trucoNivel;

  maos = normalizarMaos(maos);
  mesa = normalizarMesa(mesa);

  estadoTruco = state.trucoPending ? "aguardando" : "normal";
  ultimoTimeQuePediuTruco = typeof state.lastTrucoTeam === "number" ? state.lastTrucoTeam : null;

  atualizarTrucoStatus(state.trucoPending ? `Truco pendente (${valorMao})` : `Truco em ${valorMao}`);

  render();
  renderMesa();
  if (typeof atualizarPlacar === "function") atualizarPlacar();
  if (typeof atualizarPainelRodada === "function") atualizarPainelRodada();
  if (typeof atualizarControleJogador === "function") atualizarControleJogador();
}

if (typeof socket !== "undefined") {
  socket.on("game_state", (state) => {
    aplicarEstadoDoJogo(state);
  });
}


if (typeof socket !== "undefined") {
  socket.on("game_sync", (game) => {
    if (!game) return;

    console.log("jogo restaurado", game);

    aplicarEstadoDoJogo(game);
  });

  socket.on("player_reconnected", () => {
    mostrar("Jogador reconectou na partida");
  });

  socket.on("player_replaced_by_bot", (data) => {
    console.log("BOT assumiu jogador", data);
    mostrar("Um jogador ficou ausente. BOT assumiu a posição.");
  });
}
