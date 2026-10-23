import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barcodeMatches, barcodeExpression, barcodeSettings } from './barcode-template.ts'
import { fromText, resolveTemplate, templateErrors, documentText, isRichDocument } from './rich-text.ts'
import { prepareLabelData } from './label-data.ts'
import { DEFAULT_SETTINGS, paginateLabels } from './labels.ts'
import { layoutPages } from './print-layout.ts'
import type { Measure } from './print-layout.ts'
import { decodeTemplate } from './template-file.ts'
import { barcodeWidthRange } from './label-barcode.ts'
import { PT_PER_MM } from './print-layout.ts'

const measure: Measure = (text, size) => ({ width: text.length * size * 0.6, ascent: size * 0.8, descent: size * 0.2, supported: true })

test('barcode functions parse default and explicit options without evaluating JavaScript', () => {
  assert.deepEqual(barcodeMatches('{{barcode(3)}}')[0].options, {})
  const token = '{{barcode(3, {format: "EAN13", height: 12, width: 50, x: 2, y: 18, showText: false})}}'
  const match = barcodeMatches(token)[0]
  assert.equal(match.source, 3)
  assert.deepEqual(match.options, { format: 'EAN13', height: 12, width: 50, x: 2, y: 18, showText: false })
  assert.equal(barcodeMatches(barcodeExpression(match))[0].source, 3)
  assert.equal(barcodeSettings({ source: 1, options: {} }, DEFAULT_SETTINGS).format, 'CODE128')
  const sized = barcodeSettings({ source: 1, options: { height: 15 } }, DEFAULT_SETTINGS)
  assert.equal(sized.y, DEFAULT_SETTINGS.padding)
  assert.equal(sized.height, 15)
  for (const expression of ['{{barcode(0)}}', '{{barcode(101)}}', '{{barcode(1, {width: NaN})}}', '{{barcode(1, {x: -1})}}', '{{barcode(1, {height: 2})}}', '{{barcode(1, {format: "QR"})}}', '{{barcode(1, {x: 1, x: 2})}}', '{{barcode(1, {width: alert(1)})}}', '{{barcode(1, {unknown: 3})}}', '{{barcode(1, {__proto__: true})}}']) assert(templateErrors(fromText(expression), 3).length, expression)
  assert(templateErrors(fromText('{{barcode(alert(1))}}'), 3).length)
  assert(templateErrors(fromText('{{barcode(4)}}'), 3).length)
  assert(templateErrors(fromText('{{barcode(1)}} {{barcode(2)}}'), 3).length)
  assert.deepEqual(templateErrors(fromText(token), 3), [])
  assert(templateErrors(fromText('{{barcode(1, {format: EAN13"})}}'), 3).length)
  for (const source of [-1, NaN, Infinity]) assert.throws(() => barcodeExpression({ source, options: {} }))
})

test('styled function markers resolve original data and preserve adjacent text colors', () => {
  const template = [{ runs: [{ text: '{{1}}', color: '#ff0000', weight: 700 as const }] }, { runs: [{ text: '{{bar', color: '#0000ff' }, { text: 'code(3)}}' }] }]
  const doc = resolveTemplate(template, ['Kopi', '-', 'BRG-0001'])
  assert.equal(doc.find(line => !line.barcode)?.runs[0].color, '#ff0000')
  assert.equal(doc.find(line => line.barcode)?.barcode?.value, 'BRG-0001')
  const data = prepareLabelData([{ document: doc, values: ['Kopi', '-', 'BRG-0001'], source: 'Baris Excel 2' }], 2)
  const model = layoutPages(data.labels, paginateLabels(data.labels.map(documentText), 24, 24), DEFAULT_SETTINGS, 3, measure)
  assert.deepEqual(model.barcodeErrors, [])
  assert.equal(model.pages[0][0].label.barcode?.value, 'BRG-0001')
  assert.equal(model.pages[1][0].label.barcode?.value, 'BRG-0001')
  assert.equal(model.pages[0][0].label.barcode?.text?.color, '#0000ff')
  assert.equal(model.pages[0][0].label.runs[0].color, '#ff0000')
})

test('barcode-only templates retain rows and validate missing values with source row numbers', () => {
  const template = fromText('{{barcode(2, {format: 128})}}')
  const sources = [['A', '000123'], [], ['B', '']].map((row, index) => ({ document: resolveTemplate(template, row), values: row, source: `Baris Excel ${index + 2}` }))
  const data = prepareLabelData(sources.filter(source => source.values.length), 1)
  assert.equal(data.labels.length, 2)
  assert.equal(documentText(data.labels[0]), '000123')
  assert.match(data.errors[0], /Baris Excel 4/)
  const ean = prepareLabelData([{ document: resolveTemplate(fromText('{{barcode(1, {format: "EAN13"})}}'), ['590123412345']), values: ['590123412345'], source: 'Label manual 1' }], 1)
  assert.equal(documentText(ean.labels[0]), '5901234123457')
  assert.deepEqual(ean.errors, [])
})

test('color and barcode function templates round trip while malformed colors are rejected', () => {
  const document = [{ runs: [{ text: '{{1}}', color: '#1e3a8a' }] }, ...fromText('{{barcode(3)}}')]
  assert.deepEqual(decodeTemplate(JSON.stringify({ version: 1, settings: DEFAULT_SETTINGS, document })).document, document)
  for (const color of ['red', '#abcd', 'url(javascript:alert(1))', null, 12]) assert.equal(isRichDocument([{ runs: [{ text: 'A', color }] }]), false)
  assert.deepEqual(templateErrors(document, 3), [])
})

test('barcode flows before, between, and after text according to template order', () => {
  const settings = { ...DEFAULT_SETTINGS, labelHeight: 60, vertical: 'top' as const }
  for (const text of ['{{barcode(2)}}\n{{1}}\nHarga', '{{1}}\n{{barcode(2)}}\nHarga', '{{1}}\nHarga\n{{barcode(2)}}']) {
    const doc = resolveTemplate(fromText(text), ['Kopi', 'BRG-0001'])
    const model = layoutPages([doc], paginateLabels([documentText(doc)], 24, 1), settings, 3, measure)
    assert.deepEqual(model.barcodeErrors, [])
    assert.deepEqual(model.overflow, [])
    const label = model.pages[0][0].label, barcode = label.barcode!
    const title = label.runs.find(run => run.text === 'Kopi')!, price = label.runs.find(run => run.text === 'Harga')!
    if (text.startsWith('{{barcode')) assert(title.baseline > barcode.y + barcode.height)
    else assert(title.baseline < barcode.y)
    if (text.endsWith('Harga')) assert(price.baseline > barcode.y + barcode.height)
    else assert(price.baseline < barcode.y)
  }
})

test('barcode inherits paragraph alignment and moves with the full text block', () => {
  for (const align of ['left', 'center', 'right'] as const) {
    const template = [{ align, runs: [{ text: '{{1}}' }] }, { align, runs: [{ text: '{{barcode(2, {width: 40})}}' }] }, { align, runs: [{ text: 'Harga' }] }]
    const doc = resolveTemplate(template, ['Kopi', 'BRG-0001'])
    assert.equal(doc.find(line => line.barcode)?.align, align)
    const slots = paginateLabels([documentText(doc)], 24, 1)
    const base = layoutPages([doc], slots, DEFAULT_SETTINGS, 3, measure).pages[0][0].label
    const b = base.barcode!
    const expected = align === 'left' ? DEFAULT_SETTINGS.padding : align === 'center' ? (DEFAULT_SETTINGS.labelWidth - 40) / 2 : DEFAULT_SETTINGS.labelWidth - DEFAULT_SETTINGS.padding - 40
    assert(Math.abs(b.x / PT_PER_MM - expected) < 0.001)
    const moved = layoutPages([doc], slots, { ...DEFAULT_SETTINGS, offsetX: 1, offsetY: 1 }, 3, measure).pages[0][0].label
    assert(Math.abs(moved.barcode!.x - b.x - PT_PER_MM) < 0.001)
    assert(Math.abs(moved.barcode!.y - b.y - PT_PER_MM) < 0.001)
    assert(Math.abs(moved.runs[0].baseline - base.runs[0].baseline - PT_PER_MM) < 0.001)
  }
})

test('automatic width remains scannable for different data lengths and reports physical limits', () => {
  const values = ['A', 'BRG-0001', '123456789012345678901234567890']
  const range = barcodeWidthRange(values, 'CODE128', DEFAULT_SETTINGS.labelWidth - 2 * DEFAULT_SETTINGS.padding)
  assert(range.minimum > 0 && range.minimum <= range.recommended && range.recommended <= range.maximum)
  for (const value of values) {
    const doc = resolveTemplate(fromText('{{barcode(1)}}'), [value])
    const model = layoutPages([doc], paginateLabels([value], 24, 1), DEFAULT_SETTINGS, 3, measure)
    assert.deepEqual(model.barcodeErrors, [])
    assert.deepEqual(model.overflow, [])
    const own = barcodeWidthRange([value], 'CODE128', range.maximum)
    assert(model.pages[0][0].label.barcode!.width / PT_PER_MM >= own.minimum - 0.001)
  }
  const impossible = barcodeWidthRange(['W'.repeat(80)], 'CODE128', 30)
  assert(impossible.minimum > impossible.maximum)
  assert.throws(() => barcodeSettings({ source: 1, options: { width: 3 } }, DEFAULT_SETTINGS, 'BRG-0001'), /Lebar barcode harus .*Hapus opsi width/)
})

test('blank template lines and text around a barcode preserve reading order', () => {
  const doc = resolveTemplate(fromText('Atas\n\nSebelum {{barcode(1)}} Sesudah'), ['BRG-0001'])
  assert.equal(doc[0].runs[0].text, 'Atas')
  assert.deepEqual(doc[1].runs, [])
  assert.equal(doc[2].runs[0].text, 'Sebelum ')
  assert(doc[2].runs[1].barcode)
  assert.equal(doc[2].runs[2].text, ' Sesudah')
  assert.equal(doc.length, 3)
})

test('barcode has zero internal padding and inherits its token color', () => {
  const doc = resolveTemplate([{ runs: [{ text: '{{barcode(1, {showText: false})}}', color: '#166534' }] }], ['BRG-0001'])
  const model = layoutPages([doc], paginateLabels(['BRG-0001'], 24, 1), DEFAULT_SETTINGS, 3, measure)
  const barcode = model.pages[0][0].label.barcode!
  assert.equal(barcode.color, '#166534')
  assert.equal(barcode.bars[0].x, barcode.x)
  assert.equal(barcode.barY, barcode.y)
  assert.equal(barcode.barHeight, barcode.height)
  const last = barcode.bars.at(-1)!
  assert(Math.abs(last.x + last.width - barcode.x - barcode.width) < 0.001)
})

test('template whitespace survives layout and inline barcode does not add an Enter', () => {
  const settings = { ...DEFAULT_SETTINGS, labelWidth: 180, labelHeight: 80, vertical: 'top' as const }
  const plain = resolveTemplate(fromText('  A  B  \n\nC'), [])
  assert.equal(documentText(plain), '  A  B  \n\nC')
  const model = layoutPages([plain], paginateLabels(['text'], 1, 1), settings, 1, measure)
  const runs = model.pages[0][0].label.runs
  assert.equal(runs.slice(0, -1).map(run => run.text).join(''), '  A  B  ')
  assert.equal(runs.at(-1)!.text, 'C')
  assert(Math.abs(runs.at(-1)!.baseline - runs[0].baseline - settings.fontSize * 1.3 * 2) < 0.001)
  const doc = resolveTemplate(fromText('A  {{barcode(1, {width: 40})}}  B'), ['BRG-0001'])
  const label = layoutPages([doc], paginateLabels(['code'], 1, 1), settings, 1, measure).pages[0][0].label
  assert.deepEqual(label.runs.filter(run => !run.barcode && run.text === 'A').map(run => run.baseline), label.runs.filter(run => run.text === 'B').map(run => run.baseline))
  const a = label.runs.find(run => run.text === 'A')!
  assert(Math.abs(label.barcode!.x - a.x - a.width - measure('  ', settings.fontSize, a.key).width) < 0.001)
})
