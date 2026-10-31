/* ============================================================
   POKER DE QUINTA — TEMPORADA 2027
   Aplicação: navegação, carrossel, ranking, histórico, loja e PWA
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.PQ_DATA;
  if (!DATA) {
    console.error("PQ_DATA não encontrado. Verifique js/data.js.");
    return;
  }

  const ROUTES = ["inicio", "ranking", "regulamento", "historico", "confirmar", "loja", "localizacao", "sobre", "contato"];
  const PAGE_TITLES = {
    inicio: "Poker de Quinta — Temporada 2027",
    ranking: "Ranking 2027 — Poker de Quinta",
    regulamento: "Regulamento 2027 — Poker de Quinta",
    historico: "Histórico das etapas — Poker de Quinta",
    confirmar: "Confirmação de presença — Poker de Quinta",
    loja: "Loja — Poker de Quinta",
    localizacao: "Localização — Poker de Quinta",
    sobre: "Sobre o clube — Poker de Quinta",
    contato: "Contato — Poker de Quinta",
  };
  const WA_NUMBER = DATA.site.whatsapp;
  const STORAGE_CART = "pq2027-cart-v1";
  const TZ = "America/Sao_Paulo";
  const SUITS = ["spade", "heart", "diamond", "club"];
  const SUIT_CHAR = { spade: "♠", heart: "♥", diamond: "♦", club: "♣" };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const state = {
    route: "inicio",
    ranking: [],
    previousRanking: [],
    carouselIndex: 0,
    carouselAutoplay: !reducedMotion.matches,
    carouselHover: false,
    carouselFocused: false,
    autoplayTimer: null,
    carouselInitialized: false,
    rankQuery: "",
    rankSort: "points",
    rankTop8Only: false,
    historyYear: 2027,
    historyFilter: "all",
    shopFilter: "Todos",
    selectedSizes: {},
    cart: [],
    deferredPrompt: null,
    focusReturn: null,
    pendingScroll: null,
    toastTimeouts: new Set(),
    swReloading: false,
    countdownInterval: null,
    firebaseData: null,
    firebaseSource: null,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {};

  /* ============================================================
     UTILIDADES
     ============================================================ */
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function icon(name, className = "") {
    return `<svg class="icon ${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  function getStage(id) {
    return DATA.stages.find((stage) => stage.id === Number(id));
  }

  function getPlayer(id) {
    return DATA.players.find((player) => player.id === id);
  }

  function playerName(id) {
    const player = getPlayer(id);
    return player ? player.name : "—";
  }

  function initials(name) {
    return name
      .replace(/["“”]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function avatarMarkup(player, className) {
    const fallback = `<span class="avatar-initials">${escapeHTML(initials(player.name))}</span>`;
    if (player.photo) {
      return `<span class="${className} has-photo">
        <img src="${escapeHTML(player.photo)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.classList.remove('has-photo');this.remove()">
        ${fallback}
      </span>`;
    }
    return `<span class="${className}">${escapeHTML(initials(player.name))}</span>`;
  }

  function dateParts(iso) {
    const date = new Date(iso);
    const parts = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    }).formatToParts(date);
    const map = {};
    parts.forEach((part) => { map[part.type] = part.value; });
    return {
      date,
      day: map.day,
      month: String(map.month || "").replace(".", "").toUpperCase(),
      year: map.year,
      weekday: map.weekday,
      hour: map.hour,
      minute: map.minute,
    };
  }

  function shortDate(iso) {
    const parts = dateParts(iso);
    return `${parts.day} ${parts.month} ${parts.year}`;
  }

  function longDate(iso) {
    const parts = dateParts(iso);
    return `${parts.weekday}, ${parts.day} de ${new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      timeZone: TZ,
    }).format(parts.date)} de ${parts.year}`;
  }

  function shortWeekday(iso) {
    const weekday = dateParts(iso).weekday || "";
    return weekday.replace("-feira", "");
  }

  function timeLabel(iso) {
    const parts = dateParts(iso);
    return `${parts.hour}h${parts.minute === "00" ? "" : parts.minute}`;
  }

  function waUrl(message) {
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function hydrateWhatsApp(root = document) {
    $$("[data-whatsapp]", root).forEach((element) => {
      const message = element.getAttribute("data-whatsapp") || "Olá! Vim pelo site do Poker de Quinta.";
      element.setAttribute("href", waUrl(message));
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener");
    });
  }

  function monthName(date) {
    return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: TZ }).format(date);
  }

  function ordinal(position) {
    return `${position}º`;
  }

  function pointsForPosition(position) {
    return DATA.pointsByPosition[position - 1] || 30;
  }

  function stageStatusMeta(stage) {
    if (stage.status === "completed") {
      return { label: "Concluída", className: "badge--completed", icon: "check" };
    }
    if (stage.status === "next") {
      return { label: "Próxima etapa", className: "badge--next", icon: "calendar" };
    }
    if (stage.status === "final") {
      return { label: "Grande final", className: "badge--final", icon: "trophy" };
    }
    return { label: "Em breve", className: "badge--upcoming", icon: "calendar" };
  }

  function stageBadge(stage) {
    const meta = stageStatusMeta(stage);
    return `<span class="badge ${meta.className}">${icon(meta.icon)}${meta.label}</span>`;
  }

  function stageWinner(stage) {
    return stage.results.length ? getPlayer(stage.results[0]) : null;
  }

  function stageInviteMessage(stage) {
    return `Olá! Quero reservar uma cadeira para a Etapa ${pad(stage.id)} — ${stage.name}, em ${shortDate(stage.date)}.`;
  }

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function normalizeSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }

  /* ============================================================
     RANKING — CÁLCULO
     ============================================================ */
  function computeRanking(throughStage) {
    const completed = DATA.stages
      .filter((stage) => stage.status === "completed" && stage.id <= throughStage)
      .sort((a, b) => a.id - b.id);

    const rows = DATA.players.map((player) => {
      const results = [];
      let points = 0;
      let wins = 0;
      let finalTables = 0;

      completed.forEach((stage) => {
        const index = stage.results.indexOf(player.id);
        if (index === -1) return;
        const position = index + 1;
        const stagePoints = pointsForPosition(position);
        points += stagePoints;
        if (position === 1) wins += 1;
        if (position <= 8) finalTables += 1;
        results.push({ stageId: stage.id, position, points: stagePoints });
      });

      const lastResult = results[results.length - 1] || null;

      return {
        ...player,
        points,
        wins,
        finalTables,
        played: results.length,
        results,
        lastPosition: lastResult ? lastResult.position : null,
      };
    });

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.finalTables !== a.finalTables) return b.finalTables - a.finalTables;
      if ((a.lastPosition || 99) !== (b.lastPosition || 99)) return (a.lastPosition || 99) - (b.lastPosition || 99);
      return a.name.localeCompare(b.name, "pt-BR");
    });

    rows.forEach((row, index) => {
      row.rank = index + 1;
      row.qualified = row.rank <= 8;
    });

    return rows;
  }

  function setupRanking() {
    state.ranking = computeRanking(DATA.site.rankingUpdatedAfter);
    state.previousRanking = computeRanking(Math.max(1, DATA.site.rankingUpdatedAfter - 1));
    state.ranking.forEach((row) => {
      const previous = state.previousRanking.find((item) => item.id === row.id);
      row.movement = previous ? previous.rank - row.rank : 0;
    });
  }

  /* ============================================================
     RENDER — CARROSSEL
     ============================================================ */
  function miniCard(rank, suit, extraClass, withLogo = false) {
    const suitName = SUITS.includes(suit) ? suit : "spade";
    return `<div class="stage-mini-card ${extraClass}">
      <span>${escapeHTML(rank)}</span>
      ${withLogo
        ? `<span class="stage-mini-card__logo"><img src="${escapeHTML(DATA.site.logo)}" alt=""></span>`
        : `<span class="stage-mini-card__pip">${icon(suitName)}</span>`}
      <span class="stage-mini-card__season">TEMPORADA<br>2027</span>
    </div>`;
  }

  function stageSlideMarkup(stage) {
    const status = stageStatusMeta(stage);
    const completed = stage.status === "completed";
    const isNext = stage.status === "next";
    const leftSuit = SUITS[(stage.id + 1) % SUITS.length];
    const rightSuit = SUITS[(stage.id + 2) % SUITS.length];
    const invite = stageInviteMessage(stage);
    const titleId = `stage-${stage.id}-title`;
    const actionMarkup = completed
      ? `<button class="btn btn--primary btn--sm" type="button" data-stage-open="${stage.id}">
           Ver mesa final ${icon("arrow-right")}
         </button>
         <span class="stage-slide__link">${icon("trophy")} Etapa encerrada</span>`
      : isNext
        ? `<a class="btn btn--primary btn--sm" href="#" data-whatsapp="${escapeHTML(invite)}">
             Reservar cadeira ${icon("arrow-up-right")}
           </a>
           <button class="btn btn--ghost btn--sm" type="button" data-stage-open="${stage.id}">Detalhes</button>`
        : `<button class="btn btn--ghost btn--sm" type="button" data-stage-open="${stage.id}">
             Detalhes da etapa ${icon("arrow-right")}
           </button>
           <a class="stage-slide__link" href="assets/poker-de-quinta-2027.ics" download>
             ${icon("calendar")} Salvar data
           </a>`;

    return `<article
      class="stage-slide"
      role="group"
      aria-roledescription="slide"
      aria-label="Etapa ${stage.id} de ${DATA.stages.length}"
      data-slide="${stage.id}"
      style="--accent:${stage.accent};"
    >
      <div class="stage-slide__art">
        <span class="stage-slide__watermark" aria-hidden="true">${pad(stage.id)}</span>
        <div class="stage-slide__badge"><span>ETAPA</span><strong>${pad(stage.id)}</strong></div>
        <span class="stage-slide__motif" aria-hidden="true">${icon(stage.motif)}</span>
        <div class="stage-card-fan" aria-hidden="true">
          ${miniCard("A", leftSuit, "stage-mini-card--left")}
          ${miniCard(stage.rank, stage.motif === "trophy" ? "spade" : stage.motif, "stage-mini-card--center", true)}
          ${miniCard("K", rightSuit, "stage-mini-card--right")}
        </div>
        <span class="stage-slide__venue">${icon("pin")} ${escapeHTML(DATA.site.venue)} · ${escapeHTML(DATA.site.city)}</span>
      </div>
      <div class="stage-slide__content">
        <div class="stage-slide__meta">
          <span class="badge ${status.className}">${icon(status.icon)}${status.label}</span>
          <span class="stage-slide__meta-date">${shortDate(stage.date)} · ${timeLabel(stage.date)}</span>
        </div>
        <p class="stage-slide__kicker">${escapeHTML(stage.kicker)}</p>
        <h3 id="${titleId}">${escapeHTML(stage.name)}</h3>
        <p class="stage-slide__desc">${escapeHTML(stage.description)}</p>
        <div class="stage-slide__facts">
          <div class="stage-fact"><span>Buy-in</span><strong>${escapeHTML(DATA.site.buyIn)}</strong></div>
          <div class="stage-fact"><span>Início</span><strong>${timeLabel(stage.date)}</strong></div>
          <div class="stage-fact"><span>Formato</span><strong>${stage.status === "final" ? "Top 8 da temporada" : "16 lugares · NLHE"}</strong></div>
        </div>
        <div class="stage-slide__actions">${actionMarkup}</div>
      </div>
    </article>`;
  }

  function renderCarousel() {
    const track = els.stageTrack;
    if (!track) return;

    track.innerHTML = DATA.stages.map(stageSlideMarkup).join("");
    els.carouselDots.innerHTML = DATA.stages
      .map((stage, index) => `<button
        class="carousel-dot${index === 0 ? " is-active" : ""}"
        type="button"
        data-carousel-to="${index}"
        aria-label="Etapa ${pad(stage.id)}: ${escapeHTML(stage.name)}"
        aria-pressed="${index === 0}"
      ></button>`)
      .join("");

    updateCarousel(0, false);
  }

  function updateCarousel(index, animate = true) {
    const track = els.stageTrack;
    if (!track || !track.children.length) return;

    const total = track.children.length;
    state.carouselIndex = ((index % total) + total) % total;

    Array.from(track.children).forEach((slide, slideIndex) => {
      const isActive = slideIndex === state.carouselIndex;
      slide.classList.toggle("is-active", isActive);
      slide.toggleAttribute("inert", !isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    $$(".carousel-dot", els.carouselDots).forEach((dot, dotIndex) => {
      const isActive = dotIndex === state.carouselIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });

    const firstSlide = track.children[0];
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
    const distance = firstSlide.getBoundingClientRect().width + gap;

    if (!animate) track.style.transition = "none";
    track.style.transform = `translate3d(-${distance * state.carouselIndex}px, 0, 0)`;
    if (!animate) {
      requestAnimationFrame(() => { track.style.transition = ""; });
    }

    if (els.carouselCounter) {
      els.carouselCounter.textContent = `${pad(state.carouselIndex + 1)} / ${pad(total)}`;
    }

    if (els.carouselLive) {
      const stage = DATA.stages[state.carouselIndex];
      if (stage) els.carouselLive.textContent = `Etapa ${stage.id} de ${total}: ${stage.name}, ${shortDate(stage.date)}.`;
    }

    const activeSlide = track.children[state.carouselIndex];
    if (activeSlide) activeSlide.removeAttribute("inert");
  }

  function startAutoplayTimer() {
    clearTimeout(state.autoplayTimer);
    if (!state.carouselAutoplay || state.carouselHover || state.carouselFocused || document.hidden || state.route !== "inicio" || isAnyOverlayOpen()) return;
    state.autoplayTimer = window.setTimeout(() => {
      if (isAnyOverlayOpen() || state.route !== "inicio" || document.hidden) return;
      updateCarousel(state.carouselIndex + 1, true);
      startAutoplayTimer();
    }, 7200);
  }

  function syncAutoplayButton() {
    if (!els.carouselAutoplay) return;
    const paused = !state.carouselAutoplay;
    els.carouselAutoplay.setAttribute("aria-pressed", String(paused));
    els.carouselAutoplay.setAttribute("aria-label", paused ? "Retomar carrossel" : "Pausar carrossel");
    els.carouselAutoplay.innerHTML = `${icon(paused ? "play" : "pause")}<span>${paused ? "Retomar" : "Pausar"}</span>`;
  }

  function initCarousel() {
    if (!els.stageCarousel || state.carouselInitialized) return;
    state.carouselInitialized = true;

    els.stageViewport.setAttribute("tabindex", "0");
    els.carouselPrev?.addEventListener("click", () => {
      updateCarousel(state.carouselIndex - 1);
      startAutoplayTimer();
    });
    els.carouselNext?.addEventListener("click", () => {
      updateCarousel(state.carouselIndex + 1);
      startAutoplayTimer();
    });
    els.carouselDots?.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-carousel-to]");
      if (!dot) return;
      updateCarousel(Number(dot.dataset.carouselTo));
      startAutoplayTimer();
    });
    els.carouselAutoplay?.addEventListener("click", () => {
      state.carouselAutoplay = !state.carouselAutoplay;
      syncAutoplayButton();
      startAutoplayTimer();
    });

    els.stageCarousel.addEventListener("mouseenter", () => {
      state.carouselHover = true;
      clearTimeout(state.autoplayTimer);
    });
    els.stageCarousel.addEventListener("mouseleave", () => {
      state.carouselHover = false;
      startAutoplayTimer();
    });
    els.stageCarousel.addEventListener("focusin", () => {
      state.carouselFocused = true;
      clearTimeout(state.autoplayTimer);
    });
    els.stageCarousel.addEventListener("focusout", (event) => {
      if (!els.stageCarousel.contains(event.relatedTarget)) {
        state.carouselFocused = false;
        startAutoplayTimer();
      }
    });

    els.stageCarousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateCarousel(state.carouselIndex - 1);
        startAutoplayTimer();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        updateCarousel(state.carouselIndex + 1);
        startAutoplayTimer();
      }
    });

    let pointerStart = null;
    els.stageViewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    els.stageViewport.addEventListener("pointerup", (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        updateCarousel(state.carouselIndex + (dx < 0 ? 1 : -1));
        startAutoplayTimer();
      }
    });
    els.stageViewport.addEventListener("pointercancel", () => { pointerStart = null; });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(state.autoplayTimer);
      } else {
        startAutoplayTimer();
      }
    });

    window.addEventListener("resize", debounce(() => {
      updateCarousel(state.carouselIndex, false);
    }, 120));

    reducedMotion.addEventListener("change", (event) => {
      state.carouselAutoplay = !event.matches;
      syncAutoplayButton();
      startAutoplayTimer();
    });

    syncAutoplayButton();
    startAutoplayTimer();
  }

  /* ============================================================
     RENDER — PRÓXIMA ETAPA E COUNTDOWN
     ============================================================ */
  function renderNextStage() {
    const stage = getStage(DATA.site.nextStageId);
    if (!stage) return;

    els.nextStageNumber.textContent = pad(stage.id);
    els.nextStageDate.textContent = `${longDate(stage.date).toUpperCase()} · ${timeLabel(stage.date).toUpperCase()}`;
    els.nextStageTitle.textContent = stage.name;
    els.nextStageKicker.textContent = stage.kicker;
    els.nextStageDesc.textContent = stage.description;

    const reserve = els.nextStageReserve;
    if (reserve) {
      reserve.href = waUrl(stageInviteMessage(stage));
      reserve.target = "_blank";
      reserve.rel = "noopener";
    }

    const countdownDate = els.countdownDate;
    if (countdownDate) {
      const parts = dateParts(stage.date);
      countdownDate.textContent = `${parts.day} ${parts.month} ${parts.year} · ${parts.hour}H${parts.minute}`;
    }

    const drawer = els.drawerNext;
    if (drawer) {
      const number = $(".drawer-next__number", drawer);
      const strong = $(".drawer-next__row strong", drawer);
      const span = $(".drawer-next__row div span", drawer);
      if (number) number.textContent = pad(stage.id);
      if (strong) strong.textContent = stage.name;
      if (span) span.textContent = `${shortDate(stage.date)} · ${timeLabel(stage.date).toUpperCase()}`;
    }

    const target = new Date(stage.date).getTime();
    const units = {
      days: $("[data-countdown='days']"),
      hours: $("[data-countdown='hours']"),
      minutes: $("[data-countdown='minutes']"),
      seconds: $("[data-countdown='seconds']"),
    };

    function tick() {
      const diff = Math.max(0, target - Date.now());
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff / 3600000) % 24);
      const minutes = Math.floor((diff / 60000) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      if (units.days) units.days.textContent = String(days).padStart(2, "0");
      if (units.hours) units.hours.textContent = pad(hours);
      if (units.minutes) units.minutes.textContent = pad(minutes);
      if (units.seconds) units.seconds.textContent = pad(seconds);
    }

    tick();
    if (state.countdownInterval) window.clearInterval(state.countdownInterval);
    state.countdownInterval = window.setInterval(tick, 1000);
  }

  /* ============================================================
     RENDER — HOME / RANKING / HALL
     ============================================================ */
  function renderHomeLeaders() {
    if (!els.homeLeaders) return;
    const top = state.ranking.slice(0, 3);
    els.homeLeaders.innerHTML = top.map((player, index) => `<button
      class="leader-card${index === 0 ? " leader-card--first" : ""}"
      type="button"
      data-player-open="${player.id}"
      aria-label="Ver perfil de ${escapeHTML(player.name)}"
    >
      <span class="leader-card__rank">${player.rank}</span>
      <span class="leader-card__top">
        ${avatarMarkup(player, "leader-card__avatar")}
        <span>
          <span class="leader-card__name">${escapeHTML(player.name)}</span>
          <span class="leader-card__city">${escapeHTML(player.city)} · ${escapeHTML(player.uf)}</span>
        </span>
      </span>
      <span class="leader-card__points">
        <strong>${formatNumber(player.points)}</strong><span>pts</span>
      </span>
      <span class="leader-card__meta">
        ${player.wins} ${player.wins === 1 ? "vitória" : "vitórias"}
        <span class="dot"></span>
        ${player.finalTables} ${player.finalTables === 1 ? "mesa final" : "mesas finais"}
      </span>
      <span class="leader-card__arrow">${icon("arrow-up-right")}</span>
    </button>`).join("");
  }

  function renderPodium() {
    if (!els.rankingPodium) return;
    const top = state.ranking.slice(0, 3);
    els.rankingPodium.innerHTML = top.map((player, index) => `<button
      class="podium-card podium-card--${index + 1}"
      type="button"
      data-player-open="${player.id}"
      aria-label="Ver perfil de ${escapeHTML(player.name)}, ${ordinal(player.rank)} lugar"
    >
      <span class="podium-card__top">
        <span class="podium-card__label">${index === 0 ? icon("trophy") + "Líder" : index === 1 ? "2º lugar" : "3º lugar"}</span>
        <span class="podium-card__rank">${index + 1}</span>
      </span>
      ${avatarMarkup(player, "podium-card__avatar")}
      <span class="podium-card__name">${escapeHTML(player.name)}</span>
      <span class="podium-card__city">${escapeHTML(player.city)} · ${escapeHTML(player.uf)}</span>
      <span class="podium-card__stats">
        <strong>${formatNumber(player.points)}</strong><span>pontos</span>
        <span class="podium-card__meta"><b>${player.wins}</b> ${player.wins === 1 ? "vitória" : "vitórias"}<br><b>${player.finalTables}</b> ${player.finalTables === 1 ? "mesa final" : "mesas finais"}</span>
      </span>
    </button>`).join("");
  }

  function movementLabel(movement) {
    if (movement > 0) {
      return `<span class="trend trend--up" title="Subiu ${movement} ${movement === 1 ? "posição" : "posições"}" aria-label="Subiu ${movement} ${movement === 1 ? "posição" : "posições"}">↑${movement}</span>`;
    }
    if (movement < 0) {
      return `<span class="trend trend--down" title="Desceu ${Math.abs(movement)} ${Math.abs(movement) === 1 ? "posição" : "posições"}" aria-label="Desceu ${Math.abs(movement)} ${Math.abs(movement) === 1 ? "posição" : "posições"}">↓${Math.abs(movement)}</span>`;
    }
    return `<span class="trend trend--same" title="Manteve a posição" aria-label="Manteve a posição">—</span>`;
  }

  function filteredRanking() {
    const query = normalizeSearch(state.rankQuery);
    let rows = state.ranking.slice();

    if (query) {
      rows = rows.filter((row) => {
        const haystack = normalizeSearch(`${row.name} ${row.city} ${row.uf} ${row.nickname}`);
        return haystack.includes(query);
      });
    }

    if (state.rankTop8Only) rows = rows.filter((row) => row.qualified);

    if (state.rankSort === "wins") {
      rows.sort((a, b) => b.wins - a.wins || b.points - a.points || a.name.localeCompare(b.name, "pt-BR"));
    } else if (state.rankSort === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else {
      rows.sort((a, b) => a.rank - b.rank);
    }

    return rows;
  }

  function renderRankingTable() {
    if (!els.rankingBody) return;
    const rows = filteredRanking();
    const completedCount = DATA.stages.filter((stage) => stage.status === "completed").length;

    els.rankingBody.innerHTML = rows.map((player) => `<tr class="${player.qualified ? "is-qualified" : ""}">
      <td class="ranking-pos">${pad(player.rank)}</td>
      <td>
        <div class="ranking-player">
          ${avatarMarkup(player, "ranking-player__avatar")}
          <span class="ranking-player__copy">
            <button class="ranking-player__name" type="button" data-player-open="${player.id}">${escapeHTML(player.name)}</button>
            <span class="ranking-player__city">${escapeHTML(player.city)} · ${escapeHTML(player.uf)}${player.wins ? ` · ${player.wins} ${player.wins === 1 ? "vitória" : "vitórias"}` : ""}</span>
          </span>
        </div>
      </td>
      <td class="center col-stages">${player.played}/${completedCount}</td>
      <td class="center col-wins">${player.wins}</td>
      <td class="center"><span class="ranking-points">${formatNumber(player.points)}</span></td>
      <td class="center col-last">
        <span class="ranking-last">${player.lastPosition ? ordinal(player.lastPosition) : "—"}</span>
        ${movementLabel(player.movement)}
      </td>
      <td>
        <button class="row-open" type="button" data-player-open="${player.id}" aria-label="Ver detalhes de ${escapeHTML(player.name)}">
          ${icon("chevron-right")}
        </button>
      </td>
    </tr>`).join("");

    const table = $(".ranking-table", els.rankingPanel || document);
    if (table) table.hidden = rows.length === 0;
    if (els.rankingEmpty) els.rankingEmpty.hidden = rows.length !== 0;
    if (els.rankingCount) {
      els.rankingCount.textContent = rows.length === state.ranking.length
        ? `${rows.length} jogadores na classificação`
        : `${rows.length} de ${state.ranking.length} jogadores exibidos`;
    }
    hydrateWhatsApp(els.rankingBody);
  }

  function renderChampions() {
    if (!els.championsGrid) return;
    els.championsGrid.innerHTML = DATA.pastSeasons.map((season) => {
      const champion = getPlayer(season.championId);
      if (!champion) return "";
      return `<article class="champion-card">
        <span class="champion-card__year">${season.year}</span>
        <div class="champion-card__info">
          <span class="champion-card__label">Campeão da temporada</span>
          <h3 class="champion-card__name">${escapeHTML(champion.name)}</h3>
          <p class="champion-card__stats">${formatNumber(Number(String(season.points).replace(".", "")))} pts · ${season.stages} etapas · ${escapeHTML(season.prizePool)}</p>
        </div>
        <span class="champion-card__trophy">${icon("trophy")}</span>
      </article>`;
    }).join("");
  }

  /* ============================================================
     FIREBASE — DATAS, FOTOS E CONFIRMAÇÃO DE PRESENÇA
     ============================================================ */
  function firebaseDateToISO(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T20:00:00-03:00`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : raw;
  }

  function firebaseDateOnly(value) {
    const iso = firebaseDateToISO(value);
    return iso ? shortDate(iso) : "—";
  }

  function firebaseDateTime(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    const parts = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    }).formatToParts(parsed).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return `${parts.day} ${String(parts.month || "").replace(".", "").toUpperCase()} · ${parts.hour}h${parts.minute}`;
  }

  function updateRankingUpdatedMeta() {
    const updatedStage = getStage(DATA.site.rankingUpdatedAfter);
    if (!updatedStage) return;
    const updatedLabel = $("#ranking-updated-stage");
    const updatedDate = $("#ranking-updated-date");
    if (updatedLabel) updatedLabel.textContent = `Etapa ${pad(updatedStage.id)}`;
    if (updatedDate) updatedDate.textContent = `${shortDate(updatedStage.date)} · 23h58`;
  }

  function applyFirebasePhotos(photos) {
    if (!photos || typeof photos !== "object") return false;
    const photoMap = new Map();
    Object.entries(photos).forEach(([name, url]) => {
      if (typeof url !== "string") return;
      const clean = url.trim();
      if (!clean || clean.includes("avatar/00000000000000000000000000000000")) return;
      photoMap.set(normalizeSearch(name), clean);
    });

    let changed = false;
    DATA.players.forEach((player) => {
      if (player.photo) return;
      const candidates = [player.photoKey, player.name, player.nickname].filter(Boolean);
      for (const candidate of candidates) {
        const url = photoMap.get(normalizeSearch(candidate));
        if (url) {
          player.photo = url;
          changed = true;
          break;
        }
      }
    });

    if (changed) {
      setupRanking();
      renderHomeLeaders();
      renderPodium();
      renderRankingTable();
    }
    return changed;
  }

  function applyFirebaseSeason(season, liveConfig) {
    const seasonData = season && typeof season === "object" ? season : null;
    const seasonConfig = seasonData && seasonData.config ? seasonData.config : null;
    const seasonEtapas = seasonData && seasonData.etapas
      ? seasonData.etapas
      : Array.isArray(seasonData) ? seasonData : null;

    let config = seasonConfig;
    if (!config && liveConfig && String(liveConfig.dataEvento || "").startsWith(`${DATA.site.season}-`)) {
      config = liveConfig;
    }
    if (!config && !seasonEtapas) return false;

    let changed = false;

    if (seasonEtapas) {
      const entries = Array.isArray(seasonEtapas)
        ? seasonEtapas
        : Object.entries(seasonEtapas).map(([key, value]) => ({ ...(value || {}), _key: key }));
      entries.forEach((entry) => {
        if (!entry) return;
        const number = Number(entry.numero ?? entry.etapa ?? entry._key);
        const stage = getStage(number);
        if (!stage) return;
        const dateValue = entry.data ?? entry.dataEvento ?? entry.date;
        if (dateValue) {
          const iso = firebaseDateToISO(dateValue);
          if (iso && iso !== stage.date) {
            stage.date = iso;
            changed = true;
          }
        }
        if (["completed", "next", "upcoming", "final"].includes(entry.status) && stage.status !== entry.status) {
          stage.status = entry.status;
          changed = true;
        }
      });
    }

    if (config) {
      const number = Number(config.proximaEtapa ?? config.etapa);
      const stage = getStage(number);
      if (stage) {
        if (DATA.site.nextStageId !== number) {
          DATA.site.nextStageId = number;
          changed = true;
        }
        if (config.dataEvento) {
          const iso = firebaseDateToISO(config.dataEvento);
          if (iso && stage.date !== iso) {
            stage.date = iso;
            changed = true;
          }
        }
      }
      if (config.rankingUpdatedAfter) {
        const updatedAfter = Number(config.rankingUpdatedAfter);
        if (updatedAfter && getStage(updatedAfter) && DATA.site.rankingUpdatedAfter !== updatedAfter) {
          DATA.site.rankingUpdatedAfter = updatedAfter;
          changed = true;
          setupRanking();
          renderHomeLeaders();
          renderPodium();
          renderRankingTable();
        }
      }
    }

    if (!changed) return false;

    const previousIndex = state.carouselIndex;
    renderCarousel();
    updateCarousel(previousIndex, false);
    renderNextStage();
    renderHistory();
    updateRankingUpdatedMeta();
    renderConfirmPage();
    hydrateWhatsApp();
    return true;
  }

  function renderConfirmPage() {
    if (!els.confirmStage) return;
    const data = state.firebaseData;
    const liveConfig = data && data.season && data.season.config
      ? data.season.config
      : data && data.liveConfig ? data.liveConfig : null;
    const stageNumber = Number(liveConfig && (liveConfig.etapa ?? liveConfig.proximaEtapa));
    const stage = getStage(stageNumber) || getStage(DATA.site.nextStageId);
    const eventDate = liveConfig && liveConfig.dataEvento ? liveConfig.dataEvento : stage ? stage.date : null;
    const open = liveConfig ? Boolean(liveConfig.inscricoesAbertas) : null;

    els.confirmStage.textContent = stageNumber ? `Etapa ${pad(stageNumber)}` : stage ? `Etapa ${pad(stage.id)}` : "Etapa a confirmar";
    els.confirmDate.textContent = eventDate ? firebaseDateOnly(eventDate) : "Data a confirmar";
    els.confirmOpening.textContent = liveConfig && liveConfig.dataAbertura
      ? firebaseDateTime(liveConfig.dataAbertura)
      : "Definida pela organização";

    if (open === null) {
      els.confirmStatus.textContent = "Status não informado";
      els.confirmStatus.className = "badge badge--upcoming";
    } else {
      els.confirmStatus.textContent = open ? "Inscrições abertas" : "Inscrições fechadas";
      els.confirmStatus.className = `badge ${open ? "badge--open" : "badge--closed"}`;
    }

    if (els.confirmSource) {
      const source = state.firebaseSource;
      els.confirmSource.textContent = source === "network"
        ? "Firebase · ao vivo"
        : source === "cache"
          ? "Firebase · sincronizado"
          : source === "cache-offline"
            ? "Firebase · offline"
            : source === "error"
              ? "Firebase · indisponível"
              : "Firebase · verificando";
      els.confirmSource.dataset.source = source || "";
    }

    if (els.confirmOpen) {
      els.confirmOpen.href = DATA.site.confirmUrl;
      els.confirmOpen.target = "_blank";
      els.confirmOpen.rel = "noopener";
    }
    if (els.confirmOpenTop) {
      els.confirmOpenTop.href = DATA.site.confirmUrl;
      els.confirmOpenTop.target = "_blank";
      els.confirmOpenTop.rel = "noopener";
    }
  }

  function initConfirmPage() {
    const sync = () => {
      const offline = !navigator.onLine;
      if (els.confirmEmbed) els.confirmEmbed.classList.toggle("is-offline", offline);
      if (els.confirmOffline) els.confirmOffline.hidden = !offline;
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
  }

  async function initFirebaseData() {
    if (!window.PQFirebase || !window.PQFirebase.enabled) {
      renderConfirmPage();
      return;
    }
    try {
      const data = await window.PQFirebase.load();
      state.firebaseData = data;
      state.firebaseSource = data.source;
      document.body.dataset.firebaseSource = data.source || "";
      applyFirebasePhotos(data.photos);
      applyFirebaseSeason(data.season, data.liveConfig);
    } catch (error) {
      state.firebaseSource = "error";
      document.body.dataset.firebaseSource = "error";
    }
    renderConfirmPage();
  }

  function initRankingControls() {
    els.rankingSearch?.addEventListener("input", (event) => {
      state.rankQuery = event.target.value;
      renderRankingTable();
    });
    els.rankingSort?.addEventListener("change", (event) => {
      state.rankSort = event.target.value;
      renderRankingTable();
    });
    els.rankingFilter?.addEventListener("click", () => {
      state.rankTop8Only = !state.rankTop8Only;
      els.rankingFilter.setAttribute("aria-pressed", String(state.rankTop8Only));
      els.rankingFilter.classList.toggle("is-active", state.rankTop8Only);
      renderRankingTable();
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-clear-ranking]")) {
        state.rankQuery = "";
        state.rankSort = "points";
        state.rankTop8Only = false;
        if (els.rankingSearch) els.rankingSearch.value = "";
        if (els.rankingSort) els.rankingSort.value = "points";
        if (els.rankingFilter) {
          els.rankingFilter.setAttribute("aria-pressed", "false");
          els.rankingFilter.classList.remove("is-active");
        }
        renderRankingTable();
      }
    });
  }

  /* ============================================================
     RENDER — REGULAMENTO
     ============================================================ */
  function renderRulesPoints() {
    if (!els.rulesPointsBody) return;
    const rows = [];
    for (let index = 0; index < 8; index += 1) {
      const left = index + 1;
      const right = index + 9;
      rows.push(`<tr>
        <td>${ordinal(left)}</td><td>${formatNumber(pointsForPosition(left))} pts</td>
        <td>${ordinal(right)}</td><td>${formatNumber(pointsForPosition(right))} pts</td>
      </tr>`);
    }
    els.rulesPointsBody.innerHTML = rows.join("");
  }

  /* ============================================================
     RENDER — HISTÓRICO
     ============================================================ */
  function renderHistorySummary() {
    if (!els.historySummary) return;

    if (state.historyYear === 2027) {
      const leader = state.ranking[0];
      const completed = DATA.stages.filter((stage) => stage.status === "completed").length;
      const remaining = DATA.stages.length - completed;
      const prizeAwarded = DATA.stages
        .filter((stage) => stage.status === "completed")
        .reduce((total, stage) => total + stage.prizePool, 0);
      els.historySummary.innerHTML = `<div class="season-summary">
        <div class="season-summary__copy">
          <p class="season-summary__eyebrow">Temporada em andamento</p>
          <h2>${completed} de ${DATA.stages.length} etapas concluídas. Ainda há muita mesa pela frente.</h2>
          <p>${escapeHTML(leader.name)} lidera com ${formatNumber(leader.points)} pontos, mas a diferença no topo é de apenas 30 pontos. As próximas quatro noites podem mudar tudo.</p>
        </div>
        <div class="season-summary__stats">
          <div class="season-summary__stat"><strong>${formatNumber(leader.points)}</strong><span>pontos do líder</span></div>
          <div class="season-summary__stat"><strong>${formatCurrency(prizeAwarded)}</strong><span>já premiados</span></div>
          <div class="season-summary__stat"><strong>${remaining}</strong><span>etapas restantes</span></div>
        </div>
      </div>`;
      return;
    }

    const season = DATA.pastSeasons.find((item) => item.year === state.historyYear);
    if (!season) {
      els.historySummary.innerHTML = "";
      return;
    }

    const champion = getPlayer(season.championId);
    const runnerUp = getPlayer(season.runnerUpId);
    const third = getPlayer(season.thirdId);

    els.historySummary.innerHTML = `<div class="archive-summary">
      <div class="archive-champion">
        <span class="archive-champion__year">Temporada ${season.year} · encerrada</span>
        <h2>${escapeHTML(champion.name)}</h2>
        <p class="archive-champion__label">Campeão da temporada</p>
        <div class="archive-champion__stats">
          <div><strong>${escapeHTML(season.points)}</strong><span>pontos</span></div>
          <div><strong>${season.stages}</strong><span>etapas</span></div>
          <div><strong>${escapeHTML(season.prizePool)}</strong><span>em prêmios</span></div>
        </div>
      </div>
      <div class="archive-podium" aria-label="Pódio da temporada ${season.year}">
        <div class="archive-podium__row"><span class="archive-podium__pos">1º</span><span class="archive-podium__name">${escapeHTML(champion.name)}</span><span class="archive-podium__pts">campeão</span></div>
        <div class="archive-podium__row"><span class="archive-podium__pos">2º</span><span class="archive-podium__name">${escapeHTML(runnerUp.name)}</span><span class="archive-podium__pts">vice-campeão</span></div>
        <div class="archive-podium__row"><span class="archive-podium__pos">3º</span><span class="archive-podium__name">${escapeHTML(third.name)}</span><span class="archive-podium__pts">3º lugar</span></div>
      </div>
    </div>`;
  }

  function renderHistoryTimeline() {
    if (!els.historyTimeline) return;

    if (state.historyYear !== 2027) {
      const season = DATA.pastSeasons.find((item) => item.year === state.historyYear);
      els.historyTimeline.innerHTML = season
        ? `<div class="archive-note">${escapeHTML(season.note)} <br><br>O arquivo completo de mesas finais desta temporada faz parte da memória da casa. Para rever resultados, fale com a organização.</div>`
        : "";
      return;
    }

    let stages = DATA.stages.slice();
    if (state.historyFilter === "completed") stages = stages.filter((stage) => stage.status === "completed");
    if (state.historyFilter === "upcoming") stages = stages.filter((stage) => stage.status !== "completed");

    if (!stages.length) {
      els.historyTimeline.innerHTML = `<div class="history-empty">Nenhuma etapa neste filtro por enquanto.</div>`;
      return;
    }

    els.historyTimeline.innerHTML = stages.map((stage) => {
      const status = stageStatusMeta(stage);
      const winner = stageWinner(stage);
      const itemClass = stage.status === "completed" ? "timeline-item--completed" : stage.status === "next" ? "timeline-item--next" : stage.status === "final" ? "timeline-item--final" : "";
      const action = stage.status === "completed"
        ? `<button class="btn btn--ghost btn--sm" type="button" data-stage-open="${stage.id}">Mesa final ${icon("arrow-right")}</button>`
        : stage.status === "next"
          ? `<a class="btn btn--primary btn--sm" href="#" data-whatsapp="${escapeHTML(stageInviteMessage(stage))}">Reservar ${icon("arrow-up-right")}</a>`
          : `<button class="btn btn--ghost btn--sm" type="button" data-stage-open="${stage.id}">Detalhes ${icon("arrow-right")}</button>`;

      const result = stage.status === "completed"
        ? `<div class="timeline-result">
            <span>${icon("trophy")} Campeão <strong>${escapeHTML(winner ? winner.name : "—")}</strong></span>
            <span>${icon("users")} 16 jogadores</span>
            <span>${icon("ticket")} ${formatCurrency(stage.prizePool)} em jogo</span>
          </div>`
        : `<div class="timeline-result">
            <span>${icon(stage.status === "final" ? "trophy" : "calendar")} ${stage.status === "final" ? "Top 8 da temporada" : "Inscrições abertas para membros e convidados"}</span>
            <span>${icon("users")} ${stage.status === "final" ? "8 classificados" : "16 lugares"}</span>
            <span>${icon("ticket")} ${formatCurrency(stage.prizePool)} garantidos</span>
          </div>`;

      return `<article class="timeline-item ${itemClass}">
        <span class="timeline-item__marker">${pad(stage.id)}</span>
        <div class="timeline-card">
          <div class="timeline-date">
            <strong>${shortDate(stage.date)}</strong>
            <span>${escapeHTML(shortWeekday(stage.date))} · ${timeLabel(stage.date)}</span>
          </div>
          <div class="timeline-main">
            <div class="timeline-main__head">
              <h3>${escapeHTML(stage.name)}</h3>
              <span class="badge ${status.className}">${status.label}</span>
            </div>
            <p>${escapeHTML(stage.description)}</p>
            ${result}
          </div>
          <div class="timeline-action">${action}</div>
        </div>
      </article>`;
    }).join("");

    hydrateWhatsApp(els.historyTimeline);
  }

  function renderHistory() {
    $$(".season-tab", els.historyTabs).forEach((tab) => {
      const active = Number(tab.dataset.season) === state.historyYear;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    if (els.historyFilters) {
      els.historyFilters.hidden = state.historyYear !== 2027;
      $$("[data-history-filter]", els.historyFilters).forEach((button) => {
        const active = button.dataset.historyFilter === state.historyFilter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    renderHistorySummary();
    renderHistoryTimeline();
  }

  function initHistoryControls() {
    els.historyTabs?.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-season]");
      if (!tab) return;
      state.historyYear = Number(tab.dataset.season);
      state.historyFilter = "all";
      renderHistory();
    });

    els.historyFilters?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-filter]");
      if (!button) return;
      state.historyFilter = button.dataset.historyFilter;
      renderHistory();
    });
  }

  /* ============================================================
     RENDER — LOJA
     ============================================================ */
  function productArt(type) {
    const gold = "#e0b13a";
    const light = "#f5d472";
    const green = "#2a4531";
    const darkGreen = "#18301f";
    const cream = "#f4eedf";
    const common = `viewBox="0 0 220 220" role="img" aria-hidden="true" focusable="false"`;

    const spade = `<path d="M110 48c-3 12-27 23-27 43 0 17 17 23 27 11 10 12 27 6 27-11 0-20-24-31-27-43Z" fill="${light}"/><path d="M110 92c-1 10-6 18-13 24h26c-7-6-12-14-13-24Z" fill="${light}"/>`;

    switch (type) {
      case "shirt":
        return `<svg ${common}>
          <path d="M78 45 47 61 27 96l26 19 15-20v84h84V95l15 20 26-19-20-35-31-16c-5 16-20 23-42 23S83 61 78 45Z" fill="${green}" stroke="${gold}" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M78 45c5 15 17 22 32 22s27-7 32-22" fill="none" stroke="${light}" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="110" cy="119" r="26" fill="none" stroke="${gold}" stroke-opacity=".65"/>
          ${spade}
          <text x="110" y="176" text-anchor="middle" fill="${light}" font-family="Space Grotesk, sans-serif" font-size="8" letter-spacing="4">2027</text>
        </svg>`;
      case "deck":
        return `<svg ${common}>
          <g transform="rotate(-9 110 110)">
            <rect x="46" y="39" width="106" height="148" rx="8" fill="${darkGreen}" stroke="${gold}" stroke-width="2"/>
            <rect x="54" y="47" width="90" height="132" rx="5" fill="none" stroke="${gold}" stroke-opacity=".34"/>
            <path d="M64 56 140 168M140 56 64 168" stroke="${light}" stroke-opacity=".08"/>
            <path d="M110 83c-2 10-21 18-21 33 0 13 13 17 21 8 8 9 21 5 21-8 0-15-19-23-21-33Z" fill="${light}" fill-opacity=".65"/>
          </g>
          <g transform="rotate(8 110 110)">
            <rect x="71" y="30" width="103" height="144" rx="8" fill="${cream}" stroke="${gold}" stroke-width="1.7"/>
            <rect x="78" y="37" width="89" height="130" rx="5" fill="none" stroke="${gold}" stroke-opacity=".4"/>
            <text x="86" y="59" fill="${darkGreen}" font-family="Georgia, serif" font-size="24" font-weight="700">Q</text>
            <text x="86" y="78" fill="${darkGreen}" font-family="Georgia, serif" font-size="17">♠</text>
            <path d="M125 91c-2 9-20 17-20 31 0 12 12 16 20 7 8 9 20 5 20-7 0-14-18-22-20-31Z" fill="${gold}"/>
            <text x="150" y="163" text-anchor="end" fill="${darkGreen}" font-family="Georgia, serif" font-size="24" font-weight="700" transform="rotate(180 150 163)">Q</text>
          </g>
        </svg>`;
      case "cap":
        return `<svg ${common}>
          <path d="M37 121c5-40 32-67 73-67s68 27 73 67l-18 3c-3-27-19-45-55-45s-52 18-55 45l-18-3Z" fill="${green}" stroke="${gold}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M173 124c22 3 27 13 26 23-23 8-66 10-89 2-4-2-2-7 3-8 24-1 47-8 60-17Z" fill="${green}" stroke="${gold}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M110 58v20M110 78c-17 0-30 15-33 39" fill="none" stroke="${light}" stroke-opacity=".45" stroke-width="1.3"/>
          <path d="M110 86c-2 8-18 15-18 28 0 11 11 14 18 6 7 8 18 5 18-6 0-13-16-20-18-28Z" fill="${light}"/>
          <path d="M110 121c-1 7-4 12-9 16h18c-5-4-8-9-9-16Z" fill="${light}"/>
        </svg>`;
      case "glass":
        return `<svg ${common}>
          <path d="M73 45h74l-7 128c-.3 6-5 10-11 10H91c-6 0-10.7-4-11-10L73 45Z" fill="${darkGreen}" fill-opacity=".55" stroke="${gold}" stroke-width="2.2"/>
          <path d="M76 75h68l-5 90c-.2 4-3 7-7 7H88c-4 0-6.8-3-7-7L76 75Z" fill="#5f4a1d" fill-opacity=".55"/>
          <path d="M73 45h74" stroke="${light}" stroke-width="4" stroke-linecap="round"/>
          <path d="M82 81h56" stroke="${light}" stroke-width="1.5" stroke-opacity=".55"/>
          <path d="M110 99c-2 8-18 15-18 28 0 11 11 14 18 6 7 8 18 5 18-6 0-13-16-20-18-28Z" fill="${light}" fill-opacity=".9"/>
          <path d="M110 133c-1 8-5 13-10 18h20c-5-5-9-10-10-18Z" fill="${light}" fill-opacity=".9"/>
          <path d="M88 62v10" stroke="${light}" stroke-opacity=".45" stroke-linecap="round"/>
        </svg>`;
      case "poster":
        return `<svg ${common}>
          <rect x="50" y="30" width="120" height="160" rx="3" fill="${cream}" stroke="${gold}" stroke-width="2"/>
          <rect x="58" y="38" width="104" height="144" fill="none" stroke="${gold}" stroke-opacity=".4"/>
          <text x="67" y="62" fill="${darkGreen}" font-family="Georgia, serif" font-size="23" font-weight="700">Q</text>
          <text x="67" y="81" fill="${darkGreen}" font-family="Georgia, serif" font-size="17">♠</text>
          <path d="M110 95c-2 10-22 18-22 34 0 13 13 17 22 8 9 9 22 5 22-8 0-16-20-24-22-34Z" fill="${gold}"/>
          <path d="M110 132c-1 9-5 15-11 21h22c-6-6-10-12-11-21Z" fill="${gold}"/>
          <line x1="71" y1="165" x2="149" y2="165" stroke="${gold}" stroke-opacity=".6"/>
          <text x="110" y="177" text-anchor="middle" fill="${darkGreen}" font-family="Space Grotesk, sans-serif" font-size="7.5" letter-spacing="3">TEMPORADA 2027</text>
        </svg>`;
      case "bag":
        return `<svg ${common}>
          <path d="M54 83h112l-9 100H63L54 83Z" fill="${green}" stroke="${gold}" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M79 83V64c0-18 14-32 31-32s31 14 31 32v19" fill="none" stroke="${light}" stroke-width="2" stroke-linecap="round"/>
          <path d="M54 102h112" stroke="${gold}" stroke-opacity=".35" stroke-width="1.2"/>
          <path d="M110 108c-2 9-20 17-20 31 0 12 12 16 20 7 8 9 20 5 20-7 0-14-18-22-20-31Z" fill="${light}"/>
        </svg>`;
      default:
        return "";
    }
  }

  function renderShop() {
    if (!els.shopGrid) return;
    const products = state.shopFilter === "Todos"
      ? DATA.shop
      : DATA.shop.filter((product) => product.category === state.shopFilter);

    els.shopGrid.innerHTML = products.map((product) => {
      const selectedSize = state.selectedSizes[product.id] || "";
      const sizes = product.sizes.length
        ? `<div class="size-row" role="group" aria-label="Tamanhos disponíveis para ${escapeHTML(product.name)}">
            ${product.sizes.map((size) => `<button class="size-chip${selectedSize === size ? " is-selected" : ""}" type="button" data-size-product="${product.id}" data-size="${escapeHTML(size)}" aria-pressed="${selectedSize === size}">${escapeHTML(size)}</button>`).join("")}
          </div>`
        : "";

      return `<article class="product-card">
        <div class="product-card__art">
          ${product.badge ? `<span class="product-card__badge">${escapeHTML(product.badge)}</span>` : ""}
          <span class="product-card__quick">Edição 2027</span>
          <div class="product-art">${productArt(product.art)}</div>
        </div>
        <div class="product-card__body">
          <span class="product-card__category">${escapeHTML(product.category)}</span>
          <h3 class="product-card__name">${escapeHTML(product.name)}</h3>
          <p class="product-card__desc">${escapeHTML(product.description)}</p>
          ${sizes}
          <div class="product-card__bottom">
            <div class="product-card__price">${formatCurrency(product.price)}<small>à vista · Pix</small></div>
            <button class="btn btn--primary product-card__add" type="button" data-add-to-cart="${product.id}">
              Adicionar ${icon("plus")}
            </button>
          </div>
        </div>
      </article>`;
    }).join("");

    if (els.shopCount) {
      els.shopCount.textContent = `${products.length} ${products.length === 1 ? "peça" : "peças"}`;
    }
  }

  function initShopControls() {
    els.shopFilters?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shop-filter]");
      if (!button) return;
      state.shopFilter = button.dataset.shopFilter;
      $$("[data-shop-filter]", els.shopFilters).forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderShop();
    });

    els.shopGrid?.addEventListener("click", (event) => {
      const sizeButton = event.target.closest("[data-size-product]");
      if (sizeButton) {
        const productId = sizeButton.dataset.sizeProduct;
        state.selectedSizes[productId] = sizeButton.dataset.size;
        $$(`[data-size-product="${productId}"]`, els.shopGrid).forEach((button) => {
          const active = button.dataset.size === sizeButton.dataset.size;
          button.classList.toggle("is-selected", active);
          button.setAttribute("aria-pressed", String(active));
        });
        return;
      }

      const addButton = event.target.closest("[data-add-to-cart]");
      if (addButton) addToCart(addButton.dataset.addToCart);
    });
  }

  /* ============================================================
     SACOLA
     ============================================================ */
  function loadCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_CART) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored
        .filter((item) => item && DATA.shop.some((product) => product.id === item.id) && Number(item.qty) > 0)
        .map((item) => ({
          id: item.id,
          qty: Math.min(9, Math.max(1, Number(item.qty))),
          size: typeof item.size === "string" ? item.size : "",
        }));
    } catch (error) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_CART, JSON.stringify(state.cart));
    } catch (error) {
      /* Storage indisponível: o carrinho continua na sessão atual. */
    }
  }

  function cartTotalQuantity() {
    return state.cart.reduce((total, item) => total + item.qty, 0);
  }

  function cartSubtotal() {
    return state.cart.reduce((total, item) => {
      const product = DATA.shop.find((itemProduct) => itemProduct.id === item.id);
      return total + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function updateCartBadge() {
    if (!els.cartBadge) return;
    const quantity = cartTotalQuantity();
    els.cartBadge.textContent = String(quantity);
    els.cartBadge.hidden = quantity === 0;
    if (els.cartToggle) {
      els.cartToggle.setAttribute("aria-label", quantity ? `Abrir sacola, ${quantity} ${quantity === 1 ? "item" : "itens"}` : "Abrir sacola");
    }
  }

  function renderCart() {
    if (!els.cartItems) return;
    updateCartBadge();

    if (!state.cart.length) {
      els.cartItems.innerHTML = "";
      if (els.cartEmpty) els.cartEmpty.hidden = false;
      if (els.cartFoot) els.cartFoot.hidden = true;
      return;
    }

    if (els.cartEmpty) els.cartEmpty.hidden = true;
    if (els.cartFoot) els.cartFoot.hidden = false;

    els.cartItems.innerHTML = state.cart.map((item, index) => {
      const product = DATA.shop.find((entry) => entry.id === item.id);
      if (!product) return "";
      return `<div class="cart-item">
        <div class="cart-item__art">${productArt(product.art)}</div>
        <div class="cart-item__info">
          <div class="cart-item__name">${escapeHTML(product.name)}</div>
          <div class="cart-item__meta">${item.size ? `Tamanho ${escapeHTML(item.size)} · ` : ""}${escapeHTML(product.category)}</div>
          <div class="cart-item__bottom">
            <div class="qty-control" role="group" aria-label="Quantidade de ${escapeHTML(product.name)}">
              <button type="button" data-cart-dec="${index}" aria-label="Diminuir quantidade">${icon("minus")}</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-inc="${index}" aria-label="Aumentar quantidade">${icon("plus")}</button>
            </div>
            <span class="cart-item__price">${formatCurrency(product.price * item.qty)}</span>
          </div>
        </div>
        <button class="cart-item__remove" type="button" data-cart-remove="${index}" aria-label="Remover ${escapeHTML(product.name)} da sacola">
          ${icon("trash")}
        </button>
      </div>`;
    }).join("");

    if (els.cartSubtotal) els.cartSubtotal.textContent = formatCurrency(cartSubtotal());
  }

  function addToCart(productId) {
    const product = DATA.shop.find((item) => item.id === productId);
    if (!product) return;

    let size = state.selectedSizes[productId] || "";
    if (product.sizes.length && !size) {
      showToast("Escolha um tamanho antes de adicionar à sacola.", { icon: "info" });
      return;
    }
    if (!product.sizes.length) size = "";

    const existing = state.cart.find((item) => item.id === productId && item.size === size);
    if (existing) {
      existing.qty = Math.min(9, existing.qty + 1);
    } else {
      state.cart.push({ id: productId, size, qty: 1 });
    }

    saveCart();
    renderCart();
    showToast(`${product.name}${size ? ` (${size})` : ""} foi para a sacola.`, {
      icon: "check",
      actionLabel: "Ver sacola",
      onAction: openCart,
    });
  }

  function updateCartQuantity(index, delta) {
    const item = state.cart[index];
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart.splice(index, 1);
    if (item.qty > 9) item.qty = 9;
    saveCart();
    renderCart();
  }

  function removeCartItem(index) {
    if (!state.cart[index]) return;
    state.cart.splice(index, 1);
    saveCart();
    renderCart();
    showToast("Item removido da sacola.", { icon: "trash" });
  }

  function checkoutCart() {
    if (!state.cart.length) return;
    if (!navigator.onLine) {
      showToast("Você está offline. Conecte-se para finalizar o pedido.", { icon: "info" });
      return;
    }

    const lines = state.cart.map((item) => {
      const product = DATA.shop.find((entry) => entry.id === item.id);
      if (!product) return "";
      return `• ${product.name}${item.size ? ` (${item.size})` : ""} × ${item.qty} — ${formatCurrency(product.price * item.qty)}`;
    }).filter(Boolean);

    const message = [
      "Olá! Quero finalizar este pedido da Loja Poker de Quinta:",
      "",
      ...lines,
      "",
      `Subtotal: ${formatCurrency(cartSubtotal())}`,
      "Pode confirmar disponibilidade, frete e pagamento?",
    ].join("\n");

    window.open(waUrl(message), "_blank", "noopener");
    showToast("Abrindo o WhatsApp para finalizar seu pedido.", { icon: "whatsapp" });
  }

  function initCart() {
    state.cart = loadCart();
    renderCart();

    els.cartToggle?.addEventListener("click", openCart);
    els.cartDrawer?.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-cart]")) closeCart();
      const inc = event.target.closest("[data-cart-inc]");
      const dec = event.target.closest("[data-cart-dec]");
      const remove = event.target.closest("[data-cart-remove]");
      if (inc) updateCartQuantity(Number(inc.dataset.cartInc), 1);
      if (dec) updateCartQuantity(Number(dec.dataset.cartDec), -1);
      if (remove) removeCartItem(Number(remove.dataset.cartRemove));
    });
    els.cartCheckout?.addEventListener("click", checkoutCart);
  }

  /* ============================================================
     OVERLAYS — MENU, SACOLA E MODAL
     ============================================================ */
  function isAnyOverlayOpen() {
    return Boolean(
      els.menuDrawer?.classList.contains("is-open") ||
      els.cartDrawer?.classList.contains("is-open") ||
      els.appModal?.classList.contains("is-open")
    );
  }

  function syncBodyLock() {
    document.body.classList.toggle("is-locked", isAnyOverlayOpen());
  }

  function showScrim() {
    if (!els.scrim) return;
    clearTimeout(showScrim.timer);
    els.scrim.hidden = false;
    requestAnimationFrame(() => els.scrim.classList.add("is-open"));
  }

  function hideScrim() {
    if (!els.scrim) return;
    els.scrim.classList.remove("is-open");
    clearTimeout(hideScrim.timer);
    hideScrim.timer = setTimeout(() => {
      if (!isAnyOverlayOpen()) els.scrim.hidden = true;
    }, 430);
  }

  function focusFirst(container) {
    if (!container) return;
    const focusable = $$("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])", container)
      .filter((element) => element.offsetParent !== null);
    const target = focusable[0] || container;
    window.setTimeout(() => {
      try { target.focus({ preventScroll: true }); } catch (error) { target.focus(); }
    }, 80);
  }

  function dismissToasts() {
    if (!els.toastRegion) return;
    els.toastRegion.replaceChildren();
  }

  function openMenu() {
    if (!els.menuDrawer) return;
    clearTimeout(state.autoplayTimer);
    dismissToasts();
    closeCart(false);
    closeModal(false);
    state.focusReturn = document.activeElement;
    els.menuDrawer.inert = false;
    els.menuDrawer.setAttribute("aria-hidden", "false");
    els.menuDrawer.classList.add("is-open");
    els.menuToggle?.setAttribute("aria-expanded", "true");
    showScrim();
    syncBodyLock();
    focusFirst(els.menuDrawer);
  }

  function closeMenu(restoreFocus = true) {
    if (!els.menuDrawer?.classList.contains("is-open")) return;
    els.menuDrawer.classList.remove("is-open");
    els.menuDrawer.setAttribute("aria-hidden", "true");
    els.menuDrawer.inert = true;
    els.menuToggle?.setAttribute("aria-expanded", "false");
    syncBodyLock();
    if (!isAnyOverlayOpen()) hideScrim();
    if (restoreFocus && state.focusReturn) {
      try { state.focusReturn.focus({ preventScroll: true }); } catch (error) { /* noop */ }
    }
    startAutoplayTimer();
  }

  function openCart() {
    if (!els.cartDrawer) return;
    clearTimeout(state.autoplayTimer);
    dismissToasts();
    closeMenu(false);
    closeModal(false);
    state.focusReturn = document.activeElement;
    renderCart();
    els.cartDrawer.inert = false;
    els.cartDrawer.setAttribute("aria-hidden", "false");
    els.cartDrawer.classList.add("is-open");
    els.cartToggle?.setAttribute("aria-expanded", "true");
    showScrim();
    syncBodyLock();
    focusFirst(els.cartDrawer);
  }

  function closeCart(restoreFocus = true) {
    if (!els.cartDrawer?.classList.contains("is-open")) return;
    els.cartDrawer.classList.remove("is-open");
    els.cartDrawer.setAttribute("aria-hidden", "true");
    els.cartDrawer.inert = true;
    els.cartToggle?.setAttribute("aria-expanded", "false");
    syncBodyLock();
    if (!isAnyOverlayOpen()) hideScrim();
    if (restoreFocus && state.focusReturn) {
      try { state.focusReturn.focus({ preventScroll: true }); } catch (error) { /* noop */ }
    }
    startAutoplayTimer();
  }

  function closeAllOverlays(restoreFocus = false) {
    closeMenu(restoreFocus);
    closeCart(restoreFocus);
    closeModal(restoreFocus);
    if (els.scrim) {
      els.scrim.classList.remove("is-open");
      els.scrim.hidden = true;
    }
    syncBodyLock();
  }

  function openModal(html, options = {}) {
    if (!els.appModal || !els.modalContent) return;
    clearTimeout(state.autoplayTimer);
    dismissToasts();
    closeMenu(false);
    closeCart(false);
    state.focusReturn = document.activeElement;
    els.modalContent.innerHTML = html;
    hydrateWhatsApp(els.modalContent);
    els.appModal.inert = false;
    els.appModal.setAttribute("aria-hidden", "false");
    els.appModal.classList.add("is-open");
    showScrim();
    syncBodyLock();
    if (els.modalDialog) els.modalDialog.scrollTop = 0;
    focusFirst(els.appModal);
    if (options.onOpen) options.onOpen();
  }

  function closeModal(restoreFocus = true) {
    if (!els.appModal?.classList.contains("is-open")) return;
    els.appModal.classList.remove("is-open");
    els.appModal.setAttribute("aria-hidden", "true");
    els.appModal.inert = true;
    syncBodyLock();
    if (!isAnyOverlayOpen()) hideScrim();
    if (restoreFocus && state.focusReturn) {
      try { state.focusReturn.focus({ preventScroll: true }); } catch (error) { /* noop */ }
    }
    startAutoplayTimer();
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) return;
    const focusable = $$("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])", container)
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ============================================================
     MODAIS DE CONTEÚDO
     ============================================================ */
  function openStageModal(stageId) {
    const stage = getStage(stageId);
    if (!stage) return;

    const status = stageStatusMeta(stage);
    const winner = stageWinner(stage);
    const completed = stage.status === "completed";
    const finalTable = completed
      ? stage.results.slice(0, 8).map((playerId, index) => {
          const player = getPlayer(playerId);
          const prize = stage.prizePool * (DATA.payoutPercentages[index] / 100);
          return `<div class="modal-table__row">
            <span class="modal-table__pos">${index + 1}º</span>
            <span class="modal-table__name">${escapeHTML(player ? player.name : "—")}</span>
            <span class="modal-table__pts">${formatNumber(pointsForPosition(index + 1))} pts</span>
            <span class="modal-table__prize">${formatCurrency(prize)}</span>
          </div>`;
        }).join("")
      : `<p>As cartas desta etapa ainda não foram distribuídas. Garanta sua cadeira e escreva o próximo capítulo.</p>`;

    const actionMarkup = completed
      ? `<a class="btn btn--primary btn--sm" href="${waUrl(stageInviteMessage(getStage(DATA.site.nextStageId)))}" target="_blank" rel="noopener">Reservar a próxima etapa ${icon("arrow-up-right")}</a>
         <button class="btn btn--ghost btn--sm" type="button" data-close-modal>Fechar</button>`
      : stage.status === "final"
        ? `<a class="btn btn--primary btn--sm" href="${waUrl("Olá! Quero saber mais sobre a Grande Final da Temporada 2027 e como funciona a classificação.")}" target="_blank" rel="noopener">Falar com a casa ${icon("whatsapp")}</a>
           <a class="btn btn--ghost btn--sm" href="#ranking" data-route-link="ranking">Ver ranking</a>`
        : `<a class="btn btn--primary btn--sm" href="${waUrl(stageInviteMessage(stage))}" target="_blank" rel="noopener">Tenho interesse ${icon("whatsapp")}</a>
           <a class="btn btn--ghost btn--sm" href="assets/poker-de-quinta-2027.ics" download>${icon("calendar")} Salvar calendário</a>`;

    openModal(`
      <p class="modal__eyebrow">Temporada 2027 · Etapa ${pad(stage.id)}</p>
      <h2 class="modal__title" id="modal-title">${escapeHTML(stage.name)}</h2>
      <div class="modal__meta">
        <span class="badge ${status.className}">${icon(status.icon)}${status.label}</span>
        <span class="modal__date">${shortDate(stage.date)} · ${timeLabel(stage.date)} · ${escapeHTML(DATA.site.venue)}</span>
      </div>
      <p class="modal__deck">${escapeHTML(stage.description)}</p>
      <div class="modal__facts">
        <div class="modal__fact"><span>Buy-in</span><strong>${escapeHTML(DATA.site.buyIn)}</strong></div>
        <div class="modal__fact"><span>Formato</span><strong>${stage.status === "final" ? "Top 8 · Final" : "NL Hold'em"}</strong></div>
        <div class="modal__fact"><span>${completed ? "Campeão" : "Lugares"}</span><strong>${completed && winner ? escapeHTML(winner.name) : stage.status === "final" ? "8 finalistas" : "16 cadeiras"}</strong></div>
      </div>
      <div class="modal__section">
        <h3>${completed ? "Mesa final" : "Sobre a etapa"}</h3>
        ${completed ? `<div class="modal-table">
          <div class="modal-table__row modal-table__row--head">
            <span>#</span><span>Jogador</span><span>Pontos</span><span class="modal-table__prize">Prêmio</span>
          </div>
          ${finalTable}
        </div>` : `<p>${escapeHTML(stage.kicker)}. ${stage.status === "final" ? "A Grande Final reúne os oito primeiros do ranking da temporada. A classificação é definida ao término da Etapa 11; em caso de ausência, a vaga passa ao próximo colocado." : "As inscrições acontecem pelo WhatsApp da casa. O check-in fecha às 20h15 e as cadeiras não confirmadas são liberadas para a lista de espera."}</p>`}
      </div>
      <div class="modal__actions">${actionMarkup}</div>
    `);
  }

  function openPlayerModal(playerId) {
    const player = getPlayer(playerId);
    const row = state.ranking.find((item) => item.id === playerId);
    if (!player || !row) return;

    const performance = row.results.map((result) => {
      const stage = getStage(result.stageId);
      const width = Math.max(5, Math.round((result.points / 650) * 100));
      return `<div class="performance-row">
        <span class="performance-row__stage" title="Etapa ${pad(stage.id)} · ${escapeHTML(stage.name)}">Etapa ${pad(stage.id)}<span class="sr-only"> — ${escapeHTML(stage.name)}</span></span>
        <span class="performance-row__bar"><span style="width:${width}%"></span></span>
        <span class="performance-row__pos">${ordinal(result.position)}</span>
        <span class="performance-row__pts">${result.points} pts</span>
      </div>`;
    }).join("");

    openModal(`
      <div class="player-modal__head">
        ${avatarMarkup(player, "player-modal__avatar")}
        <div>
          <p class="modal__eyebrow">Perfil · Temporada 2027</p>
          <h2 class="modal__title player-modal__name" id="modal-title">${escapeHTML(player.name)}</h2>
          <p class="modal__deck">${escapeHTML(player.city)} · ${escapeHTML(player.uf)} · na casa desde ${player.since}</p>
        </div>
      </div>
      <div class="player-modal__stats">
        <div class="player-modal__stat"><strong>${ordinal(row.rank)}</strong><span>posição</span></div>
        <div class="player-modal__stat"><strong>${formatNumber(row.points)}</strong><span>pontos</span></div>
        <div class="player-modal__stat"><strong>${row.wins}</strong><span>vitórias</span></div>
        <div class="player-modal__stat"><strong>${row.finalTables}</strong><span>mesas finais</span></div>
      </div>
      <div class="player-bio">${escapeHTML(player.bio)}</div>
      <div class="modal__section">
        <h3>Desempenho nas etapas</h3>
        <div class="performance-list">${performance || "<p>Ainda sem etapas concluídas nesta temporada.</p>"}</div>
      </div>
      <div class="modal__section">
        <h3>Melhor resultado</h3>
        <p>${escapeHTML(player.best)}</p>
      </div>
      <div class="modal__actions">
        <button class="btn btn--primary btn--sm" type="button" data-close-modal>Voltar ao ranking</button>
      </div>
    `);
  }

  function openInfoModal(type) {
    if (type === "privacy") {
      openModal(`
        <p class="modal__eyebrow">Transparência</p>
        <h2 class="modal__title" id="modal-title">Privacidade e seus dados</h2>
        <div class="modal__section">
          <p>O Poker de Quinta usa as informações enviadas no formulário de contato, na lista de presença e na loja apenas para organizar as etapas, responder solicitações e cuidar do relacionamento com a comunidade.</p>
          <p>Não vendemos dados pessoais. Não compartilhamos suas informações com terceiros para fins de marketing. Fotos e vídeos do evento podem ser publicados nas redes da casa em conteúdo editorial; se você preferir não aparecer, basta avisar a organização.</p>
          <p>Para acessar, corrigir ou excluir seus dados, escreva para <a href="mailto:${DATA.site.email}">${DATA.site.email}</a>. Respondemos em até 7 dias úteis.</p>
        </div>
        <div class="modal__actions"><button class="btn btn--primary btn--sm" type="button" data-close-modal>Entendi</button></div>
      `);
      return;
    }

    if (type === "responsible") {
      openModal(`
        <p class="modal__eyebrow">Jogo responsável</p>
        <h2 class="modal__title" id="modal-title">Poker é entretenimento.</h2>
        <div class="modal__section">
          <p>O Poker de Quinta é um evento social e recreativo para maiores de 18 anos. Nenhuma das informações deste site é incentivo ao jogo como fonte de renda.</p>
          <p>Defina um limite antes de jogar, não aposte o que você não pode perder e faça pausas. Se o jogo deixou de ser diversão, procure apoio profissional e converse com alguém de confiança.</p>
          <p>Se você precisa falar com a organização sobre uma situação relacionada ao jogo, escreva para <a href="mailto:${DATA.site.email}">${DATA.site.email}</a>. A casa está disponível para ouvir com discrição.</p>
        </div>
        <div class="modal__actions">
          <a class="btn btn--primary btn--sm" href="mailto:${DATA.site.email}">${icon("mail")} Falar com a casa</a>
          <button class="btn btn--ghost btn--sm" type="button" data-close-modal>Fechar</button>
        </div>
      `);
      return;
    }

    if (type === "install") {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      openModal(`
        <p class="modal__eyebrow">Aplicativo</p>
        <h2 class="modal__title" id="modal-title">Instale o Poker de Quinta.</h2>
        <p class="modal__deck">Acesso rápido à próxima etapa, ranking e regulamento direto da tela inicial — como um app, sem passar pela loja.</p>
        <div class="modal__section">
          <h3>${ios ? "No iPhone ou iPad" : "No seu navegador"}</h3>
          <ol class="rule-list">
            ${ios
              ? `<li>Abra este site no <strong>Safari</strong>.</li>
              <li>Toque no botão <strong>Compartilhar</strong>, na barra inferior.</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>`
              : `<li>Abra o menu do navegador (três pontos ou ícone de instalação).</li>
              <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              <li>Confirme a instalação. O atalho aparece junto aos seus apps.</li>`}
          </ol>
        </div>
        <div class="modal__section">
          <h3>Por que instalar?</h3>
          <p>O app funciona em tela cheia, abre mais rápido e mantém o essencial disponível mesmo quando a conexão falha.</p>
        </div>
        <div class="modal__actions"><button class="btn btn--primary btn--sm" type="button" data-close-modal>Entendi</button></div>
      `);
    }
  }

  /* ============================================================
     NAVEGAÇÃO / ROTEAMENTO
     ============================================================ */
  function scrollToTarget(id) {
    const target = typeof id === "string" ? document.getElementById(id) : id;
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  }

  function updateNav(route) {
    $$("[data-nav]").forEach((item) => {
      if (item.dataset.nav === route) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function applyRoute(route, options = {}) {
    if (!ROUTES.includes(route)) route = "inicio";
    const changed = state.route !== route;
    state.route = route;
    document.body.setAttribute("data-route", route);
    document.title = PAGE_TITLES[route] || PAGE_TITLES.inicio;
    updateNav(route);

    $$(".page").forEach((page) => {
      const active = page.dataset.page === route;
      page.classList.toggle("is-active", active);
      page.toggleAttribute("hidden", !active);
    });

    if (route === "inicio") {
      requestAnimationFrame(() => updateCarousel(state.carouselIndex, false));
      startAutoplayTimer();
    } else {
      clearTimeout(state.autoplayTimer);
    }

    if (route === "confirmar" && els.confirmFrame && !els.confirmFrame.getAttribute("src")) {
      els.confirmFrame.src = DATA.site.confirmUrl;
    }

    if (changed) {
      const main = document.getElementById("main");
      if (!options.silent && main) {
        try { main.focus({ preventScroll: true }); } catch (error) { main.focus(); }
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    const scrollTarget = options.scrollTo || state.pendingScroll;
    state.pendingScroll = null;
    if (scrollTarget) {
      window.setTimeout(() => scrollToTarget(scrollTarget), changed ? 80 : 0);
    } else if (!changed && !options.silent) {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
  }

  function goTo(route, options = {}) {
    if (!ROUTES.includes(route)) return;
    closeAllOverlays();
    if (options.scrollTo) state.pendingScroll = options.scrollTo;
    if (location.hash === `#${route}`) {
      applyRoute(route, { scrollTo: options.scrollTo });
      return;
    }
    location.hash = route;
  }

  function parseHash() {
    return decodeURIComponent(location.hash.replace(/^#/, ""));
  }

  function initRouting() {
    const hash = parseHash();
    let initialRoute = ROUTES.includes(hash) ? hash : "inicio";
    let initialScroll = ROUTES.includes(hash) ? null : hash;

    applyRoute(initialRoute, { silent: true, scrollTo: initialScroll });

    window.addEventListener("hashchange", () => {
      const currentHash = parseHash();
      if (ROUTES.includes(currentHash)) {
        applyRoute(currentHash);
      } else if (currentHash) {
        applyRoute("inicio", { scrollTo: currentHash });
      } else {
        applyRoute("inicio");
      }
    });
  }

  function initHeader() {
    const onScroll = () => {
      els.siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ============================================================
     CONTATO
     ============================================================ */
  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const error = document.querySelector(`[data-error-for="${fieldId}"]`);
    if (field) {
      field.setAttribute("aria-invalid", message ? "true" : "false");
      if (message && error) {
        if (!error.id) error.id = `err-${fieldId}`;
        field.setAttribute("aria-describedby", error.id);
      } else {
        field.removeAttribute("aria-describedby");
      }
    }
    if (error) error.textContent = message || "";
  }

  function initContactForm() {
    if (!els.contactForm) return;

    const fields = ["contact-name", "contact-email", "contact-subject", "contact-message", "contact-consent"];

    fields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (!field) return;
      field.addEventListener("input", () => setFieldError(fieldId, ""));
      field.addEventListener("change", () => setFieldError(fieldId, ""));
    });

    els.contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      fields.forEach((fieldId) => setFieldError(fieldId, ""));

      const name = document.getElementById("contact-name").value.trim();
      const email = document.getElementById("contact-email").value.trim();
      const subject = document.getElementById("contact-subject").value;
      const message = document.getElementById("contact-message").value.trim();
      const consent = document.getElementById("contact-consent").checked;
      let firstInvalid = null;

      if (name.length < 2) {
        setFieldError("contact-name", "Informe seu nome.");
        firstInvalid = firstInvalid || "contact-name";
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("contact-email", "Informe um e-mail válido.");
        firstInvalid = firstInvalid || "contact-email";
      }
      if (!subject) {
        setFieldError("contact-subject", "Selecione um assunto.");
        firstInvalid = firstInvalid || "contact-subject";
      }
      if (message.length < 10) {
        setFieldError("contact-message", "Conte um pouco mais (mínimo de 10 caracteres).");
        firstInvalid = firstInvalid || "contact-message";
      }
      if (!consent) {
        setFieldError("contact-consent", "É necessário concordar para continuar.");
        firstInvalid = firstInvalid || "contact-consent";
      }

      if (firstInvalid) {
        document.getElementById(firstInvalid)?.focus();
        return;
      }

      if (!navigator.onLine) {
        showToast("Você está offline. Conecte-se para enviar a mensagem.", { icon: "info" });
        return;
      }

      const text = [
        `Olá! Vim pelo site do Poker de Quinta.`,
        "",
        `Nome: ${name}`,
        `E-mail: ${email}`,
        `Assunto: ${subject}`,
        "",
        message,
      ].join("\n");

      window.open(waUrl(text), "_blank", "noopener");
      showToast("Abrindo o WhatsApp com sua mensagem.", { icon: "whatsapp" });
      els.contactForm.reset();
      fields.forEach((fieldId) => setFieldError(fieldId, ""));
    });
  }

  /* ============================================================
     TOASTS
     ============================================================ */
  function showToast(message, options = {}) {
    if (!els.toastRegion) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `${icon(options.icon || "info", "toast__icon")}<span class="toast__message">${escapeHTML(message)}</span>`;

    if (options.actionLabel && typeof options.onAction === "function") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "toast__action";
      action.textContent = options.actionLabel;
      action.addEventListener("click", () => {
        options.onAction();
        dismiss();
      });
      toast.appendChild(action);
    }

    let timeout = null;
    const dismiss = () => {
      if (!toast.isConnected) return;
      toast.classList.add("is-leaving");
      if (timeout) clearTimeout(timeout);
      window.setTimeout(() => toast.remove(), 260);
    };

    els.toastRegion.appendChild(toast);
    while (els.toastRegion.children.length > 3) {
      els.toastRegion.firstElementChild.remove();
    }
    if (options.duration !== 0) {
      timeout = window.setTimeout(dismiss, options.duration || 4600);
    }
  }

  /* ============================================================
     PWA — INSTALAÇÃO, OFFLINE E SERVICE WORKER
     ============================================================ */
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function initInstall() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.deferredPrompt = event;
    });

    document.addEventListener("click", async (event) => {
      const installButton = event.target.closest("[data-install]");
      if (installButton) {
        event.preventDefault();
        closeAllOverlays();
        if (isStandalone()) {
          showToast("Você já está usando o Poker de Quinta como app.", { icon: "check" });
          return;
        }
        if (state.deferredPrompt) {
          try {
            state.deferredPrompt.prompt();
            const choice = await state.deferredPrompt.userChoice;
            if (choice.outcome === "accepted") {
              showToast("Instalação iniciada. O ícone aparecerá na sua tela inicial.", { icon: "install" });
            }
          } catch (error) {
            showToast("Não foi possível abrir a instalação. Use o menu do navegador.", { icon: "info" });
          }
          state.deferredPrompt = null;
          return;
        }
        openInfoModal("install");
      }
    });

    window.addEventListener("appinstalled", () => {
      showToast("Poker de Quinta instalado. Nos vemos na próxima quinta.", { icon: "check" });
      state.deferredPrompt = null;
    });
  }

  function updateOnlineStatus() {
    if (!els.offlineBanner) return;
    const offline = !navigator.onLine;
    els.offlineBanner.hidden = !offline;
  }

  function initOffline() {
    updateOnlineStatus();
    window.addEventListener("offline", () => {
      updateOnlineStatus();
      showToast("Você está offline. O conteúdo essencial continua disponível.", { icon: "info", duration: 6000 });
    });
    window.addEventListener("online", () => {
      updateOnlineStatus();
      showToast("Conexão restabelecida.", { icon: "check" });
    });
  }

  function initServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

    const register = () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((registration) => {
          if (registration.waiting) notifyUpdate(registration);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                notifyUpdate(registration);
              }
            });
          });
        })
        .catch(() => { /* O site continua funcionando sem service worker. */ });
    };

    function notifyUpdate(registration) {
      showToast("Uma nova versão do site está disponível.", {
        icon: "install",
        duration: 0,
        actionLabel: "Atualizar",
        onAction: () => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          state.swReloading = true;
        },
      });
    }

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (state.swReloading) {
        state.swReloading = false;
        window.location.reload();
      }
    });
  }

  /* ============================================================
     EVENTOS GLOBAIS
     ============================================================ */
  function initGlobalEvents() {
    document.addEventListener("click", (event) => {
      const routeLink = event.target.closest("[data-route-link]");
      if (routeLink) {
        event.preventDefault();
        goTo(routeLink.dataset.routeLink);
        return;
      }

      const scrollLink = event.target.closest("[data-scroll-target]");
      if (scrollLink) {
        event.preventDefault();
        const target = scrollLink.dataset.scrollTarget;
        closeAllOverlays();
        if (state.route !== "inicio") goTo("inicio", { scrollTo: target });
        else scrollToTarget(target);
        return;
      }

      if (event.target.closest("[data-close-drawer]")) {
        closeMenu();
        return;
      }
      if (event.target.closest("[data-close-cart]")) {
        closeCart();
        return;
      }
      if (event.target.closest("[data-close-modal]")) {
        closeModal();
        return;
      }
      if (event.target === els.scrim) {
        closeAllOverlays(true);
        return;
      }

      const modalButton = event.target.closest("[data-modal]");
      if (modalButton) {
        event.preventDefault();
        event.stopPropagation();
        openInfoModal(modalButton.dataset.modal);
        return;
      }

      const stageButton = event.target.closest("[data-stage-open]");
      if (stageButton) {
        event.preventDefault();
        closeAllOverlays();
        openStageModal(Number(stageButton.dataset.stageOpen));
        return;
      }

      const playerButton = event.target.closest("[data-player-open]");
      if (playerButton) {
        event.preventDefault();
        closeAllOverlays();
        openPlayerModal(playerButton.dataset.playerOpen);
        return;
      }

      if (event.target.closest("[data-open-cart]")) {
        event.preventDefault();
        openCart();
      }
    });

    els.menuToggle?.addEventListener("click", () => {
      if (els.menuDrawer.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    els.menuDrawer?.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-drawer]")) closeMenu();
    });

    els.scrim?.addEventListener("click", () => closeAllOverlays(true));
    els.appModal?.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (els.appModal?.classList.contains("is-open")) {
          closeModal();
        } else if (els.cartDrawer?.classList.contains("is-open")) {
          closeCart();
        } else if (els.menuDrawer?.classList.contains("is-open")) {
          closeMenu();
        }
      }

      if (event.key === "Tab") {
        if (els.appModal?.classList.contains("is-open")) trapFocus(event, els.appModal);
        else if (els.menuDrawer?.classList.contains("is-open")) trapFocus(event, els.menuDrawer);
        else if (els.cartDrawer?.classList.contains("is-open")) trapFocus(event, els.cartDrawer);
      }
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function cacheElements() {
    els.siteHeader = $("#site-header");
    els.main = $("#main");
    els.menuToggle = $("#menu-toggle");
    els.menuDrawer = $("#menu-drawer");
    els.cartToggle = $("#cart-toggle");
    els.cartDrawer = $("#cart-drawer");
    els.cartBadge = $("#cart-badge");
    els.cartItems = $("#cart-items");
    els.cartEmpty = $("#cart-empty");
    els.cartFoot = $("#cart-foot");
    els.cartSubtotal = $("#cart-subtotal");
    els.cartCheckout = $("#cart-checkout");
    els.scrim = $("#scrim");
    els.appModal = $("#app-modal");
    els.modalDialog = $("#modal-dialog");
    els.modalContent = $("#modal-content");
    els.toastRegion = $("#toast-region");
    els.offlineBanner = $("#offline-banner");
    els.stageCarousel = $("#stage-carousel");
    els.stageViewport = $("#stage-viewport");
    els.stageTrack = $("#stage-track");
    els.carouselDots = $("#carousel-dots");
    els.carouselCounter = $("#carousel-counter");
    els.carouselPrev = $("#carousel-prev");
    els.carouselNext = $("#carousel-next");
    els.carouselAutoplay = $("#carousel-autoplay");
    els.carouselLive = $("#carousel-live");
    els.nextStageNumber = $("#next-stage-number");
    els.nextStageDate = $("#next-stage-date");
    els.nextStageTitle = $("#next-stage-title");
    els.nextStageKicker = $("#next-stage-kicker");
    els.nextStageDesc = $("#next-stage-desc");
    els.nextStageReserve = $("#next-stage-reserve");
    els.countdownDate = $("#countdown-date");
    els.drawerNext = $("#drawer-next");
    els.homeLeaders = $("#home-leaders");
    els.rankingPodium = $("#ranking-podium");
    els.rankingBody = $("#ranking-body");
    els.rankingEmpty = $("#ranking-empty");
    els.rankingCount = $("#ranking-count");
    els.rankingPanel = $(".ranking-panel");
    els.rankingSearch = $("#ranking-search");
    els.rankingSort = $("#ranking-sort");
    els.rankingFilter = $("#ranking-filter");
    els.championsGrid = $("#champions-grid");
    els.rulesPointsBody = $("#rules-points-body");
    els.confirmStage = $("#confirm-stage");
    els.confirmDate = $("#confirm-date");
    els.confirmStatus = $("#confirm-status");
    els.confirmOpening = $("#confirm-opening");
    els.confirmSource = $("#confirm-source");
    els.confirmOpen = $("#confirm-open");
    els.confirmOpenTop = $("#confirm-open-top");
    els.confirmEmbed = $(".confirm-embed");
    els.confirmFrame = $("#confirm-frame");
    els.confirmOffline = $("#confirm-offline");
    els.historyTabs = $("#history-tabs");
    els.historyFilters = $("#history-filters");
    els.historySummary = $("#history-summary");
    els.historyTimeline = $("#history-timeline");
    els.shopFilters = $("#shop-filters");
    els.shopGrid = $("#shop-grid");
    els.shopCount = $("#shop-count");
    els.contactForm = $("#contact-form");
  }

  function init() {
    cacheElements();

    [els.menuDrawer, els.cartDrawer, els.appModal].forEach((overlay) => {
      if (overlay) overlay.inert = true;
    });

    setupRanking();
    renderCarousel();
    renderNextStage();
    renderHomeLeaders();
    renderPodium();
    renderChampions();
    renderRankingTable();
    renderRulesPoints();
    renderHistory();
    renderShop();

    initCarousel();
    initRankingControls();
    initHistoryControls();
    initShopControls();
    initCart();
    initContactForm();
    initHeader();
    initGlobalEvents();
    initInstall();
    initOffline();
    initConfirmPage();
    initServiceWorker();
    initRouting();

    hydrateWhatsApp();
    const year = $("#year");
    if (year) year.textContent = "2027";
    updateRankingUpdatedMeta();
    renderConfirmPage();
    initFirebaseData();

    // Preenche o ano no rodapé caso o HTML seja aberto em outro contexto.
    const cartNote = $(".cart-note");
    if (cartNote) {
      cartNote.textContent = "Frete e disponibilidade confirmados no atendimento. Retirada gratuita na Casa Palmeira.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
