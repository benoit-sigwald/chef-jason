// Recettes via recipe-mcp (TheMealDB & co.) — GRATUIT, sans quota.
// On interroge le serveur MCP directement et on parse son texte structuré
// vers le format de nos cartes. C'est la source PRIORITAIRE ; Gemini n'est
// utilisé que si le MCP ne fournit pas assez de recettes.

import { getMcpClientByName } from './mcp.js';

// Petit dictionnaire FR -> EN (TheMealDB recherche par mots-clés anglais).
const FR_EN = {
  poisson: 'fish', poulet: 'chicken', boeuf: 'beef', 'bœuf': 'beef', porc: 'pork',
  agneau: 'lamb', veau: 'veal', canard: 'duck', crevette: 'shrimp', crevettes: 'shrimp',
  saumon: 'salmon', thon: 'tuna', legume: 'vegetable', legumes: 'vegetable',
  'légume': 'vegetable', 'légumes': 'vegetable', 'pâtes': 'pasta', pates: 'pasta',
  riz: 'rice', dessert: 'dessert', chocolat: 'chocolate', 'gâteau': 'cake', gateau: 'cake',
  soupe: 'soup', salade: 'salad', fromage: 'cheese', oeuf: 'egg', 'œuf': 'egg', oeufs: 'egg',
  pomme: 'apple', tomate: 'tomato', champignon: 'mushroom', curry: 'curry',
  'végétarien': 'vegetarian', vegetarien: 'vegetarian', boulette: 'meatball',
  tarte: 'pie', crepe: 'pancake', 'crêpe': 'pancake', pain: 'bread', porc_: 'pork'
};

function toEnglishQuery(q) {
  const words = String(q || '').toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  const en = words.map((w) => FR_EN[w]).filter(Boolean);
  return en.length ? [...new Set(en)].join(' ') : String(q || '').trim();
}

const txt = (r) => (r.content || []).map((x) => x.text || '').join('\n');

// Parse la liste de résultats de recipe_search.
function parseSearch(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*\s+Source:\s*(\S+)\s+(https?:\/\/\S+)/g;
  let m;
  while ((m = re.exec(text))) {
    const url = m[3];
    const id = url.split('/').filter(Boolean).pop();
    out.push({ title: m[1].trim(), source: m[2].trim(), id, url });
  }
  return out;
}

// Parse une fiche recipe_get vers notre format de recette.
function parseRecipe(text, fallbackUrl) {
  const titre = (text.match(/^#\s+(.+)$/m)?.[1] || '').trim();
  const cat = (text.match(/^Category:\s*(.+)$/m)?.[1] || '').trim();
  const parts = cat.split(',').map((s) => s.trim()).filter(Boolean);
  const styleCuisine = parts.length > 1 ? `Cuisine ${parts[1]}` : (parts[0] ? `Cuisine ${parts[0]}` : 'Cuisine du monde');

  const ingBlock = text.split(/##\s*Ingredients/i)[1]?.split(/##\s*Instructions/i)[0] || '';
  const ingredients = ingBlock.split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => ({ nom: l.replace(/^- /, '').trim(), quantite: '' }));

  const etapes = [];
  const stepRe = /\*\*Step\s*\d+:\*\*\s*([\s\S]*?)(?=\n\*\*Step\s*\d+:|\nSource:|$)/g;
  let s;
  while ((s = stepRe.exec(text))) etapes.push(s[1].replace(/\s+/g, ' ').trim());

  const sourceInspiration = (text.match(/\nSource:\s*(https?:\/\/\S+)\s*$/)?.[1]) || fallbackUrl || '';

  return {
    titre, styleCuisine, accroche: '', pourPersonnes: null, difficulte: '',
    tempsTotalMinutes: null, prixEstime: '', ingredients, etapes,
    astuceChef: '', accordMets: '', sourceInspiration
  };
}

// Récupère jusqu'à 3 recettes complètes via recipe-mcp.
// Renvoie { enough, recettes, introduction, ingredientsDetectes }.
export async function recipesFromMcp(query, { allowRandom = false } = {}) {
  const empty = { enough: false, recettes: [], introduction: '', ingredientsDetectes: [] };
  const client = getMcpClientByName('recipes');
  if (!client) return empty;

  const recettes = [];
  const q = toEnglishQuery(query);

  if (q) {
    try {
      const res = await client.callTool({ name: 'recipe_search', arguments: { query: q } });
      const hits = parseSearch(txt(res)).slice(0, 5);
      for (const h of hits) {
        if (recettes.length >= 3) break;
        try {
          const d = await client.callTool({ name: 'recipe_get', arguments: { id: h.id, source: h.source } });
          const rec = parseRecipe(txt(d), h.url);
          if (rec.titre && rec.etapes.length) recettes.push(rec);
        } catch { /* recette ignorée */ }
      }
    } catch { /* recherche ignorée */ }
  }

  // Pas assez ? On complète avec des recettes aléatoires (repli quota).
  if (recettes.length < 3 && allowRandom) {
    for (let i = 0; i < 6 && recettes.length < 3; i++) {
      try {
        const r = await client.callTool({ name: 'recipe_random', arguments: { source: 'themealdb' } });
        const rec = parseRecipe(txt(r));
        if (rec.titre && rec.etapes.length) recettes.push(rec);
      } catch { /* ignore */ }
    }
  }

  return {
    enough: recettes.length >= 3,
    recettes: recettes.slice(0, 3),
    introduction: 'Sélection issue de la base TheMealDB (mode gratuit, sans quota) — recettes en anglais.',
    ingredientsDetectes: []
  };
}
