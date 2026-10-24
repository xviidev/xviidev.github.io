import test from 'node:test'
import assert from 'node:assert/strict'
import { PDFDocument, PDFName, degrees } from 'pdf-lib'
import { unzipSync } from 'fflate'
import { mergePdfs, openPdf, splitPdf } from './index.ts'
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES, pagesFromRange, splitGroups, validateFiles, pdfName } from './options.ts'
async function fixture(name = 'source.pdf', widths = [200, 300, 400, 500, 600]) {
  const doc = await PDFDocument.create()
  widths.forEach((width, i) => { const page = doc.addPage([width, 700]); if (i === 1) page.setRotation(degrees(90)); page.drawText(`Page ${i + 1}`) })
  return new File([new Uint8Array(await doc.save())], name, { type: 'application/pdf' })
}
test('page ranges preserve requested order, deduplicate and reject malformed or unavailable pages', () => {
  assert.deepEqual(pagesFromRange('4, 1-3, 2', 5), [3, 0, 1, 2])
  assert.deepEqual(pagesFromRange('', 3), [0, 1, 2])
  for (const range of ['0', '6', '3-1', '1,', '-2', '1.2', 'all', '1e2', '1-9999999999']) assert.throws(() => pagesFromRange(range, 5))
})
test('split groups support selected sections, each page and final partial chunks; limits reject oversized plans', () => {
  assert.deepEqual(splitGroups(6, 'ranges', '1-2; 6, 4', 1), [[0, 1], [5, 3]])
  assert.deepEqual(splitGroups(3, 'pages', '', 1), [[0], [1], [2]])
  assert.deepEqual(splitGroups(5, 'chunks', '', 2), [[0, 1], [2, 3], [4]])
  for (const range of ['', '1;', ';2', '1;;2']) assert.throws(() => splitGroups(5, 'ranges', range, 1))
  for (const count of [0, -1, 2.5, NaN, 6]) assert.throws(() => splitGroups(5, 'chunks', '', count))
  assert.throws(() => splitGroups(201, 'pages', '', 1), /200 PDF/)
  assert.throws(() => splitGroups(1000, 'ranges', '1-1000;1-1000', 1), /1.000|1000/)
})
test('file count, empty inputs, individual and cumulative bytes are bounded; filenames stay inside ZIP', () => {
  for (const files of [[], [{size:0}], [{size:MAX_FILE_BYTES+1}], Array(51).fill({size:1}), Array(3).fill({size:MAX_TOTAL_BYTES/3+1})]) assert.throws(() => validateFiles(files))
  assert.equal(pdfName('../bad/path.pdf'), '..-bad-path')
  assert.equal(pdfName('.pdf'), 'dokumen')
})
test('merge follows file and range order without resizing or changing page rotation', async () => {
  const a = await fixture(), b = await fixture('second.pdf', [800, 900])
  const result = await mergePdfs([{file:b, range:'2'}, {file:a, range:'2, 1'}])
  const output = await PDFDocument.load(result.bytes)
  assert.equal(result.pages, 3); assert.equal(result.type, 'application/pdf')
  assert.deepEqual(output.getPages().map(page => page.getWidth()), [900, 300, 200])
  assert.deepEqual(output.getPages().map(page => page.getRotation().angle), [90, 90, 0])
  await assert.rejects(mergePdfs([{file:a,range:''}]), /minimal dua/)
})
test('split produces ordered valid PDFs in ZIP and returns a PDF directly for one part', async () => {
  const file = await fixture('../source.pdf')
  const result = await splitPdf(file, 'chunks', '', 2), files = unzipSync(result.bytes)
  assert.equal(result.count, 3); assert.equal(result.pages, 5); assert.equal(result.type, 'application/zip')
  assert.deepEqual(Object.keys(files), ['..-source-bagian-001.pdf', '..-source-bagian-002.pdf', '..-source-bagian-003.pdf'])
  const widths = await Promise.all(Object.values(files).map(async bytes => (await PDFDocument.load(bytes)).getPages().map(page => page.getWidth())))
  assert.deepEqual(widths, [[200, 300], [400, 500], [600]])
  const single = await splitPdf(file, 'ranges', '5, 1-2', 1)
  assert.equal(single.count, 1); assert.equal(single.type, 'application/pdf')
  assert.deepEqual((await PDFDocument.load(single.bytes)).getPages().map(page => page.getWidth()), [600, 200, 300])
  const every = unzipSync((await splitPdf(file, 'pages', '', 1)).bytes)
  assert.equal(Object.keys(every).length, 5)
})
test('corrupt documents and interactive forms fail explicitly without silently losing field values', async () => {
  await assert.rejects(openPdf(new File(['not a PDF'], 'bad.pdf')), /rusak/)
  const protectedDoc = await PDFDocument.create(); protectedDoc.addPage()
  protectedDoc.context.trailerInfo.Encrypt = protectedDoc.context.register(protectedDoc.context.obj({ Filter: 'Standard' }))
  await assert.rejects(openPdf(new File([new Uint8Array(await protectedDoc.save())], 'encrypted.pdf')), /terenkripsi/)
  const doc = await PDFDocument.create(), page = doc.addPage(); const field = doc.getForm().createTextField('name'); field.setText('Saved value'); field.addToPage(page)
  await assert.rejects(openPdf(new File([new Uint8Array(await doc.save())], 'form.pdf')), /formulir/)
  doc.catalog.delete(PDFName.of('AcroForm'))
  await assert.rejects(openPdf(new File([new Uint8Array(await doc.save())], 'orphan-widget.pdf')), /formulir/)
  const xfa = await PDFDocument.create(); xfa.addPage()
  xfa.catalog.set(PDFName.of('AcroForm'), xfa.context.obj({ XFA: [] }))
  await assert.rejects(openPdf(new File([new Uint8Array(await xfa.save())], 'xfa.pdf')), /formulir/)
  const empty = await PDFDocument.create()
  await assert.rejects(openPdf(new File([new Uint8Array(await empty.save({ addDefaultPage: false }))], 'empty.pdf')), /halaman/)
})
