import { defineConfig } from 'vite'
export default defineConfig({ appType: 'mpa', build: { outDir: 'dist' }, preview: { host: '127.0.0.1', port: 4325 } })
