import fs from "node:fs/promises";
import path from "node:path";

const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9236";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8099";
const OUT = path.resolve("qa2");
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
  const events = [];
  ws.addEventListener("message", (event) => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    } else if (m.method) {
      events.push(m);
    }
  });
  const send = (method, params = {}) => {
    id += 1;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout ${method}`));
        }
      }, 30000);
    });
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height,
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "evaluate error");
    return result.result.value;
  };
  const navigate = async (route) => {
    await send("Page.navigate", { url: `${BASE}/${route}` });
    await sleep(3600);
  };
  const screenshot = async (name, fullPage = false) => {
    const params = { format: "png", fromSurface: true, captureBeyondViewport: fullPage };
    if (fullPage) {
      const metrics = await send("Page.getLayoutMetrics");
      const content = metrics.cssContentSize || metrics.contentSize;
      params.clip = { x: 0, y: 0, width: Math.ceil(content.width), height: Math.min(16000, Math.ceil(content.height)), scale: 1 };
    }
    const result = await send("Page.captureScreenshot", params);
    await fs.mkdir(OUT, { recursive: true });
    await fs.writeFile(path.join(OUT, name), Buffer.from(result.data, "base64"));
    console.log("CAPTURA", name);
  };
  const close = async () => {
    ws.close();
    fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
  };
  return { send, evaluate, navigate, screenshot, close, events };
}

async function main() {
  let page = await createPage(1440, 1000, false);
  await page.navigate("#inicio");
  const homeInfo = await page.evaluate(`(async () => {
    await new Promise(r => setTimeout(r, 2000));
    const logos = [...document.images].filter(img => img.src.includes('logo'));
    return {
      logoCount: logos.length,
      logoLoaded: logos.every(img => img.complete && img.naturalWidth > 0),
      logoUrls: logos.map(img => img.currentSrc).slice(0, 6),
      cardLogos: document.querySelectorAll('.playing-card img, .cta-card img').length,
      firebaseSource: document.body.dataset.firebaseSource,
      nextStage: document.querySelector('#next-stage-title')?.textContent,
      nextDate: document.querySelector('#next-stage-date')?.textContent,
      confirmSource: document.querySelector('#confirm-source')?.textContent,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  })()`);
  console.log("HOME LOGO", JSON.stringify(homeInfo, null, 2));
  await page.screenshot("home-desktop-logo.png");
  await page.navigate("#ranking");
  await page.screenshot("ranking-desktop-logo.png");
  await page.close();

  page = await createPage(1440, 1000, false);
  await page.navigate("#confirmar");
  await sleep(3000);
  const frameTree = await page.send("Page.getFrameTree");
  const confirmInfo = await page.evaluate(`({
    stage: document.querySelector('#confirm-stage')?.textContent,
    date: document.querySelector('#confirm-date')?.textContent,
    status: document.querySelector('#confirm-status')?.textContent,
    opening: document.querySelector('#confirm-opening')?.textContent,
    source: document.querySelector('#confirm-source')?.textContent,
    iframeSrc: document.querySelector('#confirm-frame')?.src,
    offlineHidden: document.querySelector('#confirm-offline')?.hidden,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })`);
  console.log("CONFIRM", JSON.stringify(confirmInfo, null, 2));
  console.log("FRAME TREE", JSON.stringify(frameTree.frameTree, null, 2).slice(0, 1600));
  await page.screenshot("confirmar-desktop.png");
  await page.close();

  page = await createPage(390, 844, true);
  await page.navigate("#inicio");
  await page.screenshot("home-mobile-logo.png");
  await page.navigate("#ranking");
  await page.screenshot("ranking-mobile-logo.png");
  await page.navigate("#confirmar");
  await sleep(2200);
  await page.screenshot("confirmar-mobile.png");
  const mobileConfirm = await page.evaluate(`({
    stage: document.querySelector('#confirm-stage')?.textContent,
    iframeSrc: document.querySelector('#confirm-frame')?.src,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  })`);
  console.log("CONFIRM MOBILE", JSON.stringify(mobileConfirm));
  await page.close();

  /* Injeta cache Firebase para testar fotos + datas sem alterar o banco real. */
  page = await createPage(1440, 1000, false);
  await page.navigate("#inicio");
  await page.evaluate(`(() => {
    const data = {
      enabled: true,
      season: {
        config: {
          temporada: '2027',
          proximaEtapa: 10,
          inscricoesAbertas: true,
          dataEvento: '2027-11-04',
          dataAbertura: '2027-10-25T10:00:00.000Z',
          rankingUpdatedAfter: 8
        },
        etapas: {
          '10': { numero: 10, data: '2027-11-11', status: 'next' }
        }
      },
      liveConfig: null,
      photos: {
        'Camila Duarte': 'https://github.com/pokerdequinta/fotos/blob/main/Amarildo.png?raw=true'
      },
      fetchedAt: new Date().toISOString()
    };
    localStorage.setItem('pq2027-firebase-cache-v1', JSON.stringify({ savedAt: Date.now(), data }));
    location.reload();
    return true;
  })()`);
  await sleep(4500);
  const firebaseTest = await page.evaluate(`({
    nextStage: document.querySelector('#next-stage-title')?.textContent,
    nextDate: document.querySelector('#next-stage-date')?.textContent,
    nextNumber: document.querySelector('#next-stage-number')?.textContent,
    photoAvatar: Boolean(document.querySelector('.ranking-player__avatar img')),
    photoLoaded: [...document.querySelectorAll('.ranking-player__avatar img')].every(img => img.complete && img.naturalWidth > 0)
  })`);
  console.log("FIREBASE CACHE TEST", JSON.stringify(firebaseTest, null, 2));
  await page.navigate("#ranking");
  await sleep(2200);
  const photoInfo = await page.evaluate(`({
    avatarImages: document.querySelectorAll('.ranking-player__avatar img').length,
    photoLoaded: [...document.querySelectorAll('.ranking-player__avatar img')].every(img => img.complete && img.naturalWidth > 0),
    leaderImages: document.querySelectorAll('.podium-card__avatar img').length
  })`);
  console.log("PHOTO TEST", JSON.stringify(photoInfo, null, 2));
  await page.screenshot("ranking-foto-teste.png");
  await page.evaluate("localStorage.removeItem('pq2027-firebase-cache-v1'); true");
  await page.close();

  /* Erros de console por página. */
  console.log("CONCLUÍDO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
