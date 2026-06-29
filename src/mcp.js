// Connexion aux serveurs MCP (Recipes, Pantrist, Koriander…) en stdio.
// Dégradation gracieuse : si mcp.config.json est absent ou si un serveur échoue,
// l'application continue de fonctionner sans cet enrichissement (recherche web Google).
//
// Note : avec Gemini, les clients MCP sont passés tels quels à `mcpToTool(...)`,
// qui gère automatiquement les appels d'outils. On expose donc les clients connectés.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'mcp.config.json');

const entries = []; // { name, client }

export async function initMcp(log = console) {
  if (!existsSync(CONFIG_PATH)) {
    log.info('[MCP] Aucun mcp.config.json — fonctionnement avec la recherche web Google.');
    return { serverCount: 0 };
  }

  let config;
  try {
    config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  } catch (err) {
    log.warn(`[MCP] mcp.config.json illisible (${err.message}) — ignoré.`);
    return { serverCount: 0 };
  }

  // Imports dynamiques : le SDK MCP n'est requis que si la config existe.
  let Client, StdioClientTransport;
  try {
    ({ Client } = await import('@modelcontextprotocol/sdk/client/index.js'));
    ({ StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js'));
  } catch (err) {
    log.warn(`[MCP] SDK MCP indisponible (${err.message}) — ignoré.`);
    return { serverCount: 0 };
  }

  const servers = (config.servers || []).filter((s) => s.enabled);
  for (const srv of servers) {
    try {
      // « node » => on réutilise le binaire Node qui exécute l'app
      // (robuste : indépendant du PATH du processus parent).
      const command = srv.command === 'node' ? process.execPath : srv.command;
      // Chemins .js relatifs => résolus depuis la racine du projet : portable
      // (fonctionne en local, sous l'aperçu et sur un hébergeur Linux).
      const projectRoot = path.join(__dirname, '..');
      const args = (srv.args || []).map((a) =>
        (typeof a === 'string' && a.endsWith('.js') && !path.isAbsolute(a))
          ? path.join(projectRoot, a) : a);
      const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...(srv.env || {}) }
      });
      const client = new Client({ name: 'le-chef-jason', version: '1.0.0' }, { capabilities: {} });
      await client.connect(transport);
      entries.push({ name: srv.name, client });
      log.info(`[MCP] Serveur « ${srv.name} » connecté.`);
    } catch (err) {
      log.warn(`[MCP] Échec du serveur « ${srv.name} » : ${err.message} — ignoré.`);
    }
  }

  return { serverCount: entries.length };
}

// Tous les clients MCP connectés.
export function getMcpClients() {
  return entries.map((e) => e.client);
}

// Client MCP d'un serveur précis (ex : "recipes"), ou null.
export function getMcpClientByName(name) {
  return entries.find((e) => e.name === name)?.client || null;
}

export async function shutdownMcp() {
  await Promise.allSettled(entries.map((e) => e.client.close()));
}
