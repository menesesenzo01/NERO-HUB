import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API = `http://localhost:${process.env.PORT || 5180}`;

export default defineConfig({
  // "/" no PC; "/<repositório>/" quando o site é montado para o GitHub Pages.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: { '/api': API, '/d': API, '/icons': API },
  },
});
