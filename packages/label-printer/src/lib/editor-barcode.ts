import { $getSelection, $getNodeByKey, $getRoot, $isElementNode, $isRangeSelection, $isTextNode, $createRangeSelection, $setSelection } from 'lexical'
import type { ElementNode, LexicalNode, RangeSelection } from 'lexical'
import { barcodeMatches, barcodeExpression } from './barcode-template.ts'
import type { BarcodeExpression, BarcodeMatch } from './barcode-template.ts'

function offsetOf(parent: ElementNode, key: string, offset: number): number | null {
  if (parent.getKey() === key) return parent.getChildren().slice(0, offset).reduce((sum, child) => sum + child.getTextContentSize(), 0)
  let position = 0
  for (const child of parent.getChildren()) {
    if (child.getKey() === key) return position + offset
    if ($isElementNode(child)) { const found = offsetOf(child, key, offset); if (found !== null) return position + found }
    position += child.getTextContentSize()
  }
  return null
}

export function $selectedBarcode(selection = $getSelection()): { match: BarcodeMatch; paragraph: ElementNode } | null {
  if (!$isRangeSelection(selection)) return null
  const node = selection.anchor.getNode()
  const paragraph = $isElementNode(node) && node.getParent() === $getRoot() ? node : node.getTopLevelElement()
  if (!paragraph) return null
  const start = offsetOf(paragraph, selection.anchor.key, selection.anchor.offset)
  const end = offsetOf(paragraph, selection.focus.key, selection.focus.offset)
  if (start === null || end === null) return null
  try {
    const match = barcodeMatches(paragraph.getTextContent()).find(item => selection.isCollapsed() ? start >= item.start && start <= item.end : Math.min(start, end) < item.end && Math.max(start, end) > item.start)
    return match ? { match, paragraph } : null
  } catch { return null }
}

function $selectedTemplateField(selection = $getSelection()) {
  if (!$isRangeSelection(selection)) return null
  const node = selection.anchor.getNode()
  const paragraph = $isElementNode(node) && node.getParent() === $getRoot() ? node : node.getTopLevelElement()
  if (!paragraph) return null
  const start = offsetOf(paragraph, selection.anchor.key, selection.anchor.offset), end = offsetOf(paragraph, selection.focus.key, selection.focus.offset)
  if (start === null || end === null) return null
  const match = [...paragraph.getTextContent().matchAll(/\{\{\s*(\d+)\s*\}\}/g)].find(item => selection.isCollapsed() ? start >= item.index! && start <= item.index! + item[0].length : Math.min(start, end) < item.index! + item[0].length && Math.max(start, end) > item.index!)
  return match && Number(match[1]) >= 1 && Number(match[1]) <= 100 ? { column: Number(match[1]), paragraph, start: match.index!, end: match.index! + match[0].length } : null
}

export function $selectedTemplateColumn(selection = $getSelection()): number | null { return $selectedTemplateField(selection)?.column ?? null }

function pointAt(parent: ElementNode, offset: number): { node: LexicalNode; offset: number; type: 'text' | 'element' } {
  let position = 0
  for (const child of parent.getChildren()) {
    const length = child.getTextContentSize()
    if (offset <= position + length) {
      if ($isTextNode(child)) return { node: child, offset: offset - position, type: 'text' }
      if ($isElementNode(child)) return pointAt(child, offset - position)
    }
    position += length
  }
  return { node: parent, offset: parent.getChildrenSize(), type: 'element' }
}

export function $insertBarcode(expression: BarcodeExpression, saved: RangeSelection | null): RangeSelection | null {
  let selection = saved && $getNodeByKey(saved.anchor.key) && $getNodeByKey(saved.focus.key) ? saved.clone() : $getSelection()
  if (!$isRangeSelection(selection)) selection = $getRoot().selectEnd()
  if (!$isRangeSelection(selection)) return null
  let range: RangeSelection = selection
  const selected = $selectedBarcode(range)
  const target = selected ? { paragraph: selected.paragraph, start: selected.match.start, end: selected.match.end } : $selectedTemplateField(range)
  if (target) {
    const start = pointAt(target.paragraph, target.start), end = pointAt(target.paragraph, target.end)
    range = $createRangeSelection()
    range.anchor.set(start.node.getKey(), start.offset, start.type)
    range.focus.set(end.node.getKey(), end.offset, end.type)
    range.format = $isTextNode(start.node) ? start.node.getFormat() : selection.format
    range.style = $isTextNode(start.node) ? start.node.getStyle() : selection.style
  }
  // Converting a selected {{n}} keeps the style and original field number.
  $setSelection(range)
  range.insertText(barcodeExpression(expression))
  return range.clone()
}
