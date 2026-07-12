// Serveur léger de "Le Chef Jason".
// - Sert le frontend statique (public/)
// - Cache la clé du LLM et orchestre LLM (OpenRouter) + MCP via /api/*

import './src/env.js'; // doit rester le tout premier import (charge .env)
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initMcp, shutdownMcp } from './src/mcp.js';
import { generateRecipes } from './src/llm.js';
import { buildUserBrief, FRIDGE_BRIEF } from './src/prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

if (!process.env.OPENROUTER_API_KEY) {
  console.error('\n⚠️  OPENROUTER_API_KEY manquante : le LLM open-source est désactivé,\n    l\'app fonctionnera via MCP/TheMealDB uniquement. Clé gratuite : https://openrouter.ai/keys\n');
}

const app = express();
// Les photos sont compressées côté client (~150 Ko/photo) ; 4 Mo suffit et
// reste sous la limite de 4,5 Mo des fonctions serverless Vercel.
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Recettes à partir de critères (personnes, prix, difficulté, style, demande).
app.post('/api/recipes', async (req, res) => {
  try {
    const b = req.body || {};
    const brief = buildUserBrief(b);
    const query = b.demande || b.style || '';
    const data = await generateRecipes({ brief, query, images: [] });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Recettes à partir d'une ou PLUSIEURS photos (frigo, congélateur, placards).
app.post('/api/fridge', async (req, res) => {
  try {
    const { images, image, ...criteres } = req.body || {};
    // Accepte un tableau "images" (multi) ou un seul "image" (rétrocompat).
    const photos = Array.isArray(images) && images.length ? images : (image ? [image] : []);
    if (photos.length === 0) return res.status(400).json({ error: 'Aucune photo fournie.' });

    const brief = `${FRIDGE_BRIEF}\n\n${buildUserBrief(criteres)}`;
    const data = await generateRecipes({ brief, query: criteres.demande || '', images: photos });
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

function handleError(res, err) {
  console.error('[Erreur]', err);
  if (err.status === 429 || /quota|rate.?limit|exceeded/i.test(err.message || '')) {
    return res.status(429).json({
      error: 'Le service est très sollicité (limite de débit). Réessayez dans un instant.'
    });
  }
  res.status(500).json({ error: err.message || 'Le Chef a rencontré un imprévu. Réessayez.' });
}

// Sur Vercel (serverless) : pas de listen ni de sous-processus MCP (cold start) —
// l'app est exportée et la bascule MCP se dégrade gracieusement (LLM seul).
if (process.env.VERCEL) {
  console.log('[Vercel] Mode serverless : MCP désactivé, LLM OpenRouter seul.');
} else {
  const { serverCount } = await initMcp(console);
  app.listen(PORT, () => {
    console.log(`\n🍽️  Le Chef Jason est en cuisine : http://localhost:${PORT}`);
    console.log(`    LLM : ${process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'} | Serveurs MCP : ${serverCount}\n`);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      await shutdownMcp();
      process.exit(0);
    });
  }
}

export default app;
