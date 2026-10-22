import { ToggleGroup, ToggleGroupItem } from '@xviidev/ui/components/toggle-group'
import { Button } from '@xviidev/ui/components/button'
import { SelectInput } from '@xviidev/ui/components/select-input'
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
import { $setSelection, $createParagraphNode, $createTextNode, $getRoot, $getSelection, $isElementNode, $isLineBreakNode, $isRangeSelection, $isTextNode, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_HIGH, COMMAND_PRIORITY_LOW, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, REDO_COMMAND, SELECTION_CHANGE_COMMAND, UNDO_COMMAND } from 'lexical'
import type { LexicalNode, RangeSelection } from 'lexical'
import type { RichDocument, RichLine, RichRun, Weight } from '../lib/rich-text'

export interface RichTextHandle { insertText: (text: string) => void }
interface Props { label: string; initialDocument: RichDocument; onChange: (document: RichDocument) => void; fontFamily?: string; fontSize?: number; lineHeight?: number }

function readRuns(node: LexicalNode): RichRun[] {
  if ($isLineBreakNode(node)) return [{ text: '\n' }]
  if ($isTextNode(node)) {
    const styles = Object.fromEntries(node.getStyle().split(';').map(item => item.split(':').map(part => part.trim())).filter(parts => parts.length === 2))
    const size = parseFloat(styles['font-size'])
    const weight = Number(styles['font-weight'])
    return [{ text: node.getTextContent(), weight: node.hasFormat('bold') ? 700 : [300, 400, 500, 600, 700].includes(weight) ? weight as Weight : 400,
      italic: node.hasFormat('italic'), underline: node.hasFormat('underline'), ...(size >= 4 && size <= 100 ? { size } : {}) }]
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

const Controls = forwardRef<RichTextHandle>(function Controls(_, ref) {
  const [editor] = useLexicalComposerContext()
  const savedSelection = useRef<RangeSelection | null>(null)
  const [bold, setBold] = useState(false), [italic, setItalic] = useState(false), [underline, setUnderline] = useState(false)
  const [align, setAlign] = useState('left')
  const [weight, setWeight] = useState('400'), [size, setSize] = useState('')
  const [canUndo, setCanUndo] = useState(false), [canRedo, setCanRedo] = useState(false)
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
      const node = selection.anchor.getNode(); const paragraph = $isElementNode(node) ? node : node.getParent()
      setAlign(paragraph?.getFormatType() || 'left')
      setBold(selection.hasFormat('bold')); setItalic(selection.hasFormat('italic')); setUnderline(selection.hasFormat('underline'))
      setWeight(selection.hasFormat('bold') ? '700' : $getSelectionStyleValueForProperty(selection, 'font-weight', '400'))
      setSize($getSelectionStyleValueForProperty(selection, 'font-size', '').replace('pt', ''))
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
      editor.registerCommand(CAN_UNDO_COMMAND, value => { setCanUndo(value); return false }, COMMAND_PRIORITY_LOW),
      editor.registerCommand(CAN_REDO_COMMAND, value => { setCanRedo(value); return false }, COMMAND_PRIORITY_LOW),
    )
  }, [editor])
  function style(property: string, value: string | null) {
    editor.update(() => {
      let selection = $getSelection()
      if (!$isRangeSelection(selection) && savedSelection.current) { selection = savedSelection.current.clone();$setSelection(selection) }
      if ($isRangeSelection(selection)) {
        if (property === 'font-weight' && selection.hasFormat('bold')) selection.formatText('bold')
        if (property === 'font-weight' && value === '700') { selection.formatText('bold'); $patchStyleText(selection, { 'font-weight': null }) }
        else $patchStyleText(selection, { [property]: value })
      }
    })
    requestAnimationFrame(()=>editor.focus())
  }
  return <div className="rich-toolbar" role="toolbar" aria-label="Format teks">
    <ToggleGroup multiple size="sm" value={[...(bold || weight === '700' ? ['bold'] : []), ...(italic ? ['italic'] : []), ...(underline ? ['underline'] : [])]} onValueChange={values => {
      for (const format of ['bold', 'italic', 'underline'] as const) {
        const active = format === 'bold' ? bold || weight === '700' : format === 'italic' ? italic : underline
        if (values.includes(format) !== active) editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
      }
    }}>
      <ToggleGroupItem value="bold" aria-label="Tebal" title="Tebal (Ctrl+B)" onMouseDown={event => event.preventDefault()}><strong>B</strong></ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Miring" title="Miring (Ctrl+I)" onMouseDown={event => event.preventDefault()}><em>I</em></ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Garis bawah" title="Garis bawah (Ctrl+U)" onMouseDown={event => event.preventDefault()}><u>U</u></ToggleGroupItem>
    </ToggleGroup>
    <SelectInput size="sm" label="Ketebalan teks terpilih" value={weight} onValueChange={value=>style('font-weight',value)} options={[{value:'300',label:'Tipis'},{value:'400',label:'Normal'},{value:'500',label:'Sedang'},{value:'600',label:'Semitebal'},{value:'700',label:'Tebal'}]} />
    <SelectInput size="sm" label="Ukuran teks terpilih" value={size || 'base'} onValueChange={value=>style('font-size',value==='base'?null:`${value}pt`)} options={[{value:'base',label:'Ukuran dasar'},...[6,7,8,9,10,11,12,14,16,18,20,24,32,48,72].map(size=>({value:String(size),label:`${size} pt`}))]} />
    <ToggleGroup size="sm" value={[align]} onValueChange={values => { const value = values[0]; if (value === 'left' || value === 'center' || value === 'right') editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value) }}>
      {(['left', 'center', 'right'] as const).map((value, index) => <ToggleGroupItem key={value} value={value} aria-label={`Rata ${['kiri', 'tengah', 'kanan'][index]}`} onMouseDown={event => event.preventDefault()}>{['⇤', '↔', '⇥'][index]}</ToggleGroupItem>)}
    </ToggleGroup>
    <Button variant="ghost" size="icon-sm" type="button" aria-label="Urungkan" title="Urungkan (Ctrl+Z)" disabled={!canUndo} onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}>↶</Button>
    <Button variant="ghost" size="icon-sm" type="button" aria-label="Ulangi" title="Ulangi (Ctrl+Y)" disabled={!canRedo} onMouseDown={event => event.preventDefault()} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}>↷</Button>
  </div>
})

export const RichTextEditor = forwardRef<RichTextHandle, Props>(function RichTextEditor({ label, initialDocument, onChange, fontFamily = 'Noto Sans', fontSize = 10, lineHeight = 1.3 }, ref) {
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
          const text = $createTextNode(run.text).setStyle(`${run.weight === 700 ? '' : `font-weight: ${run.weight ?? 400};`}${run.size ? `font-size: ${run.size}pt;` : ''}`)
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
      <Controls ref={ref} />
      <RichTextPlugin contentEditable={<ContentEditable className="rich-content" style={{ fontFamily, fontSize: `${fontSize}pt`, lineHeight }} aria-label={label} spellCheck={false} />} ErrorBoundary={LexicalErrorBoundary} />
      <HistoryPlugin />
      <OnChangePlugin ignoreSelectionChange onChange={editorState => editorState.read(() => onChange(readDocument()))} />
    </div>
  </LexicalComposer>
})
