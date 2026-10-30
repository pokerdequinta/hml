import fs from "node:fs/promises";

const DEBUG_HOST = "http://127.0.0.1:9229";
const BASE = "http://127.0.0.1:8099";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844,
  });
  const route = process.argv[2] || "#ranking";
  await send("Page.navigate", { url: `${BASE}/${route}` });
  await sleep(2200);
  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const vw = innerWidth;
      const clipped = (el) => {
        let p = el.parentElement;
        while (p && p !== document.body) {
          const s = getComputedStyle(p);
          if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) return true;
          p = p.parentElement;
        }
        return false;
      };
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if ((r.right > vw + 0.5 || r.left < -0.5) && !clipped(el)) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: el.className && typeof el.className === 'string' ? el.className : '',
            id: el.id,
            left: Math.round(r.left * 10) / 10,
            right: Math.round(r.right * 10) / 10,
            width: Math.round(r.width * 10) / 10,
            text: (el.textContent || '').trim().slice(0, 55),
          });
        }
      }
      const sections = ['.page-heading', '.podium', '.ranking-panel', '.ranking-toolbar', '.ranking-table-wrap', '.ranking-table', '.ranking-info-grid', '.champions-grid', '.site-footer'].map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        const r = el.getBoundingClientRect();
        return { sel, left: r.left, right: r.right, width: r.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflowX: getComputedStyle(el).overflowX };
      });
      const drawers = [...document.querySelectorAll('.drawer')].map(el => {
        const r = el.getBoundingClientRect();
        return { id: el.id, left: r.left, right: r.right, width: r.width, transform: getComputedStyle(el).transform, visibility: getComputedStyle(el).visibility };
      });
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        offenders: offenders.slice(0, 30),
        drawers,
        sections,
      };
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(result.result.value, null, 2));
  ws.close();
  fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
