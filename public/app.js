// Le Chef Jason — logique du frontend (UI/UX premium).

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const segmentedEl = $('.segmented');
const segs        = $$('.seg');
const formCriteres = $('#form-criteres');
const formFrigo    = $('#form-frigo');
const photoInput  = $('#photo');
const dropzone    = $('#dropzone');
const preview     = $('#preview');
const dropText    = $('.dropzone-text');
const frigoSubmit = $('#frigo-submit');
const demandeInput = $('#demande');
const statusEl  = $('#status');
const resultsEl = $('#results');

let photoDataUrl = null;

const LOADING_MESSAGES = [
  'Le Chef consulte les grandes tables',
  'Le Chef compose votre sélection',
  'Le Chef compare les sources',
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

/* ---------- Photo : sélection + glisser-déposer ---------- */
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    photoDataUrl = reader.result;
    preview.src = photoDataUrl;
    preview.hidden = false;
    dropText.textContent = 'Photo prête — touchez pour changer';
    frigoSubmit.disabled = false;
  };
  reader.readAsDataURL(file);
}
photoInput.addEventListener('change', () => handleFile(photoInput.files?.[0]));
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer?.files?.[0]));

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
  if (!photoDataUrl) return;
  request('/api/fridge', { ...gather(formFrigo), image: photoDataUrl });
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
  if (!state && !photoDataUrl) frigoSubmit.disabled = true;
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
      'Repéré dans votre frigo&nbsp;: ' +
      data.ingredientsDetectes.map((x) => `<span class="tag">${esc(x)}</span>`).join(''));
    add(det);
  }

  if (data.comparaison || data.recommandation) {
    const v = node('div', 'verdict');
    if (data.comparaison) {
      v.appendChild(node('div', 'verdict-card verdict-compare',
        `<h3>⚖️ Comparaison</h3><p>${esc(data.comparaison)}</p>`));
    }
    if (data.recommandation) {
      v.appendChild(node('div', 'verdict-card verdict-reco',
        `<h3>★ Recommandation du Chef</h3><p>${esc(data.recommandation)}</p>`));
    }
    add(v);
  }

  if (Array.isArray(data.sources)) {
    data.sources.forEach((src, idx) => {
      const badge = src.disponible
        ? '<span class="source-badge on">Disponible</span>'
        : '<span class="source-badge off">Indisponible</span>';
      const head = node('div', 'source-head',
        `<span class="source-index">${String(idx + 1).padStart(2, '0')}</span>` +
        `<h2>${esc(src.nom || 'Source')}</h2>${badge}` +
        (src.note ? `<p class="source-note">${esc(src.note)}</p>` : ''));
      add(head);

      if (src.disponible && Array.isArray(src.recettes) && src.recettes.length) {
        const cards = node('div', 'cards');
        src.recettes.forEach((r) => {
          const c = card(r);
          c.classList.add('reveal');
          c.style.setProperty('--d', d++);
          cards.appendChild(c);
        });
        frag.appendChild(cards);
      } else {
        add(node('p', 'source-empty',
          src.disponible
            ? 'Aucune recette retournée par cette source.'
            : 'Source non configurée — voir mcp.config.json pour l\'activer.'));
      }
    });
  }

  // Rétrocompatibilité (ancienne structure à plat)
  if (!data.sources && Array.isArray(data.recettes)) {
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
    <div class="card-head">
      <span class="card-style">${esc(r.styleCuisine || 'Cuisine du Chef')}</span>
      <h3 class="card-title">${esc(r.titre || '')}</h3>
      ${r.accroche ? `<p class="card-accroche">${esc(r.accroche)}</p>` : ''}
    </div>
    <div class="card-meta">
      <div><span>Convives</span><b>${esc(String(r.pourPersonnes || '—'))}</b></div>
      <div><span>Temps</span><b>${esc(String(r.tempsTotalMinutes || '—'))} min</b></div>
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
