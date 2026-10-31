import assert from 'node:assert/strict'
import { test } from 'node:test'
import { discoverPrinters, executePrint, printLimits } from './print-choice.ts'
import type { PrintConnection, PrintPreference } from './print-choice.ts'

const ready: PrintConnection = { status: 'ready', printers: ['Label printer'] }
function setup(preference: PrintPreference = 'auto', connection: PrintConnection = ready) {
  const calls: string[] = []
  return { calls, options: {
    preference, limits: printLimits(1, 100, 150), printer: '',
    discover: async () => { calls.push('discover'); return connection },
    client: async (printer: string) => { calls.push('client:' + printer) },
    browser: async () => { calls.push('browser') },
    pdf: async () => { calls.push('pdf') },
  } }
}
test('automatically uses the installed client and falls back before sending when unavailable', async () => {
  const connected = setup()
  assert.equal(await executePrint(connected.options), 'client')
  assert.deepEqual(connected.calls, ['discover', 'client:Label printer'])
  for (const status of ['empty', 'unavailable'] as const) {
    const fallback = setup('auto', { status, printers: [] })
    assert.equal(await executePrint(fallback.options), 'browser')
    assert.deepEqual(fallback.calls, ['discover', 'browser'])
  }
})
test('never retries a potentially submitted job through browser or PDF', async () => {
  const run = setup()
  run.options.client = async () => { run.calls.push('submitted'); throw new Error('Connection lost after submission') }
  await assert.rejects(executePrint(run.options))
  assert.deepEqual(run.calls, ['discover', 'submitted'])
})
test('honors manual browser/PDF selection without waiting for the client', async () => {
  for (const preference of ['browser', 'pdf'] as const) {
    const run = setup(preference)
    assert.equal(await executePrint(run.options), preference)
    assert.deepEqual(run.calls, [preference])
  }
})
test('retains the chosen printer but does not silently switch when it disappears', async () => {
  const run = setup('auto', { status: 'ready', printers: ['Printer A', 'Printer B'] })
  run.options.printer = 'Printer B'
  await executePrint(run.options)
  assert.deepEqual(run.calls, ['discover', 'client:Printer B'])
  run.calls.length = 0
  run.options.printer = 'Removed printer'
  assert.equal(await executePrint(run.options), 'choose-printer')
  assert.deepEqual(run.calls, ['discover'])
})
test('large jobs go to PDF and tiny paper goes to browser without submitting an unsupported job', async () => {
  for (const limits of [printLimits(101, 100, 150), printLimits(1, 1000, 1000)]) {
    const run = setup(); run.options.limits = limits
    assert.equal(await executePrint(run.options), 'pdf')
    assert.deepEqual(run.calls, ['pdf'])
  }
  const tiny = setup(); tiny.options.limits = printLimits(1, 3, 10)
  assert.equal(await executePrint(tiny.options), 'browser')
  assert.deepEqual(tiny.calls, ['browser'])
})
test('discovery handles permission/network errors, invalid responses, and duplicate names', async () => {
  for (const request of [async () => { throw new Error('Offline') }, async () => ({ printers: [] }), async () => ['']]) {
    assert.deepEqual(await discoverPrinters(request), { status: 'unavailable', printers: [] })
  }
  assert.deepEqual(await discoverPrinters(async () => []), { status: 'empty', printers: [] })
  assert.deepEqual(await discoverPrinters(async () => ['Printer A', 'Printer A']), { status: 'ready', printers: ['Printer A'] })
})

test('a replacement printer requires selection, including when it is the only one left', async () => {
  const run = setup('auto', { status: 'ready', printers: ['New printer'] })
  run.options.printer = 'Original printer'
  assert.equal(await executePrint(run.options), 'choose-printer')
  assert.deepEqual(run.calls, ['discover'])
})

test('long raster jobs use the client when present, or PDF to avoid exhausting browser memory', async () => {
  const connected = setup(); connected.options.limits = printLimits(40, 210, 297)
  assert.equal(await executePrint(connected.options), 'client')
  const disconnected = setup('auto', { status: 'unavailable', printers: [] }); disconnected.options.limits = connected.options.limits
  assert.equal(await executePrint(disconnected.options), 'pdf')
  assert.deepEqual(disconnected.calls, ['discover', 'pdf'])
})
