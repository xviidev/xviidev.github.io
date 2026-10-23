import { encode } from '@xviidev/barcode/engine'
import { formatCell, expandLabels } from './labels.ts'
import type { LabelBarcode } from './label-barcode.ts'
import type { RichDocument } from './rich-text.ts'

export interface LabelSource { document: RichDocument; values: unknown[]; source: string }
export function prepareLabelData(sources: LabelSource[], copies: number, barcode?: LabelBarcode) {
  const enabled = barcode?.enabled
  const kept = sources.filter(item => item.document.length || (enabled && item.values.some(value => formatCell(value))))
  const errors: string[] = []
  const documents = kept.map(item => item.document.map(line => {
    if (!line.barcode) return line
    try {
      const code = encode(line.barcode.value, line.barcode.options.format ?? 'CODE128')
      const barcode = { ...line.barcode, value: code.value }
      return { ...line, barcode, runs: line.runs.map(run => run.barcode ? { ...run, barcode } : run) }
    } catch (error) { errors.push(`${item.source}: ${(error as Error).message}`); return line }
  }))
  const values = kept.map(item => {
    if (!enabled) return ''
    const raw = barcode.source === 'fixed' ? barcode.value : item.values[barcode.column]
    try { return encode(typeof raw === 'string' ? raw : formatCell(raw), barcode.format).value }
    catch (error) { errors.push(`${item.source}: ${(error as Error).message}`); return '' }
  })
  const indices = expandLabels(kept.map((_, index) => String(index)), copies).map(Number)
  return { labels: indices.map(index => documents[index]), barcodeValues: indices.map(index => values[index]), errors, count: kept.length }
}
