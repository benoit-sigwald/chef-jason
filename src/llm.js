// Génération des recettes — RÈGLE : LLM D'ABORD, puis MCP en secours.
//
// LLM = OpenRouter (modèles OPEN-SOURCE gratuits). On essaie PLUSIEURS modèles
// dans l'ordre (les modèles :free sont souvent rate-limités) jusqu'à obtenir une
// réponse JSON exploitable. Si tout échoue -> MCP/TheMealDB (recettes réelles).
// La/les photo(s) du frigo passent par un modèle vision open-source (Gemma 4…).

import { SYSTEM_PROMPT } from './prompts.js';
import { recipesFromMcp } from './mcpRecipes.js';

const KEY = process.env.OPENROUTER_API_KEY;

// Modèles texte (du meilleur au plus léger) — on prend le 1er qui répond.
const TEXT_MODELS = [
  process.env.OPENROUTER_MODEL,
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
].filter(Boolean);

// Modèles vision (multimodaux) pour les photos du frigo.
const VISION_MODELS = [
  process.env.OPENROUTER_VISION_MODEL,
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
].filter(Boolean);

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT par un objet JSON valide (aucun texte ni balise markdown autour). Forme EXACTE :
{"introduction":"phrase d'accroche du Chef","ingredientsDetectes":["..."],"recettes":[{"titre":"","styleCuisine":"","accroche":"","pourPersonnes":2,"difficulte":"Facile|Intermédiaire|Difficile|Chef étoilé","tempsTotalMinutes":30,"prixEstime":"~18 €","ingredients":[{"nom":"","quantite":""}],"etapes":["",""],"astuceChef":"","accordMets":"","sourceInspiration":""}]}
EXACTEMENT 3 recettes ; réponds en FRANÇAIS ; respecte PRÉCISÉMENT la demande ; "ingredientsDetectes" rempli seulement si des photos sont fournies.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Un appel sur un modèle, avec 1 reprise sur 429.
async function callModel(messages, model) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://le-chef-jason.onrender.com',
        'X-Title': 'Le Chef Jason',
      },
      body: JSON.stringify({ model, messages, max_tokens: 4000, temperature: 0.7 }),
      signal: AbortSignal.timeout(45_000), // un modèle qui pend ne bloque pas la requête : on passe au suivant
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
    if (res.status === 429 && attempt === 0) { await sleep(900); continue; }
    const t = await res.text();
    throw new Error(`${model} -> ${res.status}: ${t.slice(0, 100)}`);
  }
  throw new Error(`${model} rate-limited`);
}

async function llmGenerate({ brief, images }, log = console) {
  if (!KEY) throw new Error('OPENROUTER_API_KEY manquante');
  const hadImages = Boolean(images && images.length);
  const system = { role: 'system', content: `${SYSTEM_PROMPT}\n${JSON_INSTRUCTION}` };
  const content = hadImages
    ? [{ type: 'text', text: brief }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
    : brief;
  const messages = [system, { role: 'user', content }];
  const models = hadImages ? VISION_MODELS : TEXT_MODELS;

  let lastErr;
  for (const model of models) {
    try {
      const out = await callModel(messages, model);
      const result = finalize(safeParse(out), hadImages);
      if (result.recettes.length) {
        log.info?.(`[LLM] ${model} ✓`);
        return result;
      }
    } catch (e) {
      lastErr = e;
      log.warn?.(`[LLM] ${e.message} — modèle suivant`);
    }
  }
  throw lastErr || new Error('Aucun modèle LLM exploitable');
}

function finalize(result, hadImages) {
  if (!result || typeof result !== 'object') return { recettes: [], ingredientsDetectes: [] };
  result.recettes = Array.isArray(result.recettes) ? result.recettes.slice(0, 3) : [];
  result.ingredientsDetectes = Array.isArray(result.ingredientsDetectes) ? result.ingredientsDetectes : [];
  if (!hadImages) result.ingredientsDetectes = []; // sans photo, rien à « détecter »
  return result;
}

// Point d'entrée : LLM d'abord, MCP ensuite.
export async function generateRecipes({ brief, query, images = [] }, log = console) {
  try {
    const r = await llmGenerate({ brief, images }, log);
    if (r.recettes.length) return r;
  } catch (e) {
    log.warn?.(`[LLM] indisponible (${e.message}) — bascule MCP.`);
  }

  try {
    const mcp = await recipesFromMcp(query || '', { allowRandom: true });
    if (mcp.recettes.length) return mcp;
  } catch (e) {
    log.warn?.(`[MCP] échec (${e.message}).`);
  }

  throw new Error('Aucune recette disponible pour le moment. Réessayez dans un instant.');
}

// Parse robuste : retire d'éventuelles balises ``` et isole le 1er objet JSON.
function safeParse(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}
