import { useEffect, useRef, useState } from 'react'
import { FileUpload } from '@xviidev/ui/components/file-upload'
import { Button } from '@xviidev/ui/components/button'
import { Field, FieldLabel } from '@xviidev/ui/components/field'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@xviidev/ui/components/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { Badge } from '@xviidev/ui/components/badge'
import { ImageIcon, Redo2Icon, ShieldCheckIcon } from '@xviidev/ui/lib/icons'
import { validateFile } from '@xviidev/ui/lib/file'
import { defaults, MAX_FILE_BYTES } from './lib/options'
import { askWorker, createWorker } from './lib/client'
import type { Source } from './lib/client'
import { useResult } from './lib/use-result'
import { SidePanel } from './components/SidePanel'
import { Comparison } from './components/Comparison'
import { ResultSummary } from './components/ResultSummary'
import './styles.css'
import noticesUrl from '../THIRD_PARTY_NOTICES.txt?url'

const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif,.jxl,.qoi,.gif,.bmp,.svg,image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/svg+xml'

export default function ImageCompressor() {
  const [source, setSource] = useState<Source | null>(null), [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [options, setOptions] = useState(() => defaults('jpeg'))
  const loadController = useRef<AbortController | null>(null), sourceUrl = useRef(''), version = useRef(0)
  const output = useResult(source, options)
  function clear() {
    version.current++; loadController.current?.abort(); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); sourceUrl.current = ''
    setSource(null); setFile(null); setLoading(false); setError('')
  }
  async function load(file: File) {
    const issue = validateFile(file, ACCEPT, MAX_FILE_BYTES)
    if (issue) { setError(issue); return }
    clear(); setFile(file); setLoading(true)
    const requestVersion = version.current, controller = new AbortController(); loadController.current = controller
    const worker = createWorker()
    try {
      let input = file
      if (/\.svg$/i.test(file.name) || file.type === 'image/svg+xml') {
        const { rasterizeSvg } = await import('./lib/svg')
        input = await rasterizeSvg(file, controller.signal)
      }
      const data = await askWorker<{ pixels: ImageData; preview: Blob }>(worker, { kind: 'load', file: input }, controller.signal)
      if (version.current !== requestVersion) return
      const url = URL.createObjectURL(data.preview); sourceUrl.current = url
      const width = data.pixels.width, height = data.pixels.height
      setSource({ file, pixels: data.pixels, url, width, height }); setOptions(defaults('jpeg', width, height))
    } catch (issue) {
      if (!controller.signal.aborted && version.current === requestVersion) { setError(`Gambar gagal dibuka. ${(issue as Error).message}`); setFile(null) }
    } finally { worker.terminate(); if (version.current === requestVersion) setLoading(false) }
  }
  const loadRef = useRef(load); loadRef.current = load
  useEffect(() => {
    document.title = 'Kompres gambar — XVII Dev'
    function paste(event: ClipboardEvent) { const file = event.clipboardData?.files[0]; if (file && file.type.startsWith('image/')) { event.preventDefault(); void loadRef.current(file) } }
    window.addEventListener('paste', paste)
    return () => { window.removeEventListener('paste', paste); version.current++; loadController.current?.abort(); if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current) }
  }, [])
  return <>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col gap-2"><h1 className="text-2xl font-medium">Kompres gambar</h1><p className="text-sm text-muted-foreground">Bandingkan hasil kompresi sebelum mengunduh.</p></div><Badge variant="secondary"><ShieldCheckIcon aria-hidden="true" />Diproses lokal</Badge></div>
    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    {source ? <>
      <Field className="mb-4"><FieldLabel htmlFor="image-file" className="sr-only">Gambar sumber</FieldLabel><FileUpload compact id="image-file" file={file} preview={source.url} fileDescription={`${source.width} × ${source.height} px`} accept={ACCEPT} maxSize={MAX_FILE_BYTES} icon={ImageIcon} label="Pilih gambar" busy={loading} onFileSelect={load} onClear={clear} /></Field>
      <Comparison source={source} result={output.result} busy={output.busy} error={output.error} summary={<ResultSummary source={source} options={options} {...output} />}>
        <Card size="sm" className="min-w-0"><CardHeader><CardTitle role="heading" aria-level={2}>Pengaturan hasil</CardTitle><CardAction><Button variant="ghost" size="icon-sm" aria-label="Atur ulang" title="Atur ulang" onClick={() => setOptions(defaults('jpeg', source.width, source.height))}><Redo2Icon /></Button></CardAction></CardHeader><CardContent><SidePanel source={source} options={options} setOptions={setOptions} {...output} /></CardContent></Card>
      </Comparison>
    </> : <Card className="mx-auto max-w-2xl"><CardHeader><CardTitle role="heading" aria-level={2}>Mulai dari gambar Anda</CardTitle><CardDescription>Pilih gambar, lalu lihat seberapa kecil hasilnya bisa dibuat.</CardDescription></CardHeader><CardContent><Field><FieldLabel htmlFor="image-file" className="sr-only">Gambar sumber</FieldLabel><FileUpload id="image-file" file={file} accept={ACCEPT} maxSize={MAX_FILE_BYTES} icon={ImageIcon} label="Pilih gambar" hint="JPG, PNG, WebP, AVIF, JPEG XL, QOI, GIF, BMP, SVG · maksimal 40 MB" busy={loading} onFileSelect={load} onClear={clear} /></Field></CardContent><CardFooter className="flex-col gap-2"><p className="text-sm text-muted-foreground">Atau tempel gambar dengan Ctrl+V.</p><p className="text-xs text-muted-foreground">File tetap di perangkat Anda, tanpa unggah ke server.</p></CardFooter></Card>}
    <Accordion className="mt-4"><AccordionItem value="info"><AccordionTrigger>Informasi format &amp; privasi</AccordionTrigger><AccordionContent><div className="flex max-w-3xl flex-col gap-2 text-muted-foreground"><p>Maksimal 40 MB, 16 juta piksel, dan sisi 8.192 px. Animasi diproses sebagai satu gambar statis. Hasil kompresi tidak menyertakan metadata sumber.</p><p>JPEG XL dan QOI dapat dibandingkan di sini; dukungan saat membuka hasil bergantung pada aplikasi Anda. Pemrosesan menggunakan codec jSquash, turunan Squoosh. <a href={noticesUrl}>Lisensi codec</a>.</p></div></AccordionContent></AccordionItem></Accordion>
  </>
}
