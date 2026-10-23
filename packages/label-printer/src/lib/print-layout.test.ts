import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { DEFAULT_SETTINGS, paginateLabels } from './labels.ts'
import { fromText, documentText, resolveTemplate, makeTemplate } from './rich-text.ts'
import { PT_PER_MM, layoutLabel, layoutPages } from './print-layout.ts'
import type { FontKey, Measure } from './print-layout.ts'
import { generatePdf } from './pdf-export.ts'
import { decodeTemplate } from './template-file.ts'

const measure: Measure = (text, size) => ({ width: [...text].length * size * 0.6, ascent: size * 0.8, descent: size * 0.2, supported: !text.includes('ðŸ’¥') })

test('rich line styling survives positioning and keeps compact rows', () => {
  const doc = resolveTemplate(makeTemplate(3), ['Budi', '-', 'Sinjai'])
  const result = layoutLabel(doc, { ...DEFAULT_SETTINGS, vertical: 'top' }, measure)
  assert.equal(result.overflow, false)
  assert.equal(result.runs.length, 2)
  assert.equal(result.runs[0].key, 'sans:700:normal')
  assert.equal(result.runs[1].key, 'sans:400:normal')
  assert.ok(Math.abs(result.runs[1].baseline - result.runs[0].baseline - 13) < 0.001)
})
test('wrapping fits long words and flags oversized text or positions', () => {
  const result = layoutLabel(fromText('a'.repeat(80)), DEFAULT_SETTINGS, measure)
  assert.equal(result.overflow, false)
  assert.ok(result.runs.length > 1)
  assert.equal(layoutLabel(fromText('A\nB\nC'), { ...DEFAULT_SETTINGS, fontSize: 70 }, measure).overflow, true)
  assert.equal(layoutLabel(fromText('A'), { ...DEFAULT_SETTINGS, offsetX: -10 }, measure).overflow, true)
  assert.equal(layoutLabel(fromText('ðŸ’¥'), DEFAULT_SETTINGS, measure).unsupported, true)
})
test('line-specific sizes, weights, italics, alignment, and underlines are retained', () => {
  const result = layoutLabel([{ align: 'right', runs: [{ text: 'Nama', weight: 300, italic: true, underline: true, size: 14 }] }], DEFAULT_SETTINGS, measure)
  assert.equal(result.runs[0].key, 'sans:300:italic')
  assert.equal(result.runs[0].size, 14)
  assert.equal(result.runs[0].underline, true)
  assert.ok(result.runs[0].x > DEFAULT_SETTINGS.padding * PT_PER_MM)
})
test('template files validate settings, typography, and document data', () => {
  const saved = JSON.stringify({ version: 1, settings: DEFAULT_SETTINGS, document: makeTemplate(3) })
  assert.equal(decodeTemplate(saved).document.length, 3)
  assert.throws(() => decodeTemplate(JSON.stringify({ version: 1, settings: { ...DEFAULT_SETTINGS, labelWidth: -1 }, document: makeTemplate(3) })))
  assert.throws(() => decodeTemplate(JSON.stringify({ version: 1, settings: { ...DEFAULT_SETTINGS, font: 'unknown' }, document: makeTemplate(3) })))
})
test('vector PDF embeds custom fonts and preserves physical multi-page geometry', async () => {
  const cache = new Map<FontKey, { bytes: Uint8Array; font: ReturnType<typeof fontkit.create> }>()
  const load = async (key: FontKey) => {
    if (!cache.has(key)) {
      const [family, weight, style] = key.split(':')
      const name = family === 'sans' ? 'noto-sans' : 'jetbrains-mono'
      const bytes = new Uint8Array(await readFile(createRequire(import.meta.url).resolve(`@fontsource/${name}/files/${name}-latin-${weight}-${style}.woff`)))
      cache.set(key, { bytes, font: fontkit.create(bytes) })
    }
    return cache.get(key)!
  }
  const docs = Array.from({ length: 25 }, (_, i) => resolveTemplate(makeTemplate(3), [`Penerima ${i + 1}`, '-', 'Sinjai']))
  for (const key of ['sans:700:normal', 'sans:400:normal'] as FontKey[]) await load(key)
  const realMeasure: Measure = (text, size, key) => {
    const font = cache.get(key)!.font
    return { width: font.layout(text).glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth, 0) / font.unitsPerEm * size, ascent: font.ascent / font.unitsPerEm * size, descent: -font.descent / font.unitsPerEm * size, supported: true }
  }
  const slots = paginateLabels(docs.map(documentText), 24, 1)
  const model = layoutPages(docs, slots, DEFAULT_SETTINGS, 3, realMeasure)
  assert.equal(model.overflow.length, 0)
  const bytes = await generatePdf(model, DEFAULT_SETTINGS, async key => (await load(key)).bytes)
  const pdf = await PDFDocument.load(bytes)
  assert.equal(pdf.getPageCount(), 2)
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 210 * PT_PER_MM) < 0.01)
  assert.ok(Math.abs(pdf.getPage(0).getHeight() - 297 * PT_PER_MM) < 0.01)
  assert.equal(model.pages[1].length, 1)
  await assert.rejects(generatePdf({ ...model, overflow: [0] }, DEFAULT_SETTINGS, async key => (await load(key)).bytes))
})

test('PDF preserves text and underline colors and the barcode token color', async () => {
  const cache = new Map<FontKey, { bytes: Uint8Array; font: ReturnType<typeof fontkit.create> }>()
  for (const key of ['sans:400:normal', 'mono:400:normal'] as FontKey[]) {
    const name = key.startsWith('sans') ? 'noto-sans' : 'jetbrains-mono'
    const bytes = new Uint8Array(await readFile(createRequire(import.meta.url).resolve(`@fontsource/${name}/files/${name}-latin-400-normal.woff`)))
    cache.set(key, { bytes, font: fontkit.create(bytes) })
  }
  const realMeasure: Measure = (text, size, key) => {
    const font = cache.get(key)!.font
    return { width: font.layout(text).glyphs.reduce((sum, glyph) => sum + glyph.advanceWidth, 0) / font.unitsPerEm * size, ascent: font.ascent / font.unitsPerEm * size, descent: -font.descent / font.unitsPerEm * size, supported: true }
  }
  const doc = resolveTemplate([{ runs: [{ text: '{{1}}', color: '#ff0000', underline: true }] }, { runs: [{ text: '{{barcode(2)}}', color: '#0000ff' }] }], ['Produk', 'BRG-0001'])
  const model = layoutPages([doc], paginateLabels([documentText(doc)], 24, 1), DEFAULT_SETTINGS, 3, realMeasure)
  assert.deepEqual(model.barcodeErrors, [])
  const pdf = await PDFDocument.load(await generatePdf(model, DEFAULT_SETTINGS, async key => cache.get(key)!.bytes))
  const contents = pdf.getPage(0).node.Contents() as PDFArray
  const commands = new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(contents.get(0)) as PDFRawStream).decode())
  assert(commands.includes('1 0 0 rg'))
  assert(commands.includes('1 0 0 RG'))
  assert(commands.includes('0 0 1 rg'))
})
