import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaults, resizePercent, previewGeometry, rotatedOptions, outputSize, proportionalSize, validateDimensions, validateRasterHeader, outputName, sizeChange } from './options.ts'

test('rotation swaps geometry and resize validates actual output dimensions', () => {
  assert.deepEqual(outputSize(300, 200, { ...defaults('webp'), rotate: 90 }), { width: 200, height: 300 })
  assert.deepEqual(outputSize(300, 200, { ...defaults('webp'), resize: true, width: 150, height: 100 }), { width: 150, height: 100 })
  assert.deepEqual(outputSize(300, 200, { ...defaults('original'), rotate: 90 }), { width: 300, height: 200 })
})
test('aspect ratio calculations use source geometry instead of accumulating rounding errors', () => {
  assert.deepEqual(proportionalSize(100, 'width', 300, 200), { width: 100, height: 67 })
  assert.deepEqual(proportionalSize(200, 'height', 300, 200), { width: 300, height: 200 })
})
test('allocation limits and invalid values cannot silently resize or encode', () => {
  for (const [w, h] of [[0, 10], [Infinity, 2], [8193, 1], [5000, 5000], [1.2, 2]]) assert.throws(() => validateDimensions(w, h))
  for (const quality of [NaN, -1, 101]) assert.throws(() => outputSize(300, 200, { ...defaults(), quality }))
  assert.throws(() => outputSize(3000, 2000, { ...defaults(), quantize: true }))
})
test('download extensions reflect codecs while original files keep their name', () => {
  assert.equal(outputName('foto.png', 'jpeg'), 'foto-kompres.jpg')
  assert.equal(outputName('foto.PNG', 'avif'), 'foto-kompres.avif')
  assert.equal(outputName('foto.png', 'original'), 'foto.png')
  assert.equal(outputName('../foto.png', 'qoi'), '..-foto-kompres.qoi')
})
test('size differences report increases honestly', () => {
  assert.equal(sizeChange(1000, 250), '75% lebih kecil')
  assert.equal(sizeChange(1000, 1500), '50% lebih besar')
  assert.equal(sizeChange(0, 100), '')
})
test('PNG and QOI dimensions are bounded before codec allocation', () => {
  const buffer = new ArrayBuffer(24), view = new DataView(buffer)
  view.setUint32(0, 0x89504e47); view.setUint32(4, 0x0d0a1a0a); view.setUint32(16, 100000); view.setUint32(20, 100000)
  assert.throws(() => validateRasterHeader(buffer))
  view.setUint32(16, 320); view.setUint32(20, 240); assert.doesNotThrow(() => validateRasterHeader(buffer))
  view.setUint32(0, 0x716f6966); view.setUint32(4, 8193); view.setUint32(8, 1); assert.throws(() => validateRasterHeader(buffer))
})

test('percentage presets use oriented source dimensions and rotation preserves selected resize scale', () => {
  assert.deepEqual(resizePercent(320, 240, 0, 50), { width: 160, height: 120 })
  assert.deepEqual(resizePercent(320, 240, 90, 50), { width: 120, height: 160 })
  assert.deepEqual(resizePercent(3, 1, 0, 25), { width: 1, height: 1 })
  assert.throws(() => resizePercent(8192, 1, 0, 200))
  assert.throws(() => resizePercent(4000, 3000, 0, 150))
  const half = { ...defaults('png', 160, 120), resize: true }
  const rotated = rotatedOptions(half, 90)
  assert.deepEqual(outputSize(320, 240, rotated), { width: 120, height: 160 })
  assert.deepEqual(rotatedOptions(rotated, 0), half)
  assert.deepEqual(outputSize(320, 240, rotatedOptions(rotated, 270)), { width: 120, height: 160 })
})
test('comparison frame retains source resolution and matches both sides even for distorted aspect ratios', () => {
  for (const rotate of [0, 90, 180, 270] as const) {
    const size = resizePercent(320, 240, rotate, 25), options = { ...defaults('png'), ...size, rotate, resize: true }
    const frame = previewGeometry(320, 240, options)
    assert.equal(Math.max(frame.width, frame.height), 320)
    assert.equal(frame.width / frame.height, size.width / size.height)
    const swapped = rotate === 90 || rotate === 270
    assert.equal(frame.width, swapped ? frame.sourceHeight : frame.sourceWidth)
    assert.equal(frame.height, swapped ? frame.sourceWidth : frame.sourceHeight)
    assert.deepEqual(outputSize(320, 240, options), size)
  }
  const square = previewGeometry(320, 240, { ...defaults('png'), resize: true, width: 100, height: 100 })
  assert.equal(square.width, square.height)
  assert.equal(square.width, 320)
})
