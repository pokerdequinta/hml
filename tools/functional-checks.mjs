const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9234";
const BASE = "http://127.0.0.1:8099";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageAt(route) {
  const target = await (await fetch(`${DEBUG_HOST}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  });
  const send = (method, params = {}) => {
    id += 1;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844,
  });
  await send("Page.navigate", { url: `${BASE}/${route}` });
  await sleep(2000);
  return {
    target, ws, send, evaluate,
    close: async () => {
      ws.close();
      fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
    },
  };
}

async function main() {
  let page = await pageAt("#ranking");
  await page.evaluate(`(() => {
    const input = document.querySelector('#ranking-search');
    input.value = 'joao';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(350);
  console.log("BUSCA joao", JSON.stringify(await page.evaluate(`({
    rows: document.querySelectorAll('#ranking-body tr').length,
    first: document.querySelector('#ranking-body .ranking-player__name')?.textContent,
    count: document.querySelector('#ranking-count')?.textContent
  })`)));

  await page.evaluate(`(() => {
    const input = document.querySelector('#ranking-search');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#ranking-filter').click();
    return true;
  })()`);
  await sleep(350);
  console.log("FILTRO top 8", JSON.stringify(await page.evaluate(`({
    rows: document.querySelectorAll('#ranking-body tr').length,
    pressed: document.querySelector('#ranking-filter').getAttribute('aria-pressed'),
    count: document.querySelector('#ranking-count')?.textContent
  })`)));
  await page.evaluate("document.querySelector('[data-player-open=\"p01\"]').click(); true");
  await sleep(500);
  console.log("MODAL jogador", JSON.stringify(await page.evaluate(`({
    open: document.querySelector('#app-modal').classList.contains('is-open'),
    title: document.querySelector('#modal-title')?.textContent,
    stats: [...document.querySelectorAll('.player-modal__stat strong')].map(n => n.textContent),
    focusInside: document.querySelector('#app-modal').contains(document.activeElement)
  })`)));
  await page.close();

  page = await pageAt("#historico");
  await page.evaluate("document.querySelector('[data-season=\"2026\"]').click(); true");
  await sleep(400);
  console.log("HISTÓRICO 2026", JSON.stringify(await page.evaluate(`({
    champion: document.querySelector('.archive-champion h2')?.textContent,
    podium: [...document.querySelectorAll('.archive-podium__name')].map(n => n.textContent),
    filtersHidden: document.querySelector('#history-filters').hidden,
    timelineNote: document.querySelector('.archive-note')?.textContent.slice(0, 70)
  })`)));
  await page.evaluate("document.querySelector('[data-stage-open=\"9\"]')?.click(); true");
  await sleep(300);
  await page.evaluate("document.querySelector('[data-season=\"2027\"]').click(); true");
  await sleep(400);
  await page.evaluate("document.querySelector('[data-stage-open=\"9\"]').click(); true");
  await sleep(500);
  console.log("MODAL etapa futura", JSON.stringify(await page.evaluate(`({
    title: document.querySelector('#modal-title')?.textContent,
    actions: [...document.querySelectorAll('#modal-content .modal__actions a')].map(a => a.textContent.trim().slice(0, 30)),
    hasFinalTable: Boolean(document.querySelector('#modal-content .modal-table'))
  })`)));
  await page.close();

  page = await pageAt("#inicio");
  await page.evaluate("document.querySelector('#menu-toggle').click(); true");
  await sleep(300);
  await page.evaluate("document.querySelector('#menu-drawer [data-route-link=\"loja\"]').click(); true");
  await sleep(500);
  console.log("MENU -> LOJA", JSON.stringify(await page.evaluate(`({
    route: document.body.dataset.route,
    activePage: [...document.querySelectorAll('.page.is-active')].map(p => p.dataset.page),
    menuOpen: document.querySelector('#menu-drawer').classList.contains('is-open'),
    menuHidden: document.querySelector('#menu-drawer').getAttribute('aria-hidden'),
    scrollY: Math.round(scrollY)
  })`)));
  await page.close();

  page = await pageAt("#contato");
  await page.evaluate(`(() => {
    document.querySelector('#contact-form button[type="submit"]').click();
    return true;
  })()`);
  await sleep(350);
  console.log("FORM inválido", JSON.stringify(await page.evaluate(`({
    invalidFields: [...document.querySelectorAll('[aria-invalid="true"]')].map(el => el.id),
    errors: [...document.querySelectorAll('.field__error')].filter(el => el.textContent.trim()).map(el => el.textContent.trim()),
    active: document.activeElement?.id
  })`)));
  await page.close();

  console.log("CONCLUÍDO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
