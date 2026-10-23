import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS, getLayout, parseManual, expandLabels, paginateLabels, rowsToLabels } from './labels.ts'

test('default millimetre layout fits exactly 24 labels on A4', () => {
  assert.deepEqual(getLayout(DEFAULT_SETTINGS), { columns: 3, rows: 8, capacity: 24, errors: [] })
})
test('invalid geometry never produces printable pages', () => {
  for (const patch of [{ labelWidth: 0 }, { gapX: -1 }, { marginLeft: 220 }, { padding: 40 }, { labelHeight: NaN }, { labelWidth: 300 }]) {
    const result = getLayout({ ...DEFAULT_SETTINGS, ...patch })
    assert.equal(result.capacity, 0)
    assert.ok(result.errors.length)
  }
})
test('manual multiline labels are separated by blank lines and accept CRLF', () => {
  assert.deepEqual(parseManual('  Budi\r\nJalan A\r\n \r\nSari\r\nJalan B\r\n'), ['Budi\nJalan A', 'Sari\nJalan B'])
  assert.deepEqual(parseManual('   '), [])
})
test('copies are grouped per label and bounded without silent truncation', () => {
  assert.deepEqual(expandLabels(['A', 'B'], 2), ['A', 'A', 'B', 'B'])
  for (const count of [0, -1, 1.5, 101, NaN]) assert.throws(() => expandLabels(['A'], count))
  assert.throws(() => expandLabels(Array(501).fill('A'), 2))
})
test('start position skips only the first sheet and exact fits add no blank sheet', () => {
  const pages = paginateLabels(['A', 'B', 'C', 'D'], 4, 3)
  assert.deepEqual(pages.map(page => page.map(slot => slot?.text ?? null)), [[null, null, 'A', 'B'], ['C', 'D', null, null]])
  assert.equal(paginateLabels(['A', 'B', 'C', 'D'], 4, 1).length, 1)
  assert.equal(paginateLabels([], 4, 1).length, 0)
  assert.equal(paginateLabels(['A'], 4, 5).length, 0)
})
test('spreadsheet mapping preserves column order, zero, and phone text', () => {
  const rows = [['Nama', 'Alamat', 'Kode'], ['Budi', 'Sinjai', '0012'], [null, null, null], ['Sari', 'Makassar', 0]]
  assert.deepEqual(rowsToLabels(rows, [2, 0], true), ['0012\nBudi', '0\nSari'])
  assert.deepEqual(rowsToLabels([['081234', 'Budi']], [0, 1], false), ['081234\nBudi'])
})

test('21-label preset fits seven rows without adding an extra row', () => {
  const result = getLayout({ ...DEFAULT_SETTINGS, labelHeight: 38.1, marginTop: 15, marginBottom: 15 })
  assert.equal(result.capacity, 21)
  assert.equal(result.rows, 7)
})
test('downloadable Excel template can be parsed end to end', async () => {
  const { default: readWorkbook } = await import('read-excel-file/node')
  const { fileURLToPath } = await import('node:url')
  const sheets = await readWorkbook(fileURLToPath(new URL('../../public/contoh-label.xlsx', import.meta.url)))
  assert.equal(sheets[0].sheet, 'Penerima')
  const labels = rowsToLabels(sheets[0].data, [0, 1, 2], true)
  assert.equal(labels.length, 3)
  assert.match(labels[0], /Budi Santoso\nJl. Persatuan No. 12\nSinjai/)
  await assert.rejects(readWorkbook(Buffer.from('invalid workbook')))
})
