import { defineConfig, normalizePath } from 'vite'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const require = createRequire(import.meta.url)
const pdfjs = dirname(require.resolve('pdfjs-dist/package.json'))
export default defineConfig({ base: '/utilities/', plugins: [react(), tailwindcss(), viteStaticCopy({
  targets: ['cmaps', 'standard_fonts', 'wasm'].map(folder => ({ src: `${normalizePath(resolve(pdfjs, folder))}/*`, dest: `pdfjs/${folder}`, rename: { stripBase: true } })),
})] })
