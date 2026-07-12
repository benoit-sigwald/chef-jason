# 🍽️ Le Chef Jason

Assistant culinaire gastronomique, dans l'esprit du **Guide Michelin**. À chaque
demande, le Chef propose **trois recettes** raffinées — avec, pour chacune, son
**style de cuisine**, ses ingrédients, ses étapes, le geste technique signature et
un accord mets/vin.

> 🆓 **100 % gratuit** : propulsé par des **LLM open-source gratuits via OpenRouter**
> (Llama, Qwen, Gemma…), avec bascule automatique entre modèles, et **TheMealDB via MCP** en secours.

## Fonctions

- 📖 **Recherche de recettes** par envie, et enrichissement optionnel via serveurs **MCP** (recettes, garde-manger, cookbook).
- 📷 **Photos du frigo / placards** → le Chef identifie vos ingrédients et propose des recettes adaptées (vision). Les photos sont compressées côté navigateur (1024 px) avant envoi.
- 🎛️ **Questions** : nombre de personnes, budget, difficulté, style.
- ⭐ **Style de cuisine** indiqué après chaque recette.
- 3️⃣ **Trois recettes** recommandées à chaque demande.

## Architecture

```
Navigateur (HTML/CSS/JS pur, design Michelin)
        │  fetch JSON
        ▼
Serveur Node léger (server.js)  ── cache la clé API, orchestre
        ├── src/llm.js        → OpenRouter : cascade de modèles gratuits (texte + vision)
        ├── src/mcp.js        → serveurs MCP (optionnels, dégradation gracieuse)
        ├── src/mcpRecipes.js → recettes TheMealDB via recipe-mcp (secours)
        └── src/prompts.js    → persona du Chef + briefs
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
   cp .env.example .env       # puis éditer .env et coller votre clé OPENROUTER_API_KEY
   ```
   Clé gratuite à créer sur **https://openrouter.ai/keys** (gratuit).
4. Lancer :
   ```bash
   npm start
   ```
5. Ouvrir **http://localhost:3000**

## Coût et limites

- **Gratuit** : les modèles `:free` d'OpenRouter couvrent un usage personnel.
- Il existe des **limites de débit** ; l'app essaie plusieurs modèles en cascade, et bascule sur TheMealDB (MCP) si tous sont saturés.
- Modèles par défaut : voir `TEXT_MODELS` / `VISION_MODELS` dans `src/llm.js` (surchargables via `.env` → `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL`).

## Déploiement

- **Vercel** : `vercel.json` fourni. En serverless, les serveurs MCP sont désactivés (LLM seul). Définir `OPENROUTER_API_KEY` dans les variables d'environnement du projet Vercel.
- **Render** : `render.yaml` fourni (Web Service Node, MCP actif).

## Serveurs MCP (optionnel)

Pour enrichir les recettes avec de vraies bases de données :

```bash
cp mcp.config.example.json mcp.config.json
```

Puis passer `"enabled": true` sur les serveurs voulus. Sans ce fichier, le Chef
s'appuie uniquement sur les LLM OpenRouter.

> ℹ️ **Ordre des sources.** Le Chef essaie d'abord les LLM open-source (cascade
> de modèles gratuits) ; si tous échouent ou sont rate-limités, il bascule sur
> les bases MCP (TheMealDB — recettes réelles, en anglais).

## Personnalisation rapide

| Quoi | Où |
|------|-----|
| Personnalité / ton du Chef | `src/prompts.js` → `SYSTEM_PROMPT` |
| Champs des recettes (format JSON) | `src/llm.js` → `JSON_INSTRUCTION` |
| Design (couleurs, polices) | `public/styles.css` → variables `:root` |
| Modèles LLM | `.env` → `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL` |

## Notes techniques

- Les recettes sont renvoyées en **JSON structuré** (schéma garanti), puis rendues en cartes.
- La photo du frigo est envoyée en base64 au serveur, jamais stockée.
