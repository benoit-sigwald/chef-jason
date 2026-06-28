// Recettes gratuites via l'API publique TheMealDB (navigateur, sans clé, CORS OK).
// Remplace l'ancien serveur MCP : même résultat, 100% front-end, sans quota.

import type { Recipe } from '../types';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

// Petit dictionnaire FR -> EN (TheMealDB cherche par mots-clés anglais).
const FR_EN: Record<string, string> = {
  poisson: 'fish', poulet: 'chicken', boeuf: 'beef', 'bœuf': 'beef', porc: 'pork',
  agneau: 'lamb', veau: 'veal', canard: 'duck', crevette: 'shrimp', crevettes: 'shrimp',
  saumon: 'salmon', thon: 'tuna', legume: 'vegetable', legumes: 'vegetable',
  'légume': 'vegetable', 'légumes': 'vegetable', 'pâtes': 'pasta', pates: 'pasta',
  riz: 'rice', dessert: 'dessert', chocolat: 'chocolate', 'gâteau': 'cake', gateau: 'cake',
  soupe: 'soup', salade: 'salad', fromage: 'cheese', oeuf: 'egg', 'œuf': 'egg', oeufs: 'egg',
  pomme: 'apple', tomate: 'tomato', champignon: 'mushroom', curry: 'curry',
  'végétarien': 'vegetarian', vegetarien: 'vegetarian', boulette: 'meatball',
  tarte: 'pie', 'crêpe': 'pancake', crepe: 'pancake', pain: 'bread', cremeux: 'cream',
};

export function toEnglishQuery(q: string): string {
  const words = String(q || '').toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  const en = words.map((w) => FR_EN[w]).filter(Boolean) as string[];
  return en.length ? [...new Set(en)].join(' ') : String(q || '').trim();
}

interface Meal {
  [key: string]: string | null;
}

function mapMeal(m: Meal): Recipe {
  const ingredients: { nom: string; quantite: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const nom = (m[`strIngredient${i}`] || '').trim();
    const quantite = (m[`strMeasure${i}`] || '').trim();
    if (nom) ingredients.push({ nom, quantite });
  }
  const etapes = String(m.strInstructions || '')
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter((s) => s.length > 1);

  const area = (m.strArea || '').trim();
  return {
    titre: (m.strMeal || '').trim(),
    styleCuisine: area ? `Cuisine ${area}` : 'Cuisine du monde',
    ingredients,
    etapes,
    sourceInspiration:
      (m.strSource || '').trim() ||
      (m.strYoutube || '').trim() ||
      `https://www.themealdb.com/meal/${m.idMeal}`,
    image: (m.strMealThumb || '').trim() || undefined,
    pourPersonnes: null,
    tempsTotalMinutes: null,
  };
}

export async function searchRecipes(query: string, limit = 3): Promise<Recipe[]> {
  const q = toEnglishQuery(query);
  if (!q) return [];
  try {
    const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(q)}`);
    const data = await res.json();
    const meals: Meal[] = data.meals || [];
    return meals.slice(0, limit).map(mapMeal).filter((r) => r.titre && r.etapes.length);
  } catch {
    return [];
  }
}

export async function randomRecipes(n = 3): Promise<Recipe[]> {
  const out: Recipe[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    try {
      const res = await fetch(`${BASE}/random.php`);
      const data = await res.json();
      const m: Meal | undefined = data.meals?.[0];
      const id = m?.idMeal || '';
      if (m && id && !seen.has(id)) {
        seen.add(id);
        const r = mapMeal(m);
        if (r.titre && r.etapes.length) out.push(r);
      }
    } catch {
      /* on continue */
    }
  }
  return out;
}

export const MEALDB_INTRO =
  'Sélection issue de la base TheMealDB (gratuit, sans quota) — recettes en anglais.';
