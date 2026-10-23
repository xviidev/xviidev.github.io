import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BitArray, Code128Reader, EAN13Reader } from '@zxing/library'
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { DEFAULT_SETTINGS, paginateLabels } from './labels.ts'
import { DEFAULT_BARCODE, placeBarcode } from './label-barcode.ts'
import { prepareLabelData } from './label-data.ts'
import { documentText, fromText } from './rich-text.ts'
import { layoutPages, PT_PER_MM } from './print-layout.ts'
import type { Measure } from './print-layout.ts'
import { generatePdf } from './pdf-export.ts'
import { decodeTemplate } from './template-file.ts'
import { applyPaperPreset, paperSettings } from './presets.ts'

const measure: Measure = (text, size) => ({ width: text.length * size * 0.6, ascent: size * 0.8, descent: size * 0.2, supported: true })
const barcode = { ...DEFAULT_BARCODE, enabled: true, value: 'BRG-0001' }
const sources = [
  { document: fromText('Produk A'), values: ['Produk A', '000123'], source: 'Baris Excel 2' },
  { document: [], values: [], source: 'Baris Excel 3' },
  { document: [], values: ['', '000456'], source: 'Baris Excel 4' },
]

test('column barcodes stay attached to rows, copies, empty text and partially used sheets', () => {
  const data = prepareLabelData(sources, 2, { ...barcode, source: 'column', column: 1 })
  assert.equal(data.count, 2)
  assert.deepEqual(data.errors, [])
  assert.deepEqual(data.barcodeValues, ['000123', '000123', '000456', '000456'])
  const slots = paginateLabels(data.labels.map(documentText), 24, 24)
  const model = layoutPages(data.labels, slots, { ...DEFAULT_SETTINGS, barcode }, 3, measure, data.barcodeValues)
  assert.deepEqual(model.pages.map(page => page.map(slot => slot.label.barcode?.value)), [['000123'], ['000123', '000456', '000456']])
  assert.equal(model.pages[0][0].index, 0)
  assert.equal(model.pages[1][0].index, 1)
  assert.deepEqual(model.barcodeErrors, [])
  assert.deepEqual(model.overflow, [])
})

test('invalid and missing codes report the original row; disabled barcodes preserve text-only behavior', () => {
  const data = prepareLabelData([...sources, { document: fromText('Produk C'), values: ['Produk C'], source: 'Baris Excel 5' }], 1, { ...barcode, source: 'column', column: 1, format: 'EAN13' })
  assert.equal(data.errors.length, 3)
  assert.match(data.errors[0], /Baris Excel 2/)
  assert.match(data.errors[1], /Baris Excel 4/)
  assert.match(data.errors[2], /Baris Excel 5/)
  assert.deepEqual(prepareLabelData(sources, 1).labels.map(documentText), ['Produk A'])
  assert.equal(prepareLabelData(sources, 1, barcode).barcodeValues[0], 'BRG-0001')
  assert.throws(() => prepareLabelData(sources, 0, barcode))
  assert.throws(() => prepareLabelData(Array(501).fill(sources[0]), 2, barcode), /Maksimal/)
})

test('placed barcode patterns decode independently at physical label dimensions', () => {
  for (const format of ['CODE128', 'EAN13'] as const) {
    const value = format === 'CODE128' ? 'BRG-0001' : '590123412345'
    const placed = placeBarcode(value, { ...barcode, format }, DEFAULT_SETTINGS, measure)
    // Sample the same vector rectangles used by both canvas and PDF at 300 DPI.
    const scale = 300 / 72, bits = new BitArray(Math.ceil(placed.width * scale))
    for (let pixel = 0; pixel < bits.getSize(); pixel++) {
      const x = placed.x + (pixel + 0.5) / scale
      if (placed.bars.some(bar => x >= bar.x && x < bar.x + bar.width)) bits.set(pixel)
    }
    assert.equal((format === 'CODE128' ? new Code128Reader() : new EAN13Reader()).decodeRow(0, bits).getText(), placed.value)
    assert.equal(placed.value, format === 'CODE128' ? value : value + '7')
    assert(placed.bars[0].x > placed.x)
    assert(placed.text!.baseline < placed.y + placed.height)
  }
})

test('layout reserves text space and blocks out-of-bounds or too dense barcodes', () => {
  const docs = [fromText('Nama produk\nHarga')], slots = paginateLabels(['Nama produk\nHarga'], 24, 1)
  const settings = { ...DEFAULT_SETTINGS, barcode }
  const model = layoutPages(docs, slots, settings, 3, measure, [barcode.value])
  assert.deepEqual(model.overflow, [])
  const label = model.pages[0][0].label
  assert(label.runs.filter(run => run !== label.barcode?.text).every(run => run.baseline < barcode.y * PT_PER_MM))
  const shifted = layoutPages(docs, slots, { ...settings, offsetY: 20 }, 3, measure, [barcode.value])
  assert.deepEqual(shifted.overflow, [0])
  for (const change of [{ x: -1 }, { width: 200 }, { height: 2 }, { y: NaN }, { width: 10 }]) assert.throws(() => placeBarcode('BRG-0001', { ...barcode, ...change }, DEFAULT_SETTINGS, measure))
})

test('design JSON keeps barcode configuration and old designs still work; paper presets exclude it', () => {
  const saved = JSON.stringify({ version: 1, document: fromText('{{1}}'), settings: { ...DEFAULT_SETTINGS, barcode } })
  assert.deepEqual(decodeTemplate(saved).settings.barcode, barcode)
  assert.equal(decodeTemplate(JSON.stringify({ version: 1, document: fromText('{{1}}'), settings: DEFAULT_SETTINGS })).settings.barcode, undefined)
  assert.throws(() => decodeTemplate(saved.replace('"column":0', '"column":-1')))
  assert.throws(() => decodeTemplate(saved.replace('"showText":true', '"showText":"true"')))
  const designed = { ...DEFAULT_SETTINGS, barcode }
  assert.equal('barcode' in paperSettings(designed), false)
  assert.deepEqual(applyPaperPreset({ ...DEFAULT_SETTINGS, barcode }, { ...DEFAULT_SETTINGS, labelHeight: 38.1 }).barcode, barcode)
})

test('PDF includes vector barcode bars on every copied page and rejects barcode errors', async () => {
  const settings = { ...DEFAULT_SETTINGS, barcode: { ...barcode, showText: false } }
  const data = prepareLabelData([{ document: [], values: ['BRG-0001'], source: 'Label manual 1' }], 2, settings.barcode)
  const model = layoutPages(data.labels, paginateLabels(data.labels.map(documentText), 24, 24), settings, 3, measure, data.barcodeValues)
  const pdf = await PDFDocument.load(await generatePdf(model, settings, async () => { throw new Error('No text fonts needed') }))
  assert.equal(pdf.getPageCount(), 2)
  for (const page of pdf.getPages()) {
    const contents = page.node.Contents() as PDFArray
    const stream = pdf.context.lookup(contents.get(0)) as PDFRawStream
    const commands = new TextDecoder().decode(decodePDFRawStream(stream).decode())
    assert(commands.includes('1 1 1 rg'))
    assert.equal((commands.match(/0 0 0 rg/g) ?? []).length, model.pages[0][0].label.barcode!.bars.length)
    assert(!commands.includes(' Do')) // No raster image XObject: bars remain vectors.
  }
  await assert.rejects(generatePdf({ ...model, barcodeErrors: ['Barcode label 1 tidak valid'] }, settings, async () => new Uint8Array()), /Barcode label 1/)
})
