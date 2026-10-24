import { useEffect, useRef, useState } from 'react'
import { createWorker, processImage } from './client'
import type { Result, Source } from './client'
import type { Options } from './options'
import { outputSize } from './options'

export function useResult(source: Source | null, options: Options) {
  const [completed, setCompleted] = useState<{ source: Source; options: Options; result: Result } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)
  useEffect(() => {
    setCompleted(null); setError(''); setBusy(false)
    if (!source) return
    if (options.format === 'original') { setCompleted({ source, options, result: { blob: source.file, url: source.url, width: source.width, height: source.height } }); return }
    try { outputSize(source.width, source.height, options) } catch (issue) { setError((issue as Error).message); return }
    const controller = new AbortController(); controllerRef.current = controller
    let worker: Worker | undefined, url = ''
    setBusy(true)
    const timer = setTimeout(() => {
      worker = createWorker()
      void processImage(worker, source, options, controller.signal).then(data => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(data.preview)
        setCompleted({ source, options, result: { ...data, url } })
      }).catch(issue => { if (!controller.signal.aborted) setError((issue as Error).message) }).finally(() => { worker?.terminate(); if (!controller.signal.aborted) setBusy(false) })
    }, 300)
    return () => { clearTimeout(timer); controller.abort(); worker?.terminate(); if (url) URL.revokeObjectURL(url) }
  }, [source, options, revision])
  const result = completed?.source === source && completed?.options === options ? completed.result : null
  return { result, busy, error, retry: () => setRevision(value => value + 1), cancel: () => { controllerRef.current?.abort(); setBusy(false); setCompleted(null); setError('Pemrosesan dibatalkan.') } }
}
