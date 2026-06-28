# 🍽️ Le Chef Jason

Assistant culinaire gastronomique, dans l'esprit du **Guide Michelin**. À chaque
demande, le Chef propose **trois recettes** raffinées — avec, pour chacune, son
**style de cuisine**, ses ingrédients, ses étapes, le geste technique signature et
un accord mets/vin.

> 🆓 **100 % gratuit** : propulsé par **Google Gemini** (palier gratuit), pas l'API Claude.

## Fonctions

- 🔎 **Recherche de sites de qualité** (Michelin, Great British Chefs, Taste of France) via la recherche web de Google (grounding).
- 📖 **Recherche de recettes** par envie, et enrichissement optionnel via serveurs **MCP** (recettes, garde-manger, cookbook).
- 📷 **Photo du frigo** → le Chef identifie vos ingrédients et propose des recettes adaptées (vision).
- 🎛️ **Questions** : nombre de personnes, budget, difficulté, style.
- ⭐ **Style de cuisine** indiqué après chaque recette.
- 3️⃣ **Trois recettes** recommandées à chaque demande.

## Architecture

```
Navigateur (HTML/CSS/JS pur, design Michelin)
        │  fetch JSON
        ▼
Serveur Node léger (server.js)  ── cache la clé API, orchestre
        ├── src/gemini.js   → Google Gemini : vision + recherche web + sortie structurée
        ├── src/mcp.js      → serveurs MCP (optionnels, dégradation gracieuse)
        └── src/prompts.js  → persona du Chef + briefs
```

> Pourquoi un petit serveur ? Une page HTML pure ne peut pas cacher la clé API ni
> parler aux serveurs MCP. Le serveur reste minimal : il sert les fichiers et relaie
> les appels. Le frontend, lui, est du HTML/CSS/JS pur, sans build.

## Installation

1. **Installer [Node.js](https://nodejs.org)** (version 20 LTS ou plus).
2. Dans ce dossier :
   ```bash
   npm install
   ```
3. Configurer la clé API **gratuite** :
   ```bash
   cp .env.example .env       # puis éditer .env et coller votre clé GEMINI_API_KEY
   ```
   Clé gratuite à créer sur **https://aistudio.google.com/apikey** (compte Google requis, gratuit).
4. Lancer :
   ```bash
   npm start
   ```
5. Ouvrir **http://localhost:3000**

## Coût et limites

- **Gratuit** : le palier gratuit de Gemini couvre largement un usage personnel.
- Il existe des **limites de débit** (quelques requêtes par minute) ; en cas de dépassement, patienter quelques instants.
- Modèle par défaut : `gemini-2.5-flash` (rapide, multilingue, avec vision).

## Serveurs MCP (optionnel)

Pour enrichir les recettes avec de vraies bases de données :

```bash
cp mcp.config.example.json mcp.config.json
```

Puis passer `"enabled": true` sur les serveurs voulus (`recipes`, `pantrist`,
`koriander`). Sans ce fichier, la source MCP est marquée « Indisponible » et le Chef
s'appuie sur la recherche web.

> ℹ️ **Comparaison des deux sources.** À chaque demande, le Chef lance DEUX
> recherches en parallèle — recherche web (Gemini) et bases MCP — puis présente
> les recettes de chaque source **côte à côte**, avec une **analyse comparative**
> et une **recommandation**. (Gemini ne pouvant combiner web + MCP dans un seul
> appel, ce sont deux passes distinctes suivies d'une synthèse.)

## Personnalisation rapide

| Quoi | Où |
|------|-----|
| Personnalité / ton du Chef | `src/prompts.js` → `SYSTEM_PROMPT` |
| Champs des recettes (schéma) | `src/gemini.js` → `RECIPES_SCHEMA` |
| Design (couleurs, polices) | `public/styles.css` → variables `:root` |
| Modèle Gemini | `.env` → `CHEF_MODEL` |

## Notes techniques

- Les recettes sont renvoyées en **JSON structuré** (schéma garanti), puis rendues en cartes.
- La photo du frigo est envoyée en base64 au serveur, jamais stockée.
