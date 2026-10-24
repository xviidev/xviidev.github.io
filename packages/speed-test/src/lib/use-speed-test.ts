import { useEffect, useRef, useState } from 'react'
import type SpeedTest from '@cloudflare/speedtest'
import type { ConfigOptions } from '@cloudflare/speedtest'
import { complete, EMPTY, MODES, parseHistory, snapshot, STORAGE_KEY } from './model'
import type { HistoryEntry, Mode, Phase, Snapshot } from './model'
export type Status = 'idle' | 'running' | 'done' | 'cancelled' | 'error'
export function useSpeedTest() {
  const [status, setStatus] = useState<Status>('idle'), [data, setData] = useState<Snapshot>(EMPTY), [phase, setPhase] = useState<Phase>('latency'), [step, setStep] = useState(0), [elapsed, setElapsed] = useState(0), [error, setError] = useState(''), [storageError, setStorageError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>(() => { try { return parseHistory(localStorage.getItem(STORAGE_KEY)) } catch { return [] } })
  const active = useRef<{ engine: SpeedTest | null; version: number; running: boolean; timer?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> }>({ engine: null, version: 0, running: false })
  function release() {
    const current = active.current
    current.version++; current.running = false; clearInterval(current.timer); clearTimeout(current.timeout)
    const engine = current.engine; current.engine = null
    if (engine) { engine.onFinish = () => {}; engine.onError = () => {}; engine.onResultsChange = () => {}; engine.onPhaseChange = () => {}; engine.pause() }
  }
  useEffect(() => {
    document.title = 'Tes kecepatan internet — XVII Dev'
    function offline() { if (active.current.running) { release(); setStatus('error'); setError('Koneksi internet terputus. Sambungkan kembali lalu ulangi tes.') } }
    window.addEventListener('offline', offline)
    function leave() { if (active.current.running) { release(); setStatus('cancelled') } }
    window.addEventListener('pagehide', leave)
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('pagehide', leave); release() }
  }, [])
  function saveHistory(next: HistoryEntry[]) { setHistory(next); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError('') } catch { setStorageError('Riwayat tidak dapat disimpan di browser ini. Hasil tes tetap dapat dilihat.') } }
  function cancel() { release(); setStatus('cancelled'); setError('') }
  async function start(mode: Mode) {
    if (active.current.running) return
    release(); const version = active.current.version, started = Date.now()
    active.current.running = true; setStatus('running'); setData(EMPTY); setPhase('latency'); setStep(0); setElapsed(0); setError('')
    const valid = () => active.current.version === version && active.current.running
    function fail(message: string) { if (!valid()) return; release(); setStatus('error'); setError(message) }
    if (!navigator.onLine) { fail('Perangkat sedang offline. Sambungkan internet terlebih dahulu.'); return }
    active.current.timer = setInterval(() => { if (valid()) setElapsed((Date.now() - started) / 1000) }, 250)
    active.current.timeout = setTimeout(() => fail('Tes melewati batas 120 detik. Coba lagi dengan mode Hemat atau periksa koneksi.'), 120_000)
    try {
      const { default: Engine } = await import('@cloudflare/speedtest')
      if (!valid()) return
      const config: ConfigOptions = { autoStart: false, measurements: MODES[mode].measurements as ConfigOptions['measurements'], logAimApiUrl: null, logMeasurementApiUrl: null, includeCredentials: false, bandwidthAbortRequestDuration: 15_000 }
      const engine = new Engine(config); active.current.engine = engine
      engine.onPhaseChange = ({ measurement, measurementId }) => { if (valid()) { setPhase(measurement.type as Phase); setStep(measurementId + 1) } }
      engine.onResultsChange = () => { if (valid()) setData(snapshot(engine.results, started)) }
      engine.onError = (_message, code) => fail(code === 429 ? 'Server sedang membatasi tes. Tunggu sebentar sebelum mencoba kembali.' : 'Pengukuran gagal. Periksa koneksi, VPN, atau pemblokir jaringan, lalu coba kembali.')
      engine.onFinish = results => {
        if (!valid()) return
        const final = snapshot(results, started), duration = (Date.now() - started) / 1000
        setData(final); setElapsed(duration)
        if (!complete(final.metrics)) { fail('Hasil belum lengkap. Coba ulangi tes atau gunakan mode Standar.'); return }
        release(); setStatus('done')
        // Read again to retain results saved by another tab while this test ran.
        let previous = history
        try { previous = parseHistory(localStorage.getItem(STORAGE_KEY)) } catch { /* In-memory history still works without storage. */ }
        saveHistory([{ id: crypto.randomUUID(), date: new Date().toISOString(), mode, duration, metrics: final.metrics }, ...previous].slice(0, 20))
      }
      engine.play()
    } catch { fail('Mesin pengukuran tidak dapat dimulai. Muat ulang halaman lalu coba lagi.') }
  }
  return { status, data, phase, step, elapsed, error, history, storageError, start, cancel, clearHistory: () => saveHistory([]) }
}
