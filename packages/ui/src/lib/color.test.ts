import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHexColor } from './color.ts'

test('HEX input normalizes pasted and shorthand colors to opaque six-digit sRGB', () => {
  for (const [input, expected] of [['#ABC', '#aabbcc'], ['fff', '#ffffff'], ['123ABC', '#123abc'], [' #166534 ', '#166534'], ['#000000', '#000000']]) {
    assert.equal(normalizeHexColor(input), expected)
  }
})

test('invalid and transparent colors never reach color picker consumers', () => {
  for (const input of ['', '#12', '#abcd', '#12345678', 'red', 'rgb(0,0,0)', 'transparent', '#gggggg', 'url(https://example.com)', '#111111; color:red']) {
    assert.equal(normalizeHexColor(input), undefined)
  }
})
