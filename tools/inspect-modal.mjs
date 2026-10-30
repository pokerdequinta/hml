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
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 1000 });
  await send("Page.navigate", { url: `${BASE}/#historico` });
  await sleep(1800);
  await send("Runtime.evaluate", { expression: "document.querySelector('[data-stage-open=\"8\"]').click(); true" });
  await sleep(700);
  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const dialog = document.querySelector('#modal-dialog');
      const content = document.querySelector('#modal-content');
      const eyebrow = document.querySelector('#modal-content .modal__eyebrow');
      const title = document.querySelector('#modal-content .modal__title');
      const close = document.querySelector('#app-modal .modal__close');
      const box = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { top:r.top, left:r.left, width:r.width, height:r.height, paddingTop:s.paddingTop, paddingBottom:s.paddingBottom, marginTop:s.marginTop, scrollTop:el.scrollTop, position:s.position }; };
      return { dialog: box(dialog), dialogScrollTop: dialog.scrollTop, content: box(content), eyebrow: box(eyebrow), title: box(title), close: box(close), modalTop: document.querySelector('#app-modal').getBoundingClientRect().top };
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(result.result.value, null, 2));
  ws.close();
  fetch(`${DEBUG_HOST}/json/close/${target.id}`).catch(() => {});
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
