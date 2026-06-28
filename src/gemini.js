// Orchestration de Google Gemini (palier GRATUIT) pour Le Chef Jason.
//
// Le Chef interroge DEUX sources en parallèle :
//   A) Recherche web (Google Search grounding) — sites de qualité, Michelin…
//   B) Bases de recettes MCP (si des serveurs sont activés)
// Gemini n'autorisant pas web + MCP dans un même appel, on fait deux passes,
// puis une passe de SYNTHÈSE COMPARATIVE qui présente et compare les deux.

import { GoogleGenAI, Type, mcpToTool } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts.js';
import { getMcpClients } from './mcp.js';

const MODEL = process.env.CHEF_MODEL || 'gemini-2.5-flash';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Schéma d'une recette ---
const RECIPE_ITEM = {
  type: Type.OBJECT,
  properties: {
    titre: { type: Type.STRING },
    styleCuisine: { type: Type.STRING, description: 'Le style de cuisine de la recette.' },
    accroche: { type: Type.STRING, description: 'Storytelling court (1-2 phrases).' },
    pourPersonnes: { type: Type.INTEGER },
    difficulte: { type: Type.STRING, enum: ['Facile', 'Intermédiaire', 'Difficile', 'Chef étoilé'] },
    tempsTotalMinutes: { type: Type.INTEGER },
    prixEstime: { type: Type.STRING, description: 'Coût total estimé, ex : « ~18 € »' },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { nom: { type: Type.STRING }, quantite: { type: Type.STRING } },
        required: ['nom', 'quantite']
      }
    },
    etapes: { type: Type.ARRAY, items: { type: Type.STRING } },
    astuceChef: { type: Type.STRING, description: 'Le geste technique signature.' },
    accordMets: { type: Type.STRING, description: 'Suggestion de vin ou boisson.' },
    sourceInspiration: { type: Type.STRING, description: 'Source/inspiration (site ou chef), URL si trouvée.' }
  },
  required: [
    'titre', 'styleCuisine', 'accroche', 'pourPersonnes', 'difficulte',
    'tempsTotalMinutes', 'prixEstime', 'ingredients', 'etapes',
    'astuceChef', 'accordMets', 'sourceInspiration'
  ]
};

// --- Schéma du résultat comparatif global ---
const RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    introduction: { type: Type.STRING, description: 'Phrase d\'accroche du Chef.' },
    ingredientsDetectes: {
      type: Type.ARRAY,
      description: 'Ingrédients identifiés sur la photo du frigo (vide si aucune photo).',
      items: { type: Type.STRING }
    },
    comparaison: {
      type: Type.STRING,
      description: 'Analyse comparative des deux sources : forces/faiblesses, ce qui les distingue.'
    },
    recommandation: {
      type: Type.STRING,
      description: 'La source et/ou la recette que le Chef recommande, et pourquoi.'
    },
    sources: {
      type: Type.ARRAY,
      description: 'Exactement deux sources : recherche web et bases MCP.',
      items: {
        type: Type.OBJECT,
        properties: {
          nom: { type: Type.STRING, description: 'Nom de la source.' },
          disponible: { type: Type.BOOLEAN, description: 'true si la source a fourni des recettes.' },
          note: { type: Type.STRING, description: 'Résumé de ce que cette source propose.' },
          recettes: { type: Type.ARRAY, description: 'Jusqu\'à 3 recettes.', items: RECIPE_ITEM }
        },
        required: ['nom', 'disponible', 'note', 'recettes']
      }
    }
  },
  required: ['introduction', 'ingredientsDetectes', 'comparaison', 'recommandation', 'sources']
};

// Passe A — recherche web (sites de qualité).
async function researchWeb(parts) {
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT +
          '\n\nAppuie-toi sur la recherche web pour citer des sites de qualité (Michelin, Great British Chefs, Taste of France). Propose 3 recettes.',
        tools: [{ googleSearch: {} }]
      }
    });
    return res.text || '';
  } catch (err) {
    return `Recherche web indisponible : ${err.message}`;
  }
}

// Passe B — bases de recettes MCP (si serveurs activés).
async function researchMcp(parts) {
  const clients = getMcpClients();
  if (clients.length === 0) return null; // aucune source MCP configurée
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT +
          '\n\nInterroge les bases de recettes MCP disponibles (outils). Propose 3 recettes issues de ces bases.',
        tools: [mcpToTool(...clients)]
      }
    });
    return res.text || '';
  } catch (err) {
    return `Recherche MCP en échec : ${err.message}`;
  }
}

// Passe de synthèse — compare les deux sources et met en forme (JSON structuré).
async function synthesize(brief, webDraft, mcpDraft, hadImage) {
  const consigne = [
    brief,
    '',
    '=== SOURCE A — Recherche web (Gemini) ===',
    webDraft || '(aucune donnée)',
    '',
    '=== SOURCE B — Bases de recettes MCP ===',
    mcpDraft != null ? mcpDraft : '(aucun serveur MCP configuré sur cette installation)',
    '',
    'Produis maintenant le résultat JSON demandé :',
    '- DEUX entrées dans "sources" :',
    '   1) nom = "Recherche web (Gemini)", disponible = true, avec jusqu\'à 3 recettes,',
    '   2) nom = "Bases de recettes MCP". Si la SOURCE B indique qu\'aucun serveur MCP',
    '      n\'est configuré ou a échoué, alors disponible = false et recettes = [].',
    '      Sinon disponible = true avec jusqu\'à 3 recettes.',
    '- "comparaison" : compare honnêtement les deux approches.',
    '- "recommandation" : indique laquelle privilégier et pourquoi.',
    hadImage
      ? '- "ingredientsDetectes" : liste les ingrédients vus sur la photo.'
      : '- "ingredientsDetectes" : laisse vide.'
  ].join('\n');

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: consigne,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESULT_SCHEMA
    }
  });

  return safeParse(res.text);
}

function safeParse(text) {
  const cleaned = String(text || '{}').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

// Point d'entrée principal. opts : { brief, imageBase64?, mediaType? }
export async function generateRecipes({ brief, imageBase64, mediaType }, _log = console) {
  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: mediaType || 'image/jpeg', data: imageBase64 } });
  }
  parts.push({ text: brief });

  // Les deux recherches en parallèle.
  const [webR, mcpR] = await Promise.allSettled([researchWeb(parts), researchMcp(parts)]);
  const webDraft = webR.status === 'fulfilled' ? webR.value : `Erreur web : ${webR.reason}`;
  const mcpDraft = mcpR.status === 'fulfilled' ? mcpR.value : `Erreur MCP : ${mcpR.reason}`;

  const result = await synthesize(brief, webDraft, mcpDraft, Boolean(imageBase64));

  // Garde-fou : au plus 3 recettes par source.
  for (const s of result.sources || []) {
    if (Array.isArray(s.recettes)) s.recettes = s.recettes.slice(0, 3);
  }
  return result;
}
