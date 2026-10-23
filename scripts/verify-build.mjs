import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { utilityMetadata, legacyPaths } from '../apps/utilities/src/lib/metadata.ts'
const output = resolve(import.meta.dirname, '../dist')
await access(resolve(output, '.nojekyll'))
assert.equal((await readFile(resolve(output, 'CNAME'), 'utf8')).trim(), 'xvii.dev')
const homepage = await readFile(resolve(output, 'index.html'), 'utf8')
assert(!homepage.includes('astro-island'), 'Homepage should not host a React island')
for (const slug of ['', ...utilityMetadata.map(tool => tool.slug)]) {
  const html = await readFile(resolve(output, 'utilitas', slug, 'index.html'), 'utf8')
  assert(html.includes('id="root"') && !html.includes('astro-island'), 'Utility must be a standalone React app')
  const canonical = `https://xvii.dev/utilitas/${slug ? slug + '/' : ''}`
  assert(html.includes(`href="${canonical}"`), `Missing canonical: ${canonical}`)
  const assets = [...html.matchAll(/(?:src|href)="(\/utilitas\/assets\/[^"]+)"/g)].map(match => match[1])
  assert(assets.some(asset => asset.endsWith('.js')), 'Missing application entry script')
  assert(assets.some(asset => asset.endsWith('.css')), 'Missing application stylesheet')
  for (const asset of assets) await access(resolve(output, asset.slice(1)))
}
for (const [oldSlug, slug] of Object.entries(legacyPaths)) {
  const html = await readFile(resolve(output, 'utilitas', oldSlug, 'index.html'), 'utf8')
  assert(html.includes(`content="0;url=/utilitas/${slug}/"`))
}
console.log('Static entry pages, asset paths, redirects, and domain verified.')
