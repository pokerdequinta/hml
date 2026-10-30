import fs from "node:fs/promises";
import path from "node:path";

const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9233";
const BASE = "http://127.0.0.1:8099";
const OUT = path.resolve("qa");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createPage(width, height, mobile) {
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
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return result.result.value;
  };
  const navigate = async (route) => {
    await send("Page.navigate", { url: `${BASE}/${route}` });
    await sleep(2100);
  };
  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await fs.mkdir(OUT, { recursive: true });
    await fs.writeFile(path.join(OUT, name), Buffer.from(result.data, "base64"));
    console.log("CAPTURA", name);
  };
  const close = async () => {
    ws.close();
    fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
  };
  return { send, evaluate, navigate, screenshot, close };
}

async function main() {
  /* 768 ranking after podium fix */
  let page = await createPage(768, 1024, true);
  await page.navigate("#ranking");
  await page.screenshot("final-768-ranking.png");
  const podiumInfo = await page.evaluate(`(() => {
    const cards = [...document.querySelectorAll('.podium-card')].map(card => {
      const r = card.getBoundingClientRect();
      return { width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right) };
    });
    return { scrollWidth: document.documentElement.scrollWidth, cards };
  })()`);
  console.log("PODIUM 768", JSON.stringify(podiumInfo));
  await page.close();

  /* Contato: consentimento e checkbox */
  page = await createPage(390, 844, true);
  await page.navigate("#contato");
  await page.evaluate("document.querySelector('.checkbox-field').scrollIntoView({block:'center'}); true");
  await sleep(500);
  await page.screenshot("final-contato-consentimento.png");
  await page.close();

  /* Histórico arquivo 2026 */
  page = await createPage(1440, 1000, false);
  await page.navigate("#historico");
  await page.evaluate("document.querySelector('[data-season=\"2026\"]').click(); true");
  await sleep(500);
  await page.screenshot("final-historico-2026.png");
  const archiveInfo = await page.evaluate(`({
    active: document.querySelector('.season-tab.is-active')?.dataset.season,
    summary: document.querySelector('.archive-champion h2')?.textContent,
    timeline: document.querySelector('.archive-note')?.textContent.slice(0, 80)
  })`);
  console.log("HISTÓRICO 2026", JSON.stringify(archiveInfo));
  await page.close();

  /* Busca sem acento, filtro top 8 e modal de etapa futura */
  page = await createPage(1440, 1000, false);
  await page.navigate("#ranking");
  await page.evaluate(`(() => {
    const input = document.querySelector('#ranking-search');
    input.value = 'joao';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(400);
  const searchRows = await page.evaluate("document.querySelectorAll('#ranking-body tr').length");
  const searchName = await page.evaluate("document.querySelector('#ranking-body .ranking-player__name')?.textContent");
  console.log("BUSCA joao", JSON.stringify({ searchRows, searchName }));
  await page.evaluate("document.querySelector('#ranking-search').value=''; document.querySelector('#ranking-search').dispatchEvent(new Event('input', {bubbles:true})); document.querySelector('#ranking-filter').click(); true");
  await sleep(300);
  const top8Rows = await page.evaluate("document.querySelectorAll('#ranking-body tr').length");
  console.log("FILTRO TOP8", JSON.stringify({ top8Rows }));
  await page.close();

  page = await createPage(1440, 1000, false);
  await page.navigate("#historico");
  await page.evaluate("document.querySelector('[data-stage-open=\"9\"]').click(); true");
  await sleep(600);
  await page.screenshot("final-modal-proxima-etapa.png");
  const futureModal = await page.evaluate(`({
    title: document.querySelector('#modal-title')?.textContent,
    actions: [...document.querySelectorAll('#modal-content .modal__actions a')].map(a => a.textContent.trim().slice(0, 40)),
    table: Boolean(document.querySelector('#modal-content .modal-table'))
  })`);
  console.log("MODAL ETAPA 09", JSON.stringify(futureModal));
  await page.close();

  /* Navegação pelo menu hamburguer */
  page = await createPage(390, 844, true);
  await page.navigate("#inicio");
  await page.evaluate("document.querySelector('#menu-toggle').click(); true");
  await sleep(400);
  await page.evaluate("document.querySelector('#menu-drawer [data-route-link=\"loja\"]').click(); true");
  await sleep(500);
  const menuNav = await page.evaluate(`({
    route: document.body.dataset.route,
    menuOpen: document.querySelector('#menu-drawer').classList.contains('is-open'),
    activePage: [...document.querySelectorAll('.page.is-active')].map(p => p.dataset.page),
    activeNav: [...document.querySelectorAll('[data-nav][aria-current="page"]')].map(n => n.dataset.nav)
  })`);
  console.log("MENU -> LOJA", JSON.stringify(menuNav));
  await page.close();

  console.log("Concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
