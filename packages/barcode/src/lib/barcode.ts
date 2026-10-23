import JsBarcode from 'jsbarcode'

export type Format = 'CODE128' | 'EAN13'
export interface Appearance { moduleWidth: number; height: number; margin: number; showText: boolean }
export const DEFAULT_APPEARANCE: Appearance = { moduleWidth: 2, height: 100, margin: 12, showText: true }
export const MAX_CODES = 200
export interface Code { value: string; bits: string }
export interface Row { line: number; code?: Code; error?: string }

export function normalize(value: string, format: Format): string {
  if (format !== 'CODE128' && format !== 'EAN13') throw new Error('Format barcode tidak dikenal.')
  if (!value) throw new Error('Isi kode terlebih dahulu.')
  if (format === 'CODE128') {
    if (value.length > 80) throw new Error('Code 128 dibatasi hingga 80 karakter.')
    if (!/^[\x20-\x7e]+$/.test(value)) throw new Error('Code 128 hanya menerima huruf, angka, spasi, dan simbol ASCII yang dapat dicetak.')
    return value
  }
  if (!/^\d{12,13}$/.test(value)) throw new Error('EAN-13 harus berisi 12 atau 13 digit angka.')
  const digits = value.slice(0, 12)
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  const check = String((10 - sum % 10) % 10)
  if (value.length === 13 && value[12] !== check) throw new Error(`Digit pemeriksa tidak cocok. Digit terakhir seharusnya ${check}.`)
  return digits + check
}

export function encode(value: string, format: Format): Code {
  const normalized = normalize(value, format)
  const target = {} as { encodings: { data: string }[] }
  JsBarcode(target, normalized, { format, displayValue: false, flat: true, margin: 0 })
  return { value: normalized, bits: target.encodings.map(item => item.data).join('') }
}

export function parseRows(text: string, format: Format): Row[] {
  const lines = text.split(/\r?\n/).map((value, index) => ({ value, line: index + 1 })).filter(item => item.value.trim() !== '')
  if (lines.length > MAX_CODES) throw new Error(`Maksimal ${MAX_CODES} kode per proses. Kurangi jumlah baris.`)
  return lines.map(({ value, line }) => {
    try { return { line, code: encode(value, format) } }
    catch (error) { return { line, error: (error as Error).message } }
  })
}

export function geometry(code: Code, appearance: Appearance) {
  const { moduleWidth, height, margin } = appearance
  if (!Number.isInteger(moduleWidth) || moduleWidth < 1 || moduleWidth > 4 || !Number.isInteger(height) || height < 40 || height > 240 || !Number.isInteger(margin) || margin < 12 || margin > 40) throw new Error('Pengaturan ukuran di luar batas.')
  const quiet = moduleWidth * margin
  return { quiet, width: code.bits.length * moduleWidth + 2 * quiet, height: height + 2 * quiet + (appearance.showText ? 26 : 0) }
}

export function bars(code: Code, appearance: Appearance) {
  const { quiet } = geometry(code, appearance)
  const result: { x: number; width: number }[] = []
  for (let i = 0; i < code.bits.length;) {
    if (code.bits[i] !== '1') { i++; continue }
    const start = i
    while (code.bits[i] === '1') i++
    result.push({ x: quiet + start * appearance.moduleWidth, width: (i - start) * appearance.moduleWidth })
  }
  return result
}

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
export function svgCode(code: Code, appearance: Appearance): string {
  const box = geometry(code, appearance)
  const rects = bars(code, appearance).map(bar => `<rect x="${bar.x}" y="${box.quiet}" width="${bar.width}" height="${appearance.height}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects}</g>${appearance.showText ? `<text x="${box.width / 2}" y="${box.quiet + appearance.height + 20}" text-anchor="middle" font-family="monospace" font-size="16" fill="black" xml:space="preserve">${escape(code.value)}</text>` : ''}</svg>`
}

export async function pngBlob(code: Code, appearance: Appearance): Promise<Blob> {
  const box = geometry(code, appearance)
  const canvas = document.createElement('canvas')
  canvas.width = box.width; canvas.height = box.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak mendukung ekspor PNG.')
  context.fillStyle = 'white'; context.fillRect(0, 0, box.width, box.height)
  context.fillStyle = 'black'
  for (const bar of bars(code, appearance)) context.fillRect(bar.x, box.quiet, bar.width, appearance.height)
  if (appearance.showText) {
    context.font = '16px monospace'; context.textAlign = 'center'
    context.fillText(code.value, box.width / 2, box.quiet + appearance.height + 20)
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG gagal dibuat.')), 'image/png'))
}
