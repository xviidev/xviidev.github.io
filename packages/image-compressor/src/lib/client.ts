import type { Options } from './options'
export interface Source { file: File; pixels: ImageData; url: string; width: number; height: number }
export interface Result { blob: Blob; url: string; width: number; height: number }
export function createWorker() { return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) }
export function askWorker<T>(worker: Worker, data: unknown, signal: AbortSignal, transfer: Transferable[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = () => { clearTimeout(timeout); signal.removeEventListener('abort', abort); worker.onmessage = null; worker.onerror = null }
    const abort = () => { finish(); worker.terminate(); reject(new DOMException('Dibatalkan', 'AbortError')) }
    const timeout = setTimeout(() => { finish(); worker.terminate(); reject(new Error('Pemrosesan terlalu lama. Perkecil gambar atau turunkan upaya kompresi.')) }, 120000)
    worker.onmessage = event => { finish(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data) }
    worker.onerror = event => { event.preventDefault(); finish(); reject(new Error('Pemrosesan gambar gagal. Coba format lain atau gambar lebih kecil.')) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { abort(); return }
    worker.postMessage(data, transfer)
  })
}
export async function processImage(worker: Worker, source: Source, options: Options, signal: AbortSignal) {
  const pixels = new ImageData(new Uint8ClampedArray(source.pixels.data), source.width, source.height)
  return askWorker<Omit<Result, 'url'> & { preview: Blob }>(worker, { kind: 'encode', pixels, options }, signal, [pixels.data.buffer])
}
