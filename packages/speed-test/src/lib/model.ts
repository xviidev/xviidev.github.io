export type Mode = 'hemat' | 'standar'
export type Phase = 'latency' | 'download' | 'upload'
export interface Metrics { download: number | null; upload: number | null; ping: number | null; jitter: number | null }
export interface Point { seconds: number; mbps: number }
export interface Snapshot { metrics: Metrics; download: Point[]; upload: Point[]; loadedDownload: number | null; loadedUpload: number | null }
export interface HistoryEntry { id: string; date: string; mode: Mode; duration: number; metrics: Metrics }
export const STORAGE_KEY = 'xvii-speed-test-history-v1'
export const EMPTY: Snapshot = { metrics: { download: null, upload: null, ping: null, jitter: null }, download: [], upload: [], loadedDownload: null, loadedUpload: null }
export interface Measurement { type: Phase; numPackets?: number; bytes?: number; count?: number }
export const MODES: Record<Mode, { label: string; bytes: number; measurements: Measurement[] }> = {
  hemat: { label: 'Hemat', bytes: 6_600_000, measurements: [
    { type: 'latency', numPackets: 10 }, { type: 'download', bytes: 100_000, count: 3 }, { type: 'download', bytes: 1_000_000, count: 3 }, { type: 'upload', bytes: 100_000, count: 3 }, { type: 'upload', bytes: 1_000_000, count: 3 },
  ] },
  standar: { label: 'Standar', bytes: 78_600_000, measurements: [
    { type: 'latency', numPackets: 20 }, { type: 'download', bytes: 100_000, count: 3 }, { type: 'download', bytes: 1_000_000, count: 4 }, { type: 'download', bytes: 10_000_000, count: 4 }, { type: 'upload', bytes: 100_000, count: 3 }, { type: 'upload', bytes: 1_000_000, count: 4 }, { type: 'upload', bytes: 10_000_000, count: 3 },
  ] },
}
export function metric(value: unknown, positive = false): number | null { return typeof value === 'number' && Number.isFinite(value) && (positive ? value > 0 : value >= 0) ? value : null }
export function complete(metrics: Metrics) { return metric(metrics.download, true) !== null && metric(metrics.upload, true) !== null && metric(metrics.ping) !== null && metric(metrics.jitter) !== null }
export function display(value: number | null) { return value === null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: value < 10 ? 2 : 1 }).format(value) }
interface RawPoint { bps: number; measTime: Date }
interface RawResults {
  getSummary(): { download?: number; upload?: number; latency?: number; jitter?: number; downLoadedLatency?: number; upLoadedLatency?: number }
  getUnloadedLatencyPoints(): number[]
  getDownLoadedLatencyPoints(): number[]
  getUpLoadedLatencyPoints(): number[]
  getDownloadBandwidthPoints(): RawPoint[]
  getUploadBandwidthPoints(): RawPoint[]
}
export function snapshot(results: RawResults, started: number): Snapshot {
  const summary = results.getSummary()
  const latency = results.getUnloadedLatencyPoints().filter(value => metric(value) !== null)
  const downLatency = results.getDownLoadedLatencyPoints().filter(value => metric(value) !== null)
  const upLatency = results.getUpLoadedLatencyPoints().filter(value => metric(value) !== null)
  function points(list: RawPoint[]): Point[] { return list.filter(point => metric(point.bps, true) !== null && Number.isFinite(+point.measTime)).slice(-150).map(point => ({ seconds: Math.max(0, (+point.measTime - started) / 1000), mbps: point.bps / 1e6 })) }
  return { metrics: { download: metric(summary.download, true) === null ? null : summary.download! / 1e6, upload: metric(summary.upload, true) === null ? null : summary.upload! / 1e6, ping: latency.length ? metric(summary.latency) : null, jitter: latency.length > 1 ? metric(summary.jitter) : null }, download: points(results.getDownloadBandwidthPoints()), upload: points(results.getUploadBandwidthPoints()), loadedDownload: downLatency.length ? metric(summary.downLoadedLatency) : null, loadedUpload: upLatency.length ? metric(summary.upLoadedLatency) : null }
}
export function parseHistory(raw: string | null): HistoryEntry[] {
  try {
    const entries: unknown = JSON.parse(raw ?? '[]')
    if (!Array.isArray(entries)) return []
    return entries.filter((item): item is HistoryEntry => {
      if (!item || typeof item !== 'object') return false
      const e = item as HistoryEntry, m = e.metrics
      return typeof e.id === 'string' && e.id.length <= 100 && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(e.date) && Number.isFinite(Date.parse(e.date)) && (e.mode === 'hemat' || e.mode === 'standar') && metric(e.duration, true) !== null && m && metric(m.download, true) !== null && metric(m.upload, true) !== null && metric(m.ping) !== null && metric(m.jitter) !== null
    }).slice(0, 20).map(e => ({ id: e.id, date: e.date, mode: e.mode, duration: e.duration, metrics: { download: e.metrics.download, upload: e.metrics.upload, ping: e.metrics.ping, jitter: e.metrics.jitter } }))
  } catch { return [] }
}
export function historyCsv(entries: HistoryEntry[]) {
  return '\ufeff' + [['Waktu (ISO 8601)', 'Mode', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'Durasi (detik)'].join(';'), ...parseHistory(JSON.stringify(entries)).map(e => [e.date, e.mode, e.metrics.download, e.metrics.upload, e.metrics.ping, e.metrics.jitter, e.duration].join(';'))].join('\r\n')
}
