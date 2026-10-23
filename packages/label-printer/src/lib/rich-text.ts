import { formatCell } from './labels.ts'
import { barcodeMatches } from './barcode-template.ts'
import type { BarcodeExpression } from './barcode-template.ts'

export type Weight = 300 | 400 | 500 | 600 | 700
export interface ResolvedBarcode extends BarcodeExpression { value: string; color?: string }
export interface RichRun { text: string; weight?: Weight; italic?: boolean; underline?: boolean; size?: number; color?: string; barcode?: ResolvedBarcode }
export interface RichLine { runs: RichRun[]; align?: 'left' | 'center' | 'right'; barcode?: ResolvedBarcode }
export type RichDocument = RichLine[]
export const lineText = (line: RichLine) => line.runs.map(run => run.text).join('')
export const documentText = (doc: RichDocument) => doc.map(line => line.runs.length ? line.runs.map(run => run.barcode?.value ?? run.text).join('') : line.barcode?.value ?? '').join('\n')
export const fromText = (text: string): RichDocument => text.replace(/\r\n?/g, '\n').split('\n').map(text => ({ runs: [{ text }] }))

export function manualDocuments(doc: RichDocument, keepHyphens = false): RichDocument[] {
  const result: RichDocument[] = []
  let current: RichDocument = []
  for (const line of doc) {
    const text = lineText(line).trim()
    if (!text) { if (current.length) result.push(current); current = []; continue }
    if (text !== '-' || keepHyphens) current.push(line)
  }
  if (current.length) result.push(current)
  return result
}

export function makeTemplate(count = 3): RichDocument {
  return Array.from({ length: Math.min(count, 100) }, (_, index) => ({ runs: [{ text: `{{${index + 1}}}`, weight: index === 0 ? 700 : 400 }] }))
}

function sliceRuns(runs: RichRun[], start: number, end: number): RichRun[] {
  let position = 0
  const result: RichRun[] = []
  for (const run of runs) {
    const a = Math.max(0, start - position), b = Math.min(run.text.length, end - position)
    if (b > a) result.push({ ...run, text: run.text.slice(a, b) })
    position += run.text.length
  }
  return result
}

export function templateErrors(template: RichDocument, columns: number): string[] {
  let text = documentText(template)
  const errors = new Set<string>()
  try {
    const barcodes = barcodeMatches(text)
    if (barcodes.length > 1) errors.add('Gunakan maksimal satu barcode per label.')
    for (const barcode of barcodes) if (typeof barcode.source === 'number' && barcode.source > columns) errors.add(`Kolom barcode ${barcode.source} tidak tersedia pada data ini.`)
    for (const barcode of [...barcodes].reverse()) text = text.slice(0, barcode.start) + text.slice(barcode.end)
  } catch (error) { errors.add((error as Error).message) }
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    const index = Number(match[1])
    if (index < 1 || index > columns) errors.add(`Kolom {{${index}}} tidak tersedia pada data ini.`)
  }
  if (text.replace(/\{\{\s*\d+\s*\}\}/g, '').includes('{{') || text.replace(/\{\{\s*\d+\s*\}\}/g, '').includes('}}')) errors.add('Gunakan penanda kolom seperti {{1}}, {{2}}, dan seterusnya.')
  if (!documentText(template).trim()) errors.add('Isi template label terlebih dahulu.')
  return [...errors]
}

export function splitContentLines(line: RichLine): RichLine[] {
  const lines: RichLine[] = [{ runs: [], align: line.align }]
  for (const run of line.runs) {
    if (run.barcode) { lines[lines.length - 1].runs.push(run); lines[lines.length - 1].barcode = run.barcode; continue }
    run.text.replace(/\r\n?/g, '\n').split('\n').forEach((text, index) => {
      if (index) lines.push({ runs: [], align: line.align })
      if (text) lines[lines.length - 1].runs.push({ ...run, text })
    })
  }
  return lines
}

export function resolveTemplate(template: RichDocument, row: unknown[]): RichDocument {
  const result: RichDocument = []
  for (const line of template) {
    const original = lineText(line)
    const barcodes = barcodeMatches(original)
    const matches = [...original.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].filter(match => !barcodes.some(barcode => match.index! >= barcode.start && match.index! < barcode.end))
    const values = matches.map(match => formatCell(row[Number(match[1]) - 1]))
    // Missing data fields still compact away. Literal template whitespace does not.
    if (!barcodes.length && matches.length && values.every(value => !value || value === '-')) continue
    const runs: RichRun[] = []
    let cursor = 0
    const replacements = [
      ...matches.map((match, index) => ({ start: match.index!, end: match.index! + match[0].length, value: values[index] === '-' ? '' : values[index], barcode: undefined as ResolvedBarcode | undefined })),
      ...barcodes.map(barcode => {
        const raw = typeof barcode.source === 'number' ? row[barcode.source - 1] : barcode.source
        const style = sliceRuns(line.runs, barcode.start, barcode.start + 1)[0]
        return { start: barcode.start, end: barcode.end, value: '', barcode: { source: barcode.source, options: barcode.options, value: typeof raw === 'string' ? raw : formatCell(raw), color: style?.color } }
      }),
    ].sort((a, b) => a.start - b.start)
    for (const replacement of replacements) {
      runs.push(...sliceRuns(line.runs, cursor, replacement.start))
      const style = sliceRuns(line.runs, replacement.start, replacement.start + 1)[0] ?? { text: '' }
      runs.push({ ...style, text: replacement.value, ...(replacement.barcode ? { barcode: replacement.barcode } : {}) })
      cursor = replacement.end
    }
    runs.push(...sliceRuns(line.runs, cursor, original.length))
    result.push(...splitContentLines({ ...line, runs: runs.filter(run => run.text || run.barcode) }).filter(line => line.barcode || lineText(line).trim() !== '-'))
  }
  return result
}

export function isRichDocument(value: unknown): value is RichDocument {
  if (!Array.isArray(value) || value.length > 500) return false
  let length = 0
  for (const line of value) {
    if (!line || typeof line !== 'object' || !Array.isArray(line.runs) || line.runs.length > 500) return false
    if (line.align !== undefined && !['left', 'center', 'right'].includes(line.align)) return false
    if (line.barcode !== undefined) return false // Resolved barcode data is never accepted as a template.
    for (const run of line.runs) {
      if (!run || typeof run.text !== 'string') return false
      if (run.barcode !== undefined) return false
      length += run.text.length
      if (run.weight !== undefined && ![300, 400, 500, 600, 700].includes(run.weight)) return false
      if (run.size !== undefined && (!Number.isFinite(run.size) || run.size < 4 || run.size > 100)) return false
      if (run.italic !== undefined && typeof run.italic !== 'boolean') return false
      if (run.underline !== undefined && typeof run.underline !== 'boolean') return false
      if (run.color !== undefined && (typeof run.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(run.color))) return false
    }
  }
  return length <= 250000
}
