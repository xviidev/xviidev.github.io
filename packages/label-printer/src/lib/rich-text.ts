import { formatCell } from './labels.ts'

export type Weight = 300 | 400 | 500 | 600 | 700
export interface RichRun { text: string; weight?: Weight; italic?: boolean; underline?: boolean; size?: number }
export interface RichLine { runs: RichRun[]; align?: 'left' | 'center' | 'right' }
export type RichDocument = RichLine[]
export const lineText = (line: RichLine) => line.runs.map(run => run.text).join('')
export const documentText = (doc: RichDocument) => doc.map(lineText).join('\n')
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
  const text = documentText(template)
  const errors = new Set<string>()
  for (const match of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    const index = Number(match[1])
    if (index < 1 || index > columns) errors.add(`Kolom {{${index}}} tidak tersedia pada data ini.`)
  }
  if (text.replace(/\{\{\s*\d+\s*\}\}/g, '').includes('{{') || text.replace(/\{\{\s*\d+\s*\}\}/g, '').includes('}}')) errors.add('Gunakan penanda kolom seperti {{1}}, {{2}}, dan seterusnya.')
  if (!text.trim()) errors.add('Isi template label terlebih dahulu.')
  return [...errors]
}

export function splitContentLines(line: RichLine): RichLine[] {
  const lines: RichLine[] = [{ runs: [], align: line.align }]
  for (const run of line.runs) {
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
    const text = lineText(line)
    const matches = [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)]
    const values = matches.map(match => formatCell(row[Number(match[1]) - 1]))
    // A line made entirely from missing fields is removed, including static prefixes.
    if (matches.length && values.every(value => !value || value === '-')) continue
    const runs: RichRun[] = []
    let cursor = 0
    matches.forEach((match, index) => {
      const start = match.index!
      runs.push(...sliceRuns(line.runs, cursor, start))
      const style = sliceRuns(line.runs, start, start + 1)[0] ?? { text: '' }
      runs.push({ ...style, text: values[index] === '-' ? '' : values[index] })
      cursor = start + match[0].length
    })
    runs.push(...sliceRuns(line.runs, cursor, text.length))
    const resolved = { ...line, runs: runs.filter(run => run.text) }
    result.push(...splitContentLines(resolved).filter(line => lineText(line).trim() && lineText(line).trim() !== '-'))
  }
  return result
}

export function isRichDocument(value: unknown): value is RichDocument {
  if (!Array.isArray(value) || value.length > 500) return false
  let length = 0
  for (const line of value) {
    if (!line || typeof line !== 'object' || !Array.isArray(line.runs) || line.runs.length > 500) return false
    if (line.align !== undefined && !['left', 'center', 'right'].includes(line.align)) return false
    for (const run of line.runs) {
      if (!run || typeof run.text !== 'string') return false
      length += run.text.length
      if (run.weight !== undefined && ![300, 400, 500, 600, 700].includes(run.weight)) return false
      if (run.size !== undefined && (!Number.isFinite(run.size) || run.size < 4 || run.size > 100)) return false
      if (run.italic !== undefined && typeof run.italic !== 'boolean') return false
      if (run.underline !== undefined && typeof run.underline !== 'boolean') return false
    }
  }
  return length <= 250000
}
