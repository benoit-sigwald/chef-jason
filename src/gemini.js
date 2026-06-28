// Orchestration Google Gemini — MODE ÉCONOME (1 seul appel) + Gemini 3.
//
// Un unique appel fait tout : vision (photo du frigo), recherche web (sites de
// qualité type Michelin) et génération des 3 recettes en JSON.
// Optimisations tokens/appels : 1 seul appel, prompts compacts, sortie plafonnée.
// Reprise automatique sur erreurs transitoires (503/429).

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts.js';

const MODEL = process.env.CHEF_MODEL || 'gemini-3-flash-preview';
const MAX_OUTPUT_TOKENS = 8192;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT par un objet JSON valide (aucun texte ni balise markdown autour). Forme :
{"introduction":"phrase d'accroche","ingredientsDetectes":["..."],"recettes":[{"titre":"","styleCuisine":"","accroche":"","pourPersonnes":2,"difficulte":"Facile|Intermédiaire|Difficile|Chef étoilé","tempsTotalMinutes":30,"prixEstime":"~18 €","ingredients":[{"nom":"","quantite":""}],"etapes":["",""],"astuceChef":"","accordMets":"","sourceInspiration":""}]}
EXACTEMENT 3 recettes ; style de cuisine pour chacune ; "ingredientsDetectes" rempli seulement si une photo est fournie.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Appel Gemini avec reprise sur 503 (indispo) et 429 (quota momentané).
async function generate(parts) {
  const req = {
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ googleSearch: {} }],
      maxOutputTokens: MAX_OUTPUT_TOKENS
    }
  };
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await ai.models.generateContent(req);
    } catch (err) {
      lastErr = err;
      if ((err.status === 503 || err.status === 429) && i < 2) {
        await sleep(1200 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function generateRecipes({ brief, imageBase64, mediaType }, _log = console) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: mediaType || 'image/jpeg', data: imageBase64 } });
  }
  parts.push({ text: `${brief}\n\n${JSON_INSTRUCTION}` });

  const res = await generate(parts);
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
