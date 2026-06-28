// Charge .env depuis la racine du projet, quel que soit le dossier de lancement.
// Importé en TOUT PREMIER par server.js (avant les modules qui lisent process.env).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
