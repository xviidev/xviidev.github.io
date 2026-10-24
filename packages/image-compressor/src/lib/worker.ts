import { FORMATS, outputSize, validateDimensions, MAX_FILE_BYTES } from './options'
import type { Options } from './options'
type Request = { kind: 'load'; file: File } | { kind: 'encode'; pixels: ImageData; options: Options }
const scope = globalThis as unknown as { onmessage: (event: MessageEvent<Request>) => void; postMessage: (value: unknown, transfer?: Transferable[]) => void }
function canvasFor(data: ImageData) {
  const canvas = new OffscreenCanvas(data.width, data.height)
  canvas.getContext('2d')!.putImageData(data, 0, 0)
  return canvas
}
async function readImage(blob: Blob, format?: string) {
  if (format === 'png' || blob.type === 'image/png') {
    const { decodePng } = await import('./codecs')
    const pixels = await decodePng(await blob.arrayBuffer())
    validateDimensions(pixels.width, pixels.height)
    return pixels
  }
  try {
    const bitmap = await createImageBitmap(blob)
    try { validateDimensions(bitmap.width, bitmap.height); const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0); return ctx.getImageData(0, 0, bitmap.width, bitmap.height) }
    finally { bitmap.close() }
  } catch (error) {
    if (format === 'jxl' || format === 'qoi' || format === 'avif') { const { decodeSpecial } = await import('./codecs'); const data = await decodeSpecial(await blob.arrayBuffer(), format); validateDimensions(data.width, data.height); return data }
    throw error
  }
}
scope.onmessage = async ({ data: request }) => {
  try {
    if (request.kind === 'load') {
      if (request.file.size > MAX_FILE_BYTES) throw new Error('Ukuran gambar maksimal 40 MB.')
      const ext = request.file.name.split('.').at(-1)?.toLowerCase()
      const pixels = await readImage(request.file, ext)
      const preview = await canvasFor(pixels).convertToBlob({ type: 'image/png' })
      scope.postMessage({ pixels, preview }, [pixels.data.buffer]); return
    }
    const options = request.options
    let pixels = request.pixels
    const { width, height } = outputSize(pixels.width, pixels.height, options)
    const { encode, resize } = await import('./codecs')
    if (options.rotate || options.flipX || options.flipY || options.format === 'jpeg') {
      const swap = options.rotate === 90 || options.rotate === 270
      const canvas = new OffscreenCanvas(swap ? pixels.height : pixels.width, swap ? pixels.width : pixels.height), ctx = canvas.getContext('2d')!
      if (options.format === 'jpeg') { ctx.fillStyle = options.background; ctx.fillRect(0, 0, canvas.width, canvas.height) }
      ctx.translate(canvas.width / 2, canvas.height / 2); ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1); ctx.rotate(options.rotate * Math.PI / 180)
      ctx.drawImage(canvasFor(pixels), -pixels.width / 2, -pixels.height / 2)
      pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    }
    if (pixels.width !== width || pixels.height !== height) {
      if (options.method === 'nearest') { const canvas = new OffscreenCanvas(width, height), ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false; ctx.drawImage(canvasFor(pixels), 0, 0, width, height); pixels = ctx.getImageData(0, 0, width, height) }
      else pixels = await resize(pixels, options, width, height)
    }
    if (options.quantize) {
      const { utils, buildPaletteSync, applyPaletteSync } = await import('image-q')
      const points = utils.PointContainer.fromImageData(pixels)
      const palette = buildPaletteSync([points], { colors: options.colors, paletteQuantization: 'wuquant' })
      const result = applyPaletteSync(points, palette, { imageQuantization: options.dither ? 'floyd-steinberg' : 'nearest' })
      pixels = new ImageData(new Uint8ClampedArray(result.toUint8Array()), width, height)
    }
    const buffer = await encode(pixels, options), meta = FORMATS.find(item => item.value === options.format)!
    const blob = new Blob([buffer], { type: meta.mime })
    // Decode the encoded bytes so the comparator shows real compression loss.
    const decoded = await readImage(blob, options.format)
    const preview = await canvasFor(decoded).convertToBlob({ type: 'image/png' })
    scope.postMessage({ blob, preview, width, height })
  } catch (issue) { scope.postMessage({ error: issue instanceof Error ? issue.message : 'Gambar tidak dapat diproses.' }) }
}
