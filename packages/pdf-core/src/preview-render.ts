import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = workerUrl
export function openPreview(data: Uint8Array) {
  const assets = `${import.meta.env.BASE_URL}pdfjs/`
  return getDocument({ data, cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, useSystemFonts: false, maxImageSize: 16_000_000 })
}
export async function renderPreview(pdf: PDFDocumentProxy, number: number, edge: number, signal: AbortSignal) {
  signal.throwIfAborted()
  const page = await pdf.getPage(number)
  signal.throwIfAborted()
  const original = page.getViewport({ scale: 1 })
  if (![original.width, original.height].every(value => Number.isFinite(value) && value > 0)) { page.cleanup(); throw new Error('Ukuran halaman tidak valid.') }
  const viewport = page.getViewport({ scale: Math.min(2, edge / Math.max(original.width, original.height)) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width)); canvas.height = Math.max(1, Math.ceil(viewport.height))
  const task = page.render({ canvas, viewport, background: 'rgb(255,255,255)' })
  const cancel = () => task.cancel()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    await task.promise
    signal.throwIfAborted()
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Pratinjau gagal dibuat.')), 'image/png'))
    signal.throwIfAborted()
    return blob
  } finally { signal.removeEventListener('abort', cancel); canvas.width = 0; canvas.height = 0; page.cleanup() }
}
