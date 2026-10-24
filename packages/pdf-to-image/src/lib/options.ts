export type ImageFormat = 'png' | 'jpg'
export const MAX_FILE_BYTES = 100 * 1024 * 1024
export const MAX_PIXELS = 24_000_000
export const MAX_DIMENSION = 8192
export const MAX_ZIP_BYTES = 256 * 1024 * 1024

export function parsePages(input: string, total: number): number[] {
  if (!Number.isInteger(total) || total < 1) throw new Error('PDF tidak memiliki halaman.')
  if (!input.trim()) throw new Error('Isi nomor halaman, misalnya 1–3, 5.')
  const selected = new Set<number>()
  for (const part of input.split(',')) {
    const match = /^\s*(\d+)\s*(?:[-–]\s*(\d+)\s*)?$/.exec(part)
    if (!match) throw new Error('Gunakan nomor atau rentang halaman, misalnya 1–3, 5.')
    const start = Number(match[1]), end = Number(match[2] ?? match[1])
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end > total || end < start) throw new Error(`Halaman harus berada dalam 1–${total}, dengan rentang berurutan.`)
    for (let page = start; page <= end; page++) selected.add(page)
  }
  return [...selected].sort((a, b) => a - b)
}

export function imageSize(width: number, height: number, dpi: number) {
  if (![width, height, dpi].every(value => Number.isFinite(value) && value > 0)) throw new Error('Ukuran halaman tidak valid.')
  if (dpi < 72 || dpi > 600) throw new Error('DPI harus berada dalam 72–600.')
  const scale = dpi / 72
  const w = Math.ceil(width * scale - 1e-8), h = Math.ceil(height * scale - 1e-8)
  if (w > MAX_DIMENSION || h > MAX_DIMENSION || w * h > MAX_PIXELS) throw new Error('Halaman terlalu besar pada kualitas ini. Turunkan DPI atau pilih kualitas Standar.')
  return { width: w, height: h, scale }
}

export function baseName(filename: string) {
  return filename.replace(/\.pdf$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim().slice(0, 100) || 'dokumen'
}
export function imageName(filename: string, page: number, total: number, format: ImageFormat) {
  return `${baseName(filename)}-halaman-${String(page).padStart(Math.max(2, String(total).length), '0')}.${format}`
}
