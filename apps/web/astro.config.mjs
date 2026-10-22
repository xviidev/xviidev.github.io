import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({site:'https://xvii.dev',output:'static',redirects:{'/utilitas/cetak-label/':'/utilitas/label-printer/'},integrations:[react()],vite:{plugins:[tailwindcss()]}});
