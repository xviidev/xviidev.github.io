import { useEffect, useRef, useState } from 'react'
import type { Request } from './pdf-tools.worker'
import type { Output } from './index'
export type { Output } from './index'
export function usePdfJob() {
  const current = useRef<{ worker: Worker; reject: (error: Error) => void } | null>(null)
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState('')
  function stop() { const job = current.current; if (!job) return; current.current = null; job.worker.terminate(); job.reject(new DOMException('Dibatalkan', 'AbortError')); setBusy(false); setProgress('') }
  useEffect(() => () => { const job = current.current; current.current = null; job?.worker.terminate(); job?.reject(new DOMException('Dibatalkan', 'AbortError')) }, [])
  async function run<T>(request: Request): Promise<T> {
    stop(); setBusy(true); setProgress('Menyiapkan…')
    let worker: Worker
    try { worker = new Worker(new URL('./pdf-tools.worker.ts', import.meta.url), { type: 'module' }) }
    catch { setBusy(false); setProgress(''); throw new Error('Pemrosesan PDF tidak dapat dimulai. Muat ulang halaman dan coba kembali.') }
    try {
      return await new Promise<T>((resolve, reject) => {
        current.current = { worker, reject }
        worker.onmessage = ({ data }) => { if ('progress' in data) setProgress(data.progress); else if (data.error) reject(new Error(data.error)); else resolve(data.value) }
        worker.onerror = () => reject(new Error('Pemrosesan PDF terhenti. Coba file lebih kecil.'))
        worker.postMessage(request)
      })
    } finally { worker.terminate(); if (current.current?.worker === worker) { current.current = null; setBusy(false); setProgress('') } }
  }
  return { busy, progress, run, stop }
}
export function downloadOutput(output: Output) {
  const url = URL.createObjectURL(new Blob([output.bytes], { type: output.type })), link = document.createElement('a')
  link.href = url; link.download = output.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export function errorMessage(error: unknown) { return (error as Error)?.name === 'AbortError' ? 'Pemrosesan dibatalkan.' : (error as Error)?.message || 'PDF gagal diproses.' }
