import type { LabelBarcode } from './label-barcode.ts'
export const MAX_LABELS = 1000

export interface LabelSettings {
  paperWidth: number
  paperHeight: number
  labelWidth: number
  labelHeight: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  gapX: number
  gapY: number
  padding: number
  fontSize: number
  font: 'sans' | 'mono'
  align: 'left' | 'center' | 'right'
  vertical: 'top' | 'center' | 'bottom'
  bold: boolean
  border: boolean
  offsetX?: number
  offsetY?: number
  lineHeight?: number
  barcode?: LabelBarcode
}

export const DEFAULT_SETTINGS: LabelSettings = {
  paperWidth: 210, paperHeight: 297,
  labelWidth: 63.5, labelHeight: 33.9,
  marginTop: 12.9, marginRight: 7.25, marginBottom: 12.9, marginLeft: 7.25,
  gapX: 2.5, gapY: 0, padding: 2,
  fontSize: 10, font: 'sans', align: 'left', vertical: 'center', bold: false, border: false, offsetX: 0, offsetY: 0, lineHeight: 1.3,
}

export function getLayout(s: LabelSettings) {
  const errors: string[] = []
  const positive: (keyof LabelSettings)[] = ['paperWidth', 'paperHeight', 'labelWidth', 'labelHeight', 'fontSize']
  const nonnegative: (keyof LabelSettings)[] = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gapX', 'gapY', 'padding']
  if (positive.some(key => typeof s[key] !== 'number' || !Number.isFinite(s[key]) || Number(s[key]) <= 0)) {
    errors.push('Ukuran kertas, label, dan huruf harus lebih besar dari nol.')
  }
  if (nonnegative.some(key => typeof s[key] !== 'number' || !Number.isFinite(s[key]) || Number(s[key]) < 0)) {
    errors.push('Margin, jarak, dan ruang dalam tidak boleh negatif.')
  }
  if (s.paperWidth > 1000 || s.paperHeight > 1000 || s.fontSize > 100) errors.push('Ukuran kertas maksimal 1.000 mm dan huruf maksimal 100 pt.')
  if (s.padding * 2 >= s.labelWidth || s.padding * 2 >= s.labelHeight) errors.push('Ruang dalam terlalu besar untuk ukuran label.')
  if (!Number.isFinite(s.offsetX ?? 0) || !Number.isFinite(s.offsetY ?? 0) || !Number.isFinite(s.lineHeight ?? 1.3) || (s.lineHeight ?? 1.3) < 1 || (s.lineHeight ?? 1.3) > 3) errors.push('Posisi teks harus valid dan jarak baris antara 1 dan 3.')
  const width = s.paperWidth - s.marginLeft - s.marginRight
  const height = s.paperHeight - s.marginTop - s.marginBottom
  if (width <= 0 || height <= 0) errors.push('Margin melebihi ukuran kertas.')
  if (errors.length) return { columns: 0, rows: 0, capacity: 0, errors }
  // Tolerance avoids losing a row because of millimetre floating-point rounding.
  const columns = Math.floor((width + s.gapX + 1e-7) / (s.labelWidth + s.gapX))
  const rows = Math.floor((height + s.gapY + 1e-7) / (s.labelHeight + s.gapY))
  if (columns < 1 || rows < 1) errors.push('Label tidak muat di area cetak. Periksa ukuran dan margin.')
  if (columns * rows > 500) errors.push('Maksimal 500 posisi label per lembar. Perbesar ukuran label.')
  return { columns, rows, capacity: errors.length ? 0 : columns * rows, errors }
}

export function parseManual(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').trim().split(/\n[\t ]*\n+/).map(value => value.trim()).filter(Boolean)
}

export function expandLabels(labels: string[], copies: number): string[] {
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) throw new Error('Jumlah salinan harus bilangan bulat antara 1 dan 100.')
  if (labels.length * copies > MAX_LABELS) throw new Error(`Maksimal ${MAX_LABELS.toLocaleString('id-ID')} label per proses. Kurangi data atau salinan.`)
  return labels.flatMap(text => Array.from({ length: copies }, () => text))
}

export interface LabelSlot { text: string; index: number }
export function paginateLabels(labels: string[], capacity: number, start: number): (LabelSlot | null)[][] {
  if (!labels.length || !Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(start) || start < 1 || start > capacity) return []
  const slots: (LabelSlot | null)[] = [
    ...Array.from({ length: start - 1 }, () => null),
    ...labels.map((text, index) => ({ text, index })),
  ]
  const pages: (LabelSlot | null)[][] = []
  for (let i = 0; i < slots.length; i += capacity) {
    const page = slots.slice(i, i + capacity)
    while (page.length < capacity) page.push(null)
    pages.push(page)
  }
  return pages
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC' }).format(value)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value).trim()
}

export function rowsToLabels(rows: unknown[][], columns: number[], header: boolean): string[] {
  return rows.slice(header ? 1 : 0)
    .map(row => columns.map(index => formatCell(row[index])).filter(Boolean).join('\n'))
    .filter(Boolean)
}
