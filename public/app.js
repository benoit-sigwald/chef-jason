// Le Chef Jason — logique du frontend (UI/UX premium).

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const segmentedEl = $('.segmented');
const segs        = $$('.seg');
const formCriteres = $('#form-criteres');
const formFrigo    = $('#form-frigo');
const photoInput  = $('#photo');
const dropzone    = $('#dropzone');
const previewsEl  = $('#previews');
const dropText    = $('.dropzone-text');
const frigoSubmit = $('#frigo-submit');
const demandeInput = $('#demande');
const statusEl  = $('#status');
const resultsEl = $('#results');

let photoDataUrls = []; // plusieurs photos (frigo, congélo, placards) — sans limite

const LOADING_MESSAGES = [
  'Le Chef consulte les grandes tables',
  'Le Chef compose votre sélection',
  'Le Chef imagine vos recettes',
  'Le Chef dresse les assiettes'
];

/* ---------- Init : aria sur les chips ---------- */
$$('.chip').forEach((c) => c.setAttribute('aria-pressed', c.classList.contains('is-on') ? 'true' : 'false'));

/* ---------- Onglets segmentés ---------- */
segs.forEach((seg, idx) => {
  seg.addEventListener('click', () => {
    segmentedEl.dataset.active = String(idx);
    segs.forEach((s) => { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
    seg.classList.add('is-active');
    seg.setAttribute('aria-selected', 'true');
    formCriteres.classList.toggle('hidden', idx !== 0);
    formFrigo.classList.toggle('hidden', idx !== 1);
  });
});

/* ---------- Chips (sélection unique par groupe) ---------- */
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const group = chip.closest('.chips');
  $$('.chip', group).forEach((c) => { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); });
  chip.classList.add('is-on');
  chip.setAttribute('aria-pressed', 'true');
});

/* ---------- Suggestions ---------- */
$$('.suggestion').forEach((s) => {
  s.addEventListener('click', () => {
    demandeInput.value = s.textContent.trim();
    demandeInput.focus();
  });
});

/* ---------- Photos (multiples) : sélection + glisser-déposer ---------- */
// Compression côté client : 1024 px max, JPEG. Une photo de téléphone passe de
// ~8 Mo à ~150 Ko en base64 → beaucoup moins de tokens vision, et on reste sous
// la limite de 4,5 Mo par requête des fonctions serverless (Vercel).
const MAX_PHOTO_DIM = 1024;
const JPEG_QUALITY = 0.8;

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_DIM / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleFiles(files) {
  if (!files) return;
  [...files].forEach(async (file) => {
    if (!file.type.startsWith('image/')) return;
    try {
      photoDataUrls.push(await compressImage(file));
    } catch {
      // Repli : original en base64 (format exotique ou navigateur ancien).
      try { photoDataUrls.push(await readAsDataUrl(file)); } catch { return; }
    }
    renderPreviews(); updateFrigoState();
  });
}

function renderPreviews() {
  previewsEl.innerHTML = '';
  photoDataUrls.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid #e4d8c2;';
    const img = document.createElement('img');
    img.src = url; img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = '×'; btn.setAttribute('aria-label', 'Retirer la photo');
    btn.style.cssText = 'position:absolute;top:4px;right:4px;width:24px;height:24px;border:none;border-radius:50%;background:rgba(20,17,13,.8);color:#fff;cursor:pointer;font-size:15px;line-height:1;';
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      photoDataUrls.splice(i, 1);
      renderPreviews(); updateFrigoState();
    });
    wrap.append(img, btn);
    previewsEl.appendChild(wrap);
  });
  previewsEl.style.cssText = photoDataUrls.length
    ? 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0.2rem 0 1rem;'
    : 'display:none;';
}

function updateFrigoState() {
  frigoSubmit.disabled = photoDataUrls.length === 0;
  dropText.textContent = photoDataUrls.length
    ? `${photoDataUrls.length} photo(s) — ajoutez-en d'autres ou lancez`
    : 'Frigo, congélateur, placards…';
}

photoInput.addEventListener('change', () => { handleFiles(photoInput.files); photoInput.value = ''; });
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', (e) => handleFiles(e.dataTransfer?.files));

/* ---------- Récolte des critères ---------- */
function gather(form) {
  const data = {};
  $$('input[name]', form).forEach((i) => { data[i.name] = i.value; });
  $$('.chips', form).forEach((g) => {
    const on = $('.chip.is-on', g);
    data[g.dataset.field] = on ? on.dataset.value : '';
  });
  return data;
}

/* ---------- Soumissions ---------- */
formCriteres.addEventListener('submit', (e) => { e.preventDefault(); request('/api/recipes', gather(formCriteres)); });
formFrigo.addEventListener('submit', (e) => {
  e.preventDefault();
  if (photoDataUrls.length === 0) return;
  request('/api/fridge', { ...gather(formFrigo), images: photoDataUrls });
});

/* ---------- Appel serveur ---------- */
async function request(url, body) {
  showLoading();
  setDisabled(true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Le Chef a rencontré un imprévu.');
    render(data);
  } catch (err) {
    showError(err.message);
  } finally {
    setDisabled(false);
  }
}

function setDisabled(state) {
  $$('.cta').forEach((b) => { b.disabled = state; });
  if (!state && photoDataUrls.length === 0) frigoSubmit.disabled = true;
}

/* ---------- États de chargement ---------- */
let loadingTimer = null;
function showLoading() {
  resultsEl.innerHTML = '';
  clearInterval(loadingTimer);
  let i = 0;
  statusEl.className = 'status';
  statusEl.innerHTML =
    `<p class="status-msg"><span class="dots">${LOADING_MESSAGES[0]}</span></p>` +
    `<div class="skeleton-grid">${'<div class="skeleton-card"></div>'.repeat(3)}</div>`;
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    const m = $('.status-msg .dots', statusEl);
    if (m) m.textContent = LOADING_MESSAGES[i];
  }, 3200);
}
function clearStatus() { clearInterval(loadingTimer); statusEl.className = 'status hidden'; statusEl.innerHTML = ''; }
function showError(msg) {
  clearInterval(loadingTimer);
  statusEl.className = 'status error';
  statusEl.innerHTML = `<p class="status-msg">✕ ${esc(msg)}</p>`;
  resultsEl.innerHTML = '';
}

/* ---------- Rendu ---------- */
function render(data) {
  clearStatus();
  resultsEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  let d = 0;
  const add = (el) => { el.classList.add('reveal'); el.style.setProperty('--d', d++); frag.appendChild(el); };

  if (data.introduction) {
    add(node('p', 'intro-line', `« ${esc(data.introduction)} »`));
  }

  if (Array.isArray(data.ingredientsDetectes) && data.ingredientsDetectes.length) {
    const det = node('p', 'detected',
      'Repéré sur vos photos&nbsp;: ' +
      data.ingredientsDetectes.map((x) => `<span class="tag">${esc(x)}</span>`).join(''));
    add(det);
  }

  if (Array.isArray(data.recettes)) {
    const cards = node('div', 'cards');
    data.recettes.forEach((r) => {
      const c = card(r);
      c.classList.add('reveal');
      c.style.setProperty('--d', d++);
      cards.appendChild(c);
    });
    frag.appendChild(cards);
  }

  resultsEl.appendChild(frag);
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function card(r) {
  const ingredients = (r.ingredients || [])
    .map((i) => `<li><b>${esc(i.quantite || '')}</b> ${esc(i.nom || '')}</li>`).join('');
  const etapes = (r.etapes || []).map((s) => `<li>${esc(s)}</li>`).join('');
  const source = r.sourceInspiration
    ? (isUrl(r.sourceInspiration)
        ? `<a href="${esc(r.sourceInspiration)}" target="_blank" rel="noopener">Source d'inspiration ↗</a>`
        : `<span>Inspiration&nbsp;: ${esc(r.sourceInspiration)}</span>`)
    : '<span></span>';

  return node('article', 'card', `
    ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.titre || '')}" loading="lazy" style="width:100%;height:12rem;object-fit:cover;display:block;" />` : ''}
    <div class="card-head">
      <span class="card-style">${esc(r.styleCuisine || 'Cuisine du Chef')}</span>
      <h3 class="card-title">${esc(r.titre || '')}</h3>
      ${r.accroche ? `<p class="card-accroche">${esc(r.accroche)}</p>` : ''}
    </div>
    <div class="card-meta">
      <div><span>Convives</span><b>${esc(String(r.pourPersonnes || '—'))}</b></div>
      <div><span>Temps</span><b>${r.tempsTotalMinutes ? esc(String(r.tempsTotalMinutes)) + ' min' : '—'}</b></div>
      <div><span>Difficulté</span><b>${esc(r.difficulte || '—')}</b></div>
      <div><span>Budget</span><b>${esc(r.prixEstime || '—')}</b></div>
    </div>
    <div class="card-body">
      <div class="card-section">
        <h4>Ingrédients</h4>
        <ul class="ingredients-list">${ingredients}</ul>
      </div>
      <div class="card-section">
        <h4>Préparation</h4>
        <ol class="steps-list">${etapes}</ol>
      </div>
      ${r.astuceChef ? `<div class="tip"><span>Le geste du Chef</span>${esc(r.astuceChef)}</div>` : ''}
    </div>
    <div class="card-foot">
      ${r.accordMets ? `<span>🍷 ${esc(r.accordMets)}</span>` : '<span></span>'}
      ${source}
    </div>`);
}

/* ---------- Utils ---------- */
function node(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html != null) el.innerHTML = html;
  return el;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function isUrl(s) { return /^https?:\/\//i.test(s); }
