// Génération des recettes — RÈGLE : LLM D'ABORD, puis MCP en secours.
//
// LLM = OpenRouter (modèles OPEN-SOURCE gratuits, ex. Llama). Le LLM comprend
// vraiment la demande (français) → corrige le « tape à côté ». S'il échoue
// (pas de clé, quota, erreur), on bascule sur MCP/TheMealDB (recettes réelles).
// La/les photo(s) du frigo passent par un modèle vision open-source.

import { SYSTEM_PROMPT } from './prompts.js';
import { recipesFromMcp } from './mcpRecipes.js';

const KEY = process.env.OPENROUTER_API_KEY;
const TEXT_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct:free';

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT par un objet JSON valide (aucun texte ni balise markdown autour). Forme EXACTE :
{"introduction":"phrase d'accroche du Chef","ingredientsDetectes":["..."],"recettes":[{"titre":"","styleCuisine":"","accroche":"","pourPersonnes":2,"difficulte":"Facile|Intermédiaire|Difficile|Chef étoilé","tempsTotalMinutes":30,"prixEstime":"~18 €","ingredients":[{"nom":"","quantite":""}],"etapes":["",""],"astuceChef":"","accordMets":"","sourceInspiration":""}]}
EXACTEMENT 3 recettes ; réponds en FRANÇAIS ; respecte précisément la demande ; "ingredientsDetectes" rempli seulement si des photos sont fournies.`;

// Appel OpenRouter (API compatible OpenAI).
async function openrouter(messages, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://le-chef-jason.onrender.com',
      'X-Title': 'Le Chef Jason',
    },
    body: JSON.stringify({ model, messages, max_tokens: 4000, temperature: 0.7 }),
  });
  if (!res.ok) {
    const t = await res.text();
    const err = new Error(`OpenRouter ${res.status}: ${t.slice(0, 180)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function llmGenerate({ brief, images }) {
  if (!KEY) throw new Error('OPENROUTER_API_KEY manquante');
  const system = { role: 'system', content: `${SYSTEM_PROMPT}\n${JSON_INSTRUCTION}` };

  let content, model;
  if (images && images.length) {
    // Vision : texte + toutes les photos (dataURL base64 acceptées telles quelles).
    content = [
      { type: 'text', text: brief },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    model = VISION_MODEL;
  } else {
    content = brief;
    model = TEXT_MODEL;
  }

  const text = await openrouter([system, { role: 'user', content }], model);
  return finalize(safeParse(text), Boolean(images && images.length));
}

function finalize(result, hadImages) {
  if (Array.isArray(result.recettes)) result.recettes = result.recettes.slice(0, 3);
  else result.recettes = [];
  if (!Array.isArray(result.ingredientsDetectes)) result.ingredientsDetectes = [];
  if (!hadImages) result.ingredientsDetectes = result.ingredientsDetectes || [];
  return result;
}

// Point d'entrée : LLM d'abord, MCP ensuite.
export async function generateRecipes({ brief, query, images = [] }, log = console) {
  // 1) LLM open-source
  try {
    const r = await llmGenerate({ brief, images });
    if (r.recettes.length) return r;
    log.warn?.('[LLM] réponse vide — bascule MCP.');
  } catch (e) {
    log.warn?.(`[LLM] indisponible (${e.message}) — bascule MCP.`);
  }

  // 2) MCP / TheMealDB (secours, gratuit, sans quota)
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
