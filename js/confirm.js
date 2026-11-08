/* ============================================================
   CONFIRMAÇÃO DE INSCRIÇÃO — POKER DE QUINTA
   Modal + página integrada, com dados no Firebase Realtime DB.
   ------------------------------------------------------------
   Caminho usado:
   confirmacao/{temporada}/config
   confirmacao/{temporada}/etapas/{etapa}/confirmados
   confirmacao/{temporada}/etapas/{etapa}/listaEspera
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.PQ_DATA;
  if (!DATA) return;

  const SITE = DATA.site || {};
  const CONFIRMATION = DATA.confirmation || {};
  const SEASON = String(CONFIRMATION.season || SITE.season || "2027");
  const CAPACITY = Number(CONFIRMATION.capacity || SITE.capacity || 20);
  const DB_URL = window.PQ_FIREBASE && window.PQ_FIREBASE.config
    ? window.PQ_FIREBASE.config.databaseURL
    : "";
  const ADMIN_KEY = "pq-confirm-admin-v1";
  const ADMIN_PASSWORD = "poker2027";
  const params = new URLSearchParams(window.location.search);
  const TEST_MODE = params.get("confirm-test") === "1";
  const BASE_ROOT = TEST_MODE ? "confirmacaoTeste" : String(CONFIRMATION.dbRoot || "confirmacao");

  const state = {
    stageId: Number(CONFIRMATION.stageId) || Number(SITE.nextStageId) || 1,
    capacity: CAPACITY,
    open: CONFIRMATION.open !== false,
    confirmed: [],
    waitlist: [],
    tab: "confirmed",
    admin: false,
    busy: false,
    loading: false,
    error: "",
    selected: "",
    lastFocus: null,
    modalReady: false,
  };

  try {
    state.admin = sessionStorage.getItem(ADMIN_KEY) === "1";
  } catch (error) {
    state.admin = false;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
    return DATA.stages.find((item) => Number(item.id) === Number(state.stageId)) || DATA.stages[0];
  }

  function stagePath() {
    return `${BASE_ROOT}/${SEASON}/etapas/${state.stageId}`;
  }

  function configPath() {
    return `${BASE_ROOT}/${SEASON}/config`;
  }

  function formatDate(iso, options = {}) {
    if (!iso) return "Data a confirmar";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Data a confirmar";
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

  function mondayOpening(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(7, 0, 0, 0);
    return `${formatDate(date)} · 07h`;
  }

  function playerPhoto(name) {
    const player = DATA.players.find((item) => item.name === name);
    return player && player.photo ? player.photo : "";
  }

  function playerOptions() {
    return DATA.players
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map((player) => `<option value="${escapeHTML(player.name)}">${escapeHTML(player.name)}</option>`)
      .join("");
  }

  function toArray(data) {
    if (!data || typeof data !== "object") return [];
    return Object.entries(data)
      .filter(([, value]) => value && typeof value === "object")
      .map(([id, value]) => ({ ...value, id }))
      .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0));
  }

  function dbEndpoint(path) {
    if (!DB_URL) throw new Error("Firebase não configurado.");
    return `${DB_URL.replace(/\/$/, "")}/${path}.json`;
  }

  async function dbGet(path) {
    const response = await fetch(`${dbEndpoint(path)}?ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) throw new Error(`Firebase ${path}: HTTP ${response.status}`);
    return response.json();
  }

  async function dbPost(path, body) {
    const response = await fetch(dbEndpoint(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Firebase ${path}: HTTP ${response.status}`);
    return response.json();
  }

  async function dbPut(path, body) {
    const response = await fetch(dbEndpoint(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Firebase ${path}: HTTP ${response.status}`);
    return response.json();
  }

  async function dbDelete(path) {
    const response = await fetch(dbEndpoint(path), { method: "DELETE" });
    if (!response.ok) throw new Error(`Firebase ${path}: HTTP ${response.status}`);
    return response.json();
  }

  function openStatus() {
    return state.open && !state.error;
  }

  function remaining() {
    return Math.max(0, state.capacity - state.confirmed.length);
  }

  function selectedEntry() {
    if (!state.selected) return null;
    return state.confirmed.find((person) => person.nome === state.selected && !person.isGuest)
      || state.waitlist.find((person) => person.nome === state.selected && !person.isGuest)
      || null;
  }

  function isRegistered(name) {
    return state.confirmed.some((person) => !person.isGuest && person.nome === name)
      || state.waitlist.some((person) => !person.isGuest && person.nome === name);
  }

  function feedback(message, type = "info") {
    $$("[data-confirm-feedback]").forEach((element) => {
      element.textContent = message || "";
      element.classList.toggle("is-error", type === "error");
    });
  }

  function submitLabel() {
    if (!openStatus()) return "Inscrições fechadas";
    return state.confirmed.length >= state.capacity ? "Entrar na lista de espera" : "Confirmar Inscrição";
  }

  function setBusy(busy) {
    state.busy = busy;
    $$("[data-confirm-submit]").forEach((button) => {
      button.disabled = busy || !openStatus();
      button.textContent = busy ? "Enviando..." : submitLabel();
    });
  }

  /* ============================================================
     MARKUP
     ============================================================ */
  function personMarkup(person, index, mode) {
    const guest = Boolean(person.isGuest);
    const photo = person.foto || playerPhoto(person.nome);
    const avatar = photo
      ? `<span class="confirm-person__avatar"><img src="${escapeHTML(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='${escapeHTML(initials(person.nome))}'"></span>`
      : `<span class="confirm-person__avatar">${escapeHTML(initials(person.nome))}</span>`;
    const guestInfo = guest && person.guestOf ? ` · convidado de ${escapeHTML(person.guestOf)}` : "";
    const actions = [];

    if (state.admin && mode === "page") {
      if (person.__wait && state.confirmed.length < state.capacity) {
        actions.push(`<button class="confirm-mini-btn confirm-mini-btn--promote" type="button" data-confirm-promote="${escapeHTML(person.id)}" title="Promover para confirmado">↗</button>`);
      }
      actions.push(`<button class="confirm-mini-btn" type="button" data-confirm-remove="${escapeHTML(person.id)}" data-confirm-kind="${person.__wait ? "waitlist" : "confirmed"}" title="Remover">✕</button>`);
    }

    return `<li class="confirm-person">
      <span class="confirm-person__pos">${index + 1}º</span>
      ${avatar}
      <span class="confirm-person__copy">
        <span class="confirm-person__name">${escapeHTML(person.nome)}${guestInfo}</span>
        <span class="confirm-person__meta">${person.data ? formatDate(person.data, { hour: "2-digit", minute: "2-digit" }) : "Confirmado"}</span>
      </span>
      <span class="confirm-person__actions">
        <span class="confirm-chip ${guest ? "confirm-chip--guest" : person.__wait ? "confirm-chip--wait" : "confirm-chip--member"}">${guest ? "Convidado" : person.__wait ? "Espera" : "Membro"}</span>
        ${actions.join("")}
      </span>
    </li>`;
  }

  function listMarkup(root) {
    if (state.error) return `<li class="confirm-empty">${escapeHTML(state.error)}</li>`;
    const mode = root.dataset.mode || "page";
    const waitlist = state.waitlist.map((person) => ({ ...person, __wait: true }));
    const members = waitlist.filter((person) => !person.isGuest);
    const guests = waitlist.filter((person) => person.isGuest);
    const orderedWaitlist = [...members, ...guests];
    const rows = state.tab === "confirmed" ? state.confirmed : orderedWaitlist;

    if (!rows.length) {
      return `<li class="confirm-empty">${state.tab === "confirmed" ? "Nenhuma inscrição confirmada ainda." : "Lista de espera vazia."}</li>`;
    }

    const limit = mode === "modal" ? 8 : rows.length;
    return rows.slice(0, limit).map((person, index) => personMarkup(person, index, mode)).join("");
  }

  function adminMarkup() {
    if (state.admin) {
      return `<div class="confirm-admin-head">
        <strong>Organizador</strong>
        <div class="admin-actions" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn--ghost btn--sm" type="button" data-confirm-toggle-open>${state.open ? "Fechar inscrições" : "Abrir inscrições"}</button>
          <button class="btn btn--ghost btn--sm" type="button" data-confirm-export>Exportar CSV</button>
          <button class="btn btn--ghost btn--sm" type="button" data-confirm-admin-logout>Sair</button>
        </div>
      </div>
      <p class="confirm-admin-msg" data-confirm-admin-msg>Modo organizador ativo. Remova ou promova jogadores pela lista.</p>`;
    }
    return `<div class="confirm-admin-head">
      <strong>Organizador</strong>
      <button class="btn btn--ghost btn--sm" type="button" data-confirm-admin-toggle>Entrar</button>
    </div>
    <form class="confirm-admin-form" data-confirm-admin-form hidden>
      <input type="password" data-confirm-admin-pass autocomplete="current-password" placeholder="Senha do organizador" aria-label="Senha do organizador">
      <button class="btn btn--primary btn--sm" type="submit">Acessar</button>
      <span class="confirm-admin-msg" data-confirm-admin-msg></span>
    </form>`;
  }

  function markup(mode) {
    const event = stage();
    return `<div class="confirm-app" data-confirm-root data-mode="${mode}">
      <div class="confirm-main">
        <section class="confirm-stage-card" aria-label="Etapa das inscrições">
          <p class="eyebrow"><span class="eyebrow__line" aria-hidden="true"></span>Inscrições · Temporada ${escapeHTML(SEASON)}</p>
          <div class="confirm-stage-head">
            <span class="confirm-stage-num" data-confirm-stage-number>${pad(state.stageId)}</span>
            <div>
              <h2 data-confirm-stage-name>${escapeHTML(event ? event.name : "Próxima etapa")}</h2>
              <p data-confirm-stage-date>${escapeHTML(event ? formatStageDate(event.date) : "Data a confirmar")}</p>
            </div>
          </div>
          <div class="confirm-stats">
            <div class="confirm-stat"><strong data-confirm-confirmed>—</strong><span>confirmados</span></div>
            <div class="confirm-stat"><strong data-confirm-remaining>—</strong><span>vagas restantes</span></div>
            <div class="confirm-stat"><strong data-confirm-waitlist>—</strong><span>lista de espera</span></div>
          </div>
          <div class="confirm-meta">
            <span class="confirm-badge" data-confirm-status>Verificando...</span>
            <span class="confirm-opening" data-confirm-opening>Abertura oficial: ${escapeHTML(event ? mondayOpening(event.date) : "a definir")}</span>
          </div>
        </section>

        <section class="confirm-form-card" aria-labelledby="confirm-form-title-${mode}">
          <h3 id="confirm-form-title-${mode}">Confirmar Inscrição</h3>
          <p class="confirm-form-deck">Escolha seu nome na lista da casa. A vaga é confirmada na hora; se a mesa estiver cheia, você entra na lista de espera.</p>
          <form class="confirm-form" data-confirm-form>
            <label class="confirm-field" data-confirm-member-field>
              <span>Seu nome</span>
              <select data-confirm-player>
                <option value="">Selecione seu nome...</option>
                ${playerOptions()}
              </select>
            </label>

            <label class="confirm-check">
              <input type="checkbox" data-confirm-guest>
              Sou convidado de um membro
            </label>

            <div class="confirm-guest" data-confirm-guest-fields hidden>
              <label class="confirm-field">
                <span>Membro que convidou</span>
                <select data-confirm-host>
                  <option value="">Selecione o membro...</option>
                  ${playerOptions()}
                </select>
              </label>
              <label class="confirm-field">
                <span>Nome do convidado</span>
                <input type="text" data-confirm-guest-name placeholder="Nome completo" autocomplete="off">
              </label>
            </div>

            <button class="btn btn--primary btn--block" type="submit" data-confirm-submit>Confirmar Inscrição</button>
            <p class="confirm-feedback" data-confirm-feedback role="status"></p>
            <p class="confirm-note">Ao confirmar, você ocupa uma vaga. Se não puder ir, cancele com antecedência para liberar a cadeira.</p>
          </form>

          <div class="confirm-existing" data-confirm-existing hidden>
            <p><strong data-confirm-existing-name></strong>, você já está <span data-confirm-existing-status>inscrito</span> nesta etapa.</p>
            <button class="btn btn--ghost btn--sm" type="button" data-confirm-cancel>Cancelar minha inscrição</button>
          </div>
        </section>
      </div>

      <aside class="confirm-side" aria-labelledby="confirm-list-title">
        <div class="confirm-side-head">
          <div>
            <p class="eyebrow">Lista ao vivo</p>
            <h3 id="confirm-list-title">Quem já confirmou</h3>
          </div>
          <button class="confirm-refresh" type="button" data-confirm-refresh>↻ Atualizar</button>
        </div>
        <div class="confirm-tabs" role="group" aria-label="Lista de inscrições">
          <button type="button" class="is-active" data-confirm-tab="confirmed">Confirmados <span data-confirm-confirmed-tab>0</span></button>
          <button type="button" data-confirm-tab="waitlist">Espera <span data-confirm-waitlist-tab>0</span></button>
        </div>
        <ul class="confirm-list" data-confirm-list></ul>
        <p class="confirm-list-note" data-confirm-list-note></p>
        <a class="text-link" href="#confirmar" data-route-link="confirmar" data-confirm-full-link>Ver página completa</a>
        <p class="confirm-error" data-confirm-error ${state.error ? "" : "hidden"}></p>
      </aside>

      ${mode === "page" ? `<section class="confirm-admin" data-confirm-admin aria-label="Área do organizador">${adminMarkup()}</section>` : ""}
    </div>`;
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function updateRoot(root) {
    if (!root) return;
    const mode = root.dataset.mode || "page";
    const event = stage();
    const confirmedCount = state.confirmed.length;
    const waitCount = state.waitlist.length;

    $$("[data-confirm-confirmed]", root).forEach((element) => { element.textContent = String(confirmedCount); });
    $$("[data-confirm-remaining]", root).forEach((element) => { element.textContent = String(remaining()); });
    $$("[data-confirm-waitlist]", root).forEach((element) => { element.textContent = String(waitCount); });
    $$("[data-confirm-confirmed-tab]", root).forEach((element) => { element.textContent = String(confirmedCount); });
    $$("[data-confirm-waitlist-tab]", root).forEach((element) => { element.textContent = String(waitCount); });
    $$("[data-confirm-stage-number]", root).forEach((element) => { element.textContent = pad(state.stageId); });
    $$("[data-confirm-stage-name]", root).forEach((element) => { element.textContent = event ? event.name : "Próxima etapa"; });
    $$("[data-confirm-stage-date]", root).forEach((element) => { element.textContent = event ? formatStageDate(event.date) : "Data a confirmar"; });
    $$("[data-confirm-opening]", root).forEach((element) => {
      element.textContent = openStatus()
        ? event ? `Etapa em ${formatDate(event.date)}` : "Etapa a confirmar"
        : `Abertura: ${event ? mondayOpening(event.date) : "a definir"}`;
    });

    const playerSelect = $("[data-confirm-player]", root);
    if (playerSelect && state.selected && playerSelect.value !== state.selected) {
      playerSelect.value = state.selected;
    }

    const status = $("[data-confirm-status]", root);
    if (status) {
      const full = state.confirmed.length >= state.capacity;
      status.textContent = state.error
        ? "Indisponível"
        : openStatus()
          ? full ? "Mesa cheia · lista de espera" : "Inscrições abertas"
          : "Inscrições fechadas";
      status.classList.toggle("is-closed", !openStatus());
    }

    $$("[data-confirm-submit]", root).forEach((button) => {
      button.disabled = state.busy || !openStatus();
      button.textContent = state.busy ? "Enviando..." : submitLabel();
    });

    $$("[data-confirm-tab]", root).forEach((button) => {
      button.classList.toggle("is-active", button.dataset.confirmTab === state.tab);
    });

    const list = $("[data-confirm-list]", root);
    if (list) list.innerHTML = listMarkup(root);
    const note = $("[data-confirm-list-note]", root);
    if (note) {
      const total = state.tab === "confirmed" ? confirmedCount : waitCount;
      const shown = mode === "modal" ? Math.min(8, total) : total;
      note.textContent = total > shown
        ? `Mostrando ${shown} de ${total}. Abra a página completa para ver todos.`
        : total ? "" : "A lista é atualizada em tempo real.";
    }

    const error = $("[data-confirm-error]", root);
    if (error) {
      error.hidden = !state.error;
      error.textContent = state.error || "";
    }

    const existing = $("[data-confirm-existing]", root);
    if (existing) {
      const entry = selectedEntry();
      existing.hidden = !entry;
      if (entry) {
        const name = $("[data-confirm-existing-name]", root);
        const statusText = $("[data-confirm-existing-status]", root);
        if (name) name.textContent = entry.nome;
        if (statusText) statusText.textContent = state.confirmed.some((person) => person.id === entry.id) ? "confirmado" : "na lista de espera";
      }
    }

    const admin = $("[data-confirm-admin]", root);
    if (admin) {
      const adminMode = state.admin ? "admin" : "guest";
      if (admin.dataset.adminMode !== adminMode) {
        admin.innerHTML = adminMarkup();
        admin.dataset.adminMode = adminMode;
      }
      const toggle = $("[data-confirm-toggle-open]", admin);
      if (toggle) toggle.textContent = state.open ? "Fechar inscrições" : "Abrir inscrições";
    }
  }

  function updateAll() {
    $$("[data-confirm-root]").forEach(updateRoot);
    updateHome();
    updateLivePill();
  }

  function updateHome() {
    const confirmed = state.error ? "—" : String(state.confirmed.length);
    const spots = state.error ? "—" : String(remaining());
    $$("[data-confirm-home-confirmed]").forEach((element) => { element.textContent = confirmed; });
    $$("[data-confirm-home-remaining]").forEach((element) => { element.textContent = spots; });
    $$("[data-confirm-home-note]").forEach((element) => {
      element.textContent = state.error
        ? "Inscrições indisponíveis no momento."
        : `${state.confirmed.length} ${state.confirmed.length === 1 ? "confirmado" : "confirmados"} · ${remaining()} ${remaining() === 1 ? "vaga restante" : "vagas restantes"}`;
    });
  }

  function updateLivePill() {
    const pill = $("#confirm-live-pill");
    if (!pill) return;
    pill.textContent = state.error ? "Firebase · indisponível" : "Firebase · ao vivo";
  }

  /* ============================================================
     DADOS
     ============================================================ */
  async function refresh(showFeedback = false) {
    if (state.loading) return;
    state.loading = true;
    if (showFeedback) feedback("Atualizando lista...");
    try {
      const [configResult, confirmedResult, waitlistResult] = await Promise.allSettled([
        dbGet(configPath()),
        dbGet(`${stagePath()}/confirmados`),
        dbGet(`${stagePath()}/listaEspera`),
      ]);
      if (confirmedResult.status === "rejected" || waitlistResult.status === "rejected") {
        throw confirmedResult.reason || waitlistResult.reason;
      }
      const config = configResult.status === "fulfilled" ? configResult.value : null;
      if (config && typeof config === "object") {
        state.open = config.aberta !== false;
        if (Number(config.capacidade) > 0) state.capacity = Number(config.capacidade);
      } else {
        state.open = CONFIRMATION.open !== false;
      }
      state.confirmed = toArray(confirmedResult.value);
      state.waitlist = toArray(waitlistResult.value);
      state.error = "";
      if (showFeedback) feedback("");
    } catch (error) {
      state.error = "Não foi possível carregar as inscrições. Verifique a conexão e tente novamente.";
      if (showFeedback) feedback(state.error, "error");
      setTimeout(() => {
        if (state.error) refresh();
      }, 5000);
    } finally {
      state.loading = false;
      updateAll();
      setBusy(false);
    }
  }

  async function saveConfig() {
    await dbPut(configPath(), {
      temporada: SEASON,
      etapa: state.stageId,
      aberta: state.open,
      capacidade: state.capacity,
      atualizadoEm: new Date().toISOString(),
    });
  }

  /* ============================================================
     AÇÕES
     ============================================================ */
  async function confirmRegistration(form) {
    if (state.busy) return;
    const root = form.closest("[data-confirm-root]");
    if (!root) return;
    const guest = $("[data-confirm-guest]", root)?.checked;
    const player = $("[data-confirm-player]", root)?.value || "";
    const host = $("[data-confirm-host]", root)?.value || "";
    const guestName = $("[data-confirm-guest-name]", root)?.value.trim() || "";

    if (state.error) {
      feedback(state.error, "error");
      return;
    }
    if (!openStatus()) {
      feedback("As inscrições estão fechadas.", "error");
      return;
    }
    if (guest) {
      if (!host) { feedback("Selecione o membro que convidou.", "error"); return; }
      if (!guestName) { feedback("Digite o nome do convidado.", "error"); return; }
    } else if (!player) {
      feedback("Selecione seu nome.", "error");
      return;
    }
    if (!guest && isRegistered(player)) {
      feedback("Você já está inscrito nesta etapa.", "error");
      state.selected = player;
      updateAll();
      return;
    }

    state.busy = true;
    setBusy(true);
    try {
      const latest = await dbGet(`${stagePath()}/confirmados`);
      const latestCount = latest && typeof latest === "object" ? Object.keys(latest).length : 0;
      const body = {
        nome: guest ? guestName : player,
        isGuest: Boolean(guest),
        guestOf: guest ? host : "",
        foto: guest ? "" : playerPhoto(player),
        data: new Date().toISOString(),
        timestamp: Date.now(),
        temporada: SEASON,
        etapa: state.stageId,
      };

      if (!guest && latestCount < state.capacity) {
        await dbPost(`${stagePath()}/confirmados`, body);
        feedback("Inscrição confirmada! Você está na lista principal.");
      } else {
        await dbPost(`${stagePath()}/listaEspera`, body);
        feedback(guest
          ? "Convidado adicionado à lista de espera."
          : "A mesa está cheia. Você entrou na lista de espera.");
      }
      state.selected = guest ? "" : player;
      if (guestName) {
        const guestInput = $("[data-confirm-guest-name]", root);
        if (guestInput) guestInput.value = "";
      }
      await refresh();
    } catch (error) {
      feedback("Não foi possível confirmar agora. Tente novamente.", "error");
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  async function cancelRegistration() {
    const entry = selectedEntry();
    if (!entry) return;
    if (!window.confirm(`Cancelar a inscrição de ${entry.nome} nesta etapa?`)) return;
    state.busy = true;
    try {
      const kind = state.confirmed.some((person) => person.id === entry.id) ? "confirmados" : "listaEspera";
      await dbDelete(`${stagePath()}/${kind}/${entry.id}`);
      state.selected = "";
      feedback("Inscrição cancelada. A vaga foi liberada.");
      await refresh();
    } catch (error) {
      feedback("Não foi possível cancelar. Tente novamente.", "error");
    } finally {
      state.busy = false;
      setBusy(false);
    }
  }

  async function removeEntry(id, kind) {
    if (!state.admin || !id) return;
    if (!window.confirm("Remover esta inscrição?")) return;
    try {
      await dbDelete(`${stagePath()}/${kind}/${id}`);
      await refresh();
    } catch (error) {
      feedback("Não foi possível remover.", "error");
    }
  }

  async function promoteEntry(id) {
    if (!state.admin || !id) return;
    const person = state.waitlist.find((item) => item.id === id);
    if (!person) return;
    if (state.confirmed.length >= state.capacity) {
      feedback("Não há vagas para promover esta pessoa.", "error");
      return;
    }
    if (!window.confirm(`Promover ${person.nome} para os confirmados?`)) return;
    try {
      await dbPost(`${stagePath()}/confirmados`, {
        ...person,
        id: undefined,
        timestamp: Date.now(),
        data: new Date().toISOString(),
        temporada: SEASON,
        etapa: state.stageId,
      });
      await dbDelete(`${stagePath()}/listaEspera/${id}`);
      await refresh();
    } catch (error) {
      feedback("Não foi possível promover.", "error");
    }
  }

  async function toggleOpen() {
    if (!state.admin) return;
    state.open = !state.open;
    try {
      await saveConfig();
      updateAll();
    } catch (error) {
      state.open = !state.open;
      feedback("Não foi possível alterar o status das inscrições.", "error");
    }
  }

  function exportCSV() {
    if (!state.admin) return;
    const rows = [
      ["nome", "tipo", "convidado_de", "etapa", "data"],
      ...state.confirmed.map((person) => [person.nome, person.isGuest ? "convidado" : "membro", person.guestOf || "", state.stageId, person.data || ""]),
      ...state.waitlist.map((person) => [person.nome, person.isGuest ? "convidado" : "membro", person.guestOf || "", state.stageId, person.data || ""]),
    ];
    const csv = "\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscricoes-etapa-${pad(state.stageId)}-${SEASON}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function adminLogin(form) {
    const input = $("[data-confirm-admin-pass]", form);
    const message = $("[data-confirm-admin-msg]", form);
    if (!input) return;
    if (input.value.trim() !== ADMIN_PASSWORD) {
      if (message) message.textContent = "Senha incorreta.";
      input.select();
      return;
    }
    try { sessionStorage.setItem(ADMIN_KEY, "1"); } catch (error) { /* ignora */ }
    state.admin = true;
    updateAll();
  }

  function adminLogout() {
    try { sessionStorage.removeItem(ADMIN_KEY); } catch (error) { /* ignora */ }
    state.admin = false;
    updateAll();
  }

  /* ============================================================
     MODAL
     ============================================================ */
  function closeAppModal() {
    const modal = $("#app-modal.is-open");
    if (!modal) return;
    const close = $("[data-close-modal]", modal);
    if (close) close.click();
    else {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modal.inert = true;
      document.body.classList.remove("is-locked");
    }
  }

  function ensureModal() {
    let modal = $("#confirm-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "confirm-modal";
    modal.hidden = true;
    modal.innerHTML = `<div class="confirm-modal__backdrop" data-confirm-close></div>
      <div class="confirm-modal__dialog" role="dialog" aria-modal="true" aria-label="Confirmar Inscrição">
        <button class="confirm-modal__close" type="button" data-confirm-close aria-label="Fechar">×</button>
        <div id="confirm-modal-body"></div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function openModal() {
    closeAppModal();
    const modal = ensureModal();
    const body = $("#confirm-modal-body", modal);
    if (!body.innerHTML) body.innerHTML = markup("modal");
    state.lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("confirm-modal-open");
    updateAll();
    setTimeout(() => {
      const first = $("[data-confirm-player]", body) || $(".confirm-modal__close", modal);
      if (first) first.focus();
    }, 60);
    refresh();
  }

  function closeModal() {
    const modal = $("#confirm-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("confirm-modal-open");
    if (state.lastFocus) {
      try { state.lastFocus.focus({ preventScroll: true }); } catch (error) { /* noop */ }
    }
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-confirm-open]");
    if (open) {
      event.preventDefault();
      openModal();
      return;
    }

    if (event.target.closest("[data-confirm-close]")) {
      closeModal();
      return;
    }

    const full = event.target.closest("[data-confirm-full-link]");
    if (full) {
      closeModal();
      return;
    }

    const tab = event.target.closest("[data-confirm-tab]");
    if (tab) {
      state.tab = tab.dataset.confirmTab === "waitlist" ? "waitlist" : "confirmed";
      updateAll();
      return;
    }

    if (event.target.closest("[data-confirm-refresh]")) {
      refresh(true);
      return;
    }

    if (event.target.closest("[data-confirm-cancel]")) {
      cancelRegistration();
      return;
    }

    const remove = event.target.closest("[data-confirm-remove]");
    if (remove) {
      removeEntry(remove.dataset.confirmRemove, remove.dataset.confirmKind);
      return;
    }

    const promote = event.target.closest("[data-confirm-promote]");
    if (promote) {
      promoteEntry(promote.dataset.confirmPromote);
      return;
    }

    if (event.target.closest("[data-confirm-admin-toggle]")) {
      const form = $("[data-confirm-admin-form]");
      if (form) form.hidden = false;
      $("[data-confirm-admin-pass]")?.focus();
      return;
    }

    if (event.target.closest("[data-confirm-admin-logout]")) {
      adminLogout();
      return;
    }

    if (event.target.closest("[data-confirm-toggle-open]")) {
      toggleOpen();
      return;
    }

    if (event.target.closest("[data-confirm-export]")) {
      exportCSV();
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.matches("[data-confirm-form]")) {
      event.preventDefault();
      confirmRegistration(form);
      return;
    }
    if (form.matches("[data-confirm-admin-form]")) {
      event.preventDefault();
      adminLogin(form);
    }
  });

  document.addEventListener("change", (event) => {
    const player = event.target.closest("[data-confirm-player]");
    if (player) {
      state.selected = player.value;
      updateAll();
      return;
    }
    const guest = event.target.closest("[data-confirm-guest]");
    if (guest) {
      const root = guest.closest("[data-confirm-root]");
      const fields = $("[data-confirm-guest-fields]", root);
      const memberField = $("[data-confirm-member-field]", root);
      if (fields) fields.hidden = !guest.checked;
      if (memberField) memberField.hidden = guest.checked;
      return;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });

  /* ============================================================
     BOOT
     ============================================================ */
  function init() {
    const pageRoot = $("#confirm-page-root");
    if (pageRoot) pageRoot.innerHTML = markup("page");
    updateAll();
    refresh();
    setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

