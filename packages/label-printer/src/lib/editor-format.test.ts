import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEditor, $getRoot, $createParagraphNode, $createTextNode, $getSelection, $isRangeSelection, $isTextNode } from 'lexical'
import { $applyFontSize } from './editor-format.ts'
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
