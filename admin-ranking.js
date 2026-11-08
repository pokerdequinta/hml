/* ============================================================
   ADMIN — CONTROLE DO RANKING
   Lê window.PQ_RANKING, edita em memória, salva rascunho local
   e gera o js/ranking-data.js pronto para publicar.
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "pq-ranking-draft-v1";
  const SOURCE = window.PQ_RANKING;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  if (!SOURCE) {
    document.body.innerHTML = "<main class='admin-main'><div class='admin-card'><div class='admin-card__body'><h1>ranking-data.js não encontrado</h1><p>Confira se o arquivo <code>js/ranking-data.js</code> está na pasta do site.</p></div></div></main>";
    return;
  }

  const toastElement = $("#toast");
  let toastTimer = null;

  const state = {
    data: normalize(clone(SOURCE)),
    seasonIndex: 0,
    stageIndex: 0,
    order: "alpha",
    dirty: false,
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    data.versao = Number(data.versao) || 1;
    data.atualizadoEm = data.atualizadoEm || new Date().toISOString().slice(0, 10);
    data.temporadaPadrao = Number(data.temporadaPadrao) || 0;
    data.jogadores = Array.isArray(data.jogadores) ? data.jogadores : [];
    data.temporadas = Array.isArray(data.temporadas) ? data.temporadas : [];

    data.jogadores = data.jogadores.map((player) => ({
      id: String(player.id || slugify(player.nome || player.name || "jogador")),
      nome: String(player.nome || player.name || player.id),
      apelido: String(player.apelido || player.nome || player.name || player.id),
      foto: String(player.foto || player.photo || ""),
      cidade: String(player.cidade || ""),
      uf: String(player.uf || ""),
      desde: player.desde || null,
      bio: String(player.bio || ""),
      melhor: String(player.melhor || ""),
    }));

    data.temporadas = data.temporadas.map((season) => ({
      ano: Number(season.ano) || new Date().getFullYear(),
      nome: String(season.nome || `Temporada ${season.ano}`),
      encerrada: Boolean(season.encerrada),
      etapas: (Array.isArray(season.etapas) ? season.etapas : []).map((stage) => ({
        numero: Number(stage.numero) || 1,
        nome: String(stage.nome || `Etapa ${String(stage.numero || 1).padStart(2, "0")}`),
        data: String(stage.data || ""),
        campeao: String(stage.campeao || ""),
        pontos: numericMap(stage.pontos),
        ko: numericMap(stage.ko),
      })).sort((a, b) => a.numero - b.numero),
    }));

    data.temporadas.sort((a, b) => b.ano - a.ano);

    /* Garante que todo id citado nos pontos exista no cadastro. */
    const ids = new Set(data.jogadores.map((player) => player.id));
    data.temporadas.forEach((season) => {
      season.etapas.forEach((stage) => {
        [...Object.keys(stage.pontos), ...Object.keys(stage.ko)].forEach((id) => {
          if (!ids.has(id)) {
            data.jogadores.push({
              id,
              nome: id.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
              apelido: id,
              foto: "",
              cidade: "",
              uf: "",
              desde: null,
              bio: "",
              melhor: "",
            });
            ids.add(id);
          }
        });
      });
    });

    return data;
  }

  function numericMap(map) {
    const result = {};
    if (!map || typeof map !== "object") return result;
    Object.entries(map).forEach(([id, value]) => {
      const number = Number(value);
      if (Number.isFinite(number) && id) result[id] = number;
    });
    return result;
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
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

  function avatar(player) {
    if (player.foto) {
      return `<img src="${escapeHTML(player.foto)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=&quot;admin-player__fallback&quot;>${escapeHTML(initials(player.nome))}</span>'">`;
    }
    return `<span class="admin-player__fallback">${escapeHTML(initials(player.nome))}</span>`;
  }

  function currentSeason() {
    return state.data.temporadas[state.seasonIndex] || null;
  }

  function currentStage() {
    const season = currentSeason();
    return season ? season.etapas[state.stageIndex] || null : null;
  }

  function toast(message, type = "info") {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.dataset.type = type;
    toastElement.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.classList.remove("is-visible"), 3200);
  }

  function setStatus(text, stateName = "saved") {
    const element = $("#save-status");
    if (!element) return;
    element.textContent = text;
    element.dataset.state = stateName;
  }

  /* ============================================================
     CÁLCULO
     ============================================================ */
  function seasonTotals(season) {
    const map = new Map();
    state.data.jogadores.forEach((player) => {
      map.set(player.id, { id: player.id, nome: player.nome, points: 0, koPoints: 0, played: 0, wins: 0 });
    });

    if (!season) return [];

    season.etapas.forEach((stage) => {
      const champion = championId(stage);
      const entries = Object.keys(stage.pontos);
      entries.forEach((id) => {
        if (!map.has(id)) map.set(id, { id, nome: id, points: 0, koPoints: 0, played: 0, wins: 0 });
        const row = map.get(id);
        row.points += Number(stage.pontos[id]) || 0;
        row.koPoints += Number(stage.ko[id]) || 0;
        row.played += 1;
        if (champion === id) row.wins += 1;
      });
      Object.keys(stage.ko).forEach((id) => {
        if (!map.has(id)) map.set(id, { id, nome: id, points: 0, koPoints: 0, played: 0, wins: 0 });
        map.get(id).koPoints += Number(stage.ko[id]) || 0;
      });
    });

    const rows = [...map.values()].filter((row) => row.played || row.points !== 0);
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.played !== a.played) return b.played - a.played;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.koPoints !== a.koPoints) return b.koPoints - a.koPoints;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    rows.forEach((row, index) => { row.rank = index + 1; });
    return rows;
  }

  function championId(stage) {
    if (!stage) return "";
    const entries = Object.entries(stage.pontos || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (!entries.length) return stage.campeao || "";
    const [id, points] = entries[0];
    return Number(points) > 0 ? id : stage.campeao || "";
  }

  function playedStageCount(season) {
    return season ? season.etapas.filter((stage) => Object.keys(stage.pontos).length).length : 0;
  }

  function totalOf(playerId, season = currentSeason()) {
    const row = seasonTotals(season).find((item) => item.id === playerId);
    return row ? row.points : 0;
  }

  /* ============================================================
     RENDER — SELEÇÃO
     ============================================================ */
  function renderSeasonSelect() {
    const select = $("#season-select");
    if (!select) return;
    select.innerHTML = state.data.temporadas.map((season, index) => {
      const played = playedStageCount(season);
      return `<option value="${index}"${index === state.seasonIndex ? " selected" : ""}>${season.ano} — ${season.encerrada ? "encerrada" : "em andamento"} · ${played} ${played === 1 ? "etapa" : "etapas"}</option>`;
    }).join("");
  }

  function renderStageSelect() {
    const select = $("#stage-select");
    if (!select) return;
    const season = currentSeason();
    if (!season || !season.etapas.length) {
      select.innerHTML = "<option value=''>Nenhuma etapa</option>";
      return;
    }
    select.innerHTML = season.etapas.map((stage, index) => {
      const count = Object.keys(stage.pontos).length;
      return `<option value="${index}"${index === state.stageIndex ? " selected" : ""}>${pad(stage.numero)} · ${stage.nome}${count ? ` · ${count} com pontos` : " · sem pontos"}</option>`;
    }).join("");
  }

  function chooseDefaultStage(season) {
    if (!season || !season.etapas.length) return 0;
    const next = season.etapas.findIndex((stage) => !Object.keys(stage.pontos).length);
    return next === -1 ? season.etapas.length - 1 : next;
  }

  /* ============================================================
     RENDER — LANÇAMENTO
     ============================================================ */
  function renderStageSettings() {
    const stage = currentStage();
    const season = currentSeason();
    const name = $("#stage-name");
    const date = $("#stage-date");
    if (name) name.value = stage ? stage.nome : "";
    if (date) date.value = stage && stage.data ? stage.data : "";
    const title = $("#entry-title");
    const subtitle = $("#entry-subtitle");
    if (title) title.textContent = stage ? `Etapa ${pad(stage.numero)} · ${season.ano}` : "Lançar pontos";
    if (subtitle) {
      const count = stage ? Object.keys(stage.pontos).length : 0;
      const champion = stage ? state.data.jogadores.find((player) => player.id === championId(stage)) : null;
      subtitle.textContent = count
        ? `${count} ${count === 1 ? "jogador pontuou" : "jogadores pontuaram"}${champion ? ` · campeão: ${champion.nome}` : ""}. Deixe em branco quem não jogou.`
        : "Preencha somente quem jogou. Deixe em branco para quem não participou.";
    }
  }

  function entryPlayers() {
    const players = state.data.jogadores.slice();
    if (state.order === "alpha") {
      players.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    } else {
      const totals = seasonTotals(currentSeason());
      const order = new Map(totals.map((row, index) => [row.id, index]));
      players.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999) || a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return players;
  }

  function renderEntry() {
    const body = $("#entry-body");
    if (!body) return;
    const season = currentSeason();
    const stage = currentStage();
    if (!season || !stage) {
      body.innerHTML = "<tr><td colspan='5' class='admin-empty'>Adicione uma temporada e uma etapa para começar.</td></tr>";
      return;
    }

    const totals = new Map(seasonTotals(season).map((row) => [row.id, row]));
    const players = entryPlayers();
    const champion = championId(stage);

    body.innerHTML = players.map((player) => {
      const row = totals.get(player.id);
      const points = Object.prototype.hasOwnProperty.call(stage.pontos, player.id) ? stage.pontos[player.id] : "";
      const ko = Object.prototype.hasOwnProperty.call(stage.ko, player.id) ? stage.ko[player.id] : "";
      const total = row ? row.points : 0;
      return `<tr data-player-row="${escapeHTML(player.id)}">
        <td class="rank"><span class="admin-rank${row && row.rank <= 20 ? " is-top" : ""}" data-rank>${row ? row.rank : "—"}</span></td>
        <td>
          <div class="admin-player">
            ${avatar(player)}
            <span class="admin-player__name">${escapeHTML(player.nome)}${champion === player.id ? " ★" : ""}</span>
          </div>
        </td>
        <td class="num"><input class="admin-points-input" type="number" inputmode="numeric" step="1" data-points value="${points === "" ? "" : escapeHTML(points)}" placeholder="—" aria-label="Pontos de ${escapeHTML(player.nome)}"></td>
        <td class="num"><input class="admin-points-input is-ko" type="number" inputmode="numeric" step="1" data-ko value="${ko === "" ? "" : escapeHTML(ko)}" placeholder="—" aria-label="KO de ${escapeHTML(player.nome)}"></td>
        <td class="num"><strong class="admin-total" data-total>${formatNumber(total)}</strong></td>
      </tr>`;
    }).join("");
  }

  function refreshComputed() {
    const season = currentSeason();
    const totals = new Map(seasonTotals(season).map((row) => [row.id, row]));
    $$("[data-player-row]").forEach((rowElement) => {
      const row = totals.get(rowElement.dataset.playerRow);
      const total = $("[data-total]", rowElement);
      const rank = $("[data-rank]", rowElement);
      if (total) total.textContent = formatNumber(row ? row.points : 0);
      if (rank) {
        rank.textContent = row ? row.rank : "—";
        rank.classList.toggle("is-top", Boolean(row && row.rank <= 20));
      }
    });
    renderSummary();
    }

  /* ============================================================
     RENDER — RESUMO
     ============================================================ */
  function renderSummary() {
    const season = currentSeason();
    const rows = seasonTotals(season);
    const played = playedStageCount(season);
    const kpiPlayers = $("#kpi-players");
    const kpiStages = $("#kpi-stages");
    const live = $("#live-ranking");
    const note = $("#summary-note");
    const closed = $("#season-closed");
    const subtitle = $("#summary-subtitle");

    if (kpiPlayers) kpiPlayers.textContent = rows.length;
    if (kpiStages) kpiStages.textContent = played;
    if (closed) closed.checked = Boolean(season && season.encerrada);
    if (subtitle) subtitle.textContent = season ? season.nome : "Temporada selecionada";
    if (note) {
      note.textContent = season
        ? `${season.etapas.length} etapas no calendário · ${state.data.jogadores.length} jogadores cadastrados.${state.data.temporadaPadrao === season.ano ? " Esta é a temporada padrão exibida pelo site." : ""}`
        : "";
    }

    if (live) {
      live.innerHTML = rows.length
        ? rows.slice(0, 20).map((row) => `<li><strong>${escapeHTML(row.nome)}</strong><span>${formatNumber(row.points)} pts</span></li>`).join("")
        : "<li class='admin-muted' style='display:block'>Nenhum ponto lançado nesta temporada.</li>";
    }
  }

  /* ============================================================
     RENDER — JOGADORES
     ============================================================ */
  function renderPlayers() {
    const body = $("#players-body");
    if (!body) return;
    body.innerHTML = state.data.jogadores
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((player) => `<tr data-player-id="${escapeHTML(player.id)}">
        <td><input type="text" data-field="nome" value="${escapeHTML(player.nome)}" aria-label="Nome"></td>
        <td><input type="text" data-field="apelido" value="${escapeHTML(player.apelido)}" aria-label="Apelido"></td>
        <td><input type="url" data-field="foto" value="${escapeHTML(player.foto)}" placeholder="https://..." aria-label="Foto"></td>
        <td><button class="admin-icon-btn" type="button" data-remove-player="${escapeHTML(player.id)}" title="Remover jogador" aria-label="Remover ${escapeHTML(player.nome)}">✕</button></td>
      </tr>`).join("");
  }

  /* ============================================================
     EDIÇÃO
     ============================================================ */
  function markDirty() {
    state.dirty = true;
    state.data.atualizadoEm = new Date().toISOString().slice(0, 10);
    setStatus("Alterações não salvas no arquivo", "dirty");
    scheduleSave();
    schedulePreview();
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), data: state.data }));
      setStatus(`Rascunho salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, "dirty");
    } catch (error) {
      setStatus("Não foi possível salvar o rascunho", "error");
    }
  }

  function scheduleSave() {
    clearTimeout(scheduleSave.timer);
    scheduleSave.timer = setTimeout(saveDraft, 600);
  }

  function schedulePreview() {
    clearTimeout(schedulePreview.timer);
    schedulePreview.timer = setTimeout(updatePreview, 300);
  }

  function handlePointsInput(event) {
    const input = event.target.closest("[data-points], [data-ko]");
    if (!input) return;
    const row = input.closest("[data-player-row]");
    const stage = currentStage();
    if (!row || !stage) return;
    const playerId = row.dataset.playerRow;
    const map = input.hasAttribute("data-ko") ? stage.ko : stage.pontos;
    const raw = input.value.trim();

    if (raw === "") {
      delete map[playerId];
    } else {
      const number = Number(raw);
      if (!Number.isFinite(number)) return;
      map[playerId] = number;
    }

    stage.campeao = championId(stage);
    markDirty();
    refreshComputed();
  }

  function renderAll() {
    renderSeasonSelect();
    renderStageSelect();
    renderStageSettings();
    renderEntry();
    renderSummary();
    renderPlayers();
    updatePreview();
  }

  /* ============================================================
     EXPORTAÇÃO
     ============================================================ */
  function buildJS() {
    const header = `/* ============================================================
   RANKING — POKER DE QUINTA
   ------------------------------------------------------------
   Arquivo gerado pelo admin.html em ${new Date().toLocaleString("pt-BR")}.
   Substitua js/ranking-data.js por este conteúdo e faça commit.
   ============================================================ */

window.PQ_RANKING = `;
    return `${header}${JSON.stringify(state.data, null, 2)};\n`;
  }

  function updatePreview() {
    const preview = $("#export-preview");
    if (preview) preview.textContent = buildJS();
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadJS() {
    downloadFile("ranking-data.js", buildJS(), "text/javascript;charset=utf-8");
    state.dirty = false;
    setStatus("Arquivo baixado — substitua no repositório", "saved");
    toast("ranking-data.js baixado. Agora substitua o arquivo no projeto.");
  }

  function downloadJSON() {
    downloadFile("ranking-data.json", JSON.stringify(state.data, null, 2), "application/json;charset=utf-8");
    toast("JSON baixado.");
  }

  /* ============================================================
     EVENTOS
     ============================================================ */
  function bindEvents() {
    $("#season-select")?.addEventListener("change", (event) => {
      state.seasonIndex = Number(event.target.value) || 0;
      state.stageIndex = chooseDefaultStage(currentSeason());
      renderStageSelect();
      renderStageSettings();
      renderEntry();
      renderSummary();
      updatePreview();
    });

    $("#stage-select")?.addEventListener("change", (event) => {
      state.stageIndex = Number(event.target.value) || 0;
      renderStageSettings();
      renderEntry();
      renderSummary();
      updatePreview();
    });

    $("#entry-body")?.addEventListener("input", handlePointsInput);

    $("#entry-body")?.addEventListener("change", (event) => {
      if (event.target.closest("[data-points], [data-ko]")) markDirty();
    });

    $("#stage-name")?.addEventListener("input", (event) => {
      const stage = currentStage();
      if (!stage) return;
      stage.nome = event.target.value;
      markDirty();
      renderStageSelect();
      renderSettingsTitle();
    });

    $("#stage-date")?.addEventListener("change", (event) => {
      const stage = currentStage();
      if (!stage) return;
      stage.data = event.target.value;
      markDirty();
    });

    $("#season-closed")?.addEventListener("change", (event) => {
      const season = currentSeason();
      if (!season) return;
      season.encerrada = event.target.checked;
      markDirty();
      renderSeasonSelect();
    });

    $("#make-default")?.addEventListener("click", () => {
      const season = currentSeason();
      if (!season) return;
      state.data.temporadaPadrao = season.ano;
      markDirty();
      scheduleSave();
      renderSummary();
      toast(playedStageCount(season)
        ? `Temporada ${season.ano} será a temporada padrão do site.`
        : `Temporada ${season.ano} marcada como padrão. Ela vira a principal assim que tiver a primeira etapa com pontos.`);
    });

    $$("[data-order]").forEach((button) => {
      button.addEventListener("click", () => {
        state.order = button.dataset.order;
        $$("[data-order]").forEach((item) => item.classList.toggle("is-active", item === button));
        renderEntry();
      });
    });

    $("#clear-stage")?.addEventListener("click", () => {
      const stage = currentStage();
      if (!stage) return;
      if (!window.confirm("Limpar todos os pontos desta etapa? Os jogadores continuam cadastrados.")) return;
      stage.pontos = {};
      stage.ko = {};
      stage.campeao = "";
      markDirty();
      renderEntry();
      renderSummary();
      renderStageSelect();
      toast("Etapa limpa.");
    });

    $("#add-season")?.addEventListener("click", addSeason);
    $("#add-stage")?.addEventListener("click", addStage);

    $("#toggle-players")?.addEventListener("click", () => {
      const panel = $("#players-panel");
      if (!panel) return;
      panel.hidden = !panel.hidden;
      $("#toggle-players").textContent = panel.hidden ? "Mostrar lista" : "Ocultar lista";
    });

    $("#add-player-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = $("#new-player-name")?.value.trim();
      const photo = $("#new-player-photo")?.value.trim();
      if (!name) return;
      let id = slugify(name) || `jogador-${Date.now()}`;
      let suffix = 2;
      while (state.data.jogadores.some((player) => player.id === id)) {
        id = `${slugify(name)}-${suffix}`;
        suffix += 1;
      }
      state.data.jogadores.push({
        id,
        nome: name,
        apelido: name.split(/\s+/)[0],
        foto: photo || "",
        cidade: "",
        uf: "",
        desde: null,
        bio: "",
        melhor: "",
      });
      event.target.reset();
      markDirty();
      renderEntry();
      renderPlayers();
      renderSummary();
      toast(`${name} cadastrado.`);
    });

    $("#players-body")?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-field]");
      if (!input) return;
      const row = input.closest("[data-player-id]");
      const player = state.data.jogadores.find((item) => item.id === row.dataset.playerId);
      if (!player) return;
      player[input.dataset.field] = input.value.trim();
      if (input.dataset.field === "nome" && !input.value.trim()) {
        input.value = player.nome;
        return;
      }
      markDirty();
      renderEntry();
      renderSummary();
      if (input.dataset.field === "nome" || input.dataset.field === "apelido") renderPlayers();
    });

    $("#players-body")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-player]");
      if (!button) return;
      const id = button.dataset.removePlayer;
      const player = state.data.jogadores.find((item) => item.id === id);
      if (!player) return;
      if (!window.confirm(`Remover ${player.nome} do cadastro e de todas as etapas? Esta ação não pode ser desfeita.`)) return;
      state.data.jogadores = state.data.jogadores.filter((item) => item.id !== id);
      state.data.temporadas.forEach((season) => season.etapas.forEach((stage) => {
        delete stage.pontos[id];
        delete stage.ko[id];
        if (stage.campeao === id) stage.campeao = championId(stage);
      }));
      markDirty();
      renderAll();
      toast(`${player.nome} removido.`);
    });

    $("#download-js")?.addEventListener("click", downloadJS);
    $("#download-json")?.addEventListener("click", downloadJSON);

    $("#import-file")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1) throw new Error("Arquivo sem JSON.");
        const parsed = JSON.parse(text.slice(start, end + 1));
        state.data = normalize(parsed);
        state.seasonIndex = 0;
        state.stageIndex = chooseDefaultStage(currentSeason());
        markDirty();
        renderAll();
        toast("Arquivo importado. Confira os dados e baixe a versão final.");
      } catch (error) {
        setStatus("Arquivo inválido", "error");
        toast("Não foi possível importar. Use o ranking-data.js ou o JSON exportado por esta página.", "error");
      } finally {
        event.target.value = "";
      }
    });

    $("#discard-all")?.addEventListener("click", () => {
      if (!window.confirm("Descartar todas as alterações e voltar ao arquivo publicado?")) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });

    $("#restore-draft")?.addEventListener("click", () => {
      const draft = readDraft();
      if (!draft) return;
      state.data = normalize(draft.data);
      const preferred = state.data.temporadas.findIndex((season) => Number(season.ano) === Number(state.data.temporadaPadrao));
      state.seasonIndex = preferred >= 0 ? preferred : 0;
      state.stageIndex = chooseDefaultStage(currentSeason());
      state.dirty = true;
      $("#draft-banner").hidden = true;
      renderAll();
      setStatus("Rascunho restaurado", "dirty");
      toast("Rascunho restaurado.");
    });

    $("#discard-draft-banner")?.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      $("#draft-banner").hidden = true;
      setStatus("Dados do arquivo publicado", "saved");
    });

  }

  function renderSettingsTitle() {
    const stage = currentStage();
    const season = currentSeason();
    const title = $("#entry-title");
    if (title) title.textContent = stage ? `Etapa ${pad(stage.numero)} · ${season.ano}` : "Lançar pontos";
    renderStageSelect();
  }

  function addSeason() {
    const suggestion = (state.data.temporadas[0]?.ano || new Date().getFullYear()) + 1;
    const answer = window.prompt("Ano da nova temporada:", suggestion);
    if (!answer) return;
    const year = Number(answer);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      toast("Informe um ano válido, por exemplo 2027.", "error");
      return;
    }
    if (state.data.temporadas.some((season) => season.ano === year)) {
      toast("Essa temporada já existe.", "error");
      return;
    }
    const stagesAnswer = window.prompt("Quantas etapas a temporada terá?", "13");
    const count = Math.min(30, Math.max(1, Number(stagesAnswer) || 13));
    const stages = Array.from({ length: count }, (_, index) => ({
      numero: index + 1,
      nome: index + 1 === count && count > 2 ? "Grande Final" : `Etapa ${pad(index + 1)}`,
      data: "",
      campeao: "",
      pontos: {},
      ko: {},
    }));
    state.data.temporadas.push({ ano: year, nome: `Temporada ${year}`, encerrada: false, etapas: stages });
    state.data.temporadas.sort((a, b) => b.ano - a.ano);
    state.seasonIndex = state.data.temporadas.findIndex((season) => season.ano === year);
    state.stageIndex = 0;
    markDirty();
    renderAll();
    toast(`Temporada ${year} criada com ${count} etapas.`);
  }

  function addStage() {
    const season = currentSeason();
    if (!season) {
      toast("Crie uma temporada antes de adicionar etapas.", "error");
      return;
    }
    const numero = Math.max(0, ...season.etapas.map((stage) => stage.numero)) + 1;
    const name = window.prompt("Nome da nova etapa:", `Etapa ${pad(numero)}`);
    if (name === null) return;
    season.etapas.push({
      numero,
      nome: name.trim() || `Etapa ${pad(numero)}`,
      data: "",
      campeao: "",
      pontos: {},
      ko: {},
    });
    season.etapas.sort((a, b) => a.numero - b.numero);
    state.stageIndex = season.etapas.findIndex((stage) => stage.numero === numero);
    markDirty();
    renderAll();
    toast(`Etapa ${pad(numero)} criada.`);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    const params = new URLSearchParams(window.location.search);
    const requestedYear = Number(params.get("temporada"));
    const requestedStage = Number(params.get("etapa"));
    const preferred = state.data.temporadas.findIndex((season) => Number(season.ano) === Number(state.data.temporadaPadrao));
    const requested = state.data.temporadas.findIndex((season) => Number(season.ano) === requestedYear);
    state.seasonIndex = requested >= 0 ? requested : (preferred >= 0 ? preferred : 0);
    state.stageIndex = requestedStage
      ? Math.max(0, currentSeason().etapas.findIndex((stage) => Number(stage.numero) === requestedStage))
      : chooseDefaultStage(currentSeason());

    bindEvents();
    renderAll();

    const draft = readDraft();
    if (draft && draft.data) {
      const banner = $("#draft-banner");
      const text = $("#draft-banner-text");
      if (banner && text) {
        const date = new Date(draft.savedAt || Date.now());
        text.textContent = `Existe um rascunho salvo em ${date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Restaurar?`;
        banner.hidden = false;
      }
    } else {
      setStatus("Dados do arquivo publicado", "saved");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

