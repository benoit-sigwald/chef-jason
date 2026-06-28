import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = '/' par défaut (Render, Lovable, local).
// Pour GitHub Pages (sous-dossier /chef-jason/), le workflow définit BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
});
