export type Format = 'original' | 'jpeg' | 'webp' | 'avif' | 'png' | 'jxl' | 'qoi'
export const FORMATS = [
  { value: 'original', label: 'Gambar asli', mime: '', extension: '' },
  { value: 'jpeg', label: 'MozJPEG', mime: 'image/jpeg', extension: 'jpg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp' },
  { value: 'avif', label: 'AVIF', mime: 'image/avif', extension: 'avif' },
  { value: 'png', label: 'OxiPNG', mime: 'image/png', extension: 'png' },
  { value: 'jxl', label: 'JPEG XL', mime: 'image/jxl', extension: 'jxl' },
  { value: 'qoi', label: 'QOI', mime: 'image/qoi', extension: 'qoi' },
] as const
export const MAX_FILE_BYTES = 40 * 1024 * 1024
export const MAX_PIXELS = 16_000_000
export const MAX_DIMENSION = 8192
export interface Options {
  format: Format
  quality: number
  lossless: boolean
  effort: number
  progressive: boolean
  sharpYuv: boolean
  subsample: '420' | '444'
  resize: boolean
  width: number
  height: number
  lockRatio: boolean
  method: 'lanczos3' | 'triangle' | 'catrom' | 'mitchell' | 'nearest'
  linearRGB: boolean
  premultiply: boolean
  rotate: 0 | 90 | 180 | 270
  flipX: boolean
  flipY: boolean
  quantize: boolean
  colors: number
  dither: boolean
  background: string
}
export function defaults(format: Format = 'jpeg', width = 1, height = 1): Options {
  return { format, width, height, quality: 75, lossless: false, effort: 4, progressive: true, sharpYuv: false, subsample: '420', resize: false, lockRatio: true, method: 'lanczos3', linearRGB: true, premultiply: true, rotate: 0, flipX: false, flipY: false, quantize: false, colors: 256, dither: true, background: '#ffffff' }
}
export function validateDimensions(width: number, height: number) {
  if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= MAX_DIMENSION) || width * height > MAX_PIXELS) throw new Error('Ukuran maksimal 16 juta piksel, dengan sisi maksimal 8.192 px.')
}
export function validateRasterHeader(buffer: ArrayBuffer) {
  if (buffer.byteLength < 24) return
  const view = new DataView(buffer)
  if (view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) validateDimensions(view.getUint32(16), view.getUint32(20))
  if (view.getUint32(0) === 0x716f6966) validateDimensions(view.getUint32(4), view.getUint32(8))
}
export function outputSize(width: number, height: number, options: Options) {
  if (options.format === 'original') return { width, height }
  const swap = options.rotate === 90 || options.rotate === 270
  const size = { width: options.resize ? options.width : swap ? height : width, height: options.resize ? options.height : swap ? width : height }
  validateDimensions(size.width, size.height)
  if (options.quantize && size.width * size.height > 4_000_000) throw new Error('Perkecil ke maksimal 4 juta piksel sebelum mengurangi warna.')
  if (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 100) throw new Error('Kualitas harus berada dalam 0–100.')
  if (!Number.isInteger(options.colors) || options.colors < 2 || options.colors > 256) throw new Error('Jumlah warna harus berada dalam 2–256.')
  return size
}
export function proportionalSize(value: number, axis: 'width' | 'height', width: number, height: number) {
  return axis === 'width' ? { width: value, height: Math.max(1, Math.round(value * height / width)) } : { width: Math.max(1, Math.round(value * width / height)), height: value }
}
export function outputName(name: string, format: Format) {
  if (format === 'original') return name
  const base = name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 100) || 'gambar'
  return `${base}-kompres.${FORMATS.find(item => item.value === format)!.extension}`
}
export function sizeChange(original: number, result: number) {
  if (original <= 0) return ''
  const difference = (1 - result / original) * 100
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Math.abs(difference))}% ${difference >= 0 ? 'lebih kecil' : 'lebih besar'}`
}
