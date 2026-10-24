export const MAX_FILE_BYTES = 100 * 1024 * 1024
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024
export const MAX_FILES = 50
export const MAX_PAGES = 1000
export const MAX_OUTPUTS = 200
export const MAX_OUTPUT_BYTES = 256 * 1024 * 1024
export type SplitMode = 'ranges' | 'pages' | 'chunks'

export function pagesFromRange(value: string, total: number): number[] {
  if (!Number.isSafeInteger(total) || total < 1 || total > MAX_PAGES) throw new Error(`Dokumen maksimal ${MAX_PAGES} halaman.`)
  if (!value.trim()) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = [], seen = new Set<number>()
  for (const token of value.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!match) throw new Error('Gunakan nomor halaman atau rentang, misalnya 1-3, 5, 8-10.')
    const start = Number(match[1]), end = Number(match[2] ?? match[1])
    if (start < 1 || end > total || start > end) throw new Error(`Halaman harus berada dalam 1–${total}; awal rentang tidak boleh melebihi akhir.`)
    for (let page = start - 1; page < end; page++) if (!seen.has(page)) { seen.add(page); pages.push(page) }
  }
  return pages
}
export function splitGroups(total: number, mode: SplitMode, range: string, chunkSize: number): number[][] {
  const all = pagesFromRange('', total)
  let groups: number[][]
  if (mode === 'ranges') {
    if (!range.trim()) throw new Error('Isi rentang halaman yang akan dipisahkan.')
    const ranges = range.split(';')
    if (ranges.some(part => !part.trim())) throw new Error('Setiap bagian harus berisi rentang halaman.')
    if (ranges.length > MAX_OUTPUTS) throw new Error(`Maksimal ${MAX_OUTPUTS} PDF per proses.`)
    groups = ranges.map(part => pagesFromRange(part, total))
  } else if (mode === 'pages') groups = all.map(page => [page])
  else if (mode === 'chunks') {
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > total) throw new Error(`Jumlah halaman per bagian harus dalam 1–${total}.`)
    groups = []
    for (let i = 0; i < total; i += chunkSize) groups.push(all.slice(i, i + chunkSize))
  } else throw new Error('Mode pemisahan tidak dikenal.')
  if (groups.length > MAX_OUTPUTS) throw new Error(`Maksimal ${MAX_OUTPUTS} PDF per proses. Gunakan rentang atau tambah halaman per bagian.`)
  if (groups.reduce((sum, pages) => sum + pages.length, 0) > MAX_PAGES) throw new Error(`Hasil maksimal ${MAX_PAGES} halaman per proses.`)
  return groups
}
export function pdfName(name: string) { return name.replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().slice(0, 100) || 'dokumen' }
export function validateFiles(files: { size: number }[]) {
  if (!files.length || files.length > MAX_FILES) throw new Error(`Pilih 1–${MAX_FILES} PDF.`)
  if (files.some(file => !file.size || file.size > MAX_FILE_BYTES)) throw new Error('Setiap PDF harus berisi data dan berukuran maksimal 100 MB.')
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) throw new Error('Total ukuran file maksimal 200 MB.')
}
