import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection, $isTextNode } from 'lexical'
import { $applyFontSize, $applyTextColor } from './editor-format.ts'
import { $selectedBarcode, $insertBarcode, $selectedTemplateColumn } from './editor-barcode.ts'
function editor() { return createEditor({ namespace: 'font-size-test', onError: error => { throw error } }) }
test('font size applies to selected text and preserves bold and italic', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('Nama alamat').toggleFormat('bold').toggleFormat('italic')
    $getRoot().append($createParagraphNode().append(text))
    const selection = text.select(0, 4)
    $applyFontSize(18, selection)
    const nodes = text.getParentOrThrow().getChildren()
    assert($isTextNode(nodes[0]) && $isTextNode(nodes[1]))
    assert.equal(nodes[0].getTextContent(), 'Nama')
    assert.equal(nodes[0].getStyle().includes('18pt'), true)
    assert.equal(nodes[0].hasFormat('bold'), true)
    assert.equal(nodes[0].hasFormat('italic'), true)
    assert.equal(nodes[1].getStyle().includes('18pt'), false)
  }, { discrete: true })
})
test('font size without text selection updates the active line only', () => {
  const instance = editor()
  instance.update(() => {
    const first = $createTextNode('Nama'), second = $createTextNode('Alamat')
    $getRoot().append($createParagraphNode().append(first), $createParagraphNode().append(second))
    $applyFontSize(16, first.select(2, 2))
    assert.equal(first.getStyle().includes('16pt'), true)
    assert.equal(second.getStyle(), '')
    const selection = $getSelection()
    assert($isRangeSelection(selection) && selection.isCollapsed())
  }, { discrete: true })
})
test('font size chosen on an empty line applies to newly inserted text', () => {
  const instance = editor()
  instance.update(() => {
    const paragraph = $createParagraphNode()
    $getRoot().append(paragraph)
    const selection = $applyFontSize(22, paragraph.select())
    selection?.insertText('Baru')
    const inserted = paragraph.getFirstChildOrThrow()
    assert($isTextNode(inserted))
    assert.equal(inserted.getStyle().includes('22pt'), true)
  }, { discrete: true })
})
test('invalid font sizes leave the document unchanged', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('Nama')
    $getRoot().append($createParagraphNode().append(text))
    for (const size of [NaN, 0, 101]) assert.equal($applyFontSize(size, text.select()), null)
    assert.equal(text.getStyle(), '')
  }, { discrete: true })
})

test('text color applies only to the selected text and preserves existing styles', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('Nama alamat').toggleFormat('bold').setStyle('font-size: 18pt;')
    const paragraph = $createParagraphNode().append(text)
    $getRoot().append(paragraph)
    const selection = $applyTextColor('#ff0000', text.select(0, 4))
    const nodes = paragraph.getChildren()
    assert($isTextNode(nodes[0]) && $isTextNode(nodes[1]))
    assert(nodes[0].getStyle().includes('#ff0000'))
    assert(nodes[0].getStyle().includes('18pt'))
    assert(nodes[0].hasFormat('bold'))
    assert(!nodes[1].getStyle().includes('#ff0000'))
    $applyTextColor('#0000ff', selection)
    assert(nodes[0].getStyle().includes('#0000ff'))
  }, { discrete: true })
})

test('color at a caret changes future input without recoloring its paragraph', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('Nama')
    $getRoot().append($createParagraphNode().append(text))
    const selection = $applyTextColor('#166534', text.select(4, 4))
    selection?.insertText(' Baru')
    const nodes = text.getParentOrThrow().getChildren()
    assert($isTextNode(nodes[0]) && $isTextNode(nodes[1]))
    assert.equal(nodes[0].getStyle(), '')
    assert(nodes[1].getStyle().includes('#166534'))
    for (const invalid of ['red', '#0000', 'transparent']) assert.equal($applyTextColor(invalid, selection), null)
  }, { discrete: true })
})

test('barcode toolbar recognizes caret inside tokens spanning styles and updates only that function', () => {
  const instance = editor()
  instance.update(() => {
    const a = $createTextNode('SKU: {{bar').toggleFormat('bold'), b = $createTextNode('code(3)}} suffix')
    const paragraph = $createParagraphNode().append(a, b)
    $getRoot().append(paragraph)
    const selection = b.select(3, 3)
    assert.equal($selectedBarcode(selection)?.match.source, 3)
    const saved = $insertBarcode({ source: 2, options: { format: 'EAN13', width: 50 } }, selection)
    assert.equal(paragraph.getTextContent(), 'SKU: {{barcode(2, {format: "EAN13", width: 50})}} suffix')
    assert.equal($selectedBarcode(saved)?.match.source, 2)
    $insertBarcode({ source: 1, options: {} }, saved)
    assert.equal(paragraph.getTextContent(), 'SKU: {{barcode(1)}} suffix')
  }, { discrete: true })
})

test('barcode insertion respects cursor outside existing functions', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('Nama: ')
    const paragraph = $createParagraphNode().append(text)
    $getRoot().append(paragraph)
    $insertBarcode({ source: 3, options: {} }, text.select(6, 6))
    assert.equal(paragraph.getTextContent(), 'Nama: {{barcode(3)}}')
  }, { discrete: true })
})

test('barcode converts a field at the caret and preserves the field style', () => {
  const instance = editor()
  instance.update(() => {
    const text = $createTextNode('{{3}}').setStyle('color: #166534;').toggleFormat('bold')
    const paragraph = $createParagraphNode().append(text)
    $getRoot().append(paragraph)
    const range = text.select(2, 2)
    assert.equal($selectedTemplateColumn(range), 3)
    const saved = $insertBarcode({ source: 3, options: {} }, range)
    assert.equal(paragraph.getTextContent(), '{{barcode(3)}}')
    const inserted = paragraph.getFirstChildOrThrow()
    assert($isTextNode(inserted))
    assert(inserted.getStyle().includes('#166534'))
    assert(inserted.hasFormat('bold'))
    $insertBarcode({ source: 3, options: { height: 10 } }, saved)
    assert(paragraph.getTextContent().includes('height: 10'))
    assert($isTextNode(paragraph.getFirstChildOrThrow()) && paragraph.getFirstChildOrThrow().getTextContent().includes('barcode'))
  }, { discrete: true })
})
