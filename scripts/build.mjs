import { execFileSync } from 'node:child_process'
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
const root = resolve(import.meta.dirname, '..')
function build(workspace) {
  execFileSync(process.execPath, [process.env.npm_execpath, 'run', 'build', '-w', workspace], { cwd: root, stdio: 'inherit' })
}
build('@xviidev/web')
build('@xviidev/utilities')
const output = resolve(root, 'dist')
// Only replace generated files within this repository's root output folder.
const inside = relative(root, output)
if (inside !== 'dist' || isAbsolute(inside)) throw new Error('Unsafe build output directory')
await mkdir(output, { recursive: true })
for (const entry of await readdir(output)) await rm(resolve(output, entry), { recursive: true, force: true })
await cp(resolve(root, 'apps/web/dist'), output, { recursive: true })
await cp(resolve(root, 'apps/utilities/dist'), resolve(output, 'utilities'), { recursive: true })
await writeFile(resolve(output, '.nojekyll'), '')
const { legacyPaths } = await import('../apps/utilities/src/lib/metadata.ts')
for (const [oldPath, target] of Object.entries(legacyPaths)) {
  if (!/^\/(?:[a-z-]+\/)+$/.test(oldPath) || !/^\/utilities\/(?:[a-z-]+\/)?$/.test(target)) throw new Error('Invalid compatibility path')
  const directory = resolve(output, oldPath.slice(1))
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'index.html'), `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><link rel="canonical" href="https://xvii.dev${target}"><title>Halaman dipindahkan — XVII Dev</title></head><body><a href="${target}">Buka utilitas</a></body></html>`)
}
await import('./verify-build.mjs')
console.log('Combined homepage and utility app: dist/')
