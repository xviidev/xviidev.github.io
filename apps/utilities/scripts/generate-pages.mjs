import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { utilityMetadata, legacyPaths } from '../src/lib/metadata.ts'
const output = resolve(import.meta.dirname, '../dist')
const template = await readFile(resolve(output, 'index.html'), 'utf8')
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const validSlug = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
const seen = new Set()
for (const tool of utilityMetadata) {
  if (!validSlug(tool.slug) || seen.has(tool.slug)) throw new Error(`Invalid or duplicate utility path: ${tool.slug}`)
  seen.add(tool.slug)
  const directory = resolve(output, tool.slug)
  await mkdir(directory, { recursive: true })
  const html = template.replace(/<title>.*?<\/title>/, `<title>${escape(tool.title)} — XVII Dev</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(tool.description)}`)
    .replace('https://xvii.dev/utilitas/', `https://xvii.dev/utilitas/${tool.slug}/`)
  await writeFile(resolve(directory, 'index.html'), html)
}
for (const [oldSlug, slug] of Object.entries(legacyPaths)) {
  if (!validSlug(oldSlug) || !seen.has(slug)) throw new Error('Invalid legacy utility redirect')
  const directory = resolve(output, oldSlug)
  await mkdir(directory, { recursive: true })
  const target = `/utilitas/${slug}/`
  await writeFile(resolve(directory, 'index.html'), `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="https://xvii.dev${target}"><title>Halaman dipindahkan — XVII Dev</title></head><body><a href="${target}">Buka utilitas cetak label</a></body></html>`)
}
console.log(`Generated ${seen.size} utility entry page(s) and legacy redirects.`)
