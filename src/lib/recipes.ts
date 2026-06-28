// Orchestrateur — RÈGLE :
//   1) TheMealDB d'abord (gratuit, sans quota). Si >= 3 recettes -> on garde.
//   2) Sinon -> Gemini 3 (recherche web + génération).
//   3) Si Gemini bloque (quota) -> repli TheMealDB aléatoire.
// Les photos (frigo/congélo/placards) passent directement par Gemini (vision).

import type { Criteria, GenerateResult, InlineImage } from '../types';
import { searchRecipes, randomRecipes, MEALDB_INTRO } from './themealdb';
import { geminiGenerate, QuotaError } from './gemini';

function briefFromCriteria(c: Criteria): string {
  const l = ['Voici ma demande de recettes.'];
  if (c.demande) l.push(`- Envie : ${c.demande}`);
  if (c.personnes) l.push(`- Personnes : ${c.personnes}`);
  if (c.prix) l.push(`- Budget : ${c.prix}`);
  if (c.difficulte) l.push(`- Difficulté : ${c.difficulte}`);
  if (c.style) l.push(`- Style : ${c.style}`);
  l.push('Propose TES TROIS recettes, en précisant le style de cuisine de chacune.');
  return l.join('\n');
}

function briefFromPhotos(c: Criteria, nbPhotos: number): string {
  return [
    `J'ai pris ${nbPhotos} photo(s) de mon frigo / congélateur / placards.`,
    'Identifie les ingrédients visibles sur TOUTES les photos, puis propose TROIS recettes bâties autour.',
    briefFromCriteria(c),
  ].join('\n');
}

export async function generateRecipes(opts: {
  criteria: Criteria;
  images: InlineImage[];
}): Promise<GenerateResult> {
  const { criteria, images } = opts;

  // Mode photos -> Gemini (vision). Repli aléatoire si quota.
  if (images.length > 0) {
    try {
      return await geminiGenerate(briefFromPhotos(criteria, images.length), images);
    } catch (e) {
      if (e instanceof QuotaError) {
        const r = await randomRecipes(3);
        if (r.length) return { introduction: MEALDB_INTRO, ingredientsDetectes: [], recettes: r };
      }
      throw e;
    }
  }

  // Mode envie -> TheMealDB d'abord.
  const query = criteria.demande || criteria.style || '';
  const meals = await searchRecipes(query, 3);
  if (meals.length >= 3) {
    return { introduction: MEALDB_INTRO, ingredientsDetectes: [], recettes: meals };
  }

  // Pas assez -> Gemini. Repli aléatoire si quota.
  try {
    return await geminiGenerate(briefFromCriteria(criteria), []);
  } catch (e) {
    if (e instanceof QuotaError) {
      const r = await randomRecipes(3);
      if (r.length) return { introduction: MEALDB_INTRO, ingredientsDetectes: [], recettes: r };
    }
    throw e;
  }
}

// Convertit un fichier image en { mimeType, data base64 } pour Gemini.
export function fileToInline(file: File): Promise<InlineImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const m = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
      if (m) resolve({ mimeType: m[1], data: m[2] });
      else reject(new Error('Image illisible'));
    };
    reader.onerror = () => reject(new Error('Lecture image échouée'));
    reader.readAsDataURL(file);
  });
}
