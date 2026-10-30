import fs from "node:fs/promises";

const DEBUG_HOST = "http://127.0.0.1:9229";
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
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
  await send("Page.navigate", { url: `${BASE}/#ranking` });
  await sleep(2000);
  const expression = `(() => {
    const selectors = ['#menu-drawer', '#cart-drawer', '.ranking-table-wrap', '.ranking-panel', '.podium', '.page-heading', '.ranking-info-grid', '.champions-grid', '.site-footer', '.bottom-nav', '#app-modal .modal__dialog'];
    const out = {};
    out.base = { scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, drawer: document.querySelector('#menu-drawer').getBoundingClientRect().width };
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const prev = el.style.display;
      el.style.display = 'none';
      out[sel] = { scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, drawer: document.querySelector('#menu-drawer').getBoundingClientRect().width };
      el.style.display = prev;
    }
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflowX;
    const prevBody = body.style.overflowX;
    html.style.overflowX = 'clip';
    body.style.overflowX = 'clip';
    out.clip = { scroll: html.scrollWidth, body: body.scrollWidth, drawer: document.querySelector('#menu-drawer').getBoundingClientRect().width };
    html.style.overflowX = prevHtml;
    body.style.overflowX = prevBody;
    return out;
  })()`;
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  console.log(JSON.stringify(result.result.value, null, 2));
  ws.close();
  fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
