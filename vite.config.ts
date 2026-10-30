import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  base: '/Creative-Website-/',
  build: { rollupOptions: { input: { main: 'index.html', pricing: 'pricing.html' } } },
  plugins: [react(), tailwindcss()],
});
