import { test } from 'node:test'
import assert from 'node:assert/strict'
import { documentText, fromText, makeTemplate, manualDocuments, resolveTemplate, templateErrors, isRichDocument } from './rich-text.ts'

test('manual labels preserve rich formatting and omit standalone hyphens', () => {
  const doc = [{ runs: [{ text: 'Budi', weight: 700 as const }] }, ...fromText('-\nSinjai\n\nSari\n-')]
  const labels = manualDocuments(doc)
  assert.deepEqual(labels.map(documentText), ['Budi\nSinjai', 'Sari'])
  assert.equal(labels[0][0].runs[0].weight, 700)
})
test('templates compact missing and hyphen rows without leaving gaps', () => {
  const template = makeTemplate(3)
  const result = resolveTemplate(template, ['Budi', '-', 'Sinjai'])
  assert.equal(documentText(result), 'Budi\nSinjai')
  assert.equal(result[0].runs[0].weight, 700)
  assert.equal(result[1].runs[0].weight, 400)
  assert.equal(resolveTemplate(template, ['-', '', '-']).length, 0)
})
test('placeholder spans may cross styled text nodes', () => {
  const result = resolveTemplate([{ runs: [{ text: '{{', weight: 700 }, { text: '1}}', weight: 400 }] }], ['081234'])
  assert.equal(documentText(result), '081234')
  assert.equal(result[0].runs[0].weight, 700)
})
test('prefixes are removed if all bound fields are missing; literal hyphens remain in real text', () => {
  assert.equal(resolveTemplate(fromText('Telepon: {{1}}'), ['-']).length, 0)
  assert.equal(documentText(resolveTemplate(fromText('{{1}}'), ['Jl. A-B No. 1'])), 'Jl. A-B No. 1')
  assert.equal(documentText(resolveTemplate(fromText('{{1}} / {{2}}'), ['Budi', 'Sinjai'])), 'Budi / Sinjai')
})
test('invalid placeholders and unsafe template JSON are rejected', () => {
  assert.ok(templateErrors(fromText('{{0}}\n{{4}}'), 3).length)
  assert.ok(templateErrors(fromText('{{Nama}}'), 3).length)
  assert.ok(templateErrors(fromText('{{1'), 3).length)
  assert.equal(templateErrors(makeTemplate(3), 3).length, 0)
  assert.equal(isRichDocument([{ runs: [{ text: 'Nama', size: 500 }] }]), false)
  assert.equal(isRichDocument([{ runs: [{ text: 'Nama', weight: 999 }] }]), false)
  assert.equal(isRichDocument(makeTemplate(3)), true)
})

test('manual template keeps field positions when the second line is a dash', () => {
  const raw = manualDocuments(fromText('Budi\n-\nSinjai'), true)
  assert.equal(documentText(resolveTemplate(makeTemplate(3), raw[0].map(line => documentText([line])))), 'Budi\nSinjai')
})
test('multiline spreadsheet cells also remove dash-only inner lines', () => {
  assert.equal(documentText(resolveTemplate(makeTemplate(1), ['Nama\n-\nSinjai'])), 'Nama\nSinjai')
})
