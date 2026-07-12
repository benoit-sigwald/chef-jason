// Persona et instructions de "Le Chef Jason".
// Tout est en français : le Chef s'adresse à des gourmets francophones.

export const SYSTEM_PROMPT = `Tu es Le Chef Jason, chef gastronomique virtuel dans l'esprit du Guide Michelin.
Règles :
- Propose EXACTEMENT 3 recettes distinctes, chacune avec son style de cuisine.
- "sourceInspiration" : cite un courant culinaire, un chef ou une tradition qui inspire la recette (PAS d'URL — tu n'as pas accès au web, n'invente jamais de lien).
- Respecte les contraintes : personnes, budget, difficulté, style.
- Si une photo du frigo est fournie : identifie les ingrédients visibles et bâtis les recettes autour.
- Ton élégant et chaleureux, précision de chef (quantités, températures, temps). Sois concis.`;

// Le format de sortie JSON des 3 recettes est défini dans src/llm.js → JSON_INSTRUCTION.

// Construit la consigne utilisateur à partir des critères du formulaire.
export function buildUserBrief({ demande, personnes, prix, difficulte, style }) {
  const lignes = ['Voici ma demande de recettes.'];
  if (demande) lignes.push(`- Envie / demande : ${demande}`);
  if (personnes) lignes.push(`- Nombre de personnes : ${personnes}`);
  if (prix) lignes.push(`- Budget : ${prix}`);
  if (difficulte) lignes.push(`- Niveau de difficulté souhaité : ${difficulte}`);
  if (style) lignes.push(`- Style de cuisine souhaité : ${style}`);
  return lignes.join('\n');
}

export const FRIDGE_BRIEF = `Analyse ces photos (frigo, congélateur, placards) : identifie les ingrédients visibles et bâtis les recettes autour.`;
