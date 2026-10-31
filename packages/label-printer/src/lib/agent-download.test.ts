import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectAgentDownload } from './agent-download.ts'
test('download matches OS and supported architecture', () => {
  assert.equal(detectAgentDownload('Windows NT 10.0; Win64; x64').asset, 'print-agent-windows7-x64.zip')
  assert.equal(detectAgentDownload('Windows NT 6.1; WOW64').asset, 'print-agent-windows7-x64.zip')
  assert.equal(detectAgentDownload('Windows NT 6.1').asset, 'print-agent-windows7-x86.zip')
  assert.equal(detectAgentDownload('Macintosh; Intel Mac OS X 10_15_7').asset, 'print-agent-macos.tar.gz')
  assert.equal(detectAgentDownload('X11; Linux x86_64').asset, 'print-agent-linux-x64.tar.gz')
})
test('unsupported or unknown systems have no download', () => {
  for (const ua of ['Windows NT 5.1', 'Windows NT 10.0; ARM64', 'Linux aarch64', 'Android; Linux x86_64', 'iPhone; Mac OS X', 'CrOS x86_64', '']) {
    assert.deepEqual(detectAgentDownload(ua), { label: 'Tidak didukung' })
  }
  assert.equal(detectAgentDownload('Macintosh; Intel Mac OS X', 5).asset, undefined)
})
