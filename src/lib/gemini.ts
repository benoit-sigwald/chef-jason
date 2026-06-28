// Appel Gemini 3 directement depuis le navigateur (REST + fetch).
// ⚠️ La clé VITE_GEMINI_API_KEY est exposée côté client (choix assumé).

import type { GenerateResult, InlineImage } from '../types';

const KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_CHEF_MODEL as string) || 'gemini-3-flash-preview';

const SYSTEM_PROMPT = `Tu es Le Chef Jason, chef gastronomique virtuel dans l'esprit du Guide Michelin.
Règles :
- Propose EXACTEMENT 3 recettes distinctes, chacune avec son style de cuisine.
- Appuie-toi sur la recherche web pour des sources de qualité (guide.michelin.com, greatbritishchefs.com, tasteoffrance) et indique la source.
- Respecte les contraintes (personnes, budget, difficulté, style).
- Si des photos (frigo, congélateur, placards) sont fournies : identifie les ingrédients visibles et bâtis les recettes autour.
- Ton élégant et chaleureux, précision de chef. Sois concis.`;

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT par un objet JSON valide (aucun texte ni balise markdown autour). Forme :
{"introduction":"phrase d'accroche","ingredientsDetectes":["..."],"recettes":[{"titre":"","styleCuisine":"","accroche":"","pourPersonnes":2,"difficulte":"Facile|Intermédiaire|Difficile|Chef étoilé","tempsTotalMinutes":30,"prixEstime":"~18 €","ingredients":[{"nom":"","quantite":""}],"etapes":["",""],"astuceChef":"","accordMets":"","sourceInspiration":""}]}
EXACTEMENT 3 recettes ; style de cuisine pour chacune ; "ingredientsDetectes" rempli seulement si des photos sont fournies.`;

export class QuotaError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function geminiGenerate(brief: string, images: InlineImage[] = []): Promise<GenerateResult> {
  if (!KEY) throw new Error('Clé Gemini absente (VITE_GEMINI_API_KEY).');

  const parts: unknown[] = images.map((im) => ({
    inlineData: { mimeType: im.mimeType, data: im.data },
  }));
  parts.push({ text: `${brief}\n\n${JSON_INSTRUCTION}` });

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    tools: [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 8192 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

  let res: Response | undefined;
  for (let i = 0; i < 3; i++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    if ((res.status === 503 || res.status === 429) && i < 2) {
      await sleep(1200 * (i + 1));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    if (res && res.status === 429) throw new QuotaError('Quota Gemini atteint');
    const t = res ? await res.text() : 'no response';
    throw new Error(`Gemini ${res?.status}: ${t.slice(0, 160)}`);
  }

  const data = await res.json();
  const text: string = (data.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || '')
    .join('');
  const result = safeParse(text);
  if (Array.isArray(result.recettes)) result.recettes = result.recettes.slice(0, 3);
  if (!Array.isArray(result.ingredientsDetectes)) result.ingredientsDetectes = [];
  return result;
}

function safeParse(text: string): GenerateResult {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t) as GenerateResult;
}
