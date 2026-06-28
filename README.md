# 🍽️ Le Chef Jason

Assistant culinaire gastronomique — **Vite + React + TypeScript + Tailwind CSS**.

- 🆓 **Recettes gratuites, sans quota** via l'API publique **TheMealDB** (appel direct depuis le navigateur).
- ✨ **Secours Gemini 3** quand TheMealDB ne suffit pas, et pour l'**analyse des photos** (frigo / congélateur / placards — multi-photos, sans limite).
- ⭐ 3 recettes par demande, avec style de cuisine, ingrédients, étapes et photo du plat.
- 🎨 Design éditorial (hero photo, fond gris « Nardo », chips tactiles).

## Règle de fonctionnement

1. **TheMealDB d'abord** (gratuit). Si ≥ 3 recettes → on les affiche.
2. Sinon → **Gemini 3** (recherche web + génération).
3. Si Gemini est bloqué (quota) → repli aléatoire TheMealDB.
4. Le mode **photos** passe directement par Gemini (vision).

## Démarrer en local

```bash
npm install
cp .env.example .env     # puis colle ta clé Gemini dans VITE_GEMINI_API_KEY
npm run dev              # http://localhost:5173
```

Build de production : `npm run build` (sortie dans `dist/`).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `VITE_GEMINI_API_KEY` | Clé Gemini (https://aistudio.google.com/apikey). ⚠️ Exposée au navigateur (préfixe `VITE_`). |
| `VITE_CHEF_MODEL` | Modèle Gemini (défaut `gemini-3-flash-preview`). |

## Importer dans Lovable

1. Pousse ce dépôt sur GitHub.
2. Dans Lovable : **New → Import from GitHub** → choisis `chef-jason`.
3. Ajoute la variable d'environnement **`VITE_GEMINI_API_KEY`** dans Lovable.
4. Lovable détecte Vite + React + Tailwind et lance l'app.

## Structure

```
index.html              point d'entrée Vite
src/
  main.tsx, App.tsx
  components/            Hero, Composer, ChipGroup, PhotoUpload, RecipeCard, Results, Loader, Footer
  lib/
    themealdb.ts         API TheMealDB (gratuit) + mapping
    gemini.ts            Appel Gemini 3 (navigateur, REST)
    recipes.ts           Orchestrateur (TheMealDB d'abord → Gemini)
  types.ts
public/                  hero.jpg, chef.jpg
```
