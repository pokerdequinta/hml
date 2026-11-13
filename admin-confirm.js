(function () {
  "use strict";

  const DEFAULTS = ["Pizza", "Churrasco", "Hambúrguer"];
  const base = window.PQ_FIREBASE?.config?.databaseURL?.replace(/\/$/, "") || "";
  const season = String(window.PQ_DATA?.site?.season || "2027");
  const stage = Number(window.PQ_DATA?.site?.nextStageId) || 1;
  const optionsPath = `votacaoConfig/${season}/opcoesJanta`;
  const endpoint = (path) => base ? `${base}/${path.replace(/^\/+|\/+$/g, "")}.json` : "";
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  const modal = $("#admin-confirm-modal");
  const root = $("#admin-confirm-root");

  let options = DEFAULTS.slice();
  let originalOptions = DEFAULTS.slice();
  let optionsLoaded = false;
  let optionsDirty = false;
  let state = { confirmed: [], wait: [], config: {} };
  let tab = "rsvp";

  async function api(path, init) {
    const url = endpoint(path);
    if (!url) throw new Error("Firebase não configurado");
    const response = await fetch(url, { ...init, cache: "no-store" });
    if (!response.ok) throw new Error(`Firebase respondeu ${response.status}`);
    if (response.status === 204) return null;
    return response.json();
  }

  function normalizeOptions(value) {
    const list = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key])
        : [];
    return list.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }

  function render() {
    root.innerHTML = `
      <div class="admin-confirm-heading">
        <h2 id="admin-confirm-title">Administração da etapa ${stage}</h2>
        <p>Gerencie inscrições e configure as três opções que aparecem na votação pública.</p>
      </div>
      <div class="admin-confirm-tabs" role="tablist" aria-label="Seções do modal">
        <button type="button" role="tab" id="pdq-tab-rsvp" aria-controls="pdq-rsvp" data-pdq-tab="rsvp" aria-selected="${tab === "rsvp"}">Inscrições</button>
        <button type="button" role="tab" id="pdq-tab-dinner" aria-controls="pdq-dinner" data-pdq-tab="dinner" aria-selected="${tab === "dinner"}">Opções de janta</button>
      </div>
      <section class="admin-confirm-panel" id="pdq-rsvp" role="tabpanel" aria-labelledby="pdq-tab-rsvp" ${tab === "rsvp" ? "" : "hidden"}>
        <div class="admin-confirm-toolbar">
          <span class="admin-status" id="pdq-rsvp-status">Carregando…</span>
          <button class="btn btn--ghost btn--sm" type="button" id="pdq-toggle">Abrir/fechar inscrições</button>
          <button class="btn btn--ghost btn--sm" type="button" id="pdq-refresh">Atualizar</button>
          <button class="btn btn--ghost btn--sm" type="button" id="pdq-export">Exportar CSV</button>
        </div>
        <div class="admin-kpis">
          <div class="admin-kpi"><strong id="pdq-confirm-count">—</strong><span>confirmados</span></div>
          <div class="admin-kpi"><strong id="pdq-wait-count">—</strong><span>lista de espera</span></div>
        </div>
        <h3>Confirmados</h3><div class="admin-confirm-roster" id="pdq-confirm-list"></div>
        <h3>Lista de espera</h3><div class="admin-confirm-roster" id="pdq-wait-list"></div>
        <p id="pdq-rsvp-error" class="admin-confirm-error" role="alert" hidden></p>
      </section>
      <section class="admin-confirm-panel" id="pdq-dinner" role="tabpanel" aria-labelledby="pdq-tab-dinner" ${tab === "dinner" ? "" : "hidden"}>
        <div class="admin-dinner-intro">
          <span class="admin-dinner-intro__icon" aria-hidden="true">🍽️</span>
          <div><h3>Alternativas da janta</h3><p>Cadastre exatamente três opções. Adições e exclusões ficam em rascunho até você salvar.</p></div>
        </div>
        <div class="admin-confirm-toolbar admin-dinner-toolbar">
          <span id="pdq-option-count" class="admin-option-count">Carregando opções…</span>
          <span id="pdq-dinner-status" class="admin-status" role="status" aria-live="polite">Lendo Firebase</span>
        </div>
        <ol id="pdq-option-list" class="admin-vote-option-list"></ol>
        <form id="pdq-option-form" class="admin-inline-form">
          <label class="admin-field" for="pdq-new-option"><span>Adicionar alternativa</span><input id="pdq-new-option" type="text" maxlength="60" placeholder="Ex.: Lasanha" autocomplete="off" required></label>
          <button class="btn btn--ghost" id="pdq-add-option" type="submit">Adicionar</button>
        </form>
        <div class="admin-dinner-actions">
          <button class="btn btn--primary" type="button" id="pdq-save-options" disabled>Salvar opções da votação</button>
          <button class="btn btn--ghost btn--sm" type="button" id="pdq-reload-options">Descartar e recarregar</button>
        </div>
        <p id="pdq-dinner-error" class="admin-confirm-error" role="alert" hidden></p>
      </section>`;
    renderOptions();
  }

  function setDinnerStatus(text, stateName) {
    const status = $("#pdq-dinner-status", root);
    if (!status) return;
    status.textContent = text;
    if (stateName) status.dataset.state = stateName;
  }

  function renderOptions() {
    const list = $("#pdq-option-list", root);
    if (!list) return;
    const count = $("#pdq-option-count", root);
    count.textContent = `${options.length} de 3 opções${optionsDirty ? " · alterações pendentes" : ""}`;
    if (!optionsLoaded) {
      list.innerHTML = '<li class="admin-empty">Aguardando resposta do Firebase…</li>';
    } else if (!options.length) {
      list.innerHTML = '<li class="admin-empty">Sem alternativas. Cadastre três opções para liberar a votação.</li>';
    } else {
      list.innerHTML = options.map((value, index) => `
        <li class="admin-vote-option">
          <span class="admin-vote-option__number">${String(index + 1).padStart(2, "0")}</span>
          <span class="admin-vote-option__name">${esc(value)}</span>
          <button class="admin-icon-btn" type="button" data-pdq-delete="${index}" aria-label="Excluir ${esc(value)}" title="Excluir opção">⌫</button>
        </li>`).join("");
    }
    const input = $("#pdq-new-option", root);
    const add = $("#pdq-add-option", root);
    const save = $("#pdq-save-options", root);
    if (input) input.disabled = !optionsLoaded || options.length >= 3;
    if (add) add.disabled = !optionsLoaded || options.length >= 3;
    if (save) save.disabled = !optionsLoaded || options.length !== 3 || !optionsDirty;
  }

  async function loadOptions({ discard = false } = {}) {
    if (optionsDirty && !discard) return;
    optionsLoaded = false;
    setDinnerStatus("Lendo opções…", "");
    renderOptions();
    try {
      const value = await api(optionsPath);
      const loaded = normalizeOptions(value);
      options = loaded.length ? loaded : DEFAULTS.slice();
      originalOptions = loaded.slice();
      optionsLoaded = true;
      optionsDirty = loaded.length === 0;
      const error = $("#pdq-dinner-error", root);
      if (error) error.hidden = true;
      setDinnerStatus(loaded.length ? "Lista sincronizada" : "3 sugestões prontas — salve para publicar", loaded.length ? "saved" : "dirty");
    } catch (error) {
      options = DEFAULTS.slice();
      originalOptions = [];
      optionsLoaded = false;
      setDinnerStatus("Banco indisponível", "error");
      const message = $("#pdq-dinner-error", root);
      message.textContent = `Não foi possível ler a lista atual (${error.message}). As opções padrão são apenas prévia; conecte-se ao Firebase antes de salvar.`;
      message.hidden = false;
    }
    renderOptions();
  }

  function nameOf(value) {
    return typeof value === "string" ? value : (value?.nome || value?.name || value?.apelido || "Inscrito");
  }

  function toEntries(value) {
    return value && typeof value === "object" ? Object.entries(value).map(([id, item]) => ({ id, item, name: nameOf(item) })) : [];
  }

  function drawList(selector, items, waiting) {
    const element = $(selector, root);
    element.innerHTML = items.length ? items.map((item) => `
      <div class="admin-confirm-roster__row"><span>${esc(item.name)}</span><span class="admin-vote-option__actions">
      ${waiting ? `<button class="btn btn--ghost btn--sm" data-pdq-promote="${esc(item.id)}" type="button">Promover</button>` : ""}
      <button class="admin-icon-btn" data-pdq-remove="${waiting ? "wait" : "confirmed"}:${esc(item.id)}" type="button" aria-label="Remover ${esc(item.name)}">✕</button></span></div>`).join("") : '<p class="admin-muted">Nenhum nome nesta lista.</p>';
  }

  async function loadRsvp() {
    const error = $("#pdq-rsvp-error", root);
    const status = $("#pdq-rsvp-status", root);
    error.hidden = true;
    try {
      const [config, confirmed, wait] = await Promise.all([
        api(`confirmacao/${season}/config`).catch(() => null),
        api(`confirmacao/${season}/etapas/${stage}/confirmados`).catch(() => null),
        api(`confirmacao/${season}/etapas/${stage}/listaEspera`).catch(() => null),
      ]);
      state = { config: config || {}, confirmed: toEntries(confirmed), wait: toEntries(wait) };
      $("#pdq-confirm-count", root).textContent = state.confirmed.length;
      $("#pdq-wait-count", root).textContent = state.wait.length;
      const open = Boolean(state.config.inscricoesAbertas);
      status.textContent = open ? "Inscrições abertas" : "Inscrições fechadas";
      status.dataset.state = open ? "saved" : "dirty";
      drawList("#pdq-confirm-list", state.confirmed, false);
      drawList("#pdq-wait-list", state.wait, true);
    } catch (err) {
      error.textContent = `Não foi possível carregar as listas: ${err.message}`;
      error.hidden = false;
    }
  }

  async function openModal() {
    modal.hidden = false;
    tab = "rsvp";
    render();
    await Promise.all([loadOptions(), loadRsvp()]);
  }

  async function saveOptions() {
    const error = $("#pdq-dinner-error", root);
    if (!optionsLoaded) {
      error.textContent = "A lista não foi carregada do Firebase; não é seguro salvar por cima dela.";
      error.hidden = false;
      return;
    }
    if (options.length !== 3) {
      error.textContent = "A votação pública precisa de exatamente três opções.";
      error.hidden = false;
      return;
    }
    setDinnerStatus("Salvando…", "dirty");
    $("#pdq-save-options", root).disabled = true;
    try {
      await api(optionsPath, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options) });
      originalOptions = options.slice();
      optionsDirty = false;
      error.hidden = true;
      setDinnerStatus("Opções salvas no Firebase", "saved");
      renderOptions();
    } catch (err) {
      setDinnerStatus("Não foi possível salvar", "error");
      error.textContent = `O Firebase recusou ou não concluiu a gravação (${err.message}). Confira as regras de escrita e tente novamente; suas alterações continuam neste modal.`;
      error.hidden = false;
      renderOptions();
    }
  }

  async function toggle() {
    const error = $("#pdq-rsvp-error", root);
    try {
      await api(`confirmacao/${season}/config/inscricoesAbertas`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(!Boolean(state.config.inscricoesAbertas)) });
      await loadRsvp();
    } catch (err) {
      error.textContent = `Não foi possível alterar o status: ${err.message}`;
      error.hidden = false;
    }
  }

  async function remove(kind, id) {
    const entries = kind === "wait" ? state.wait : state.confirmed;
    const item = entries.find((entry) => entry.id === id);
    if (!item || !window.confirm(`Remover ${item.name} da lista?`)) return;
    try {
      await api(`confirmacao/${season}/etapas/${stage}/${kind === "wait" ? "listaEspera" : "confirmados"}/${id}`, { method: "DELETE" });
      await loadRsvp();
    } catch (err) {
      const error = $("#pdq-rsvp-error", root);
      error.textContent = `Não foi possível remover: ${err.message}`;
      error.hidden = false;
    }
  }

  async function promote(id) {
    const item = state.wait.find((entry) => entry.id === id);
    if (!item) return;
    if (state.confirmed.length >= 20) {
      const error = $("#pdq-rsvp-error", root);
      error.textContent = "As 20 vagas estão preenchidas.";
      error.hidden = false;
      return;
    }
    try {
      await api(`confirmacao/${season}/etapas/${stage}/confirmados`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.item) });
      await api(`confirmacao/${season}/etapas/${stage}/listaEspera/${id}`, { method: "DELETE" });
      await loadRsvp();
    } catch (err) {
      const error = $("#pdq-rsvp-error", root);
      error.textContent = `Não foi possível promover: ${err.message}`;
      error.hidden = false;
    }
  }

  function exportCSV() {
    const rows = [["Lista", "Nome"], ...state.confirmed.map((item) => ["Confirmado", item.name]), ...state.wait.map((item) => ["Espera", item.name])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `inscricoes-etapa-${stage}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  document.addEventListener("click", async (event) => {
    if (event.target.closest("#admin-confirm-open")) { await openModal(); return; }
    if (event.target.closest("[data-admin-confirm-close]")) { modal.hidden = true; return; }
    const tabButton = event.target.closest("[data-pdq-tab]");
    if (tabButton) {
      tab = tabButton.dataset.pdqTab;
      root.querySelectorAll("[data-pdq-tab]").forEach((button) => button.setAttribute("aria-selected", String(button === tabButton)));
      root.querySelector("#pdq-rsvp").hidden = tab !== "rsvp";
      root.querySelector("#pdq-dinner").hidden = tab !== "dinner";
      if (tab === "dinner" && !optionsLoaded) await loadOptions();
      if (tab === "rsvp") await loadRsvp();
      return;
    }
    const removeOption = event.target.closest("[data-pdq-delete]");
    if (removeOption) {
      options.splice(Number(removeOption.dataset.pdqDelete), 1);
      optionsDirty = JSON.stringify(options) !== JSON.stringify(originalOptions);
      const error = $("#pdq-dinner-error", root);
      error.hidden = true;
      setDinnerStatus(options.length === 3 ? "Pronto para salvar" : "Inclua outra opção para chegar a três", "dirty");
      renderOptions();
      return;
    }
    if (event.target.closest("#pdq-save-options")) { await saveOptions(); return; }
    if (event.target.closest("#pdq-reload-options")) { await loadOptions({ discard: true }); return; }
    if (event.target.closest("#pdq-toggle")) { await toggle(); return; }
    if (event.target.closest("#pdq-refresh")) { await loadRsvp(); return; }
    if (event.target.closest("#pdq-export")) { exportCSV(); return; }
    const removePerson = event.target.closest("[data-pdq-remove]");
    if (removePerson) { const [kind, ...id] = removePerson.dataset.pdqRemove.split(":"); await remove(kind, id.join(":")); return; }
    const promotePerson = event.target.closest("[data-pdq-promote]");
    if (promotePerson) await promote(promotePerson.dataset.pdqPromote);
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id !== "pdq-option-form") return;
    event.preventDefault();
    const input = $("#pdq-new-option", root);
    const value = input.value.trim();
    const error = $("#pdq-dinner-error", root);
    if (!value) return;
    if (!optionsLoaded) {
      error.textContent = "Carregue a lista do Firebase antes de editar.";
      error.hidden = false;
      return;
    }
    if (options.length >= 3) {
      error.textContent = "Já existem três opções. Exclua uma antes de adicionar outra.";
      error.hidden = false;
      return;
    }
    if (options.some((item) => item.localeCompare(value, "pt-BR", { sensitivity: "base" }) === 0)) {
      error.textContent = "Essa opção já existe.";
      error.hidden = false;
      return;
    }
    options.push(value);
    optionsDirty = JSON.stringify(options) !== JSON.stringify(originalOptions);
    input.value = "";
    error.hidden = true;
    setDinnerStatus(options.length === 3 ? "Pronto para salvar" : "Adicione mais uma opção", "dirty");
    renderOptions();
    $("#pdq-new-option", root)?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) modal.hidden = true;
  });
})();
