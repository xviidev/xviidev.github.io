import { $applyFontSize, $applyTextColor } from '../lib/editor-format'
import { $selectedBarcode, $insertBarcode, $selectedTemplateColumn } from '../lib/editor-barcode'
import type { BarcodeExpression } from '../lib/barcode-template'
import { BarcodeToolbar } from './BarcodeToolbar'
import { ColorPicker } from '@xviidev/ui/components/color-picker'
import { Separator } from '@xviidev/ui/components/separator'
import { normalizeHexColor } from '@xviidev/ui/lib/color'
import { ToggleGroup, ToggleGroupItem } from '@xviidev/ui/components/toggle-group'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from '@xviidev/ui/components/input-group'
import { BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '@xviidev/ui/lib/icons'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection'
import { mergeRegister } from '@lexical/utils'
import { $createParagraphNode, $createTextNode, $getRoot, $getSelection, $isElementNode, $isLineBreakNode, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND, SKIP_DOM_SELECTION_TAG } from 'lexical'
import type { LexicalNode, RangeSelection } from 'lexical'
import type { RichDocument, RichLine, RichRun, Weight } from '../lib/rich-text'
import type { LabelSettings } from '../lib/labels'
import { DEFAULT_SETTINGS } from '../lib/labels'

export interface RichTextHandle { insertText: (text: string) => void }
interface Props { label: string; initialDocument: RichDocument; onChange: (document: RichDocument) => void; fontFamily?: string; fontSize?: number; lineHeight?: number; rows?: unknown[][]; settings?: LabelSettings }

function readRuns(node: LexicalNode): RichRun[] {
  if ($isLineBreakNode(node)) return [{ text: '\n' }]
  if ($isTextNode(node)) {
    const styles = Object.fromEntries(node.getStyle().split(';').map(item => item.split(':').map(part => part.trim())).filter(parts => parts.length === 2))
    const size = parseFloat(styles['font-size'])
    const weight = Number(styles['font-weight'])
    return [{ text: node.getTextContent(), weight: node.hasFormat('bold') ? 700 : [300, 400, 500, 600, 700].includes(weight) ? weight as Weight : 400,
      italic: node.hasFormat('italic'), underline: node.hasFormat('underline'), ...(normalizeHexColor(styles.color ?? '') ? { color: normalizeHexColor(styles.color) } : {}), ...(size >= 4 && size <= 100 ? { size } : {}) }]
  }
  return $isElementNode(node) ? node.getChildren().flatMap(readRuns) : [{ text: node.getTextContent() }]
}

function readDocument(): RichDocument {
  return $getRoot().getChildren().flatMap(node => {
    const format = $isElementNode(node) ? node.getFormatType() : ''
    const align = ['left', 'center', 'right'].includes(format) ? format as RichLine['align'] : undefined
    const runs = readRuns(node)
    const lines: RichLine[] = [{ runs: [], align }]
    for (const run of runs) {
      const parts = run.text.split('\n')
      parts.forEach((text, index) => {
        if (index) lines.push({ runs: [], align })
        if (text) lines[lines.length - 1].runs.push({ ...run, text })
      })
    }
    return lines
  })
}

const Controls = forwardRef<RichTextHandle, { fontSize: number; rows: unknown[][]; settings: LabelSettings }>(function Controls({ fontSize, rows, settings }, ref) {
  const [editor] = useLexicalComposerContext()
  const savedSelection = useRef<RangeSelection | null>(null)
  const [bold, setBold] = useState(false), [italic, setItalic] = useState(false)
  const [align, setAlign] = useState('left')
  const [size, setSize] = useState(String(fontSize))
  const [color, setColor] = useState('#111111')
  const colorSelection = useRef<RangeSelection | null>(null)
  const [activeBarcode, setActiveBarcode] = useState<BarcodeExpression | null>(null)
  const [barcodeSource, setBarcodeSource] = useState(1)
  const editingSize = useRef(false)
  const sizeSelection = useRef<RangeSelection | null>(null)
  const sizeDraft = useRef(String(fontSize))
  const lastValidSize = useRef(String(fontSize))
  useImperativeHandle(ref, () => ({ insertText(text) {
    editor.update(() => {
      let selection = $getSelection()
      if (!$isRangeSelection(selection)) selection = $getRoot().selectEnd()
      if ($isRangeSelection(selection)) selection.insertText(text)
    })
    editor.focus()
  } }), [editor])
  useEffect(() => {
    const update = () => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      savedSelection.current = selection.clone()
      setColor(normalizeHexColor($getSelectionStyleValueForProperty(selection, 'color', '#111111')) ?? '#111111')
      const barcode = $selectedBarcode(selection)?.match
      setActiveBarcode(barcode ? { source: barcode.source, options: barcode.options } : null)
      setBarcodeSource($selectedTemplateColumn(selection) ?? 1)
      const node = selection.anchor.getNode(); const paragraph = $isElementNode(node) ? node : node.getParent()
      setAlign(paragraph?.getFormatType() || 'left')
      setBold(selection.hasFormat('bold') || $getSelectionStyleValueForProperty(selection, 'font-weight', '400') === '700'); setItalic(selection.hasFormat('italic'))
      if (!editingSize.current) { const value = $getSelectionStyleValueForProperty(selection, 'font-size', `${fontSize}pt`).replace('pt', ''); setSize(value); sizeDraft.current = value; if (value) lastValidSize.current = value }
    }
    return mergeRegister(
      editor.registerCommand(FORMAT_TEXT_COMMAND, format => {
        if (format !== 'bold') return false
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return false
        const wasBold = selection.hasFormat('bold') || $getSelectionStyleValueForProperty(selection, 'font-weight', '400') === '700'
        $patchStyleText(selection, { 'font-weight': null })
        if (selection.hasFormat('bold') !== !wasBold) selection.formatText('bold')
        return true
      }, COMMAND_PRIORITY_HIGH),
      editor.registerUpdateListener(({ editorState }) => editorState.read(update)),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { update(); return false }, COMMAND_PRIORITY_LOW),
    )
  }, [editor, fontSize])
  useEffect(() => { if (!editingSize.current) { setSize(String(fontSize)); sizeDraft.current = String(fontSize) } }, [fontSize])
  function applySize(value: string, focus = false) {
    const number = Number(value)
    if (!value || !Number.isFinite(number) || number < 4 || number > 100) return false
    editor.update(() => {
      sizeSelection.current = $applyFontSize(number, sizeSelection.current ?? savedSelection.current)
      savedSelection.current = sizeSelection.current?.clone() ?? null
    }, { discrete: true, tag: SKIP_DOM_SELECTION_TAG })
    lastValidSize.current = value
    if (focus) editor.focus()
    return true
  }
  function commitSize(focus = false) {
    if (!editingSize.current) return
    if (!applySize(sizeDraft.current, focus)) {
      sizeDraft.current = lastValidSize.current; setSize(lastValidSize.current)
    }
    editingSize.current = false
  }
  return <div className="rich-toolbar" role="toolbar" aria-label="Format teks">
    <ToggleGroup multiple size="icon-sm" spacing={0.5} aria-label="Gaya huruf" value={[...(bold ? ['bold'] : []), ...(italic ? ['italic'] : [])]} onValueChange={values => {
      for (const format of ['bold', 'italic'] as const) {
        if (values.includes(format) !== (format === 'bold' ? bold : italic)) editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
      }
    }}>
      <ToggleGroupItem value="bold" aria-label="Tebal" title="Tebal (Ctrl+B)" onMouseDown={event => event.preventDefault()}><BoldIcon /></ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Miring" title="Miring (Ctrl+I)" onMouseDown={event => event.preventDefault()}><ItalicIcon /></ToggleGroupItem>
    </ToggleGroup>
    <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
    <div onPointerDownCapture={() => { colorSelection.current = savedSelection.current?.clone() ?? null }} onFocusCapture={() => { colorSelection.current = savedSelection.current?.clone() ?? null }}>
      <ColorPicker compact label="Warna teks" value={color} onValueChange={next => {
        editor.update(() => {
          colorSelection.current = $applyTextColor(next, colorSelection.current ?? savedSelection.current)
          savedSelection.current = colorSelection.current?.clone() ?? null
        }, { discrete: true, tag: SKIP_DOM_SELECTION_TAG })
        setColor(next)
      }} />
    </div>
    <InputGroup className="h-8 w-20">
      <InputGroupInput className="h-8 text-center" type="number" aria-label="Ukuran huruf" title="Ukuran huruf, 4–100 pt" min={4} max={100} step={0.5} value={size} onFocus={() => {
        editingSize.current = true
        sizeSelection.current = savedSelection.current?.clone() ?? null
      }} onChange={event => {
        const value = event.target.value
        sizeDraft.current = value; setSize(value); applySize(value)
      }} onBlur={() => commitSize()} onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); commitSize(true) }
      }} />
      <InputGroupAddon align="inline-end" className="py-0"><InputGroupText>pt</InputGroupText></InputGroupAddon>
    </InputGroup>
    <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
    <ToggleGroup size="icon-sm" spacing={0.5} aria-label="Perataan paragraf" value={[align]} onValueChange={values => { const value = values[0]; if (value === 'left' || value === 'center' || value === 'right') editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value) }}>
      {([{ value: 'left', label: 'kiri', icon: AlignLeftIcon }, { value: 'center', label: 'tengah', icon: AlignCenterIcon }, { value: 'right', label: 'kanan', icon: AlignRightIcon }] as const).map(({ value, label, icon: Icon }) => <ToggleGroupItem key={value} value={value} aria-label={`Rata ${label}`} title={`Rata ${label}`} onMouseDown={event => event.preventDefault()}><Icon /></ToggleGroupItem>)}
    </ToggleGroup>
    <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
    <BarcodeToolbar active={activeBarcode} defaultSource={barcodeSource} rows={rows} settings={settings} onApply={expression => {
      editor.update(() => { savedSelection.current = $insertBarcode(expression, savedSelection.current) }, { discrete: true, tag: SKIP_DOM_SELECTION_TAG })
      editor.focus()
    }} />
  </div>
})

export const RichTextEditor = forwardRef<RichTextHandle, Props>(function RichTextEditor({ label, initialDocument, onChange, fontFamily = 'Noto Sans', fontSize = 10, lineHeight = 1.3, rows = [], settings = DEFAULT_SETTINGS }, ref) {
  const initialConfig = useMemo(() => ({
    namespace: label,
    theme: { text: { bold: 'font-bold', italic: 'italic', underline: 'underline' }, paragraph: 'rich-paragraph' },
    onError: (error: Error) => { throw error },
    editorState: () => {
      const root = $getRoot()
      for (const line of initialDocument.length ? initialDocument : [{ runs: [] }]) {
        const paragraph = $createParagraphNode()
        if (line.align) paragraph.setFormat(line.align)
        for (const run of line.runs) {
          const text = $createTextNode(run.text).setStyle(`${run.weight === 700 ? '' : `font-weight: ${run.weight ?? 400};`}${run.size ? `font-size: ${run.size}pt;` : ''}${run.color ? `color: ${run.color};` : ''}`)
          if (run.weight === 700) text.toggleFormat('bold')
          if (run.italic) text.toggleFormat('italic')
          if (run.underline) text.toggleFormat('underline')
          paragraph.append(text)
        }
        root.append(paragraph)
      }
    },
  }), [])
  return <LexicalComposer initialConfig={initialConfig}>
    <div className="rich-editor">
      <Controls ref={ref} fontSize={fontSize} rows={rows} settings={settings} />
      <RichTextPlugin contentEditable={<ContentEditable className="rich-content" style={{ fontFamily, fontSize: `${fontSize}pt`, lineHeight }} aria-label={label} spellCheck={false} />} ErrorBoundary={LexicalErrorBoundary} />
      <HistoryPlugin />
      <OnChangePlugin ignoreSelectionChange onChange={editorState => editorState.read(() => onChange(readDocument()))} />
    </div>
  </LexicalComposer>
})
