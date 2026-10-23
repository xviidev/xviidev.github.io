import type { LabelSettings, LabelSlot } from './labels.ts'
import type { RichDocument, RichRun, Weight } from './rich-text.ts'
import { placeBarcode } from './label-barcode.ts'
import type { PlacedBarcode } from './label-barcode.ts'
import { barcodeSettings } from './barcode-template.ts'

export const PT_PER_MM = 72 / 25.4
export type FontKey = `${'sans' | 'mono'}:${Weight}:${'normal' | 'italic'}`
export interface Metrics { width: number; ascent: number; descent: number; supported: boolean }
export interface PlacedRun extends RichRun { x: number; baseline: number; size: number; key: FontKey; width: number }
export interface LaidLabel { runs: PlacedRun[]; overflow: boolean; unsupported: boolean; height: number; barcode?: PlacedBarcode }
export interface PrintModel { pages: { index: number; x: number; y: number; label: LaidLabel }[][]; overflow: number[]; unsupported: number[]; barcodeErrors?: string[] }
export type Measure = (text: string, size: number, key: FontKey) => Metrics
export const fontKey = (run: RichRun, settings: LabelSettings): FontKey => `${settings.font}:${run.weight ?? (settings.bold ? 700 : 400)}:${run.italic ? 'italic' : 'normal'}`

function tokens(line: RichDocument[number]): RichRun[][] {
  const text = line.runs.map(run => run.text).join('')
  return [...text.matchAll(/\S+|[^\S\n]+|\n/g)].map(match => {
    let position = 0
    return line.runs.flatMap(run => {
      const a = Math.max(0, match.index! - position), b = Math.min(run.text.length, match.index! + match[0].length - position)
      position += run.text.length
      return b > a ? [{ ...run, text: run.text.slice(a, b) }] : []
    })
  })
}

export function layoutLabel(doc: RichDocument, s: LabelSettings, measure: Measure): LaidLabel {
  return layoutFlowLabel(doc, s, measure)
}

export function layoutPages(documents: RichDocument[], slots: (LabelSlot | null)[][], s: LabelSettings, columns: number, measure: Measure, barcodeValues: string[] = []): PrintModel {
  const barcodeErrors: string[] = []
  const labels = documents.map((document, index) => {
    const embedded = document.flatMap(line => line.barcode ? [line.barcode] : [])
    const content = document.filter(line => !line.barcode)
    if (!s.barcode?.enabled && !embedded.length) return layoutLabel(content, s, measure)
    try {
      if (embedded.length > 1) throw new Error('Gunakan maksimal satu barcode per label.')
      if (embedded.length) return layoutFlowLabel(document, s, measure)
      const config = s.barcode!
      const barcode = placeBarcode(embedded.length ? embedded[0].value : barcodeValues[index] ?? '', config, s, measure)
      // Text alignment stays within the space above the barcode, with a 1 mm gap.
      const label = content.length ? layoutLabel(content, { ...s, labelHeight: config.y - 1 + s.padding }, measure) : { runs: [] as PlacedRun[], height: 0, overflow: false, unsupported: false }
      if (barcode.text) label.runs.push(barcode.text)
      return { ...label, barcode }
    } catch (error) {
      barcodeErrors.push(`Barcode label ${index + 1}: ${(error as Error).message}`)
      return layoutLabel(content, s, measure)
    }
  })
  return {
    barcodeErrors,
    pages: slots.map(page => page.flatMap((slot, index) => slot ? [{ index: slot.index,
      x: (s.marginLeft + (index % columns) * (s.labelWidth + s.gapX)) * PT_PER_MM,
      y: (s.marginTop + Math.floor(index / columns) * (s.labelHeight + s.gapY)) * PT_PER_MM,
      label: labels[slot.index],
    }] : [])),
    overflow: labels.flatMap((label, index) => label.overflow ? [index] : []),
    unsupported: labels.flatMap((label, index) => label.unsupported ? [index] : []),
  }
}

export function layoutFlowLabel(document: RichDocument, s: LabelSettings, measure: Measure): LaidLabel {
  const padding = s.padding * PT_PER_MM, usableWidth = (s.labelWidth - 2 * s.padding) * PT_PER_MM
  const usableHeight = (s.labelHeight - 2 * s.padding) * PT_PER_MM
  interface Item { run?: RichRun; shape?: PlacedBarcode; width: number; ascent: number; descent: number; size: number; key: FontKey; offsetX?: number; offsetY?: number }
  const visual: { items: Item[]; align: LabelSettings['align'] }[] = []
  let overflow = false, unsupported = false
  for (const paragraph of document) {
    let items: Item[] = [], width = 0
    const commit = (force = false) => { if (items.length || force) visual.push({ items, align: paragraph.align ?? s.align }); items = []; width = 0 }
    const append = (next: Item[]) => {
      const nextWidth = next.reduce((sum, item) => sum + item.width, 0)
      if (items.length && width + nextWidth > usableWidth + 0.001) commit()
      items.push(...next); width += nextWidth
      overflow ||= nextWidth > usableWidth + 0.01
    }
    const textItem = (run: RichRun): Item => {
      const size = run.size ?? s.fontSize, key = fontKey(run, s), metric = measure(run.text, size, key)
      unsupported ||= !metric.supported
      return { run, size, key, width: metric.width, ascent: metric.ascent, descent: metric.descent }
    }
    const appendText = (runs: RichRun[]) => {
      for (const token of tokens({ runs })) {
        if (token.map(run => run.text).join('') === '\n') { commit(true); continue }
        const measured = token.map(textItem)
        if (measured.reduce((sum, item) => sum + item.width, 0) <= usableWidth + 0.001) append(measured)
        else for (const run of token) for (const char of run.text) append([textItem({ ...run, text: char })])
      }
    }
    let pending: RichRun[] = []
    const sourceRuns = paragraph.runs.some(run => run.barcode) ? paragraph.runs : paragraph.barcode ? [{ text: '', barcode: paragraph.barcode }] : paragraph.runs
    for (const run of sourceRuns) {
      if (!run.barcode) { pending.push(run); continue }
      appendText(pending); pending = []
      const config = barcodeSettings(run.barcode, s, run.barcode.value)
      const shape = placeBarcode(run.barcode.value, { ...config, color: run.barcode.color ?? run.color ?? '#111111', x: s.padding, y: s.padding }, s, measure)
      append([{ shape, width: shape.width, ascent: shape.height, descent: 0, size: 0, key: 'mono:400:normal', offsetX: (run.barcode.options.x ?? 0) * PT_PER_MM, offsetY: (run.barcode.options.y ?? 0) * PT_PER_MM }])
    }
    appendText(pending)
    commit(true)
  }
  const runs: PlacedRun[] = []
  let top = 0, barcode: PlacedBarcode | undefined
  for (const line of visual) {
    const width = line.items.reduce((sum, item) => sum + item.width, 0)
    const ascent = Math.max(0, ...line.items.map(item => item.ascent)), descent = Math.max(0, ...line.items.map(item => item.descent))
    const height = Math.max(ascent + descent, ...line.items.filter(item => item.run).map(item => item.size * (s.lineHeight ?? 1.3)), line.items.length ? 0 : s.fontSize * (s.lineHeight ?? 1.3))
    const baseline = top + ascent + (height - ascent - descent) / 2
    let left = line.align === 'center' ? (usableWidth - width) / 2 : line.align === 'right' ? usableWidth - width : 0
    for (const item of line.items) {
      if (item.run) runs.push({ ...item.run, x: left, baseline, size: item.size, key: item.key, width: item.width })
      if (item.shape) {
        if (barcode) throw new Error('Gunakan maksimal satu barcode per label.')
        const shape = item.shape, dx = left + (item.offsetX ?? 0) - shape.x, dy = baseline - shape.height + (item.offsetY ?? 0) - shape.y
        barcode = { ...shape, x: shape.x + dx, y: shape.y + dy, barY: shape.barY + dy, bars: shape.bars.map(bar => ({ ...bar, x: bar.x + dx })), text: shape.text ? { ...shape.text, x: shape.text.x + dx, baseline: shape.text.baseline + dy } : undefined }
      }
      left += item.width
    }
    top += height
  }
  const dx = padding + (s.offsetX ?? 0) * PT_PER_MM
  const dy = padding + (s.vertical === 'center' ? Math.max(0, (usableHeight - top) / 2) : s.vertical === 'bottom' ? Math.max(0, usableHeight - top) : 0) + (s.offsetY ?? 0) * PT_PER_MM
  const placedRuns = runs.map(run => ({ ...run, x: run.x + dx, baseline: run.baseline + dy }))
  if (barcode) {
    barcode = { ...barcode, x: barcode.x + dx, y: barcode.y + dy, barY: barcode.barY + dy, bars: barcode.bars.map(bar => ({ ...bar, x: bar.x + dx })), text: barcode.text ? { ...barcode.text, x: barcode.text.x + dx, baseline: barcode.text.baseline + dy } : undefined }
    if (barcode.text) placedRuns.push(barcode.text)
    overflow ||= barcode.x < padding - 0.01 || barcode.x + barcode.width > padding + usableWidth + 0.01 || barcode.y < padding - 0.01 || barcode.y + barcode.height > padding + usableHeight + 0.01
  }
  overflow ||= top > usableHeight + 0.01 || dy < padding - 0.01 || dy + top > padding + usableHeight + 0.01 || placedRuns.some(run => run.x < padding - 0.01 || run.x + run.width > padding + usableWidth + 0.01)
  return { runs: placedRuns, height: top, overflow, unsupported, barcode }
}