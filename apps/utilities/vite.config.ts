import { defineConfig, normalizePath } from 'vite'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const require = createRequire(import.meta.url)
const pdfjs = dirname(require.resolve('pdfjs-dist/package.json'))
export default defineConfig({ base: '/utilities/', worker: { format: 'es' }, optimizeDeps: { include: ['image-q'], exclude: ['@jsquash/jpeg', '@jsquash/webp', '@jsquash/avif', '@jsquash/jxl', '@jsquash/qoi', '@jsquash/oxipng', '@jsquash/png', '@jsquash/resize'] }, plugins: [react(), tailwindcss(), viteStaticCopy({
  targets: ['cmaps', 'standard_fonts', 'wasm'].map(folder => ({ src: `${normalizePath(resolve(pdfjs, folder))}/*`, dest: `pdfjs/${folder}`, rename: { stripBase: true } })),
})] })
