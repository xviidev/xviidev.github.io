import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { imageSize } from './options'
import type { ImageFormat } from './options'

GlobalWorkerOptions.workerSrc = workerUrl
export function openPdf(data: Uint8Array) {
  const assets = `${import.meta.env.BASE_URL}pdfjs/`
  return getDocument({ data, cMapUrl: `${assets}cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, useSystemFonts: false })
}

export async function renderImage(pdf: PDFDocumentProxy, number: number, dpi: number, format: ImageFormat, signal: AbortSignal, preview = false) {
  signal.throwIfAborted()
  const page = await pdf.getPage(number)
  signal.throwIfAborted()
  const original = page.getViewport({ scale: 1 })
  const size = preview
    ? { scale: Math.min(1, 900 / Math.max(original.width, original.height)) }
    : imageSize(original.width, original.height, dpi)
  const viewport = page.getViewport({ scale: size.scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width - 1e-8); canvas.height = Math.ceil(viewport.height - 1e-8)
  const task = page.render({ canvas, viewport, background: 'rgb(255,255,255)' })
  const cancel = () => task.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    await task.promise
    signal.throwIfAborted()
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Gambar gagal dibuat. Turunkan kualitas dan coba kembali.')), format === 'jpg' ? 'image/jpeg' : 'image/png', 0.92))
    signal.throwIfAborted()
    return { blob, width: original.width, height: original.height }
  } finally {
    signal.removeEventListener('abort', cancel)
    canvas.width = 0; canvas.height = 0
    page.cleanup()
  }
}
