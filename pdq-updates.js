(function () {
  "use strict";

  const DEFAULT_DINNER = ["Pizza", "Churrasco", "Hambúrguer"];
  const HAND_OPTIONS = [
    { name: "Maior pote", detail: "A mão que colocou mais fichas no centro.", icon: "💰" },
    { name: "Melhor blefe", detail: "A linha de blefe mais marcante da noite.", icon: "🎭" },
    { name: "Maior virada", detail: "A reviravolta mais inesperada da mesa.", icon: "🔄" },
  ];
  let rankingData;
  Object.defineProperty(window, "PQ_RANKING", {
    configurable: true,
    enumerable: true,
    get: () => rankingData,
    set: (value) => {
      if (value && Array.isArray(value.jogadores)) value.jogadores.forEach((player) => { player.foto = ""; });
      rankingData = value;
    },
  });
  if (window.PQFirebase?.load) {
    const load = window.PQFirebase.load.bind(window.PQFirebase);
    window.PQFirebase.load = async (...args) => ({ ...(await load(...args)), photos: {} });
  }

  const database = window.PQ_FIREBASE?.config?.databaseURL?.replace(/\/$/, "") || "";
  const endpoint = (path) => database ? `${database}/${path.replace(/^\/+|\/+$/g, "")}.json` : "";
  const whatsapp = `https://wa.me/${window.PQ_DATA?.site?.whatsapp || "5541987210685"}`;
  const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  const selections = {};

  if (window.PQ_DATA) {
    window.PQ_DATA.shop = [
      { id: "camisa-2027", name: "Camiseta oficial Poker de Quinta", category: "Vestuário", price: 159.9, description: "Camiseta oficial da temporada 2027 com a identidade Poker de Quinta. Escolha o tamanho e confirme disponibilidade pelo WhatsApp.", badge: "Oficial", sizes: ["P", "M", "G", "GG"], art: "shirt" },
      { id: "ovo-codorna-conserva", name: "Ovo de codorna em conserva", category: "Da casa", price: 0, description: "Ovos de codorna em conserva em pote pequeno ou grande. Consulte o valor com a organização.", badge: "P ou G", sizes: ["P", "G"], art: "ovos-codorna" },
    ];
  }

  function renderStore() {
    const grid = document.querySelector("#shop-grid");
    if (!grid || !window.PQ_DATA?.shop) return;
    const [shirt, eggs] = window.PQ_DATA.shop;
    const productCard = (product, kind) => {
      const art = kind === "eggs"
        ? '<img src="assets/img/ovos-codorna-conserva.png" alt="Potes pequeno e grande de ovos de codorna em conserva" loading="lazy" decoding="async">'
        : '<img src="assets/img/camiseta-pdq.webp" alt="Camiseta verde oficial do Poker de Quinta com a logo da casa aplicada no peito" loading="lazy" decoding="async">';
      const sizeButtons = product.sizes.map((size) => `<button type="button" class="size-chip${selections[product.id] === size ? " is-selected" : ""}" data-pdq-size="${product.id}" data-size="${safe(size)}" aria-pressed="${selections[product.id] === size}">${safe(size)}</button>`).join("");
      const price = kind === "eggs"
        ? '<div class="product-card__price">Consulte<small>valor pelo WhatsApp</small></div>'
        : '<div class="product-card__price">R$ 159,90<small>confirme disponibilidade pelo WhatsApp</small></div>';
      return `<article class="product-card">
        <div class="product-card__art ${kind === "eggs" ? "product-card__art--photo" : "product-card__art--shirt"}">
          <span class="product-card__badge">${safe(product.badge)}</span><div class="product-art">${art}</div>
        </div>
        <div class="product-card__body">
          <span class="product-card__category">${safe(product.category)}</span>
          <h3 class="product-card__name">${safe(product.name)}</h3><p class="product-card__desc">${safe(product.description)}</p>
          <div class="size-row" role="group" aria-label="Escolha o tamanho de ${safe(product.name)}">${sizeButtons}</div>
          <div class="product-card__bottom">${price}<button class="btn btn--primary product-card__add" type="button" data-pdq-order="${product.id}">Pedir no WhatsApp <svg class="icon" aria-hidden="true"><use href="#i-whatsapp"></use></svg></button></div>
        </div>
      </article>`;
    };
    grid.innerHTML = productCard(shirt, "shirt") + productCard(eggs, "eggs");
    const count = document.querySelector("#shop-count");
    if (count) count.textContent = "2 produtos";
  }

  function currentStage() {
    return Number(window.PQ_DATA?.site?.nextStageId) || 1;
  }

  function voteKey() {
    return `pq-vote-2027-${currentStage()}`;
  }

  function showExistingVote() {
    try {
      if (!localStorage.getItem(voteKey())) return false;
      const form = document.querySelector("#stage-vote-form");
      const next = document.querySelector("#vote-next-step");
      if (form) form.hidden = true;
      if (next) next.hidden = false;
      const status = document.querySelector("#vote-options-status");
      if (status) status.textContent = "Você já registrou sua votação neste dispositivo.";
      return true;
    } catch (_) {
      return false;
    }
  }

  function dinnerIcon(name, index) {
    const normalized = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    if (/pizza|calzone/.test(normalized)) return "🍕";
    if (/churr|carne|costela|picanha|espet/.test(normalized)) return "🥩";
    if (/hamb|burger/.test(normalized)) return "🍔";
    if (/lasanha|massa|macarr|nhoque/.test(normalized)) return "🍝";
    if (/sushi|japones|temaki|sashimi/.test(normalized)) return "🍣";
    if (/frango|galinha|asa/.test(normalized)) return "🍗";
    if (/pastel|frito|coxinha/.test(normalized)) return "🥟";
    if (/salada|veg/.test(normalized)) return "🥗";
    if (/taco|mexic/.test(normalized)) return "🌮";
    if (/peixe|frutos do mar|camarao/.test(normalized)) return "🐟";
    return ["🍽️", "🍲", "🥘"][index % 3];
  }

  function normalizeOptionList(value) {
    const items = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((key) => value[key])
        : [];
    return items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  }

  function renderChoiceGroup(container, choices, name, descriptionFor) {
    if (!container) return;
    container.innerHTML = choices.map((choice, index) => {
      const label = typeof choice === "string" ? choice : choice.name;
      const detail = descriptionFor(choice, index);
      const emoji = typeof choice === "string" ? dinnerIcon(choice, index) : choice.icon;
      return `<label class="vote-option vote-option--tile">
        <input type="radio" name="${name}" value="${safe(label)}" required>
        <span class="vote-option__symbol" aria-hidden="true">${emoji}</span>
        <span class="vote-option__copy"><strong>${safe(label)}</strong>${detail ? `<small>${safe(detail)}</small>` : ""}</span>
        <span class="vote-option__check" aria-hidden="true">✓</span>
      </label>`;
    }).join("");
  }

  function setVoteUnavailable(message) {
    const status = document.querySelector("#vote-options-status");
    const button = document.querySelector("#submit-stage-vote");
    const dinnerGroup = document.querySelector("#dinner-vote-group");
    if (status) status.textContent = message;
    if (button) button.disabled = true;
    if (dinnerGroup) dinnerGroup.setAttribute("aria-disabled", "true");
  }

  function renderDinner(value) {
    const options = normalizeOptionList(value);
    if (options.length !== 3) {
      const dinnerRoot = document.querySelector("#dinner-vote-options");
      if (dinnerRoot) dinnerRoot.innerHTML = "";
      setVoteUnavailable("A votação abre quando a organização salvar exatamente três opções de janta.");
      return false;
    }
    renderChoiceGroup(document.querySelector("#dinner-vote-options"), options, "janta", () => "");
    renderChoiceGroup(document.querySelector("#hand-vote-options"), HAND_OPTIONS, "maoEtapa", (choice) => choice.detail);
    const status = document.querySelector("#vote-options-status");
    const button = document.querySelector("#submit-stage-vote");
    const dinnerGroup = document.querySelector("#dinner-vote-group");
    if (status) status.textContent = "Escolha uma janta e uma Mão da Etapa.";
    if (button) button.disabled = false;
    if (dinnerGroup) dinnerGroup.removeAttribute("aria-disabled");
    return true;
  }

  async function loadDinner() {
    if (!endpoint(`votacaoConfig/${window.PQ_DATA?.site?.season || "2027"}/opcoesJanta`)) {
      setVoteUnavailable("Não foi possível conectar ao banco de votação. A inscrição continua bloqueada até carregar as três opções.");
      showExistingVote();
      return;
    }
    try {
      const response = await fetch(endpoint(`votacaoConfig/${window.PQ_DATA?.site?.season || "2027"}/opcoesJanta`), { cache: "no-store", credentials: "omit" });
      if (!response.ok) throw new Error(`Firebase ${response.status}`);
      const value = await response.json();
      if (!renderDinner(value)) {
        const status = document.querySelector("#vote-options-status");
        if (status) status.textContent = "A lista no Firebase precisa conter exatamente três alternativas; peça à organização para atualizá-la.";
      }
    } catch (_) {
      setVoteUnavailable("Não foi possível carregar as opções da votação. Tente novamente quando estiver conectado.");
    }
    showExistingVote();
  }

  document.addEventListener("click", (event) => {
    const sizeButton = event.target.closest("[data-pdq-size]");
    if (sizeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selections[sizeButton.dataset.pdqSize] = sizeButton.dataset.size;
      renderStore();
      return;
    }
    const orderButton = event.target.closest("[data-pdq-order]");
    if (orderButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const product = window.PQ_DATA.shop.find((item) => item.id === orderButton.dataset.pdqOrder);
      const size = selections[orderButton.dataset.pdqOrder];
      if (!size) {
        window.alert("Escolha um tamanho antes de pedir.");
        return;
      }
      const message = product.id === "ovo-codorna-conserva"
        ? `Olá! Quero pedir ovo de codorna em conserva, tamanho ${size}. Pode me informar o valor e a disponibilidade?`
        : `Olá! Quero pedir a ${product.name}, tamanho ${size}. Pode confirmar disponibilidade e valor?`;
      window.open(`${whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
      return;
    }
    const confirm = event.target.closest("[data-confirm-open]");
    if (confirm) {
      event.preventDefault();
      window.location.hash = "confirmar";
    }
  }, true);

  function initUpdates() {
    setTimeout(renderStore, 0);
    loadDinner();
    const form = document.querySelector("#stage-vote-form");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const dinner = form.querySelector('input[name="janta"]:checked')?.value;
      const hand = form.querySelector('input[name="maoEtapa"]:checked')?.value;
      const error = document.querySelector("#vote-error");
      const button = document.querySelector("#submit-stage-vote");
      if (!form.reportValidity() || !dinner || !hand) return;
      button.disabled = true;
      button.textContent = "Registrando votos…";
      try {
        const path = `votacoes/${window.PQ_DATA?.site?.season || "2027"}/etapas/${currentStage()}`;
        const response = await fetch(endpoint(path), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ janta: dinner, maoEtapa: hand, criadoEm: new Date().toISOString() }),
        });
        if (!response.ok) throw new Error(`Firebase ${response.status}`);
        try { localStorage.setItem(voteKey(), JSON.stringify({ janta: dinner, maoEtapa: hand, at: Date.now() })); } catch (_) { /* storage opcional */ }
        form.hidden = true;
        document.querySelector("#vote-next-step").hidden = false;
        document.querySelector("#vote-options-status").textContent = "Votos registrados com sucesso.";
      } catch (err) {
        error.textContent = `Não foi possível registrar os votos (${err.message}). A inscrição só será liberada após o registro; verifique a conexão e as permissões do Firebase.`;
        error.hidden = false;
        button.disabled = false;
        button.textContent = "Registrar votos e continuar";
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUpdates, { once: true });
  else initUpdates();
})();
