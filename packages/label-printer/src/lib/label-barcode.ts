import { encode } from '@xviidev/barcode/engine'
import type { Format } from '@xviidev/barcode/engine'
import type { LabelSettings } from './labels.ts'
import type { Measure, PlacedRun } from './print-layout.ts'

const PT = 72 / 25.4
export interface LabelBarcode {
  enabled: boolean
  format: Format
  source: 'fixed' | 'column'
  value: string
  column: number
  x: number
  y: number
  width: number
  height: number
  showText: boolean
}
export const DEFAULT_BARCODE: LabelBarcode = { enabled: false, format: 'CODE128', source: 'fixed', value: '', column: 0, x: 6.5, y: 18, width: 50, height: 12, showText: true }
export interface PlacedBarcode {
  value: string; x: number; y: number; width: number; height: number
  bars: { x: number; width: number }[]; barY: number; barHeight: number
  text?: PlacedRun
}

export function isLabelBarcode(value: unknown): value is LabelBarcode {
  if (!value || typeof value !== 'object') return false
  const b = value as LabelBarcode
  return typeof b.enabled === 'boolean' && ['CODE128', 'EAN13'].includes(b.format) && ['fixed', 'column'].includes(b.source) && typeof b.value === 'string' && b.value.length <= 80 && Number.isInteger(b.column) && b.column >= 0 && b.column < 100 && typeof b.showText === 'boolean' && [b.x, b.y, b.width, b.height].every(n => typeof n === 'number' && Number.isFinite(n)) && b.x >= 0 && b.y >= 0 && b.width > 0 && b.height >= 8 && b.width <= 1000 && b.height <= 1000
}

export function placeBarcode(value: string, b: LabelBarcode, s: LabelSettings, measure: Measure): PlacedBarcode {
  if (!isLabelBarcode(b)) throw new Error('Pengaturan barcode tidak valid. Tinggi minimal 8 mm.')
  if (b.x < s.padding || b.y < s.padding || b.x + b.width > s.labelWidth - s.padding + 0.001 || b.y + b.height > s.labelHeight - s.padding + 0.001) throw new Error('Barcode tidak muat di dalam label. Sesuaikan posisi atau ukurannya.')
  const code = encode(value, b.format)
  const module = b.width * PT / (code.bits.length + 24)
  if (module < 0.19 * PT) throw new Error('Barcode terlalu rapat. Perbesar lebarnya atau pendekkan kode (lebar modul minimal 0,19 mm).')
  const x = b.x * PT, y = b.y * PT, width = b.width * PT, height = b.height * PT
  const quiet = 12 * module, barY = y + PT, barHeight = height - 2 * PT - (b.showText ? 3.5 * PT : 0)
  const bars: PlacedBarcode['bars'] = []
  for (let i = 0; i < code.bits.length;) {
    if (code.bits[i] !== '1') { i++; continue }
    const start = i
    while (code.bits[i] === '1') i++
    bars.push({ x: x + quiet + start * module, width: (i - start) * module })
  }
  let text: PlacedRun | undefined
  if (b.showText) {
    const metric = measure(code.value, 8, 'mono:400:normal')
    const size = Math.min(8, 8 * (width - 2 * PT) / Math.max(metric.width, 1))
    const measured = measure(code.value, size, 'mono:400:normal')
    text = { text: code.value, x: x + (width - measured.width) / 2, baseline: y + height - PT - measured.descent, size, key: 'mono:400:normal', width: measured.width }
  }
  return { value: code.value, x, y, width, height, bars, barY, barHeight, text }
}
