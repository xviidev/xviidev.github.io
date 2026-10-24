import { mergePdfs, openPdf, splitPdf } from './index'
import type { PdfInput } from './index'
import { validateFiles } from './options'
import type { SplitMode } from './options'
export type Request = { kind: 'info'; files: File[] } | { kind: 'merge'; inputs: PdfInput[] } | { kind: 'split'; file: File; mode: SplitMode; range: string; chunkSize: number }
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    const progress = (message: string) => self.postMessage({ progress: message })
    if (data.kind === 'info') {
      validateFiles(data.files)
      const counts: number[] = []
      for (const [i, file] of data.files.entries()) {
        progress(`Membaca file ${i + 1} dari ${data.files.length}…`)
        try { counts.push((await openPdf(file)).getPageCount()) }
        catch (error) { throw new Error(`${file.name}: ${(error as Error).message}`) }
      }
      self.postMessage({ value: counts }); return
    }
    const result = data.kind === 'merge' ? await mergePdfs(data.inputs, progress) : await splitPdf(data.file, data.mode, data.range, data.chunkSize, progress)
    self.postMessage({ value: result }, { transfer: [result.bytes.buffer] })
  } catch (error) { self.postMessage({ error: (error as Error).message || 'PDF gagal diproses.' }) }
}
