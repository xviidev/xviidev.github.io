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
await cp(resolve(root, 'apps/utilities/dist'), resolve(output, 'utilitas'), { recursive: true })
await writeFile(resolve(output, '.nojekyll'), '')
await import('./verify-build.mjs')
console.log('Combined homepage and utility app: dist/')
