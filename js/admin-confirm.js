/* ============================================================
   ADMIN — INSCRIÇÕES / CONFIRMAÇÃO DE PRESENÇA
   Gerenciamento no admin.html (modal).
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.PQ_DATA;
  if (!DATA) return;

  const SITE = DATA.site || {};
  const CONFIRMATION = DATA.confirmation || {};
  const SEASON = String(CONFIRMATION.season || SITE.season || "2027");
  const CAPACITY = Number(CONFIRMATION.capacity || SITE.capacity || 20);
  const STAGE_ID = Number(CONFIRMATION.stageId) || Number(SITE.nextStageId) || 1;
  const DB_URL = window.PQ_FIREBASE && window.PQ_FIREBASE.config
    ? window.PQ_FIREBASE.config.databaseURL
    : "";
  const params = new URLSearchParams(window.location.search);
  const TEST_MODE = params.get("confirm-test") === "1";
  const BASE_ROOT = TEST_MODE ? "confirmacaoTeste" : String(CONFIRMATION.dbRoot || "confirmacao");
  const STAGE_PATH = `${BASE_ROOT}/${SEASON}/etapas/${STAGE_ID}`;
  const CONFIG_PATH = `${BASE_ROOT}/${SEASON}/config`;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    confirmed: [],
    waitlist: [],
    capacity: CAPACITY,
    open: CONFIRMATION.open !== false,
    tab: "confirmed",
    loading: false,
    error: "",
  };

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function stage() {
    return DATA.stages.find((item) => Number(item.id) === STAGE_ID) || DATA.stages[0];
  }

  function formatDate(iso, options = {}) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
      ...options,
    }).format(date).replace(".", "").toUpperCase();
  }

  function formatStageDate(iso) {
    if (!iso) return "Data a confirmar";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Data a confirmar";
    const text = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function dbEndpoint(path) {
    if (!DB_URL) throw new Error("Firebase não configurado.");
    return `${DB_URL.replace(/\/$/, "")}/${path}.json`;
  }

  async function dbGet(path) {
    const response = await fetch(`${dbEndpoint(path)}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function dbPost(path, body) {
    const response = await fetch(dbEndpoint(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function dbPut(path, body) {
    const response = await fetch(dbEndpoint(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function dbDelete(path) {
    const response = await fetch(dbEndpoint(path), { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function toArray(data) {
    if (!data || typeof data !== "object") return [];
    return Object.entries(data)
      .filter(([, value]) => value && typeof value === "object")
      .map(([id, value]) => ({ ...value, id }))
      .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
  }

  function remaining() {
    return Math.max(0, state.capacity - state.confirmed.length);
  }

  function feedback(message, type = "info") {
    const element = $("[data-admin-confirm-feedback]");
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-error", type === "error");
  }

  function update() {
    const confirmed = state.confirmed.length;
    const waitlist = state.waitlist.length;
    $$("[data-admin-confirmed]").forEach((element) => { element.textContent = String(confirmed); });
    $$("[data-admin-remaining]").forEach((element) => { element.textContent = String(remaining()); });
    $$("[data-admin-waitlist]").forEach((element) => { element.textContent = String(waitlist); });
    $$("[data-admin-confirmed-tab]").forEach((element) => { element.textContent = String(confirmed); });
    $$("[data-admin-waitlist-tab]").forEach((element) => { element.textContent = String(waitlist); });

    const toggle = $("[data-admin-confirm-toggle]");
    if (toggle) {
      toggle.textContent = state.open ? "Fechar inscrições" : "Abrir inscrições";
      toggle.classList.toggle("btn--primary", !state.open);
    }

    const status = $("[data-admin-confirm-status]");
    if (status) {
      status.textContent = state.error
        ? "Indisponível"
        : state.open
          ? confirmed >= state.capacity ? "Mesa cheia · lista de espera" : "Inscrições abertas"
          : "Inscrições fechadas";
      status.classList.toggle("is-closed", !state.open || Boolean(state.error));
    }

    $$("[data-admin-confirm-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.adminConfirmTab === state.tab);
    });

    const list = $("[data-admin-confirm-list]");
    if (!list) return;
    if (state.error) {
      list.innerHTML = `<li class="confirm-empty">${escapeHTML(state.error)}</li>`;
      return;
    }

    const waitRows = state.waitlist.map((person) => ({ ...person, __wait: true }));
    const ordered = [
      ...waitRows.filter((person) => !person.isGuest),
      ...waitRows.filter((person) => person.isGuest),
    ];
    const rows = state.tab === "confirmed" ? state.confirmed : ordered;

    if (!rows.length) {
      list.innerHTML = `<li class="confirm-empty">${state.tab === "confirmed" ? "Nenhuma inscrição confirmada." : "Lista de espera vazia."}</li>`;
      return;
    }

    list.innerHTML = rows.map((person, index) => {
      const guest = Boolean(person.isGuest);
      const photo = person.foto || "";
      const avatar = photo
        ? `<span class="confirm-person__avatar"><img src="${escapeHTML(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='${escapeHTML(initials(person.nome))}'"></span>`
        : `<span class="confirm-person__avatar">${escapeHTML(initials(person.nome))}</span>`;
      const promote = person.__wait && state.confirmed.length < state.capacity
        ? `<button class="confirm-mini-btn confirm-mini-btn--promote" type="button" data-admin-promote="${escapeHTML(person.id)}" title="Promover para confirmado">↗</button>`
        : "";
      return `<li class="confirm-person">
        <span class="confirm-person__pos">${index + 1}º</span>
        ${avatar}
        <span class="confirm-person__copy">
          <span class="confirm-person__name">${escapeHTML(person.nome)}${guest && person.guestOf ? ` · convidado de ${escapeHTML(person.guestOf)}` : ""}</span>
          <span class="confirm-person__meta">${person.data ? formatDate(person.data, { hour: "2-digit", minute: "2-digit" }) : "Inscrito"}</span>
        </span>
        <span class="confirm-person__actions">
          <span class="confirm-chip ${guest ? "confirm-chip--guest" : person.__wait ? "confirm-chip--wait" : "confirm-chip--member"}">${guest ? "Convidado" : person.__wait ? "Espera" : "Membro"}</span>
          ${promote}
          <button class="confirm-mini-btn" type="button" data-admin-remove="${escapeHTML(person.id)}" data-admin-kind="${person.__wait ? "listaEspera" : "confirmados"}" title="Remover da lista">✕</button>
        </span>
      </li>`;
    }).join("");
  }

  async function load(showFeedback = false) {
    if (!DB_URL) {
      state.error = "Firebase não configurado.";
      update();
      return;
    }
    if (state.loading) return;
    state.loading = true;
    if (showFeedback) feedback("Atualizando...");
    try {
      const [configResult, confirmedResult, waitlistResult] = await Promise.allSettled([
        dbGet(CONFIG_PATH),
        dbGet(`${STAGE_PATH}/confirmados`),
        dbGet(`${STAGE_PATH}/listaEspera`),
      ]);
      if (confirmedResult.status === "rejected" || waitlistResult.status === "rejected") {
        throw confirmedResult.reason || waitlistResult.reason;
      }
      const config = configResult.status === "fulfilled" ? configResult.value : null;
      if (config && typeof config === "object") {
        state.open = config.aberta !== false;
        if (Number(config.capacidade) > 0) state.capacity = Number(config.capacidade);
      }
      state.confirmed = toArray(confirmedResult.value);
      state.waitlist = toArray(waitlistResult.value);
      state.error = "";
      if (showFeedback) feedback("");
    } catch (error) {
      state.error = "Não foi possível carregar as inscrições.";
      if (showFeedback) feedback(state.error, "error");
    } finally {
      state.loading = false;
      update();
    }
  }

  async function removeEntry(id, kind) {
    if (!id) return;
    if (!window.confirm("Remover esta inscrição da lista?")) return;
    try {
      feedback(`Removendo ${id}...`);
      await dbDelete(`${STAGE_PATH}/${kind}/${encodeURIComponent(id)}`);
      feedback("Inscrição removida.");
      await load();
    } catch (error) {
      feedback(`Não foi possível remover (${error.message}).`, "error");
    }
  }

  async function promoteEntry(id) {
    const person = state.waitlist.find((item) => item.id === id);
    if (!person) return;
    if (state.confirmed.length >= state.capacity) {
      feedback("Não há vagas para promover.", "error");
      return;
    }
    if (!window.confirm(`Promover ${person.nome} para os confirmados?`)) return;
    try {
      await dbPost(`${STAGE_PATH}/confirmados`, {
        ...person,
        id: undefined,
        timestamp: Date.now(),
        data: new Date().toISOString(),
        temporada: SEASON,
        etapa: STAGE_ID,
      });
      await dbDelete(`${STAGE_PATH}/listaEspera/${encodeURIComponent(id)}`);
      feedback(`${person.nome} promovido para confirmado.`);
      await load();
    } catch (error) {
      feedback(`Não foi possível promover (${error.message}).`, "error");
    }
  }

  async function toggleOpen() {
    state.open = !state.open;
    try {
      await dbPut(CONFIG_PATH, {
        temporada: SEASON,
        etapa: STAGE_ID,
        aberta: state.open,
        capacidade: state.capacity,
        atualizadoEm: new Date().toISOString(),
      });
      feedback(state.open ? "Inscrições abertas." : "Inscrições fechadas.");
      update();
    } catch (error) {
      state.open = !state.open;
      feedback("Não foi possível alterar o status.", "error");
    }
  }

  function exportCSV() {
    const rows = [
      ["nome", "tipo", "convidado_de", "etapa", "data"],
      ...state.confirmed.map((person) => [person.nome, person.isGuest ? "convidado" : "membro", person.guestOf || "", STAGE_ID, person.data || ""]),
      ...state.waitlist.map((person) => [person.nome, person.isGuest ? "convidado" : "membro", person.guestOf || "", STAGE_ID, person.data || ""]),
    ];
    const csv = "\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscricoes-etapa-${pad(STAGE_ID)}-${SEASON}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function markup() {
    const event = stage();
    return `<div class="admin-confirm" data-admin-confirm-root>
      <header class="admin-confirm__head">
        <div>
          <p class="eyebrow"><span class="eyebrow__line" aria-hidden="true"></span>Inscrições · Temporada ${escapeHTML(SEASON)}</p>
          <h2 id="admin-confirm-title">Etapa ${pad(STAGE_ID)} — ${escapeHTML(event ? event.name : "Próxima etapa")}</h2>
          <p>${escapeHTML(event ? formatStageDate(event.date) : "Data a confirmar")}</p>
        </div>
        <span class="confirm-badge" data-admin-confirm-status>Carregando...</span>
      </header>

      <div class="confirm-stats admin-confirm__stats">
        <div class="confirm-stat"><strong data-admin-confirmed>—</strong><span>confirmados</span></div>
        <div class="confirm-stat"><strong data-admin-remaining>—</strong><span>vagas restantes</span></div>
        <div class="confirm-stat"><strong data-admin-waitlist>—</strong><span>lista de espera</span></div>
      </div>

      <div class="admin-confirm__toolbar">
        <button class="btn btn--ghost btn--sm" type="button" data-admin-confirm-toggle>Abrir/Fechar inscrições</button>
        <button class="btn btn--ghost btn--sm" type="button" data-admin-confirm-refresh>Atualizar</button>
        <button class="btn btn--ghost btn--sm" type="button" data-admin-confirm-export>Exportar CSV</button>
      </div>

      <div class="confirm-tabs" role="group" aria-label="Lista de inscrições">
        <button type="button" class="is-active" data-admin-confirm-tab="confirmed">Confirmados <span data-admin-confirmed-tab>0</span></button>
        <button type="button" data-admin-confirm-tab="waitlist">Espera <span data-admin-waitlist-tab>0</span></button>
      </div>

      <ul class="confirm-list admin-confirm__list" data-admin-confirm-list></ul>
      <p class="confirm-feedback" data-admin-confirm-feedback role="status"></p>
    </div>`;
  }

  function openModal() {
    let modal = $("#admin-confirm-modal");
    if (!modal) return;
    const root = $("#admin-confirm-root", modal);
    if (!root.innerHTML) root.innerHTML = markup();
    modal.hidden = false;
    document.body.classList.add("admin-confirm-open");
    load();
    setTimeout(() => $("[data-admin-confirm-close]", modal)?.focus(), 60);
  }

  function closeModal() {
    const modal = $("#admin-confirm-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("admin-confirm-open");
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("#admin-confirm-open")) {
      openModal();
      return;
    }
    if (event.target.closest("[data-admin-confirm-close]")) {
      closeModal();
      return;
    }
    if (event.target.closest("[data-admin-confirm-refresh]")) {
      load(true);
      return;
    }
    if (event.target.closest("[data-admin-confirm-toggle]")) {
      toggleOpen();
      return;
    }
    if (event.target.closest("[data-admin-confirm-export]")) {
      exportCSV();
      return;
    }

    const tab = event.target.closest("[data-admin-confirm-tab]");
    if (tab) {
      state.tab = tab.dataset.adminConfirmTab === "waitlist" ? "waitlist" : "confirmed";
      update();
      return;
    }

    const remove = event.target.closest("[data-admin-remove]");
    if (remove) {
      removeEntry(remove.dataset.adminRemove, remove.dataset.adminKind);
      return;
    }

    const promote = event.target.closest("[data-admin-promote]");
    if (promote) {
      promoteEntry(promote.dataset.adminPromote);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  /* Atualiza enquanto o modal estiver aberto. */
  setInterval(() => {
    const modal = $("#admin-confirm-modal");
    if (modal && !modal.hidden && !state.loading) load();
  }, 15000);
})();

