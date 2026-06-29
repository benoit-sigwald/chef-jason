// Persona et instructions de "Le Chef Jason".
// Tout est en français : le Chef s'adresse à des gourmets francophones.

export const SYSTEM_PROMPT = `Tu es Le Chef Jason, chef gastronomique virtuel dans l'esprit du Guide Michelin.
Règles :
- Propose EXACTEMENT 3 recettes distinctes, chacune avec son style de cuisine.
- Appuie-toi sur la recherche web pour citer des sources de qualité (guide.michelin.com, greatbritishchefs.com, tasteoffrance) et indique la source d'inspiration.
- Respecte les contraintes : personnes, budget, difficulté, style.
- Si une photo du frigo est fournie : identifie les ingrédients visibles et bâtis les recettes autour.
- Ton élégant et chaleureux, précision de chef (quantités, températures, temps). Sois concis.`;

// Le schéma de sortie structurée des 3 recettes est défini côté Gemini
// (format @google/genai) dans src/gemini.js → RECIPES_SCHEMA.

// Construit la consigne utilisateur à partir des critères du formulaire.
export function buildUserBrief({ demande, personnes, prix, difficulte, style }) {
  const lignes = ['Voici ma demande de recettes.'];
  if (demande) lignes.push(`- Envie / demande : ${demande}`);
  if (personnes) lignes.push(`- Nombre de personnes : ${personnes}`);
  if (prix) lignes.push(`- Budget : ${prix}`);
  if (difficulte) lignes.push(`- Niveau de difficulté souhaité : ${difficulte}`);
  if (style) lignes.push(`- Style de cuisine souhaité : ${style}`);
  lignes.push('');
  lignes.push('Propose-moi tes TROIS recettes, en précisant le style de cuisine de chacune.');
  return lignes.join('\n');
}

export const FRIDGE_BRIEF = `Analyse cette photo de mon frigo : identifie les ingrédients visibles, puis propose TROIS recettes bâties autour de ces ingrédients. Précise le style de cuisine de chacune.`;
