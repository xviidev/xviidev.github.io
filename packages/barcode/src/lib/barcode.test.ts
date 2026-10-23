import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Resvg } from '@resvg/resvg-js'
import { BinaryBitmap, GlobalHistogramBinarizer, RGBLuminanceSource, MultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library'
import { PDFDocument } from 'pdf-lib'
import { DEFAULT_APPEARANCE, encode, geometry, normalize, parseRows, svgCode } from './barcode.ts'
import type { Format } from './barcode.ts'
import { pdfBytes } from './pdf.ts'

test('EAN-13 computes and checks the check digit, preserving leading zeros', () => {
  assert.equal(normalize('590123412345', 'EAN13'), '5901234123457')
  assert.equal(normalize('4006381333931', 'EAN13'), '4006381333931')
  assert.equal(normalize('000123456789', 'EAN13'), '0001234567895')
  for (const invalid of ['5901234123458', '123', '59012341234a', ' 590123412345', '５９０１２３４１２３４５']) assert.throws(() => normalize(invalid, 'EAN13'))
})

test('Code 128 preserves printable text and rejects unsupported input', () => {
  assert.equal(normalize(' A&B <123> ', 'CODE128'), ' A&B <123> ')
  for (const invalid of ['', 'Produk 🌱', 'a\tb', 'a\nb', 'a'.repeat(81)]) assert.throws(() => encode(invalid, 'CODE128'))
  assert.throws(() => encode('123', 'OTHER' as Format))
})

test('mass input keeps physical line numbers, duplicates and whitespace without silent truncation', () => {
  const rows = parseRows('BRG-1\r\n\r\n A \r\nBRG-1\r\n🌱', 'CODE128')
  assert.deepEqual(rows.map(row => row.line), [1, 3, 4, 5])
  assert.equal(rows[1].code?.value, ' A ')
  assert.equal(rows[0].code?.value, rows[2].code?.value)
  assert.match(rows[3].error!, /ASCII/)
  assert.deepEqual(parseRows('\n  \n', 'CODE128'), [])
  assert.equal(parseRows(Array(200).fill('A').join('\n'), 'CODE128').length, 200)
  assert.throws(() => parseRows(Array(201).fill('A').join('\n'), 'CODE128'), /Maksimal/)
})

test('exported SVG round trips through an independent barcode reader at all sizes', () => {
  for (const [format, value] of [['CODE128', 'BRG-0001'], ['CODE128', ' A&B <123> '], ['CODE128', '12345678901234567890'], ['EAN13', '590123412345'], ['EAN13', '000123456789']] as const) {
    for (const moduleWidth of [1, 2, 4]) for (const showText of [true, false]) {
      const appearance = { ...DEFAULT_APPEARANCE, moduleWidth, height: 40, showText }
      const code = encode(value, format), svg = svgCode(code, appearance)
      const rendered = new Resvg(svg).render(), pixels = rendered.pixels
      const gray = new Uint8ClampedArray(rendered.width * rendered.height)
      for (let i = 0; i < gray.length; i++) gray[i] = pixels[i * 4]
      const reader = new MultiFormatReader()
      const decoded = reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(new RGBLuminanceSource(gray, rendered.width, rendered.height))), new Map([[DecodeHintType.POSSIBLE_FORMATS, [format === 'CODE128' ? BarcodeFormat.CODE_128 : BarcodeFormat.EAN_13]]]))
      assert.equal(decoded.getText(), code.value)
      const box = geometry(code, appearance)
      assert(box.quiet >= moduleWidth * 12)
      assert.equal(rendered.width, box.width)
      assert.equal(rendered.height, box.height)
    }
  }
})

test('SVG escapes text and invalid dimensions are rejected', () => {
  assert.match(svgCode(encode('<a&b>', 'CODE128'), DEFAULT_APPEARANCE), /&lt;a&amp;b&gt;/)
  for (const change of [{ moduleWidth: 0 }, { height: NaN }, { margin: 0 }]) assert.throws(() => geometry(encode('ABC', 'CODE128'), { ...DEFAULT_APPEARANCE, ...change }))
})

test('PDF exports vector pages for the complete batch and paginates', async () => {
  const codes = Array.from({ length: 30 }, (_, index) => encode(`BRG-${index}`, 'CODE128'))
  const pdf = await PDFDocument.load(await pdfBytes(codes, DEFAULT_APPEARANCE))
  assert(pdf.getPageCount() > 1)
  for (const page of pdf.getPages()) {
    assert.equal(page.getWidth(), 595.28)
    assert.equal(page.getHeight(), 841.89)
  }
  await assert.rejects(pdfBytes([], DEFAULT_APPEARANCE), /Belum ada/)
  const symbols = await PDFDocument.load(await pdfBytes([encode(' A&B <123> ', 'CODE128')], DEFAULT_APPEARANCE))
  assert.equal(symbols.getPageCount(), 1)
})
