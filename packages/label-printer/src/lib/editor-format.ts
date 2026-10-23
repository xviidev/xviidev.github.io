import { $getSelection, $setSelection, $getRoot, $getNodeByKey, $isRangeSelection, $isElementNode } from 'lexical'
import type { RangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'

// Call inside editor.update. A collapsed cursor formats the active line;
// an empty line also keeps the size for newly typed text.
export function $applyFontSize(size: number, saved: RangeSelection | null) {
  if (!Number.isFinite(size) || size < 4 || size > 100) return null
  let selection = saved && $getNodeByKey(saved.anchor.key) && $getNodeByKey(saved.focus.key) ? saved.clone() : $getSelection()
  if (!$isRangeSelection(selection)) selection = $getRoot().selectStart()
  if (!$isRangeSelection(selection)) return null
  let range: RangeSelection = selection
  $setSelection(range)
  const style = { 'font-size': `${size}pt` }
  if (range.isCollapsed()) {
    const caret = range.clone()
    const node = range.anchor.getNode()
    const paragraph = $isElementNode(node) && node.getParent() === $getRoot() ? node : node.getTopLevelElement()
    if (paragraph && paragraph.getTextContentSize()) {
      const line = paragraph.select(0, paragraph.getChildrenSize())
      $patchStyleText(line, style)
      $setSelection(caret)
      range = caret
    }
  }
  $patchStyleText(range, style)
  return range.clone()
}

export function $applyTextColor(color: string, saved: RangeSelection | null) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return null
  let selection = saved && $getNodeByKey(saved.anchor.key) && $getNodeByKey(saved.focus.key) ? saved.clone() : $getSelection()
  if (!$isRangeSelection(selection)) selection = $getRoot().selectStart()
  if (!$isRangeSelection(selection)) return null
  $setSelection(selection)
  $patchStyleText(selection, { color: color.toLowerCase() })
  return selection.clone()
}
