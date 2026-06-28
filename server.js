// Serveur léger de "Le Chef Jason".
// - Sert le frontend statique (public/)
// - Cache la clé API et orchestre Claude + MCP via /api/*

import './src/env.js'; // doit rester le tout premier import (charge .env)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initMcp, shutdownMcp } from './src/mcp.js';
import { generateRecipes } from './src/gemini.js';
import { buildUserBrief, FRIDGE_BRIEF } from './src/prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.error('\n⚠️  GEMINI_API_KEY manquante. Copie .env.example en .env et colle ta clé gratuite\n    (https://aistudio.google.com/apikey).\n');
}

const app = express();
app.use(express.json({ limit: '12mb' })); // marge pour les photos en base64
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Recettes à partir de critères (personnes, prix, difficulté, style, demande).
app.post('/api/recipes', async (req, res) => {
  try {
    const brief = buildUserBrief(req.body || {});
    const data = await generateRecipes({ brief });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Recettes à partir d'une photo du frigo (+ critères optionnels).
app.post('/api/fridge', async (req, res) => {
  try {
    const { image, ...criteres } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Aucune image fournie.' });

    const { mediaType, data: imageBase64 } = parseDataUrl(image);
    const brief = `${FRIDGE_BRIEF}\n\n${buildUserBrief(criteres)}`;
    const data = await generateRecipes({ brief, imageBase64, mediaType });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

function parseDataUrl(dataUrl) {
  const m = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
  if (m) return { mediaType: m[1], data: m[2] };
  return { mediaType: 'image/jpeg', data: dataUrl }; // déjà en base64 brut
}

function handleError(res, err) {
  console.error('[Erreur]', err);
  if (err.code === 'refusal') {
    return res.status(422).json({ error: 'Le Chef ne peut pas répondre à cette demande.' });
  }
  // Quota Gemini gratuit dépassé : message clair plutôt que le JSON brut de l'API.
  if (err.status === 429 || /quota|RESOURCE_EXHAUSTED|exceeded/i.test(err.message || '')) {
    return res.status(429).json({
      error: 'Quota Gemini gratuit atteint pour le moment. Réessayez dans quelques minutes (le quota se réinitialise chaque jour). Astuce : une clé API standard offre davantage de requêtes.'
    });
  }
  res.status(500).json({ error: 'Le Chef a rencontré un imprévu. Réessayez dans un instant.' });
}

const { serverCount } = await initMcp(console);
app.listen(PORT, () => {
  console.log(`\n🍽️  Le Chef Jason est en cuisine : http://localhost:${PORT}`);
  console.log(`    Modèle : ${process.env.CHEF_MODEL || 'gemini-2.5-flash'} | Serveurs MCP : ${serverCount}\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await shutdownMcp();
    process.exit(0);
  });
}
