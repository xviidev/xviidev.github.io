import { Zip, ZipPassThrough } from 'fflate'
import { MAX_ZIP_BYTES } from './options.ts'

// Images are already compressed. Store each result as it completes, without
// keeping another full copy of all input images in memory.
export function imageArchive() {
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let bytes = 0, failure: Error | null = null
  const zip = new Zip((error, data) => {
    if (error) { failure = error; return }
    bytes += data.byteLength
    if (bytes > MAX_ZIP_BYTES) { failure = new Error('ZIP melebihi 256 MB. Pilih lebih sedikit halaman atau turunkan kualitas.'); return }
    chunks.push(new Uint8Array(data))
  })
  return {
    add(name: string, data: Uint8Array) {
      const file = new ZipPassThrough(name)
      zip.add(file); file.push(data, true)
      if (failure) throw failure
    },
    finish() {
      zip.end()
      if (failure) throw failure
      return new Blob(chunks, { type: 'application/zip' })
    },
    cancel() { zip.terminate(); chunks.length = 0 },
  }
}
