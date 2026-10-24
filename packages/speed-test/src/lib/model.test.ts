import { test } from 'node:test'
import assert from 'node:assert/strict'
import { complete, EMPTY, historyCsv, metric, MODES, parseHistory, snapshot } from './model.ts'
const entry = { id: 'test-1', date: '2026-10-24T01:00:00.000Z', mode: 'hemat' as const, duration: 12, metrics: { download: 50, upload: 20, ping: 8, jitter: 0 } }
test('measurement profiles have honest payload estimates, latency samples, and both transfer directions', () => {
  for (const mode of Object.values(MODES)) {
    assert.equal(mode.measurements.reduce((sum, m) => sum + (m.bytes ?? 0) * (m.count ?? 0), 0), mode.bytes)
    assert.ok(mode.measurements.some(m => m.type === 'latency' && m.numPackets! >= 2))
    assert.ok(mode.measurements.some(m => m.type === 'download'))
    assert.ok(mode.measurements.some(m => m.type === 'upload'))
  }
  assert.ok(MODES.hemat.bytes < 7_000_000); assert.ok(MODES.standar.bytes < 79_000_000)
})
test('missing, invalid and unmeasured speeds never become zero results or completed tests', () => {
  for (const value of [undefined, null, NaN, Infinity, -1, '50']) assert.equal(metric(value), null)
  assert.equal(metric(0), 0); assert.equal(metric(0, true), null)
  assert.equal(complete(EMPTY.metrics), false)
  assert.equal(complete({ ...entry.metrics, upload: null }), false)
  assert.equal(complete({ ...entry.metrics, download: 0 }), false)
  assert.equal(complete(entry.metrics), true)
})
test('engine readings convert bps to Mbps and retain only real timestamped graph samples', () => {
  const data = snapshot({ getSummary: () => ({ download: 50e6, upload: 10e6, latency: 12, jitter: 0, downLoadedLatency: 30, upLoadedLatency: NaN }), getUnloadedLatencyPoints: () => [12, 12], getDownLoadedLatencyPoints: () => [30], getUpLoadedLatencyPoints: () => [], getDownloadBandwidthPoints: () => [{ bps: 25e6, measTime: new Date(2000) }, { bps: NaN, measTime: new Date(3000) }, { bps: 1e6, measTime: new Date(NaN) }], getUploadBandwidthPoints: () => [] }, 1000)
  assert.deepEqual(data.metrics, { download: 50, upload: 10, ping: 12, jitter: 0 })
  assert.deepEqual(data.download, [{ seconds: 1, mbps: 25 }]); assert.deepEqual(data.upload, [])
  assert.equal(data.loadedDownload, 30); assert.equal(data.loadedUpload, null)
})
test('history rejects broken, partial and injected records and retains a bounded clean schema', () => {
  for (const raw of [null, 'bad JSON', '{}', 'null']) assert.deepEqual(parseHistory(raw), [])
  const dirty = [entry, { ...entry, metrics: { ...entry.metrics, upload: null } }, { ...entry, mode: '=cmd' }, { ...entry, date: 'bad' }, { ...entry, duration: -1 }, { ...entry, extra: 'not retained' }]
  const clean = parseHistory(JSON.stringify(dirty)); assert.equal(clean.length, 2); assert.deepEqual(clean[1], entry)
  assert.equal(parseHistory(JSON.stringify(Array(40).fill(entry))).length, 20)
})
test('CSV exports only validated measurements with explicit units and preserves zero jitter', () => {
  const csv = historyCsv([entry])
  assert.ok(csv.startsWith('\ufeff')); assert.match(csv, /Download \(Mbps\)/); assert.match(csv, /Ping \(ms\)/)
  assert.match(csv, /hemat;50;20;8;0;12/)
  assert.equal(csv.split('\r\n').length, 2)
})

test('an initialized engine with no successful latency sample does not display a measured zero', () => {
  const raw = { getSummary: () => ({ latency: 0, jitter: 0, downLoadedLatency: 0, upLoadedLatency: 0 }), getUnloadedLatencyPoints: () => [] as number[], getDownLoadedLatencyPoints: () => [] as number[], getUpLoadedLatencyPoints: () => [] as number[], getDownloadBandwidthPoints: () => [], getUploadBandwidthPoints: () => [] }
  assert.deepEqual(snapshot(raw, 0).metrics, EMPTY.metrics)
  assert.equal(snapshot(raw, 0).loadedDownload, null)
  raw.getUnloadedLatencyPoints = () => [0]
  assert.equal(snapshot(raw, 0).metrics.ping, 0)
  assert.equal(snapshot(raw, 0).metrics.jitter, null)
  raw.getUnloadedLatencyPoints = () => [0, 0]
  assert.equal(snapshot(raw, 0).metrics.jitter, 0)
})
