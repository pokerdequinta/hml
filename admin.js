/* ============================================
   POKER DE QUINTA 2027 — admin.js (Firebase RTDB)
   ============================================ */

import { db, DATA_PATH } from "./firebase-config.js";
import {
  ref, onValue, set, get
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ---------- CONFIGURAÇÃO RÁPIDA ---------- */
// Deixe vazio "" para gravar direto (bom para homologação).
// Preencha "suaSenha" para exigir senha antes de salvar.
const ADMIN_PASSWORD = "";

const STORAGE_KEY = 'pdq_data_v2027';
let DATA = null;
let dirty = false;

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  el.style.background = type === 'error'
    ? 'var(--color-danger-soft)'
    : 'var(--color-success-soft)';
  el.style.color = type === 'error'
    ? 'var(--color-danger)'
    : 'var(--color-success)';
  el.style.borderColor = type === 'error'
    ? 'var(--color-border-danger)'
    : 'var(--color-border-success)';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2500);
}

function mkField(label, value, onChange, placeholder = '') {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const inp = document.createElement('input');
  inp.value = value || '';
  inp.placeholder = placeholder;
  inp.addEventListener('input', e => { onChange(e.target.value); markDirty(); });
  wrap.append(lab, inp);
  return wrap;
}

function mkTextarea(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'form-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const ta = document.createElement('textarea');
  ta.value = value || '';
  ta.addEventListener('input', e => { onChange(e.target.value); markDirty(); });
  wrap.append(lab, ta);
  return wrap;
}

function markDirty() {
  dirty = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  updateSaveBtn();
}

function updateSaveBtn() {
  const btn = document.getElementById('saveAllBtn');
  if (!btn) return;
  btn.textContent = dirty ? '💾 Salvar alterações no Firebase' : '💾 Salvo ✓';
  btn.style.opacity = dirty ? '1' : '0.6';
}

function connect() {
  const status = document.getElementById('connStatus');
  const dataRef = ref(db, DATA_PATH);

  onValue(dataRef, (snap) => {
    const remote = snap.val();
    if (status) {
      status.textContent = remote
        ? `✅ Conectado — dados no Firebase (última sincronização: ${new Date().toLocaleTimeString()})`
        : `⚠️ Conectado, mas o nó "/${DATA_PATH}" está vazio no Firebase.`;
    }

    if (!DATA) {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && !remote) {
        DATA = JSON.parse(cached);
        toast('Usando cache local — clique em Salvar para enviar ao Firebase.');
      } else {
        DATA = remote || { nextStage: { info: [] }, stages: [] };
      }
      renderAll();
    }
  }, (err) => {
    console.error(err);
    if (status) status.textContent = `❌ Erro: ${err.message}`;
    toast('Erro ao conectar: ' + err.message, 'error');
  });
}

async function saveToFirebase() {
  if (ADMIN_PASSWORD) {
    const input = prompt('Senha do admin:');
    if (input !== ADMIN_PASSWORD) { toast('Senha incorreta', 'error'); return; }
  }
  try {
    await set(ref(db, DATA_PATH), DATA);
    dirty = false;
    localStorage.removeItem(STORAGE_KEY);
    updateSaveBtn();
    toast('Dados salvos no Firebase ✓');
  } catch (err) {
    console.error(err);
    toast('Erro ao salvar: ' + err.message, 'error');
  }
}

async function reloadFromFirebase() {
  if (dirty && !confirm('Você tem alterações não salvas. Descartar e recarregar?')) return;
  const snap = await get(ref(db, DATA_PATH));
  DATA = snap.val() || { nextStage: { info: [] }, stages: [] };
  dirty = false;
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  toast('Recarregado do Firebase ✓');
}

function renderNextStage() {
  DATA.nextStage = DATA.nextStage || { info: [] };
  const n = DATA.nextStage;

  document.getElementById('nextBadge').value = n.badge  || '';
  document.getElementById('nextDate').value  = n.date   || '';
  document.getElementById('nextDesc').value  = n.desc   || '';
  document.getElementById('nextCta').value   = n.ctaUrl || '';

  document.getElementById('nextBadge').oninput = e => { n.badge  = e.target.value; markDirty(); };
  document.getElementById('nextDate').oninput  = e => { n.date   = e.target.value; markDirty(); };
  document.getElementById('nextDesc').oninput  = e => { n.desc   = e.target.value; markDirty(); };
  document.getElementById('nextCta').oninput   = e => { n.ctaUrl = e.target.value; markDirty(); };

  const infoArr = Array.isArray(n.info) ? n.info : Object.values(n.info || {});
  n.info = infoArr;

  const list = document.getElementById('nextInfoList');
  list.innerHTML = '';
  infoArr.forEach((it, i) => {
    const block = document.createElement('div');
    block.className = 'highlight-editor';
    block.style.display = 'grid';
    block.style.gridTemplateColumns = '60px 1fr 1fr 40px';
    block.style.gap = '8px';
    block.style.alignItems = 'end';
    block.appendChild(mkField('Ícone', it.icon,  v => { it.icon  = v; }));
    block.appendChild(mkField('Label', it.label, v => { it.label = v; }));
    block.appendChild(mkField('Valor', it.value, v => { it.value = v; }));
    const rm = document.createElement('button');
    rm.className = 'btn btn--danger';
    rm.style.padding = '8px';
    rm.textContent = '✕';
    rm.onclick = () => {
      n.info.splice(i, 1);
      markDirty(); renderNextStage();
    };
    block.appendChild(rm);
    list.appendChild(block);
  });
}

document.getElementById('addInfoBtn').onclick = () => {
  DATA.nextStage = DATA.nextStage || { info: [] };
  DATA.nextStage.info = DATA.nextStage.info || [];
  DATA.nextStage.info.push({ icon: '📌', label: '', value: '' });
  markDirty(); renderNextStage();
};

function renderStages() {
  const wrap = document.getElementById('stagesEditor');
  wrap.innerHTML = '';

  const stagesArr = Array.isArray(DATA.stages)
    ? DATA.stages
    : Object.values(DATA.stages || {});
  stagesArr.sort((a, b) => a.number - b.number);
  DATA.stages = stagesArr;

  stagesArr.forEach((stage, si) => {
    const block = document.createElement('div');
    block.className = 'admin-stage-block';

    const h3 = document.createElement('h3');
    h3.textContent = `${stage.number}ª Etapa`;
    block.appendChild(h3);

    const rmStage = document.createElement('button');
    rmStage.className = 'btn btn--danger';
    rmStage.style.marginBottom = '12px';
    rmStage.textContent = '🗑️ Remover etapa';
    rmStage.onclick = () => {
      if (confirm(`Remover ${stage.number}ª etapa?`)) {
        DATA.stages.splice(si, 1);
        markDirty(); renderStages();
      }
    };
    block.appendChild(rmStage);

    const highlights = Array.isArray(stage.highlights)
      ? stage.highlights
      : Object.values(stage.highlights || {});
    stage.highlights = highlights;

    highlights.forEach((h, hi) => {
      const card = document.createElement('div');
      card.className = 'highlight-editor';

      const title = document.createElement('h4');
      title.textContent = `${h.icon || ''} ${h.title || 'Destaque'} — ${h.name || ''}`;
      card.appendChild(title);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';
      grid.appendChild(mkField('Tipo', h.type, v => { h.type = v; markDirty(); renderStages(); }));
      grid.appendChild(mkField('Ícone', h.icon, v => { h.icon = v; }));
      grid.appendChild(mkField('Título', h.title, v => { h.title = v; }));
      grid.appendChild(mkField('Nome', h.name, v => { h.name = v; }));
      card.appendChild(grid);

      card.appendChild(mkField('Detalhe', h.detail, v => { h.detail = v; }));
      card.appendChild(mkField('Pontos (opcional)', h.points, v => { h.points = v; }));
      card.appendChild(mkField('Recompensa (opcional)', h.reward, v => { h.reward = v; }));
      card.appendChild(mkField('URL da foto principal', h.photo, v => { h.photo = v; }));

      if (h.type === 'bestHand') {
        card.appendChild(mkField('URL da foto da pessoa', h.personPhoto, v => { h.personPhoto = v; }));
      }

      if (h.type === 'roleta') {
        const imgsArr = Array.isArray(h.images) ? h.images : Object.values(h.images || {});
        h.images = imgsArr;
        const imgLabel = document.createElement('label');
        imgLabel.textContent = 'URLs das imagens (uma por linha)';
        imgLabel.style.cssText = 'font-size:11px; color:var(--color-text-muted); text-transform:uppercase; display:block; margin-top:8px;';
        const ta = document.createElement('textarea');
        ta.value = imgsArr.join('\n');
        ta.style.cssText = 'width:100%; min-height:80px; background:var(--color-surface); border:1px solid var(--color-border-soft); border-radius:8px; padding:8px; color:var(--color-text); font-size:12px;';
        ta.oninput = e => {
          h.images = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
          markDirty();
        };
        card.append(imgLabel, ta);
      }

      if (h.type === 'killers') {
        const killersArr = Array.isArray(h.killers) ? h.killers : Object.values(h.killers || {});
        h.killers = killersArr;
        killersArr.forEach((k, ki) => {
          const kGrid = document.createElement('div');
          kGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;';
          kGrid.appendChild(mkField(`Matador ${ki + 1} - Nome`, k.name, v => { k.name = v; }));
          kGrid.appendChild(mkField(`Matador ${ki + 1} - Foto`, k.photo, v => { k.photo = v; }));
          card.appendChild(kGrid);
        });
      }

      const rmH = document.createElement('button');
      rmH.className = 'btn btn--danger';
      rmH.style.marginTop = '8px';
      rmH.textContent = '✕ Remover destaque';
      rmH.onclick = () => {
        if (confirm('Remover este destaque?')) {
          stage.highlights.splice(hi, 1);
          markDirty(); renderStages();
        }
      };
      card.appendChild(rmH);
      block.appendChild(card);
    });

    const addH = document.createElement('button');
    addH.className = 'btn btn--ghost';
    addH.textContent = '+ Adicionar destaque';
    addH.onclick = () => {
      stage.highlights = stage.highlights || [];
      stage.highlights.push({ type: 'champion', icon: '👑', title: 'Campeão', name: '', detail: '', photo: '' });
      markDirty(); renderStages();
    };
    block.appendChild(addH);

    wrap.appendChild(block);
  });
}

document.getElementById('addStageBtn').onclick = () => {
  const stagesArr = Array.isArray(DATA.stages) ? DATA.stages : Object.values(DATA.stages || {});
  DATA.stages = stagesArr;
  const nextNum = stagesArr.length ? Math.max(...stagesArr.map(s => s.number)) + 1 : 1;
  DATA.stages.push({
    number: nextNum,
    highlights: [
      { type: 'champion', icon: '👑', title: 'Campeão',       name: '', detail: '', photo: '' },
      { type: 'bestHand', icon: '🃏', title: 'Melhor Mão',    name: '', detail: '', photo: '', personPhoto: '' },
      { type: 'killer',   icon: '💥', title: 'Matador de KO', name: '', detail: '', photo: '' },
      { type: 'roleta',   icon: '🎡', title: 'Roleta da Sorte', name: '', detail: '', images: [] }
    ]
  });
  markDirty(); renderStages();
  toast(`${nextNum}ª etapa adicionada — não esqueça de salvar.`);
};

function renderAll() {
  renderNextStage();
  renderStages();
  updateSaveBtn();
}

document.getElementById('saveAllBtn').onclick = saveToFirebase;
document.getElementById('reloadBtn').onclick  = reloadFromFirebase;

window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

connect();