import fs from "node:fs/promises";
import path from "node:path";

const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9229";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8099";
const OUT = path.resolve("qa");
const ASSET_OUT = path.resolve("assets/img");

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      } else if (message.method) {
        this.events.push(message);
      }
    });
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout em ${method}`));
        }
      }, 30000);
    });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createPage() {
  const response = await fetch(`${DEBUG_HOST}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Não foi possível criar target: ${response.status}`);
  const target = await response.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const client = new CDP(ws);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  await client.send("Network.enable");
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  return { client, ws, target };
}

async function closePage(page) {
  try { page.ws.close(); } catch {}
  try { await fetch(`${DEBUG_HOST}/json/close/${page.target.id}`); } catch {}
}

async function setViewport(page, width, height, mobile = false) {
  await page.client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
}

async function waitReady(page, delay = 1600) {
  for (let i = 0; i < 60; i += 1) {
    const state = await page.client.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (state.result.value === "complete") break;
    await sleep(100);
  }
  await page.client.send("Runtime.evaluate", {
    expression: "document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true",
    awaitPromise: true,
    returnByValue: true,
  });
  await sleep(delay);
}

async function getMetrics(page) {
  const metrics = await page.client.send("Page.getLayoutMetrics");
  return metrics.cssContentSize || metrics.contentSize;
}

async function screenshot(page, file, options = {}) {
  const { fullPage = false, width, height } = options;
  const params = {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: fullPage,
  };
  if (fullPage) {
    const content = await getMetrics(page);
    const h = Math.min(16000, Math.ceil(content.height));
    params.clip = { x: 0, y: 0, width: Math.ceil(content.width), height: h, scale: 1 };
  }
  const result = await page.client.send("Page.captureScreenshot", params);
  const buffer = Buffer.from(result.data, "base64");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
  console.log(`Captura: ${path.relative(process.cwd(), file)} (${buffer.length} bytes)`);
  if (width && height) {
    // metadata only; useful for manifest checks
  }
}

async function evaluate(page, expression) {
  const result = await page.client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Erro ao avaliar expressão");
  }
  return result.result.value;
}

async function navigate(page, url) {
  await page.client.send("Page.navigate", { url });
  await waitReady(page);
}

async function collectDiagnostics(page, label) {
  const info = await evaluate(page, `(() => {
    const root = document.documentElement;
    const missingImages = [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
    const links = [...document.querySelectorAll('a[href="#"]')].length;
    return {
      label: ${JSON.stringify(label)},
      url: location.href,
      title: document.title,
      route: document.body.dataset.route,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      scrollHeight: root.scrollHeight,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
      missingImages,
      placeholderLinks: links,
      activeNav: [...document.querySelectorAll('[data-nav][aria-current="page"]')].map(el => el.dataset.nav),
      stageSlides: document.querySelectorAll('.stage-slide').length,
      rankingRows: document.querySelectorAll('#ranking-body tr').length,
      shopCards: document.querySelectorAll('.product-card').length,
      timelineItems: document.querySelectorAll('.timeline-item').length,
      visiblePages: [...document.querySelectorAll('.page')].filter(el => !el.hidden).map(el => el.dataset.page),
    };
  })()`);

  const errors = page.client.events
    .filter((event) => event.method === "Runtime.exceptionThrown" || (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level)))
    .map((event) => event.method === "Runtime.exceptionThrown"
      ? event.params.exceptionDetails.text + " " + (event.params.exceptionDetails.exception?.description || "")
      : `${event.params.entry.level}: ${event.params.entry.text}`);

  console.log("DIAGNÓSTICO", JSON.stringify(info, null, 2));
  if (errors.length) console.log("ERROS DE CONSOLE", JSON.stringify(errors, null, 2));
  return { info, errors };
}

async function checkManifest(page) {
  try {
    const manifest = await page.client.send("Page.getAppManifest");
    console.log("MANIFEST", JSON.stringify({
      url: manifest.url,
      errors: manifest.errors,
      data: manifest.data ? JSON.parse(manifest.data) : null,
    }, null, 2));
  } catch (error) {
    console.log("MANIFEST ERROR", error.message);
  }
  try {
    const installability = await page.client.send("Page.getInstallabilityErrors");
    console.log("INSTALLABILITY", JSON.stringify(installability, null, 2));
  } catch (error) {
    console.log("INSTALLABILITY ERROR", error.message);
  }
}

async function finish(page) {
  await closePage(page);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(ASSET_OUT, { recursive: true });

  /* 1. Desktop home */
  let page = await createPage();
  await setViewport(page, 1440, 1000);
  await navigate(page, `${BASE}/#inicio`);
  await collectDiagnostics(page, "home-desktop");
  await screenshot(page, path.join(OUT, "home-desktop-viewport.png"));
  await screenshot(page, path.join(OUT, "home-desktop-full.png"), { fullPage: true });
  await checkManifest(page);
  await evaluate(page, "document.getElementById('temporada').scrollIntoView({ block: 'start' }); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "home-desktop-carousel.png"));
  await animateCarousel(page);
  await screenshot(page, path.join(OUT, "home-desktop-carousel-next.png"));
  await finish(page);

  /* 2. Mobile home + manifest screenshot */
  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#inicio`);
  await collectDiagnostics(page, "home-mobile");
  await screenshot(page, path.join(OUT, "home-mobile-viewport.png"));
  await screenshot(page, path.join(ASSET_OUT, "screenshot-mobile.png"));
  await screenshot(page, path.join(OUT, "home-mobile-full.png"), { fullPage: true });
  await evaluate(page, "document.getElementById('temporada').scrollIntoView({ block: 'start' }); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "home-mobile-carousel.png"));
  await finish(page);

  /* 3. Desktop manifest screenshot */
  page = await createPage();
  await setViewport(page, 1280, 800);
  await navigate(page, `${BASE}/#inicio`);
  await screenshot(page, path.join(ASSET_OUT, "screenshot-desktop.png"));
  await finish(page);

  /* 4. Ranking desktop/mobile */
  page = await createPage();
  await setViewport(page, 1440, 1100);
  await navigate(page, `${BASE}/#ranking`);
  await collectDiagnostics(page, "ranking-desktop");
  await screenshot(page, path.join(OUT, "ranking-desktop.png"));
  await finish(page);

  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#ranking`);
  await collectDiagnostics(page, "ranking-mobile");
  await screenshot(page, path.join(OUT, "ranking-mobile.png"));
  await evaluate(page, "document.querySelector('.ranking-panel').scrollIntoView({ block: 'start' }); true");
  await sleep(500);
  await screenshot(page, path.join(OUT, "ranking-mobile-table.png"));
  await finish(page);

  /* 5. Regulamento */
  page = await createPage();
  await setViewport(page, 1440, 1100);
  await navigate(page, `${BASE}/#regulamento`);
  await collectDiagnostics(page, "regulamento-desktop");
  await screenshot(page, path.join(OUT, "regulamento-desktop.png"));
  await finish(page);

  /* 6. Histórico */
  page = await createPage();
  await setViewport(page, 1440, 1100);
  await navigate(page, `${BASE}/#historico`);
  await collectDiagnostics(page, "historico-desktop");
  await screenshot(page, path.join(OUT, "historico-desktop.png"));
  await finish(page);

  /* 7. Loja + carrinho */
  page = await createPage();
  await setViewport(page, 1440, 1100);
  await navigate(page, `${BASE}/#loja`);
  await collectDiagnostics(page, "loja-desktop");
  await screenshot(page, path.join(OUT, "loja-desktop.png"));
  await finish(page);

  /* 8. Localização */
  page = await createPage();
  await setViewport(page, 1440, 1100);
  await navigate(page, `${BASE}/#localizacao`);
  await collectDiagnostics(page, "localizacao-desktop");
  await screenshot(page, path.join(OUT, "localizacao-desktop.png"));
  await finish(page);

  /* 9. Sobre mobile */
  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#sobre`);
  await collectDiagnostics(page, "sobre-mobile");
  await screenshot(page, path.join(OUT, "sobre-mobile.png"));
  await finish(page);

  /* 10. Contato mobile */
  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#contato`);
  await collectDiagnostics(page, "contato-mobile");
  await screenshot(page, path.join(OUT, "contato-mobile.png"));
  await evaluate(page, "document.querySelector('#contact-form button[type=submit]').click(); true");
  await sleep(400);
  await screenshot(page, path.join(OUT, "contato-mobile-erros.png"));
  await finish(page);

  /* 11. Menu mobile */
  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#inicio`);
  await evaluate(page, "document.querySelector('#menu-toggle').click(); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "menu-mobile.png"));
  await evaluate(page, "document.querySelector('#install-card').click(); true");
  await sleep(500);
  await screenshot(page, path.join(OUT, "install-modal.png"));
  await finish(page);

  /* 12. Shop interactions: size + add + open cart */
  page = await createPage();
  await setViewport(page, 390, 844, true);
  await navigate(page, `${BASE}/#loja`);
  await evaluate(page, `(() => {
    const size = document.querySelector('[data-size-product="camisa-2027"][data-size="M"]');
    size?.click();
    const add = document.querySelector('[data-add-to-cart="camisa-2027"]');
    add?.click();
    return true;
  })()`);
  await sleep(900);
  await screenshot(page, path.join(OUT, "loja-mobile-toast.png"));
  await evaluate(page, "document.querySelector('#cart-toggle').click(); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "carrinho-mobile.png"));
  await finish(page);

  /* 13. Stage modal + player modal */
  page = await createPage();
  await setViewport(page, 1440, 1000);
  await navigate(page, `${BASE}/#historico`);
  await evaluate(page, "document.querySelector('[data-stage-open=\"8\"]').click(); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "modal-etapa.png"));
  await evaluate(page, "document.querySelector('#app-modal [data-close-modal]').click(); true");
  await sleep(400);
  await navigate(page, `${BASE}/#ranking`);
  await evaluate(page, "document.querySelector('[data-player-open=\"p01\"]').click(); true");
  await sleep(700);
  await screenshot(page, path.join(OUT, "modal-jogador.png"));
  await finish(page);

  console.log("Concluído.");
}

async function animateCarousel(page) {
  await evaluate(page, "document.querySelector('#carousel-next').click(); true");
  await sleep(900);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
