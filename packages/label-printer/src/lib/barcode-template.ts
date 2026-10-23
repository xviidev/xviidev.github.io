import type { LabelBarcode } from './label-barcode.ts'
import { DEFAULT_BARCODE } from './label-barcode.ts'
import type { LabelSettings } from './labels.ts'
import { barcodeWidthRange } from './label-barcode.ts'

export type BarcodeOptions = Partial<Pick<LabelBarcode, 'format' | 'height' | 'width' | 'x' | 'y' | 'showText'>>
export interface BarcodeExpression { source: number | string; options: BarcodeOptions }
export interface BarcodeMatch extends BarcodeExpression { start: number; end: number; raw: string }
const pattern = /\{\{\s*barcode\s*\(\s*(\d+|"(?:[^"\\]|\\.)*"|'[^']*')\s*(?:,\s*(\{[^{}]*\}))?\s*\)\s*\}\}/g

// Parse a small, explicit grammar. Template functions never execute JavaScript.
export function barcodeMatches(text: string): BarcodeMatch[] {
  return [...text.matchAll(pattern)].map(match => {
    const source = /^\d+$/.test(match[1]) ? Number(match[1]) : match[1].startsWith('"') ? JSON.parse(match[1]) as string : match[1].slice(1, -1)
    if (typeof source === 'number' && (!Number.isInteger(source) || source < 1 || source > 100)) throw new Error('Sumber barcode harus kolom 1–100.')
    const options: BarcodeOptions = {}
    const body = match[2]?.slice(1, -1).trim()
    const seen = new Set<string>()
    for (const part of body ? body.split(',').filter((part, index, parts) => part.trim() || index !== parts.length - 1) : []) {
      const property = /^\s*(format|height|width|x|y|showText)\s*:\s*(.*?)\s*$/.exec(part)
      if (!property || seen.has(property[1])) throw new Error('Opsi barcode tidak dikenal atau ditulis dua kali.')
      const [, key, raw] = property; seen.add(key)
      if (key === 'format') {
        const literal = /^(?:"([^"]*)"|'([^']*)'|([A-Za-z0-9-]+))$/.exec(raw)
        if (!literal) throw new Error('Format barcode harus 128 atau EAN13.')
        const value = (literal[1] ?? literal[2] ?? literal[3]).toUpperCase()
        if (!['128', 'CODE128', 'EAN13', 'EAN-13'].includes(value)) throw new Error('Format barcode harus 128 atau EAN13.')
        options.format = value === '128' || value === 'CODE128' ? 'CODE128' : 'EAN13'
      } else if (key === 'showText') {
        if (!['true', 'false'].includes(raw)) throw new Error('showText harus true atau false.')
        options.showText = raw === 'true'
      } else {
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) throw new Error('Ukuran dan posisi barcode harus berupa angka milimeter.')
        const value = Number(raw)
        if (!Number.isFinite(value) || value > 1000 || (key === 'height' && value < 8) || (key === 'width' && value <= 0)) throw new Error('Ukuran barcode tidak valid; tinggi minimal 8 mm.')
        options[key as 'width' | 'height' | 'x' | 'y'] = value
      }
    }
    return { source, options, raw: match[0], start: match.index!, end: match.index! + match[0].length }
  })
}

export function barcodeExpression(expression: BarcodeExpression): string {
  const source = typeof expression.source === 'number' ? expression.source : JSON.stringify(expression.source)
  const entries = Object.entries(expression.options).map(([key, value]) => `${key}: ${key === 'format' ? value === 'CODE128' ? '128' : '"EAN13"' : String(value)}`)
  const result = `{{barcode(${source}${entries.length ? `, {${entries.join(', ')}}` : ''})}}`
  const matches = barcodeMatches(result)
  if (matches.length !== 1 || matches[0].raw !== result) throw new Error('Fungsi barcode tidak valid.')
  return result
}

export function barcodeSettings(expression: BarcodeExpression, s: LabelSettings, value?: string): LabelBarcode {
  const range = barcodeWidthRange(value === undefined ? [] : [value], expression.options.format ?? 'CODE128', s.labelWidth - 2 * s.padding)
  const mm = (number: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(number)
  if (value !== undefined && range.minimum > range.maximum) throw new Error(`Kode ini memerlukan lebar minimal ${mm(range.minimum)} mm; area label hanya ${mm(range.maximum)} mm. Perbesar label atau pendekkan kode.`)
  if (value !== undefined && expression.options.width !== undefined && (expression.options.width < range.minimum || expression.options.width > range.maximum)) throw new Error(`Lebar barcode harus ${mm(range.minimum)}–${mm(range.maximum)} mm. Hapus opsi width untuk menggunakan lebar otomatis.`)
  return { ...DEFAULT_BARCODE, enabled: true, x: s.padding, y: s.padding, width: value === undefined ? Math.min(50, range.maximum) : range.recommended, ...expression.options }
}
