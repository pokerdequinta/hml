import fs from "node:fs/promises";
import path from "node:path";

const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9229";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8099";
const OUT = path.resolve("qa");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createPage() {
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
  return { target, ws, send };
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result.value;
}

async function shot(page, name, fullPage = false) {
  const params = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
  if (fullPage) {
    const metrics = await page.send("Page.getLayoutMetrics");
    const content = metrics.cssContentSize || metrics.contentSize;
    params.clip = { x: 0, y: 0, width: Math.ceil(content.width), height: Math.min(16000, Math.ceil(content.height)), scale: 1 };
  }
  const image = await page.send("Page.captureScreenshot", params);
  const file = path.join(OUT, name);
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(file, Buffer.from(image.data, "base64"));
  console.log("CAPTURA", path.relative(process.cwd(), file));
}

async function run(label, width, height, route, mobile, actions) {
  const page = await createPage();
  await page.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height,
  });
  await page.send("Page.navigate", { url: `${BASE}/${route}` });
  await sleep(2100);
  const info = await evaluate(page, `({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    title: document.title,
    route: document.body.dataset.route
  })`);
  console.log(label, JSON.stringify(info));
  if (actions) await actions(page);
  await page.ws.close();
  fetch(`${DEBUG_HOST}/json/close/${page.target.id}`).catch(() => {});
}

async function main() {
  await run("desktop-1024", 1024, 768, "#inicio", false, async (page) => {
    await shot(page, "tablet-1024-home.png");
    await evaluate(page, "document.getElementById('temporada').scrollIntoView({block:'start'}); true");
    await sleep(700);
    await shot(page, "tablet-1024-carousel.png");
  });

  await run("tablet-834", 834, 1112, "#inicio", true, async (page) => {
    await shot(page, "tablet-834-home.png");
    await evaluate(page, "document.getElementById('temporada').scrollIntoView({block:'start'}); true");
    await sleep(700);
    await shot(page, "tablet-834-carousel.png");
  });

  await run("tablet-768-ranking", 768, 1024, "#ranking", true, async (page) => {
    await shot(page, "tablet-768-ranking.png");
  });

  await run("small-320", 320, 720, "#inicio", true, async (page) => {
    await shot(page, "mobile-320-home.png");
    await evaluate(page, "document.getElementById('temporada').scrollIntoView({block:'start'}); true");
    await sleep(700);
    await shot(page, "mobile-320-carousel.png");
  });

  await run("mobile-390-modal", 390, 844, "#historico", true, async (page) => {
    await evaluate(page, "document.querySelector('[data-stage-open=\"8\"]').click(); true");
    await sleep(600);
    await shot(page, "modal-etapa-mobile.png");
    await evaluate(page, "document.querySelector('#app-modal [data-close-modal]').click(); true");
    await sleep(300);
    await page.send("Page.navigate", { url: `${BASE}/#ranking` });
    await sleep(1800);
    await evaluate(page, "document.querySelector('[data-player-open=\"p01\"]').click(); true");
    await sleep(600);
    await shot(page, "modal-jogador-mobile.png");
  });

  console.log("Concluído.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
