import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import ts from 'typescript'
const root = resolve(import.meta.dirname,'..')
const nativeControls = new Set(['button','input','select','textarea','option','optgroup','details','summary','label','fieldset'])
const failures=[]
let checked=0
async function scan(dir) {
 for (const entry of await readdir(dir,{withFileTypes:true})) {
  if (['node_modules','dist','.astro','.git'].includes(entry.name)) continue
  const file=resolve(dir,entry.name)
  if (entry.isDirectory()) { await scan(file);continue }
  if (!entry.name.endsWith('.tsx')) continue
  checked++
  const source=ts.createSourceFile(file,await readFile(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  function visit(node) {
   if ((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&nativeControls.has(node.tagName.getText(source))) {
    const {line}=source.getLineAndCharacterOfPosition(node.getStart(source))
    failures.push(`${relative(root,file)}:${line+1}: gunakan komponen @xviidev/ui untuk <${node.tagName.getText(source)}>.`)
   }
   if ((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(source)==='Button'&&node.attributes.properties.some(prop=>prop.name?.getText(source)==='render')&&!node.attributes.properties.some(prop=>prop.name?.getText(source)==='nativeButton')) failures.push(`${relative(root,file)}: Button render memerlukan nativeButton={false} untuk tautan.`)
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)) {
    const name=node.moduleSpecifier.text
    if (/^@base-ui\/|^@radix-ui\//.test(name)||name.endsWith('/native-select')) failures.push(`${relative(root,file)}: impor UI melalui @xviidev/ui, bukan ${name}.`)
   }
   ts.forEachChild(node,visit)
  }
  visit(source)
 }
}
await scan(resolve(root,'apps/web/src/components'))
for(const entry of await readdir(resolve(root,'packages'),{withFileTypes:true})) {
 if(entry.isDirectory()&&entry.name!=='ui') await scan(resolve(root,'packages',entry.name,'src'))
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log(`Shared UI contract passed (${checked} React files).`)
