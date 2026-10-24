import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateFile, formatFileSize } from './file.ts'

test('file picker validates extension, MIME and wildcard types for chooser and drop', () => {
  assert.equal(validateFile({ name: 'REPORT.PDF', size: 100, type: '' }, '.pdf,application/pdf'), '')
  assert.equal(validateFile({ name: 'logo.png', size: 100, type: 'image/png' }, 'image/*'), '')
  assert.ok(validateFile({ name: 'script.exe', size: 100, type: 'application/octet-stream' }, '.pdf'))
  assert.ok(validateFile({ name: 'logo.svg', size: 100, type: 'image/svg+xml' }, 'image/png,image/jpeg,image/webp'))
})
test('empty and oversized files are rejected before reading', () => {
  assert.ok(validateFile({ name: 'empty.pdf', size: 0, type: 'application/pdf' }, '.pdf'))
  assert.ok(validateFile({ name: 'big.pdf', size: 1025, type: 'application/pdf' }, '.pdf', 1024))
  assert.equal(validateFile({ name: 'fits.pdf', size: 1024, type: 'application/pdf' }, '.pdf', 1024), '')
  assert.equal(formatFileSize(1536), '1,5 KB')
  assert.equal(formatFileSize(2 * 1024 * 1024), '2 MB')
})
