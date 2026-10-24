import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync } from 'fflate'
import { imageArchive } from './archive.ts'

test('ZIP preserves original image bytes and ordered filenames', async () => {
  const zip = imageArchive()
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), jpg = new Uint8Array([255, 216, 255, 224, 0, 1])
  zip.add('dokumen-halaman-01.png', png)
  zip.add('dokumen-halaman-02.jpg', jpg)
  const blob = zip.finish()
  assert.equal(blob.type, 'application/zip')
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  assert.deepEqual(Object.keys(files), ['dokumen-halaman-01.png', 'dokumen-halaman-02.jpg'])
  assert.deepEqual(files['dokumen-halaman-01.png'], png)
  assert.deepEqual(files['dokumen-halaman-02.jpg'], jpg)
  zip.cancel()
})
