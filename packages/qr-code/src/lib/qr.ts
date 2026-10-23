import QRCode from 'qrcode'
export type Mode = 'text' | 'wifi' | 'whatsapp'
export type Level = 'L' | 'M' | 'Q' | 'H'
export interface Content { mode: Mode; text: string; ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean; phone: string; message: string }
export interface Appearance { foreground: string; background: string; size: number; level: Level }
export interface Matrix { size: number; data: Uint8Array }
export const DEFAULT_APPEARANCE: Appearance = { foreground: '#111111', background: '#ffffff', size: 1024, level: 'M' }
export const EMPTY_CONTENT: Content = { mode: 'text', text: '', ssid: '', password: '', security: 'WPA', hidden: false, phone: '', message: '' }
const wifiEscape = (text: string) => text.replace(/[\\;,:"]/g, char => `\\${char}`)
export function payload(content: Content): string {
  if (content.mode === 'text') {
    if (!content.text.trim()) return ''
    return content.text
  }
  if (content.mode === 'wifi') {
    if (!content.ssid.trim()) return ''
    if (content.security !== 'nopass' && !content.password) throw new Error('Isi kata sandi Wi-Fi atau pilih jaringan tanpa kata sandi.')
    return `WIFI:T:${content.security};S:${wifiEscape(content.ssid)};${content.security === 'nopass' ? '' : `P:${wifiEscape(content.password)};`}H:${content.hidden};;`
  }
  if (!content.phone.trim()) return ''
  let phone = content.phone.replace(/[\s()+-]/g, '')
  if (phone.startsWith('0')) phone = `62${phone.slice(1)}`
  else if (phone.startsWith('8')) phone = `62${phone}`
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('Gunakan nomor WhatsApp 8–15 digit dengan kode negara, misalnya +6281234567890.')
  return `https://wa.me/${phone}${content.message ? `?text=${encodeURIComponent(content.message)}` : ''}`
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
export function validateAppearance(options: Appearance) {
  if (![options.foreground, options.background].every(color => /^#[0-9a-f]{6}$/i.test(color))) throw new Error('Isi warna dengan kode enam digit, misalnya #111111.')
  if (![256, 512, 1024, 2048].includes(options.size)) throw new Error('Pilih ukuran PNG yang tersedia.')
  if (!['L', 'M', 'Q', 'H'].includes(options.level)) throw new Error('Pilih tingkat koreksi kesalahan yang tersedia.')
  const dark = luminance(options.foreground), light = luminance(options.background)
  if (dark >= light || (light + 0.05) / (dark + 0.05) < 4.5) throw new Error('Gunakan pola gelap di atas latar terang dengan kontras lebih tinggi. Coba warna awal.')
}
export function createMatrix(text: string, options: Appearance): Matrix {
  validateAppearance(options)
  if (!text.trim()) throw new Error('Isi konten QR code terlebih dahulu.')
  if (new TextEncoder().encode(text).length > 3000) throw new Error('Konten terlalu panjang. Ringkas teks atau gunakan tautan yang lebih pendek.')
  try {
    const result = QRCode.create(text, { errorCorrectionLevel: options.level })
    return { size: result.modules.size, data: new Uint8Array(result.modules.data) }
  } catch { throw new Error('Konten tidak muat pada tingkat koreksi ini. Ringkas isinya atau pilih koreksi yang lebih rendah.') }
}
export function svgCode(matrix: Matrix, options: Appearance) {
  validateAppearance(options)
  const side = matrix.size + 8
  let path = ''
  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    if (matrix.data[y * matrix.size + x]) path += `M${x + 4} ${y + 4}h1v1h-1z`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="${options.background}"/><path d="${path}" fill="${options.foreground}"/></svg>`
}
// Integer module pixels preserve sharp edges, with at least four clear modules on every side.
export function rasterGeometry(matrix: Matrix, size: number) {
  const scale = Math.floor(size / (matrix.size + 8))
  if (scale < 1) throw new Error('Ukuran gambar terlalu kecil untuk QR code ini.')
  return { scale, offset: Math.floor((size - matrix.size * scale) / 2) }
}
export function pngBlob(matrix: Matrix, options: Appearance): Promise<Blob> {
  validateAppearance(options)
  const canvas = document.createElement('canvas')
  canvas.width = options.size; canvas.height = options.size
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('Browser tidak dapat membuat PNG. Coba unduh SVG.'))
  context.fillStyle = options.background; context.fillRect(0, 0, options.size, options.size)
  const { scale, offset } = rasterGeometry(matrix, options.size)
  context.fillStyle = options.foreground
  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) if (matrix.data[y * matrix.size + x]) context.fillRect(offset + x * scale, offset + y * scale, scale, scale)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG gagal dibuat. Coba unduh SVG.')), 'image/png'))
}
