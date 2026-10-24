import { useEffect, useId, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@xviidev/ui/components/button'
import { Field, FieldLabel } from '@xviidev/ui/components/field'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from '@xviidev/ui/components/input-group'
import { Badge } from '@xviidev/ui/components/badge'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { ArrowLeftIcon, ArrowRightIcon, LoaderCircleIcon, Redo2Icon } from '@xviidev/ui/lib/icons'
import { cn } from '@xviidev/ui/lib/utils'

export function PdfPreview({ file, total, selectedPages, compact = false }: { file: File; total: number; selectedPages?: readonly number[]; compact?: boolean }) {
  const root = useRef<HTMLElement>(null), id = useId()
  const [visible, setVisible] = useState(false), [current, setCurrent] = useState(1), [draft, setDraft] = useState('1'), [revision, setRevision] = useState(0)
  const [document, setDocument] = useState<{ file: File; pdf: PDFDocumentProxy } | null>(null), [loadError, setLoadError] = useState('')
  const [image, setImage] = useState<{ pdf: PDFDocumentProxy; page: number; url: string } | null>(null), [renderError, setRenderError] = useState('')
  const pdf = document?.file === file ? document.pdf : null
  const url = image?.pdf === pdf && image?.page === current ? image.url : ''
  const error = loadError || renderError
  useEffect(() => { const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '150px' }); observer.observe(root.current!); return () => observer.disconnect() }, [])
  useEffect(() => { setCurrent(1); setDraft('1') }, [file])
  useEffect(() => {
    let cancelled = false, task: PDFDocumentLoadingTask | undefined
    setDocument(null); setLoadError('')
    if (!visible) return
    void Promise.all([import('./preview-render'), file.arrayBuffer()]).then(async ([{ openPreview }, buffer]) => {
      if (cancelled) return
      task = openPreview(new Uint8Array(buffer))
      task.onPassword = () => { if (!cancelled) setLoadError('Pratinjau PDF terenkripsi belum didukung.'); void task?.destroy().catch(() => {}) }
      const pdf = await task.promise
      if (!cancelled) setDocument({ file, pdf })
    }).catch(() => { if (!cancelled) setLoadError('Pratinjau tidak dapat dibuka. Coba muat kembali.') })
    return () => { cancelled = true; void task?.destroy().catch(() => {}) }
  }, [file, visible, revision])
  useEffect(() => {
    const controller = new AbortController()
    let imageUrl = ''
    setImage(null); setRenderError('')
    if (!pdf || !visible) return
    const timer = setTimeout(() => {
      void import('./preview-render').then(({ renderPreview }) => renderPreview(pdf, current, compact ? 720 : 1200, controller.signal)).then(blob => {
        if (controller.signal.aborted) return
        imageUrl = URL.createObjectURL(blob); setImage({ pdf, page: current, url: imageUrl })
      }).catch(() => { if (!controller.signal.aborted) setRenderError('Halaman ini gagal ditampilkan. Coba halaman lain atau muat kembali.') })
    }, 120)
    return () => { clearTimeout(timer); controller.abort(); if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [pdf, current, compact, visible])
  function navigate(page: number) { const target = Math.max(1, Math.min(total, page)); setCurrent(target); setDraft(String(target)) }
  const selected = selectedPages?.includes(current - 1)
  return <section ref={root} aria-label={`Pratinjau ${file.name}`} className="flex min-w-0 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Pratinjau halaman</p>{selectedPages && <Badge variant={selected ? 'secondary' : 'outline'}>{selected ? 'Dipilih' : 'Tidak dipilih'}</Badge>}</div>
    <div className={cn('flex items-center justify-center overflow-hidden bg-muted p-3', compact ? 'h-72' : 'h-[clamp(18rem,60dvh,34rem)]')} aria-busy={visible && !url && !error}>
      {url ? <img src={url} alt={`Halaman ${current} dari ${file.name}`} className="max-h-full max-w-full object-contain shadow-sm" /> : error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />{visible ? 'Menyiapkan pratinjau…' : 'Pratinjau halaman'}</p>}
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button variant="outline" size="icon-sm" disabled={current <= 1} aria-label={`Halaman sebelumnya ${file.name}`} onClick={() => navigate(current - 1)}><ArrowLeftIcon /></Button>
      <Field className="w-auto"><FieldLabel className="sr-only" htmlFor={id}>Halaman pratinjau {file.name}</FieldLabel><InputGroup className="w-32"><InputGroupInput id={id} type="number" min={1} max={total} value={draft} onChange={event => { const value = event.target.value; setDraft(value); const page = Number(value); if (Number.isSafeInteger(page) && page >= 1 && page <= total) setCurrent(page) }} onBlur={() => setDraft(String(current))} onKeyDown={event => { if (event.key === 'Enter') setDraft(String(current)) }} /><InputGroupAddon align="inline-end"><InputGroupText>/ {total}</InputGroupText></InputGroupAddon></InputGroup></Field>
      <Button variant="outline" size="icon-sm" disabled={current >= total} aria-label={`Halaman berikutnya ${file.name}`} onClick={() => navigate(current + 1)}><ArrowRightIcon /></Button>
      {error && <Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}><Redo2Icon data-icon="inline-start" />Muat kembali</Button>}
    </div>
  </section>
}
