import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { utilityMetadata } from '../src/lib/metadata.ts'
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
    .replace('https://xvii.dev/utilities/', `https://xvii.dev/utilities/${tool.slug}/`)
  await writeFile(resolve(directory, 'index.html'), html)
}
// Compatibility pages are assembled at the site root after both apps are built.
console.log(`Generated ${seen.size} utility entry page(s).`)
