import type { LabelSettings, LabelSlot } from './labels.ts'
import type { RichDocument, RichRun, Weight } from './rich-text.ts'
import { placeBarcode } from './label-barcode.ts'
import type { PlacedBarcode } from './label-barcode.ts'

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
  const padding = s.padding * PT_PER_MM
  const maxWidth = (s.labelWidth - 2 * s.padding) * PT_PER_MM
  const maxHeight = (s.labelHeight - 2 * s.padding) * PT_PER_MM
  const visual: { runs: RichRun[]; align: LabelSettings['align'] }[] = []
  for (const paragraph of doc) {
    let current: RichRun[] = []
    let width = 0
    const commit = () => {
      while (current.length && !current[current.length - 1].text.trim()) current.pop()
      if (current.length) visual.push({ runs: current, align: paragraph.align ?? s.align })
      current = []; width = 0
    }
    for (const token of tokens(paragraph)) {
      const text = token.map(run => run.text).join('')
      if (text === '\n') { commit(); continue }
      if (!text.trim() && current.length === 0) continue
      const tokenWidth = token.reduce((sum, run) => sum + measure(run.text, run.size ?? s.fontSize, fontKey(run, s)).width, 0)
      if (width + tokenWidth > maxWidth + 0.001 && current.length) commit()
      if (!text.trim() && current.length === 0) continue
      if (tokenWidth <= maxWidth + 0.001) { current.push(...token); width += tokenWidth; continue }
      // Unbroken words wrap by Unicode code point rather than being clipped.
      for (const run of token) for (const char of run.text) {
        const charWidth = measure(char, run.size ?? s.fontSize, fontKey(run, s)).width
        if (width + charWidth > maxWidth + 0.001 && current.length) commit()
        current.push({ ...run, text: char }); width += charWidth
      }
    }
    commit()
  }
  let top = 0
  const positioned: PlacedRun[] = []
  let unsupported = false, tooWide = false
  for (const line of visual) {
    const measured = line.runs.map(run => ({ run, size: run.size ?? s.fontSize, key: fontKey(run, s), metric: measure(run.text, run.size ?? s.fontSize, fontKey(run, s)) }))
    const width = measured.reduce((sum, item) => sum + item.metric.width, 0)
    const ascent = Math.max(...measured.map(item => item.metric.ascent))
    const descent = Math.max(...measured.map(item => item.metric.descent))
    const height = Math.max(ascent + descent, ...measured.map(item => item.size * (s.lineHeight ?? 1.3)))
    let x = padding + (line.align === 'center' ? (maxWidth - width) / 2 : line.align === 'right' ? maxWidth - width : 0)
    if (width > maxWidth + 0.01) tooWide = true
    for (const { run, size, key, metric } of measured) {
      positioned.push({ ...run, x, baseline: top + ascent + (height - ascent - descent) / 2, size, key, width: metric.width })
      unsupported ||= !metric.supported
      x += metric.width
    }
    top += height
  }
  const yOffset = padding + (s.vertical === 'center' ? Math.max(0, (maxHeight - top) / 2) : s.vertical === 'bottom' ? Math.max(0, maxHeight - top) : 0)
  const offsetX = (s.offsetX ?? 0) * PT_PER_MM, offsetY = (s.offsetY ?? 0) * PT_PER_MM
  const runs = positioned.map(run => ({ ...run, x: run.x + offsetX, baseline: run.baseline + yOffset + offsetY }))
  const outside = runs.some(run => run.x < padding - 0.01 || run.x + run.width > padding + maxWidth + 0.01) || yOffset + offsetY < padding - 0.01 || yOffset + offsetY + top > padding + maxHeight + 0.01
  return { runs, height: top, unsupported, overflow: tooWide || top > maxHeight + 0.01 || outside }
}

export function layoutPages(documents: RichDocument[], slots: (LabelSlot | null)[][], s: LabelSettings, columns: number, measure: Measure, barcodeValues: string[] = []): PrintModel {
  const barcodeErrors: string[] = []
  const labels = documents.map((document, index) => {
    if (!s.barcode?.enabled) return layoutLabel(document, s, measure)
    try {
      const barcode = placeBarcode(barcodeValues[index] ?? '', s.barcode, s, measure)
      // Text alignment stays within the space above the barcode, with a 1 mm gap.
      const label = layoutLabel(document, { ...s, labelHeight: s.barcode.y - 1 + s.padding }, measure)
      if (barcode.text) label.runs.push(barcode.text)
      return { ...label, barcode }
    } catch (error) {
      barcodeErrors.push(`Barcode label ${index + 1}: ${(error as Error).message}`)
      return layoutLabel(document, s, measure)
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
