const etapas2027 = [
  {
    id: "etapa-01",
    numero: 1,
    titulo: "1ª Etapa",
    data: "2027-01-28",
    exibicao: "28/01/2027",
    mes: "JAN",
    tipo: "regular",
  },
  {
    id: "etapa-02",
    numero: 2,
    titulo: "2ª Etapa",
    data: "2027-02-25",
    exibicao: "25/02/2027",
    mes: "FEV",
    tipo: "regular",
  },
  {
    id: "etapa-03",
    numero: 3,
    titulo: "3ª Etapa",
    data: "2027-03-25",
    exibicao: "25/03/2027",
    mes: "MAR",
    tipo: "regular",
  },
  {
    id: "etapa-04",
    numero: 4,
    titulo: "4ª Etapa",
    data: "2027-04-29",
    exibicao: "29/04/2027",
    mes: "ABR",
    tipo: "regular",
  },
  {
    id: "etapa-05",
    numero: 5,
    titulo: "5ª Etapa",
    data: "2027-05-20",
    exibicao: "20/05/2027",
    mes: "MAI",
    tipo: "regular",
  },
  {
    id: "etapa-06",
    numero: 6,
    titulo: "6ª Etapa",
    data: "2027-06-24",
    exibicao: "24/06/2027",
    mes: "JUN",
    tipo: "regular",
  },
  {
    id: "etapa-07",
    numero: 7,
    titulo: "7ª Etapa",
    data: "2027-07-29",
    exibicao: "29/07/2027",
    mes: "JUL",
    tipo: "regular",
  },
  {
    id: "etapa-08",
    numero: 8,
    titulo: "8ª Etapa",
    data: "2027-08-26",
    exibicao: "26/08/2027",
    mes: "AGO",
    tipo: "regular",
  },
  {
    id: "etapa-09",
    numero: 9,
    titulo: "9ª Etapa",
    data: "2027-09-30",
    exibicao: "30/09/2027",
    mes: "SET",
    tipo: "regular",
  },
  {
    id: "etapa-10",
    numero: 10,
    titulo: "10ª Etapa",
    data: "2027-10-14",
    exibicao: "14/10/2027",
    mes: "OUT",
    tipo: "regular",
  },
  {
    id: "etapa-11",
    numero: 11,
    titulo: "11ª Etapa",
    data: "2027-10-28",
    exibicao: "28/10/2027",
    mes: "OUT",
    tipo: "regular",
  },
  {
    id: "etapa-12",
    numero: 12,
    titulo: "12ª Etapa",
    data: "2027-11-25",
    exibicao: "25/11/2027",
    mes: "NOV",
    tipo: "regular",
  },
  {
    id: "etapa-final",
    numero: 13,
    titulo: "Etapa Final",
    data: "2027-12-09",
    exibicao: "09/12/2027",
    mes: "DEZ",
    tipo: "final",
  },
];

const jogadoresIniciais = [
  {
    id: "jogador-01",
    nome: "Aguardando resultados",
    apelido: "Ranking será atualizado pelo Caderno do Dealer",
    etapas: 0,
    ko: 0,
    pontos: 0,
  },
];

const STORAGE_KEY = "poker-de-quinta-2027-presencas";

const estado = {
  presencas: carregarPresencas(),
};

const elementos = {
  calendarGrid: document.querySelector("#calendarGrid"),
  rankingPreview: document.querySelector("#rankingPreview"),
  rankingTableBody: document.querySelector("#rankingTableBody"),
  presenceStage: document.querySelector("#presenceStage"),
  presenceForm: document.querySelector("#presenceForm"),
  presenceList: document.querySelector("#presenceList"),
  confirmedCount: document.querySelector("#confirmedCount"),
  waitingCount: document.querySelector("#waitingCount"),
  countdown: document.querySelector("#countdown"),
  nextDay: document.querySelector("#nextDay"),
  nextMonth: document.querySelector("#nextMonth"),
  nextStageName: document.querySelector("#nextStageName"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  menuButton: document.querySelector("#menuButton"),
  siteHeader: document.querySelector(".site-header"),
};

document.addEventListener("DOMContentLoaded", iniciarAplicacao);

function iniciarAplicacao() {
  renderizarCalendario();
  renderizarRanking();
  preencherEtapasDoFormulario();
  atualizarProximaEtapa();
  renderizarPresencas();
  configurarEventos();
  iniciarContagemRegressiva();
  registrarServiceWorker();
}

function configurarEventos() {
  document.querySelectorAll("[data-open-ranking]").forEach((botao) => {
    botao.addEventListener("click", abrirRanking);
  });

  document.querySelectorAll("[data-open-presence]").forEach((botao) => {
    botao.addEventListener("click", abrirPresenca);
  });

  document.querySelectorAll("[data-open-stage]").forEach((botao) => {
    botao.addEventListener("click", () => {
      abrirEtapa(Number(botao.dataset.stage || 1));
    });
  });

  document.addEventListener("click", (evento) => {
    const botaoEtapa = evento.target.closest("[data-stage-number]");

    if (botaoEtapa) {
      abrirEtapa(Number(botaoEtapa.dataset.stageNumber));
    }

    if (evento.target.matches("[data-close-modal]")) {
      fecharModais();
    }

    if (evento.target === elementos.modalBackdrop) {
      fecharModais();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      fecharModais();
    }
  });

  elementos.presenceForm.addEventListener("submit", confirmarPresenca);

  elementos.menuButton.addEventListener("click", alternarMenu);

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      elementos.siteHeader.classList.remove("menu-open");
      elementos.menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

function renderizarCalendario() {
  elementos.calendarGrid.innerHTML = etapas2027
    .map((etapa, index) => {
      const eFinal = etapa.tipo === "final";
      const destaque = index === 0 ? "stage-card-featured" : "";
      const classeFinal = eFinal ? "final-stage" : "";

      return `
        <article class="stage-card ${destaque} ${classeFinal}">
          <div class="stage-card-top">
            <span class="stage-number">
              ${String(etapa.numero).padStart(2, "0")}
            </span>

            <span class="stage-status">
              ${eFinal ? "Festiva" : "Etapa regular"}
            </span>
          </div>

          <h3>${etapa.titulo}</h3>

          <div class="stage-card-date">
            ${etapa.exibicao} · 20H
          </div>

          <div class="stage-card-footer">
            <span>
              ${eFinal ? "Celebração da temporada" : "Rua Prof. Sebastião Paraná, 765"}
            </span>

            <button
              class="stage-card-button"
              data-stage-number="${etapa.numero}"
              aria-label="Ver detalhes da ${etapa.titulo}"
            >
              ↗
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderizarRanking() {
  const ranking = obterRanking();

  elementos.rankingPreview.innerHTML = ranking
    .slice(0, 4)
    .map(criarLinhaRanking)
    .join("");

  elementos.rankingTableBody.innerHTML = ranking
    .map((jogador, index) => {
      return `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>
            <strong>${escaparHTML(jogador.nome)}</strong>
            <br />
            <small>${escaparHTML(jogador.apelido || "")}</small>
          </td>
          <td>${jogador.etapas}</td>
          <td>${jogador.ko}</td>
          <td>${jogador.pontos}</td>
        </tr>
      `;
    })
    .join("");
}

function criarLinhaRanking(jogador, index) {
  const iniciais = gerarIniciais(jogador.nome);

  return `
    <div class="ranking-row">
      <span class="ranking-position">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <div class="ranking-player">
        <span class="player-avatar">${iniciais}</span>

        <span>
          <strong>${escaparHTML(jogador.nome)}</strong>
          <small>${escaparHTML(jogador.apelido || "Temporada 2027")}</small>
        </span>
      </div>

      <span class="ranking-points">${jogador.pontos}</span>
    </div>
  `;
}

function obterRanking() {
  return [...jogadoresIniciais].sort((a, b) => b.pontos - a.pontos);
}

function preencherEtapasDoFormulario() {
  elementos.presenceStage.innerHTML = etapas2027
    .map(
      (etapa) => `
        <option value="${etapa.id}">
          ${etapa.titulo} — ${etapa.exibicao}
        </option>
      `,
    )
    .join("");
}

function atualizarProximaEtapa() {
  const agora = new Date();

  const proximaEtapa =
    etapas2027.find((etapa) => {
      return criarDataEtapa(etapa) >= agora;
    }) || etapas2027[etapas2027.length - 1];

  const data = criarDataEtapa(proximaEtapa);

  elementos.nextDay.textContent = String(data.getDate()).padStart(2, "0");
  elementos.nextMonth.textContent = proximaEtapa.mes;
  elementos.nextStageName.textContent = proximaEtapa.titulo;
}

function iniciarContagemRegressiva() {
  atualizarContagemRegressiva();
  setInterval(atualizarContagemRegressiva, 1000);
}

function atualizarContagemRegressiva() {
  const agora = new Date();

  const proximaEtapa =
    etapas2027.find((etapa) => criarDataEtapa(etapa) > agora) ||
    etapas2027[etapas2027.length - 1];

  const destino = criarDataEtapa(proximaEtapa);
  const diferenca = Math.max(0, destino.getTime() - agora.getTime());

  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor(
    (diferenca / (1000 * 60 * 60)) % 24,
  );
  const minutos = Math.floor((diferenca / (1000 * 60)) % 60);
  const segundos = Math.floor((diferenca / 1000) % 60);

  const valores = [dias, horas, minutos, segundos];

  elementos.countdown.innerHTML = valores
    .map(
      (valor, index) => `
        <div>
          <strong>${String(valor).padStart(2, "0")}</strong>
          <span>${["dias", "horas", "min", "seg"][index]}</span>
        </div>
      `,
    )
    .join("");
}

function criarDataEtapa(etapa) {
  const [ano, mes, dia] = etapa.data.split("-").map(Number);

  // Os torneios começam às 20h, horário de Brasília.
  return new Date(ano, mes - 1, dia, 20, 0, 0);
}

function abrirRanking() {
  abrirModal("rankingModal");
}

function abrirPresenca() {
  renderizarPresencas();
  abrirModal("presenceModal");
}

function abrirEtapa(numero) {
  const etapa = etapas2027.find((item) => item.numero === numero);

  if (!etapa) {
    return;
  }

  document.querySelector("#stageModalTitle").textContent = etapa.titulo;
  document.querySelector("#stageModalDate").textContent =
    `${etapa.exibicao} · 20h · Rua Prof. Sebastião Paraná, 765`;

  abrirModal("stageModal");
}

function abrirModal(id) {
  fecharModais();

  const modal = document.querySelector(`#${id}`);

  if (!modal) {
    return;
  }

  modal.hidden = false;
  elementos.modalBackdrop.hidden = false;
  document.body.classList.add("modal-open");

  const primeiroCampo = modal.querySelector("input, select, button");

  if (primeiroCampo) {
    setTimeout(() => primeiroCampo.focus(), 80);
  }
}

function fecharModais() {
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.hidden = true;
  });

  elementos.modalBackdrop.hidden = true;
  document.body.classList.remove("modal-open");
}

function confirmarPresenca(evento) {
  evento.preventDefault();

  const etapaId = document.querySelector("#presenceStage").value;
  const nome = document.querySelector("#presenceName").value.trim();
  const telefone = document.querySelector("#presencePhone").value.trim();

  if (!etapaId || !nome || !telefone) {
    return;
  }

  const presencasDaEtapa = estado.presencas[etapaId] || [];

  const jaCadastrado = presencasDaEtapa.some(
    (pessoa) => pessoa.nome.toLowerCase() === nome.toLowerCase(),
  );

  if (jaCadastrado) {
    alert("Este nome já está cadastrado nesta etapa.");
    return;
  }

  const confirmados = presencasDaEtapa.filter(
    (pessoa) => pessoa.status === "confirmado",
  ).length;

  const novaPresenca = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    nome,
    telefone,
    status: confirmados < 20 ? "confirmado" : "espera",
    criadoEm: new Date().toISOString(),
  };

  estado.presencas[etapaId] = [...presencasDaEtapa, novaPresenca];

  salvarPresencas();
  renderizarPresencas();

  evento.target.reset();

  alert(
    novaPresenca.status === "confirmado"
      ? "Presença confirmada com sucesso!"
      : "As 20 vagas já foram preenchidas. Você entrou na lista de espera.",
  );
}

function renderizarPresencas() {
  const etapaId = elementos.presenceStage.value || etapas2027[0].id;
  const lista = estado.presencas[etapaId] || [];

  const confirmados = lista.filter(
    (pessoa) => pessoa.status === "confirmado",
  );

  const espera = lista.filter((pessoa) => pessoa.status === "espera");

  elementos.confirmedCount.textContent = confirmados.length;
  elementos.waitingCount.textContent = espera.length;

  if (!lista.length) {
    elementos.presenceList.innerHTML = `
      <p class="empty-message">
        Nenhuma presença registrada para esta etapa.
      </p>
    `;

    return;
  }

  elementos.presenceList.innerHTML = lista
    .map(
      (pessoa, index) => `
        <div class="presence-person">
          <div>
            <strong>${index + 1}. ${escaparHTML(pessoa.nome)}</strong>
            <small>${mascararTelefone(pessoa.telefone)}</small>
          </div>

          <span class="presence-badge ${pessoa.status === "espera" ? "waiting" : ""}">
            ${pessoa.status === "espera" ? "Lista de espera" : "Confirmado"}
          </span>
        </div>
      `,
    )
    .join("");
}

function carregarPresencas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (erro) {
    console.warn("Não foi possível carregar as presenças.", erro);
    return {};
  }
}

function salvarPresencas() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado.presencas));
}

function alternarMenu() {
  const aberto = elementos.siteHeader.classList.toggle("menu-open");

  elementos.menuButton.setAttribute("aria-expanded", String(aberto));
}

function gerarIniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function mascararTelefone(telefone) {
  if (telefone.length < 6) {
    return telefone;
  }

  return `${telefone.slice(0, 5)}••••${telefone.slice(-2)}`;
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .then(() => {
          console.info("PWA ativado.");
        })
        .catch((erro) => {
          console.warn("Falha ao ativar o PWA.", erro);
        });
    });
  }
}
