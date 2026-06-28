// Orchestration Google Gemini — MODE ÉCONOME (1 seul appel par recherche).
//
// Un unique appel fait tout : analyse de la photo (vision), recherche web
// (sites de qualité type Michelin) et génération des 3 recettes en JSON.
// Gemini n'autorisant pas « recherche web + sortie structurée » simultanément,
// on demande le JSON dans le prompt et on le parse (extraction robuste).

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts.js';

const MODEL = process.env.CHEF_MODEL || 'gemini-2.5-flash';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const JSON_INSTRUCTION = `
Réponds UNIQUEMENT avec un objet JSON valide — aucun texte avant/après, aucune balise markdown.
Format EXACT :
{
  "introduction": "phrase d'accroche chaleureuse du Chef",
  "ingredientsDetectes": ["ingrédient1", "ingrédient2"],
  "recettes": [
    {
      "titre": "Nom de la recette",
      "styleCuisine": "ex : Bistronomie française",
      "accroche": "storytelling court (1-2 phrases)",
      "pourPersonnes": 2,
      "difficulte": "Facile | Intermédiaire | Difficile | Chef étoilé",
      "tempsTotalMinutes": 30,
      "prixEstime": "~18 €",
      "ingredients": [{ "nom": "...", "quantite": "..." }],
      "etapes": ["étape 1", "étape 2"],
      "astuceChef": "le geste technique signature",
      "accordMets": "suggestion de vin ou boisson",
      "sourceInspiration": "site ou chef (URL si trouvée via la recherche web)"
    }
  ]
}
Règles : EXACTEMENT 3 recettes ; indique le style de cuisine de chacune ;
"ingredientsDetectes" rempli seulement si une photo est fournie (sinon []).`;

export async function generateRecipes({ brief, imageBase64, mediaType }, _log = console) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: mediaType || 'image/jpeg', data: imageBase64 } });
  }
  parts.push({ text: `${brief}\n\n${JSON_INSTRUCTION}` });

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ googleSearch: {} }]
    }
  });

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
