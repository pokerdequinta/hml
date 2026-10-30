const DEBUG_HOST = process.env.CDP_HOST || "http://127.0.0.1:9230";
const BASE = "http://127.0.0.1:8099";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
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
    } else if (m.method) events.push(m);
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
    return result.result.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });

  console.log("Navegando online...");
  await send("Page.navigate", { url: `${BASE}/#inicio` });
  await sleep(4200);

  const swInfo = await evaluate(`(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const registration = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    const details = {};
    for (const key of keys) {
      const cache = await caches.open(key);
      const entries = await cache.keys();
      details[key] = entries.map((request) => request.url.replace(location.origin, ''));
    }
    return {
      supported: true,
      scope: registration.scope,
      active: registration.active && registration.active.state,
      controller: Boolean(navigator.serviceWorker.controller),
      caches: details,
    };
  })()`);
  console.log("SERVICE WORKER", JSON.stringify(swInfo, null, 2));

  const installability = await send("Page.getInstallabilityErrors");
  console.log("INSTALLABILITY", JSON.stringify(installability, null, 2));

  console.log("Simulando offline...");
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await sleep(500);

  await send("Page.navigate", { url: `${BASE}/#ranking` });
  await sleep(2500);

  const offlineState = await evaluate(`(() => ({
    title: document.title,
    route: document.body.dataset.route,
    online: navigator.onLine,
    offlineBannerVisible: !document.querySelector('#offline-banner')?.hidden,
    rankingRows: document.querySelectorAll('#ranking-body tr').length,
    cssLoaded: getComputedStyle(document.body).backgroundColor,
    bodyText: document.body.innerText.slice(0, 120),
  }))()`);
  console.log("OFFLINE STATE", JSON.stringify(offlineState, null, 2));

  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await sleep(500);

  const errors = events
    .filter((event) => event.method === "Runtime.exceptionThrown" || (event.method === "Log.entryAdded" && event.params.entry.level === "error"))
    .map((event) => event.method === "Runtime.exceptionThrown" ? event.params.exceptionDetails.text : event.params.entry.text);
  console.log("ERROS", JSON.stringify(errors, null, 2));

  ws.close();
  fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
