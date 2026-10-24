import { validateDimensions } from './options'
export async function rasterizeSvg(file: File, signal: AbortSignal) {
  const url = URL.createObjectURL(file), image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new DOMException('Dibatalkan', 'AbortError')) }
      signal.addEventListener('abort', abort, { once: true })
      image.src = url
      image.onload = () => { signal.removeEventListener('abort', abort); resolve() }
      image.onerror = () => { signal.removeEventListener('abort', abort); reject(new Error('SVG tidak dapat dibaca.')) }
      if (signal.aborted) abort()
    })
    signal.throwIfAborted(); validateDimensions(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('SVG gagal dirender.')), 'image/png'))
    canvas.width = 0; canvas.height = 0
    signal.throwIfAborted()
    return new File([blob], 'gambar.png', { type: 'image/png' })
  } finally { URL.revokeObjectURL(url) }
}
