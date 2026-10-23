import QRCode from 'qrcode'
export type Mode = 'text' | 'wifi' | 'whatsapp'
export type Level = 'L' | 'M' | 'Q' | 'H'
export interface Content { mode: Mode; text: string; ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean; phone: string; message: string }
export type Shape = 'square' | 'rounded' | 'dots'
export interface Appearance { foreground: string; background: string; size: number; level: Level; shape: Shape; logo?: string; logoScale: number }
export interface Matrix { size: number; data: Uint8Array; protected?: Uint8Array }
export const DEFAULT_APPEARANCE: Appearance = { foreground: '#111111', background: '#ffffff', size: 1024, level: 'M', shape: 'square', logoScale: 18 }
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
  if (!['square', 'rounded', 'dots'].includes(options.shape)) throw new Error('Pilih bentuk pola yang tersedia.')
  if (![12, 16, 18].includes(options.logoScale)) throw new Error('Pilih ukuran logo yang tersedia.')
  if (options.logo && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(options.logo) || options.logo.length > 2000000)) throw new Error('Logo tidak valid. Unggah ulang gambar PNG, JPG, atau WebP.')
  const dark = luminance(options.foreground), light = luminance(options.background)
  if (dark >= light || (light + 0.05) / (dark + 0.05) < 4.5) throw new Error('Gunakan pola gelap di atas latar terang dengan kontras lebih tinggi. Coba warna awal.')
}
export function createMatrix(text: string, options: Appearance): Matrix {
  validateAppearance(options)
  if (!text.trim()) throw new Error('Isi konten QR code terlebih dahulu.')
  if (new TextEncoder().encode(text).length > 3000) throw new Error('Konten terlalu panjang. Ringkas teks atau gunakan tautan yang lebih pendek.')
  try {
    const result = QRCode.create(text, { errorCorrectionLevel: options.logo ? 'H' : options.level })
    return { size: result.modules.size, data: new Uint8Array(result.modules.data), protected: new Uint8Array(result.modules.reservedBit) }
  } catch { throw new Error('Konten tidak muat pada tingkat koreksi ini. Ringkas isinya atau pilih koreksi yang lebih rendah.') }
}
export function finderModule(x: number, y: number, size: number) {
  return (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)
}
export function svgCode(matrix: Matrix, options: Appearance) {
  validateAppearance(options)
  const side = matrix.size + 8
  let path = '', shapes = ''
  const dark = (x: number, y: number) => x >= 0 && y >= 0 && x < matrix.size && y < matrix.size && !!matrix.data[y * matrix.size + x]
  const alignmentCenters: [number, number][] = []
  const alignmentCells = new Set<number>()
  if (options.shape !== 'square') for (let y = 2; y < matrix.size - 2; y++) for (let x = 2; x < matrix.size - 2; x++) {
    if (!dark(x, y) || !matrix.protected?.[y * matrix.size + x] || finderModule(x, y, matrix.size)) continue
    let matches = true
    for (let dy = -2; dy <= 2 && matches; dy++) for (let dx = -2; dx <= 2; dx++) {
      const expected = Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0)
      if (!matrix.protected[(y + dy) * matrix.size + x + dx] || dark(x + dx, y + dy) !== expected) { matches = false; break }
    }
    if (matches) { alignmentCenters.push([x, y]); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) alignmentCells.add((y + dy) * matrix.size + x + dx) }
  }
  function roundedModule(x: number, y: number) {
    const a = x + 4, b = y + 4
    const tl = !dark(x - 1, y) && !dark(x, y - 1) ? 0.5 : 0
    const tr = !dark(x + 1, y) && !dark(x, y - 1) ? 0.5 : 0
    const br = !dark(x + 1, y) && !dark(x, y + 1) ? 0.5 : 0
    const bl = !dark(x - 1, y) && !dark(x, y + 1) ? 0.5 : 0
    return `M${a + tl} ${b}H${a + 1 - tr}Q${a + 1} ${b} ${a + 1} ${b + tr}V${b + 1 - br}Q${a + 1} ${b + 1} ${a + 1 - br} ${b + 1}H${a + bl}Q${a} ${b + 1} ${a} ${b + 1 - bl}V${b + tl}Q${a} ${b} ${a + tl} ${b}Z`
  }
  for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    if (!dark(x, y)) continue
    const a = x + 4, b = y + 4
    if (options.shape === 'square') path += `M${a} ${b}h1v1h-1z`
    else if (finderModule(x, y, matrix.size) || alignmentCells.has(y * matrix.size + x)) continue
    else if (options.shape === 'dots') shapes += `<circle cx="${a + 0.5}" cy="${b + 0.5}" r="0.5"/>`
    else path += roundedModule(x, y)
  }
  // Smooth re-entrant corners too, where three dark modules surround a white corner.
  if (options.shape === 'rounded') for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
    if (dark(x, y) || finderModule(x, y, matrix.size) || alignmentCells.has(y * matrix.size + x)) continue
    const a = x + 4, b = y + 4, r = 0.3
    if (dark(x - 1, y) && dark(x, y - 1) && dark(x - 1, y - 1)) path += `M${a} ${b}h${r}Q${a} ${b} ${a} ${b + r}Z`
    if (dark(x + 1, y) && dark(x, y - 1) && dark(x + 1, y - 1)) path += `M${a + 1} ${b}v${r}Q${a + 1} ${b} ${a + 1 - r} ${b}Z`
    if (dark(x + 1, y) && dark(x, y + 1) && dark(x + 1, y + 1)) path += `M${a + 1} ${b + 1}h${-r}Q${a + 1} ${b + 1} ${a + 1} ${b + 1 - r}Z`
    if (dark(x - 1, y) && dark(x, y + 1) && dark(x - 1, y + 1)) path += `M${a} ${b + 1}v${-r}Q${a} ${b + 1} ${a + r} ${b + 1}Z`
  }
  // Keep the 1:1:3:1:1 finder proportions while styling their outlines as complete shapes.
  if (options.shape !== 'square') for (const [x, y] of [[4, 4], [matrix.size - 3, 4], [4, matrix.size - 3]]) {
    if (options.shape === 'dots') shapes += `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3.5"/><circle cx="${x + 3.5}" cy="${y + 3.5}" r="2.5" fill="${options.background}"/><circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5"/>`
    else shapes += `<rect x="${x}" y="${y}" width="7" height="7" rx="1.5"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.9" fill="${options.background}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.65"/>`
  }
  // Alignment targets keep their native 5×5 module grid instead of becoming a fourth eye.
  for (const [x, y] of alignmentCenters) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) !== 2 && Math.abs(dy) !== 2 && (dx !== 0 || dy !== 0)) continue
    if (options.shape === 'dots') shapes += `<circle cx="${x + dx + 4.5}" cy="${y + dy + 4.5}" r="0.58"/>`
    else shapes += `<rect x="${x + dx + 4}" y="${y + dy + 4}" width="1" height="1" rx="0.25"/>`
  }
  const box = matrix.size * options.logoScale / 100, position = (side - box) / 2, inset = box * 0.12
  const logo = options.logo ? `<rect x="${position}" y="${position}" width="${box}" height="${box}" fill="${options.background}"/><image href="${options.logo}" x="${position + inset}" y="${position + inset}" width="${box - inset * 2}" height="${box - inset * 2}" preserveAspectRatio="xMidYMid meet"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${side} ${side}"><rect width="${side}" height="${side}" fill="${options.background}"/><path d="${path}" fill="${options.foreground}" shape-rendering="${options.shape === 'square' ? 'crispEdges' : 'geometricPrecision'}"/><g fill="${options.foreground}">${shapes}</g>${logo}</svg>`
}
// Integer module pixels preserve sharp edges, with at least four clear modules on every side.
export function rasterGeometry(matrix: Matrix, size: number) {
  const scale = Math.floor(size / (matrix.size + 8))
  if (scale < 1) throw new Error('Ukuran gambar terlalu kecil untuk QR code ini.')
  return { scale, offset: Math.floor((size - matrix.size * scale) / 2) }
}
export async function pngBlob(matrix: Matrix, options: Appearance): Promise<Blob> {
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode(matrix, options))}`
  try { await image.decode() } catch { throw new Error('Gambar gagal disiapkan. Unggah ulang logo atau coba unduh SVG.') }
  const canvas = document.createElement('canvas')
  canvas.width = options.size; canvas.height = options.size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browser tidak dapat membuat PNG. Coba unduh SVG.')
  context.drawImage(image, 0, 0, options.size, options.size)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG gagal dibuat. Coba unduh SVG.')), 'image/png'))
}
export async function readLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Gunakan logo PNG, JPG, atau WebP.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran logo maksimal 2 MB.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) } catch { throw new Error('Gambar tidak dapat dibaca. Coba berkas lain.') }
  try {
    if (bitmap.width > 8192 || bitmap.height > 8192) throw new Error('Dimensi logo maksimal 8.192 piksel per sisi.')
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Browser tidak dapat menyiapkan logo.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally { bitmap.close() }
}
