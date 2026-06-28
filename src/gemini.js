// Orchestration des recettes — RÈGLE :
//   1) MCP d'abord (recipe-mcp, gratuit, sans quota).
//   2) Si assez de recettes (>= 3) -> on les garde.
//   3) Sinon -> Gemini 3 (recherche web + génération).
//   4) Si Gemini bloque (quota) -> repli MCP best-effort (même aléatoire).
// Le mode photo du frigo (vision) passe directement par Gemini.

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts.js';
import { recipesFromMcp } from './mcpRecipes.js';

const MODEL = process.env.CHEF_MODEL || 'gemini-3-flash-preview';
const MAX_OUTPUT_TOKENS = 8192;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT par un objet JSON valide (aucun texte ni balise markdown autour). Forme :
{"introduction":"phrase d'accroche","ingredientsDetectes":["..."],"recettes":[{"titre":"","styleCuisine":"","accroche":"","pourPersonnes":2,"difficulte":"Facile|Intermédiaire|Difficile|Chef étoilé","tempsTotalMinutes":30,"prixEstime":"~18 €","ingredients":[{"nom":"","quantite":""}],"etapes":["",""],"astuceChef":"","accordMets":"","sourceInspiration":""}]}
EXACTEMENT 3 recettes ; style de cuisine pour chacune ; "ingredientsDetectes" rempli seulement si une photo est fournie.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isQuotaError(err) {
  return err?.status === 429 || /RESOURCE_EXHAUSTED|quota|exceeded/i.test(err?.message || '');
}

// --- Orchestrateur (point d'entrée principal) ---
export async function generateRecipes({ brief, query, imageBase64, mediaType }, _log = console) {
  // 1) MCP d'abord (sauf en mode photo : le MCP ne lit pas les images).
  if (!imageBase64) {
    try {
      const mcp = await recipesFromMcp(query, { allowRandom: false });
      if (mcp.enough) return mcp;
    } catch { /* on tentera Gemini */ }
  }

  // 2) Pas assez (ou photo du frigo) -> Gemini.
  try {
    return await generateWithGemini({ brief, imageBase64, mediaType });
  } catch (err) {
    // 3) Gemini bloqué (quota) -> repli MCP best-effort (aléatoire si besoin).
    if (isQuotaError(err) && !imageBase64) {
      const mcp = await recipesFromMcp(query, { allowRandom: true });
      if (mcp.recettes.length) return mcp;
    }
    throw err;
  }
}

// --- Appel Gemini 3 (1 seul appel) avec reprise sur 503/429 ---
async function generateWithGemini({ brief, imageBase64, mediaType }) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: mediaType || 'image/jpeg', data: imageBase64 } });
  }
  parts.push({ text: `${brief}\n\n${JSON_INSTRUCTION}` });

  const req = {
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ googleSearch: {} }],
      maxOutputTokens: MAX_OUTPUT_TOKENS
    }
  };

  let res, lastErr;
  for (let i = 0; i < 3; i++) {
    try { res = await ai.models.generateContent(req); break; }
    catch (err) {
      lastErr = err;
      if ((err.status === 503 || err.status === 429) && i < 2) { await sleep(1200 * (i + 1)); continue; }
      throw err;
    }
  }
  if (!res) throw lastErr;

  const result = safeParse(res.text);
  if (Array.isArray(result.recettes)) result.recettes = result.recettes.slice(0, 3);
  if (!Array.isArray(result.ingredientsDetectes)) result.ingredientsDetectes = [];
  return result;
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
