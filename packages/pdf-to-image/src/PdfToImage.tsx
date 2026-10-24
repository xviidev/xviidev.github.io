import { FileUpload } from '@xviidev/ui/components/file-upload'
import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@xviidev/ui/components/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@xviidev/ui/components/input-group'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@xviidev/ui/components/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { DownloadIcon, ArrowLeftIcon, ArrowRightIcon, FileTextIcon, KeyRoundIcon, RulerIcon, ListOrderedIcon, HashIcon, FileImageIcon, ScanLineIcon, Rows3Icon } from '@xviidev/ui/lib/icons'
import { baseName, imageName, imageSize, MAX_FILE_BYTES, parsePages } from './lib/options'
import type { ImageFormat } from './lib/options'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
function message(error: unknown) {
  const name = (error as Error)?.name
  if (name === 'InvalidPDFException') return 'File PDF rusak atau tidak dapat dibaca. Coba dokumen lain.'
  return (error as Error)?.message || 'Proses gagal. Coba kembali dengan dokumen lain.'
}

export default function PdfToImage() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null), [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [passwordPrompt, setPasswordPrompt] = useState(''), [password, setPassword] = useState('')
  const passwordCallback = useRef<((value: string) => void) | null>(null)
  const loadingTask = useRef<PDFDocumentLoadingTask | null>(null), generation = useRef(0)
  const [format, setFormat] = useState<ImageFormat>('png'), [quality, setQuality] = useState('150'), [customDpi, setCustomDpi] = useState('300')
  const [pageMode, setPageMode] = useState('all'), [range, setRange] = useState('')
  const [current, setCurrent] = useState(1), [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false), [previewError, setPreviewError] = useState('')
  const [exporting, setExporting] = useState(false), [progress, setProgress] = useState('')
  const exporter = useRef<AbortController | null>(null)
  const filename = file?.name ?? ''
  const dpi = Number(quality === 'custom' ? customDpi : quality)
  const dpiError = !Number.isFinite(dpi) || dpi < 72 || dpi > 600 ? 'DPI harus berada dalam 72–600.' : ''
  let pages: number[] = [], rangeError = ''
  if (pdf) {
    try { pages = pageMode === 'all' ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : parsePages(range, pdf.numPages) }
    catch (issue) { rangeError = message(issue) }
  }
  let dimensions = '', sizeError = ''
  if (preview && !dpiError) {
    try { const size = imageSize(preview.width, preview.height, dpi); dimensions = `${size.width.toLocaleString('id-ID')} × ${size.height.toLocaleString('id-ID')} px` }
    catch (issue) { sizeError = message(issue) }
  }

  useEffect(() => {
    document.title = 'PDF ke gambar — XVII Dev'
    return () => { generation.current++; exporter.current?.abort(); void loadingTask.current?.destroy() }
  }, [])
  useEffect(() => {
    if (!pdf) { setPreview(null); setPreviewLoading(false); setPreviewError(''); return }
    const controller = new AbortController()
    let url = ''
    setPreview(null); setPreviewLoading(true); setPreviewError('')
    void import('./lib/render').then(({ renderImage }) => renderImage(pdf, current, 72, 'png', controller.signal, true)).then(result => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(result.blob)
      setPreview({ url, width: result.width, height: result.height })
    }).catch(issue => { if (!controller.signal.aborted) setPreviewError(message(issue)) }).finally(() => { if (!controller.signal.aborted) setPreviewLoading(false) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [pdf, current])

  function clear() {
    generation.current++; exporter.current?.abort()
    void loadingTask.current?.destroy(); loadingTask.current = null
    passwordCallback.current = null
    setPdf(null); setFile(null); setLoading(false); setPasswordPrompt(''); setPassword(''); setError(''); setProgress('')
  }
  async function load(file: File) {
    clear()
    if (file.size > MAX_FILE_BYTES) { setError('Ukuran PDF maksimal 100 MB.'); return }
    if (!file.size) { setError('File kosong. Pilih dokumen PDF.'); return }
    const version = generation.current
    setLoading(true); setFile(file); setCurrent(1); setPageMode('all'); setRange('')
    try {
      const [{ openPdf }, buffer] = await Promise.all([import('./lib/render'), file.arrayBuffer()])
      if (version !== generation.current) return
      const task = openPdf(new Uint8Array(buffer)); loadingTask.current = task
      task.onPassword = (callback: (value: string) => void, reason: number) => {
        if (version !== generation.current) return
        passwordCallback.current = callback
        setPassword(''); setPasswordPrompt(reason === 2 ? 'Kata sandi salah. Coba kembali.' : 'PDF ini memerlukan kata sandi.')
      }
      const document = await task.promise
      if (version !== generation.current) { void task.destroy(); return }
      passwordCallback.current = null; setPasswordPrompt(''); setPassword(''); setPdf(document)
    } catch (issue) { if (version === generation.current) { setError(message(issue)); setFile(null); void loadingTask.current?.destroy(); loadingTask.current = null } }
    finally { if (version === generation.current) setLoading(false) }
  }
  async function save(single: boolean) {
    if (!pdf || exporting || dpiError || (!single && (rangeError || !pages.length))) return
    const controller = new AbortController(); exporter.current = controller
    const targets = single ? [current] : pages
    setExporting(true); setError(''); setProgress('Menyiapkan gambar…')
    let archive: ReturnType<typeof import('./lib/archive').imageArchive> | undefined
    try {
      const { renderImage } = await import('./lib/render')
      if (!single) { const { imageArchive } = await import('./lib/archive'); archive = imageArchive() }
      for (const [index, page] of targets.entries()) {
        controller.signal.throwIfAborted()
        setProgress(`Memproses halaman ${page} · ${index + 1} dari ${targets.length}`)
        const result = await renderImage(pdf, page, dpi, format, controller.signal)
        const name = imageName(filename, page, pdf.numPages, format)
        if (archive) archive.add(name, new Uint8Array(await result.blob.arrayBuffer()))
        else download(result.blob, name)
      }
      controller.signal.throwIfAborted()
      if (archive) download(archive.finish(), `${baseName(filename)}.zip`)
      setProgress(single ? 'Gambar siap diunduh.' : `${targets.length} halaman siap diunduh dalam ZIP.`)
    } catch (issue) {
      if (controller.signal.aborted) setProgress('Konversi dibatalkan.')
      else { setError(message(issue)); setProgress('') }
    } finally { archive?.cancel(); exporter.current = null; setExporting(false) }
  }

  return <>
    <div className="mb-6 flex flex-col gap-3"><h1 className="text-2xl font-medium">PDF ke gambar</h1><p className="max-w-2xl text-muted-foreground">Ubah halaman PDF menjadi PNG atau JPG. Pilih halaman yang diperlukan, lalu unduh satuan atau sekaligus.</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Dokumen PDF</CardTitle><CardDescription>File diproses di perangkat Anda, tanpa diunggah ke server.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          <FieldGroup><Field><FieldLabel htmlFor="pdf-file">Pilih PDF</FieldLabel><FileUpload id="pdf-file" file={file} accept="application/pdf,.pdf" maxSize={MAX_FILE_BYTES} icon={FileTextIcon} label="Pilih PDF" hint="PDF · maksimal 100 MB" busy={loading} status={loading ? passwordPrompt ? "Menunggu kata sandi PDF." : "Membuka PDF…" : undefined} disabled={exporting} onFileSelect={load} onClear={clear} /><FieldDescription>Dokumen dikosongkan saat halaman dimuat ulang.</FieldDescription></Field></FieldGroup>
          {pdf && <p className="text-sm text-muted-foreground">{pdf.numPages.toLocaleString("id-ID")} halaman</p>}
          {passwordPrompt && <form onSubmit={event => { event.preventDefault(); passwordCallback.current?.(password); setPasswordPrompt(''); setPassword('') }}><FieldGroup><Field><FieldLabel htmlFor="pdf-password">Kata sandi PDF</FieldLabel><InputGroup><InputGroupAddon><KeyRoundIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput id="pdf-password" type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} autoFocus /></InputGroup><FieldDescription role="status">{passwordPrompt}</FieldDescription></Field><Button type="submit" disabled={!password}>Buka PDF</Button></FieldGroup></form>}
        </CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Hasil gambar</CardTitle><CardDescription>PNG untuk detail tajam; JPG untuk ukuran file lebih kecil.</CardDescription></CardHeader><CardContent><FieldGroup>
          <Field><FieldLabel htmlFor="pdf-format">Format</FieldLabel><SelectInput icon={FileImageIcon} id="pdf-format" className="w-full" value={format} disabled={exporting} onValueChange={value => setFormat(value as ImageFormat)} options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }]} /></Field>
          <Field><FieldLabel htmlFor="pdf-quality">Kualitas</FieldLabel><SelectInput icon={ScanLineIcon} id="pdf-quality" className="w-full" value={quality} disabled={exporting} onValueChange={setQuality} options={[{ value: '150', label: 'Standar' }, { value: '200', label: 'Tajam' }, { value: '300', label: 'Sangat tajam' }, { value: 'custom', label: 'DPI khusus' }]} /><FieldDescription>Kualitas lebih tinggi menghasilkan gambar dan ukuran file lebih besar.</FieldDescription></Field>
          {quality === 'custom' && <Accordion defaultValue={['dpi']}><AccordionItem value="dpi"><AccordionTrigger>Pengaturan lanjutan</AccordionTrigger><AccordionContent><Field data-invalid={!!dpiError}><FieldLabel htmlFor="pdf-dpi">Resolusi (DPI)</FieldLabel><InputGroup><InputGroupAddon><RulerIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput id="pdf-dpi" type="number" min={72} max={600} step={1} value={customDpi} disabled={exporting} aria-invalid={!!dpiError} onChange={event => setCustomDpi(event.target.value)} /></InputGroup><FieldDescription>{dpiError || '72–600 DPI. Kualitas standar menggunakan 150 DPI.'}</FieldDescription></Field></AccordionContent></AccordionItem></Accordion>}
          <Field><FieldLabel htmlFor="pdf-pages">Halaman untuk ZIP</FieldLabel><SelectInput icon={Rows3Icon} id="pdf-pages" className="w-full" value={pageMode} disabled={!pdf || exporting} onValueChange={setPageMode} options={[{ value: 'all', label: 'Semua halaman' }, { value: 'custom', label: 'Halaman tertentu' }]} /></Field>
          {pageMode === 'custom' && <Field data-invalid={!!rangeError}><FieldLabel htmlFor="pdf-range">Nomor halaman</FieldLabel><InputGroup><InputGroupAddon><ListOrderedIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput id="pdf-range" value={range} disabled={exporting} placeholder="1–3, 5, 8" aria-invalid={!!rangeError} aria-describedby="pdf-range-hint" onChange={event => setRange(event.target.value)} /></InputGroup><FieldDescription id="pdf-range-hint">{rangeError || 'Pisahkan dengan koma. Halaman diurutkan dan duplikat dilewati.'}</FieldDescription></Field>}
          <Button disabled={!pdf || exporting || !!dpiError || !!rangeError || !pages.length} onClick={() => void save(false)}><DownloadIcon data-icon="inline-start" />Unduh ZIP{pdf && !rangeError ? ` (${pages.length})` : ''}</Button>
          {exporting && <Button variant="outline" onClick={() => exporter.current?.abort()}>Batalkan konversi</Button>}
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{progress}</p>
        </FieldGroup></CardContent></Card>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </div>
      <Card className="min-w-0 lg:sticky lg:top-20"><CardHeader><CardTitle role="heading" aria-level={2}>Pratinjau halaman</CardTitle><CardDescription>Pratinjau ringan; unduhan memakai kualitas yang Anda pilih.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
        <div className="flex min-h-80 items-center justify-center overflow-hidden border border-border bg-muted p-4" aria-busy={previewLoading}>
          {preview ? <img src={preview.url} alt={`Pratinjau halaman ${current}`} className="max-h-[65vh] max-w-full object-contain" /> : <Empty><EmptyHeader><EmptyTitle>{previewLoading ? 'Menyiapkan pratinjau…' : pdf ? 'Pratinjau belum tersedia' : 'Mulai dengan memilih PDF'}</EmptyTitle><EmptyDescription>{previewError || 'Halaman dokumen akan ditampilkan di sini.'}</EmptyDescription></EmptyHeader></Empty>}
        </div>
        {pdf && <><div className="flex items-center justify-between gap-3"><Button variant="outline" size="icon" aria-label="Halaman sebelumnya" disabled={current <= 1 || exporting} onClick={() => setCurrent(value => value - 1)}><ArrowLeftIcon /></Button><p className="text-sm" role="status">Halaman {current} dari {pdf.numPages}</p><Button variant="outline" size="icon" aria-label="Halaman berikutnya" disabled={current >= pdf.numPages || exporting} onClick={() => setCurrent(value => value + 1)}><ArrowRightIcon /></Button></div><form onSubmit={event => { event.preventDefault(); const page = Number(new FormData(event.currentTarget).get("page")); if (Number.isInteger(page) && page >= 1 && page <= pdf.numPages) setCurrent(page) }}><FieldGroup className="flex-row items-end gap-3"><Field><FieldLabel htmlFor="pdf-jump">Lihat halaman</FieldLabel><InputGroup><InputGroupAddon><HashIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput id="pdf-jump" key={current} name="page" type="number" min={1} max={pdf.numPages} step={1} defaultValue={current} required disabled={exporting} /></InputGroup></Field><Button type="submit" variant="outline" disabled={exporting}>Lihat</Button></FieldGroup></form><p className="text-sm text-muted-foreground">{sizeError || dimensions}</p></>}
        <Button variant="outline" disabled={!pdf || exporting || !!dpiError || !!sizeError} onClick={() => void save(true)}><DownloadIcon data-icon="inline-start" />Unduh halaman ini{pdf ? ` · ${format.toUpperCase()}` : ''}</Button>
      </CardContent></Card>
    </div>
  </>
}
