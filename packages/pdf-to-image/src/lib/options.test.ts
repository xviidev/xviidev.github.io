import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageName, imageSize, parsePages } from './options.ts'

test('page ranges deduplicate and keep document order', () => {
  assert.deepEqual(parsePages('5, 1–3, 2, 7-8', 10), [1, 2, 3, 5, 7, 8])
  assert.deepEqual(parsePages(' 1 ', 1), [1])
})
test('invalid page selections cannot export unintended pages', () => {
  for (const input of ['', '0', '11', '3-1', '1,', '-2', '1.5', 'abc', '1-10000000000', '1-2-3']) assert.throws(() => parsePages(input, 10))
})
test('resolution uses PDF points and respects rotated page dimensions', () => {
  assert.deepEqual(imageSize(612, 792, 150), { width: 1275, height: 1650, scale: 150 / 72 })
  const portrait = imageSize(612, 792, 300), landscape = imageSize(792, 612, 300)
  assert.equal(portrait.width, landscape.height)
  assert.equal(portrait.height, landscape.width)
})
test('oversized pages and invalid resolutions fail before canvas allocation', () => {
  for (const [w, h, dpi] of [[0, 10, 150], [Infinity, 10, 150], [600, 800, 0], [600, 800, 601], [600, 800, NaN], [10000, 1, 72], [6000, 6000, 72], [595, 842, 600]]) assert.throws(() => imageSize(w, h, dpi))
})
test('download names cannot create ZIP subdirectories and sort by page', () => {
  assert.equal(imageName('Laporan.PDF', 2, 120, 'jpg'), 'Laporan-halaman-002.jpg')
  assert.equal(imageName('../../arsip.pdf', 1, 2, 'png'), '..-..-arsip-halaman-01.png')
  assert.equal(imageName('.pdf', 1, 1, 'png'), 'dokumen-halaman-01.png')
})
