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

  document.getElementById("mao").innerHTML = maos[0]
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

  botPlayTimeout = setTimeout(botPlay, getBotDelay());
  atualizarControleJogador();
  render();
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

function botEscolherCarta(j) {
  let mao = maos[j];

  if (maoDeFerroAtiva) {
    return mao[Math.floor(Math.random() * mao.length)];
  }
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

function botDeveForcarTrucoComZap(j) {
  if (mesa.length) return false;

  const meuTime = getTime(j);
  const jaTemVantagemNaMao = resultadoRodadas.some((resultado) =>
    resultado === "empate" || resultado === meuTime,
  );
  if (!jaTemVantagemNaMao) return false;

  const cartaDeSaida = botEscolherCarta(j);
  return forcaCarta(cartaDeSaida) === 103;
}

function temZapNaMesa() {
  return mesa.some((jogada) => forcaCarta(jogada.c) === 103);
}

function jogadorJaTeveVantagemNaMao() {
  const meuTime = getTime(0);
  return resultadoRodadas.some((resultado) => resultado === "empate" || resultado === meuTime);
}

function botDevePedirTruco(j) {
  if (estadoTruco !== "normal" || maoDeOnzeAtiva || pontos[0] >= 11 || pontos[1] >= 11) return false;
  if (nivelTruco >= 4 || botJaPediuTrucoNaMao) return false;
  if (temZapNaMesa() && jogadorJaTeveVantagemNaMao()) return false;

  const meuTime = getTime(j);
  if (ultimoTimeQuePediuTruco === meuTime) return false;

  const forcaMao = calcularForcaMediaMao(maos[j]);
  const melhorCarta = Math.max(...maos[j].map((c) => forcaCarta(c)));
  const pontosTime = pontos[meuTime];
  const pontosOponente = pontos[1 - meuTime];

  // Perfil emocional momentâneo: muda por jogada para não ficar previsível.
  const humor = (Math.random() - 0.5) * 0.08; // -0.04 até +0.04
  const confianca = Math.random() * 0.06; // 0 até +0.06

  // Pressão de placar e risco (foco em realismo, não em taxa de vitória).
  const diferenca = pontosTime - pontosOponente;
  const riscoPlacar = pontosOponente >= 10 ? -0.09 : pontosOponente >= 8 ? -0.04 : 0;
  const urgencia = diferenca < 0 ? 0.04 : diferenca > 2 ? -0.03 : 0;

  // Rodada inicial tende a chamar mais; depois cai bastante.
  const fatorRodada = rodada === 1 ? 0.03 : rodada === 2 ? -0.05 : -0.09;

  // Força da mão influencia, mas sem gatilhos determinísticos.
  let ajusteForca = 0;
  if (forcaMao >= 7.8 || melhorCarta >= 103) ajusteForca = 0.08;
  else if (forcaMao >= 6.8 || melhorCarta >= 100) ajusteForca = 0.04;
  else if (forcaMao >= 5.8) ajusteForca = -0.01;
  else ajusteForca = -0.04;

  // Blefe raro para parecer humano.
  const blefeRaro = forcaMao < 5.8 && rodada === 1 && Math.random() < 0.06 ? 0.05 : 0;

  // Base conservadora para reduzir spam.
  let chance = 0.07 + ajusteForca + fatorRodada + urgencia + riscoPlacar + humor + confianca + blefeRaro;

  // Anti-spam forte: se alguém acabou de pedir truco, reduz bastante a repetição.
  if (ultimoTimeQuePediuTruco !== null) chance -= 0.07;

  // Limites de realismo: nunca 0% nem alto demais.
  chance = Math.min(0.3, Math.max(0.02, chance));

  return Math.random() < chance;
}

function botResponderTruco(j) {
  if (temZapNaMesa() && jogadorJaTeveVantagemNaMao()) {
    return "correr";
  }

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
  if (maoDeOnzeAtiva) {
    const timeQueChamou = getTime(j);
    mostrar(NOMES[j] + " chamou truco na mão de 11 e perdeu a partida!");
    encerrarPartidaPorPenalidade(1 - timeQueChamou);
    return;
  }

  if (pontos[0] >= 11 || pontos[1] >= 11) return;

  const meuTime = getTime(j);

  botJaPediuTrucoNaMao = true;
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
        botPlayTimeout = setTimeout(botPlay, getBotDelay());
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

      avancarStarterProximaMao();
      setTimeout(iniciar, 1200);
    }, getBotDelay());
    return;
  }

  setTimeout(() => {
    mostrarBalaoTruco(
      j,
      "TRUCO!",
      (respostaJogador) => {
        if (respostaJogador === "aceitar") {
          estadoTruco = "normal";
          atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
          botPlayTimeout = setTimeout(botPlay, getBotDelay());
          return;
        }

        if (respostaJogador === "aumentar") {
          if (nivelTruco >= 4) {
            estadoTruco = "normal";
            atualizarTrucoStatus("Valor máximo de truco atingido");
            botPlayTimeout = setTimeout(botPlay, getBotDelay());
            return;
          }

          estadoTruco = "aguardando";

          if (nivelTruco === 1) {
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
          ultimoTimeQuePediuTruco = getTime(0);

          atualizarTrucoStatus("Você aumentou! Valor " + valorMao);
          mostrar("SEIS! Agora vale " + valorMao);

          const adversarios = [1, 3].filter((idx) => maos[idx] && maos[idx].length);
          const botRespondente =
            adversarios.length > 1
              ? adversarios.reduce((a, b) =>
                  calcularForcaMediaMao(maos[a]) >= calcularForcaMediaMao(maos[b]) ? a : b,
                )
              : adversarios[0] ?? 1;

          setTimeout(() => {
            const respostaBot = botResponderTruco(botRespondente);

            if (respostaBot === "aceitar") {
              estadoTruco = "normal";
              mostrar("Eles aceitaram o aumento!");
              atualizarTrucoStatus("Truco aceito! Valor " + valorMao);
              botPlayTimeout = setTimeout(botPlay, getBotDelay());
              return;
            }

            estadoTruco = "normal";
            mostrar("Eles correram!");
            adicionarPontos(getTime(0), getPontosRecusaTruco());
            atualizarTrucoStatus("Truco recusado");
            botPlayActive = false;

            if (botPlayTimeout) {
              clearTimeout(botPlayTimeout);
              botPlayTimeout = null;
            }

            avancarStarterProximaMao();
            setTimeout(iniciar, 1200);
          }, getBotDelay());
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

        avancarStarterProximaMao();
        setTimeout(iniciar, 1200);
      },
    );
  }, getBotDelay());
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

  botPlayTimeout = setTimeout(botPlay, getBotDelay());
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
  ocultarBalaoTruco();
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

    avancarStarterProximaMao();
    setTimeout(iniciar, 1500);
  }, 1000);
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
  botJaPediuTrucoNaMao = false;
  maoDeOnzeAtiva = isMaoDeOnze();
  maoDeFerroAtiva = isMaoDeFerro();
  maoDeOnzeAceita = false;
  valorMao = maoDeOnzeAtiva ? 3 : 1;

  atualizarTrucoStatus(
    maoDeOnzeAtiva || maoDeFerroAtiva ? "Mão especial (truco proibido)" : "Nenhum",
  );
  atualizarPainelRodada();

  vira = baralho.pop();
  document.getElementById("vira").innerHTML = renderCartaFrente(vira);

  distribuir();
  atualizarPlacar();
  atualizarHistorico();

  // Inicia o turno do bot se o starter não for o jogador
  if (starter !== 0) {
    botPlayTimeout = setTimeout(botPlay, getBotDelay());
  }
}

function atualizarControleJogador() {
  podeJogar = !jogoEncerrado && turno === 0 && mesa.length < 4 && estadoTruco === "normal";
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

if (typeof socket !== "undefined") {
  socket.on("game_state", (state) => {
    if (!state) return;

    if (Array.isArray(state.mesa)) mesa = state.mesa;
    if (typeof state.turno === "number") turno = state.turno;
    if (typeof state.starter === "number") starter = state.starter;
    if (Array.isArray(state.pontos)) pontos = state.pontos;
    if (typeof state.rodada === "number") rodada = state.rodada;
    if (Array.isArray(state.resultadoRodadas)) resultadoRodadas = state.resultadoRodadas;
    if (typeof state.valorMao === "number") valorMao = state.valorMao;
    if (typeof state.trucoNivel === "number") nivelTruco = state.trucoNivel;

    estadoTruco = state.trucoPending ? "aguardando" : "normal";
    ultimoTimeQuePediuTruco =
      typeof state.lastTrucoTeam === "number" ? state.lastTrucoTeam : null;

    atualizarTrucoStatus(
      state.trucoPending ? `Truco pendente (${valorMao})` : `Truco em ${valorMao}`,
    );

    if (typeof atualizarPlacar === "function") atualizarPlacar();
    if (typeof atualizarPainelRodada === "function") atualizarPainelRodada();
    if (typeof renderMesa === "function") renderMesa();
    if (typeof atualizarControleJogador === "function") atualizarControleJogador();
  });
}
