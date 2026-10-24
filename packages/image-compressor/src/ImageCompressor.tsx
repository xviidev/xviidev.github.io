import { useEffect, useRef, useState } from 'react'
import { FileUpload } from '@xviidev/ui/components/file-upload'
import { Button } from '@xviidev/ui/components/button'
import { Field, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { ImageIcon, ArrowLeftRightIcon } from '@xviidev/ui/lib/icons'
import { validateFile } from '@xviidev/ui/lib/file'
import { defaults, MAX_FILE_BYTES } from './lib/options'
import { askWorker, createWorker } from './lib/client'
import type { Source } from './lib/client'
import { useResult } from './lib/use-result'
import { SidePanel } from './components/SidePanel'
import { Comparison } from './components/Comparison'
import './styles.css'
import noticesUrl from '../THIRD_PARTY_NOTICES.txt?url'

const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif,.jxl,.qoi,.gif,.bmp,.svg,image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/svg+xml'

export default function ImageCompressor() {
  const [source, setSource] = useState<Source | null>(null), [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [a, setA] = useState(() => defaults('original')), [b, setB] = useState(() => defaults('jpeg'))
  const loadController = useRef<AbortController | null>(null), sourceUrl = useRef(''), version = useRef(0)
  const left = useResult(source, a), right = useResult(source, b)
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
      setSource({ file, pixels: data.pixels, url, width, height }); setA(defaults('original', width, height)); setB(defaults('jpeg', width, height))
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
    <div className="mb-6 flex flex-col gap-3"><h1 className="text-2xl font-medium">Kompres gambar</h1><p className="max-w-3xl text-muted-foreground">Bandingkan codec dan kualitas di dua sisi, lihat detailnya, lalu unduh hasil yang paling sesuai. Semua pemrosesan berlangsung di perangkat Anda.</p></div>
    <div className="mb-6 flex flex-col gap-4"><Field><FieldLabel htmlFor="image-file">Gambar sumber</FieldLabel><FileUpload id="image-file" file={file} accept={ACCEPT} maxSize={MAX_FILE_BYTES} icon={ImageIcon} label="Pilih gambar" hint="JPG, PNG, WebP, AVIF, JPEG XL, QOI, GIF, BMP, atau SVG · maksimal 40 MB" busy={loading} onFileSelect={load} onClear={clear} /><FieldDescription>Bisa juga menempel gambar dari clipboard. Maksimal 16 juta piksel dan sisi 8.192 px. Animasi diproses sebagai satu gambar statis; metadata tidak disertakan pada hasil kompresi.</FieldDescription></Field>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</div>
    {source ? <>
      <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setA(b); setB(a) }}><ArrowLeftRightIcon data-icon="inline-start" />Tukar pengaturan</Button><Button variant="ghost" size="sm" onClick={() => setB({ ...a, format: a.format === 'original' ? b.format : a.format })}>Salin A ke B</Button><Button variant="ghost" size="sm" onClick={() => { setA(defaults('original', source.width, source.height)); setB(defaults('jpeg', source.width, source.height)) }}>Atur ulang</Button></div>
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)_minmax(12rem,1fr)]">
        <Comparison source={source} left={left.result} right={right.result} busyA={left.busy} busyB={right.busy} />
        <SidePanel side="A" source={source} options={a} setOptions={setA} {...left} />
        <SidePanel side="B" source={source} options={b} setOptions={setB} {...right} />
      </div>
    </> : <Empty className="min-h-72 border border-dashed border-border"><EmptyHeader><EmptyTitle>{loading ? 'Membuka gambar…' : 'Mulai dari gambar Anda'}</EmptyTitle><EmptyDescription>Unggah atau tempel gambar untuk membandingkan hasil asli, kompresi, ukuran, dan format.</EmptyDescription></EmptyHeader></Empty>}
    <p className="mt-6 text-xs text-muted-foreground">Codec menggunakan jSquash, turunan proyek Squoosh. JPEG XL dan QOI dapat dilihat di pembanding ini, tetapi dukungan format tersebut bergantung pada aplikasi pembuka gambar. <a href={noticesUrl} className="underline underline-offset-4">Lisensi codec</a>.</p>
  </>
}
