import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Configuração do Firebase direto aqui
const firebaseConfig = {
  apiKey:            "AIzaSyAdQ5YfqyZ0Uhu234OPW3hK1QzvZw9bjlw",
  authDomain:        "pdqhml.firebaseapp.com",
  databaseURL:       "https://pdqhml-default-rtdb.firebaseio.com",
  projectId:         "pdqhml",
  storageBucket:     "pdqhml.firebasestorage.app",
  messagingSenderId: "166410002787",
  appId:             "1:166410002787:web:e04bf2c3c4a7ebb8577356",
  measurementId:     "G-MJBNCJBDZK"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const DATA_PATH = "pdq/data";

let DATA = null;
let activeStage = null;
const sliderIntervals = {};

function subscribeData() {
  const dataRef = ref(db, DATA_PATH);
  onValue(dataRef, (snapshot) => {
    DATA = snapshot.val();
    if (!DATA) {
      document.getElementById('stageContent').innerHTML = '<p class="empty-state">Nenhum dado no Firebase. Vá no Admin e clique em Salvar.</p>';
      return;
    }
    renderNextStage();
    renderStageTabs();

    const stages = DATA.stages || [];
    const stillExists = stages.some(s => s.number === activeStage);
    const target = stillExists
      ? activeStage
      : (stages.length ? stages[stages.length - 1].number : null);

    if (target !== null) selectStage(target);
  }, (error) => {
    console.error("Erro Firebase:", error);
    document.getElementById('stageContent').innerHTML = `<p class="empty-state">Erro ao conectar: ${error.message}</p>`;
  });
}

function renderNextStage() {
  if (!DATA?.nextStage) return;
  const { badge, date, desc, info, ctaUrl } = DATA.nextStage;

  document.getElementById('nextStageBadge').textContent = badge || '—';
  document.getElementById('nextStageDate').textContent  = date  || '—';
  document.getElementById('nextStageDesc').textContent  = desc  || '';
  if (ctaUrl) document.getElementById('nextStageCta').href = ctaUrl;

  const list = Array.isArray(info) ? info : Object.values(info || {});
  document.getElementById('nextStageInfo').innerHTML = list.map(it => `
    <div class="info-item">
      <span class="info-item__icon">${it.icon || ''}</span>
      <div>
        <div class="info-item__label">${it.label || ''}</div>
        <div class="info-item__value">${it.value || ''}</div>
      </div>
    </div>
  `).join('');
}

function renderStageTabs() {
  const nav = document.getElementById('stageTabs');
  const stages = DATA.stages || [];
  nav.innerHTML = stages.map(s => `
    <button class="stage-tab" data-stage="${s.number}">${s.number}ª Etapa</button>
  `).join('');
  nav.querySelectorAll('.stage-tab').forEach(btn => {
    btn.addEventListener('click', () => selectStage(Number(btn.dataset.stage)));
  });
}

function selectStage(number) {
  activeStage = number;
  Object.values(sliderIntervals).forEach(clearInterval);
  
  document.querySelectorAll('.stage-tab').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.stage) === number);
  });
  renderStageContent(number);
}

function renderStageContent(number) {
  const stages = DATA.stages || [];
  const stage = stages.find(s => s.number === number);
  const wrap = document.getElementById('stageContent');
  if (!stage) return;

  const highlights = Array.isArray(stage.highlights) ? stage.highlights : Object.values(stage.highlights || {});
  wrap.innerHTML = `<div class="highlight-grid">${highlights.map((h, i) => renderHighlight(h, number, i)).join('')}</div>`;

  highlights.forEach((h, i) => {
    if (h.type === 'roleta' && h.images) {
      const imgs = Array.isArray(h.images) ? h.images : Object.values(h.images);
      if (imgs.length > 1) initSlider(`roleta-${number}-${i}`, imgs);
    }
  });
}

function renderHighlight(h, stageNum, idx) {
  const header = `<div class="highlight-card__header">
      <span class="highlight-card__icon">${h.icon || ''}</span>
      <span class="highlight-card__title">${h.title || ''}</span>
    </div>`;

  if (h.type === 'champion' || h.type === 'killer') {
    return `<article class="highlight-card">
      ${header}
      <div class="highlight-card__photo-wrap">
        <img class="highlight-card__photo" src="${h.photo}" alt="${h.name}" loading="lazy">
      </div>
      <div class="highlight-card__name">${h.name}</div>
      <div class="highlight-card__detail">${h.detail || ''}</div>
      ${h.points ? `<div class="highlight-card__detail">${h.points}</div>` : ''}
    </article>`;
  }

  if (h.type === 'bestHand') {
    return `<article class="highlight-card">
      ${header}
      ${h.personPhoto ? `<div class="highlight-card__avatar"><img src="${h.personPhoto}" alt="${h.detail}" loading="lazy"></div>` : ''}
      <div class="highlight-card__photo-wrap">
        <img class="highlight-card__photo" src="${h.photo}" alt="${h.name}" loading="lazy">
      </div>
      <div class="highlight-card__name">${h.name}</div>
      <div class="highlight-card__detail">${h.detail || ''}</div>
      ${h.reward ? `<div class="highlight-card__detail">${h.reward}</div>` : ''}
    </article>`;
  }

  if (h.type === 'killers') {
    const killers = Array.isArray(h.killers) ? h.killers : Object.values(h.killers || {});
    return `<article class="highlight-card">
      ${header}
      <div class="killers">
        ${killers.map(k => `
          <div class="killer">
            <img class="killer__photo" src="${k.photo}" alt="${k.name}" loading="lazy">
            <div class="killer__name">${k.name}</div>
          </div>`).join('')}
      </div>
      <div class="highlight-card__detail">${h.detail || ''}</div>
    </article>`;
  }

  if (h.type === 'roleta') {
    const id = `roleta-${stageNum}-${idx}`;
    const imgs = Array.isArray(h.images) ? h.images : Object.values(h.images || {});
    return `<article class="highlight-card">
      ${header}
      <div class="roleta-slider">
        <img id="${id}" src="${imgs[0] || ''}" alt="${h.name}" loading="lazy">
      </div>
      <div class="highlight-card__name">${h.name}</div>
      <div class="highlight-card__detail">${h.detail || ''}</div>
    </article>`;
  }
  return '';
}

function initSlider(id, images) {
  const img = document.getElementById(id);
  if (!img || images.length < 2) return;
  let i = 0;
  sliderIntervals[id] = setInterval(() => {
    i = (i + 1) % images.length;
    img.style.opacity = '0.4';
    setTimeout(() => { img.src = images[i]; img.style.opacity = '1'; }, 180);
  }, 2200);
}

function initSheet() {
  const btn = document.getElementById('moreBtn');
  const sheet = document.getElementById('moreSheet');
  const overlay = document.getElementById('sheetOverlay');
  if (!btn) return;
  
  const close = () => { sheet.hidden = true; overlay.hidden = true; document.body.style.overflow = ''; };
  const open  = () => { sheet.hidden = false; overlay.hidden = false; document.body.style.overflow = 'hidden'; };

  btn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  sheet.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

initSheet();
subscribeData();
