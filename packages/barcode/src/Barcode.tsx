import { useEffect, useMemo, useState } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { Input } from '@xviidev/ui/components/input'
import { Textarea } from '@xviidev/ui/components/textarea'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@xviidev/ui/components/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@xviidev/ui/components/tabs'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { BarcodeIcon, DownloadIcon, ArrowLeftIcon, ArrowRightIcon } from '@xviidev/ui/lib/icons'
import { DEFAULT_APPEARANCE, MAX_CODES, encode, geometry, parseRows, pngBlob, svgCode } from './lib/barcode'
import type { Appearance, Format, Row } from './lib/barcode'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function Barcode() {
  const [mode, setMode] = useState('single'), [format, setFormat] = useState<Format>('CODE128')
  const [single, setSingle] = useState(''), [batch, setBatch] = useState('')
  const [appearance, setAppearance] = useState<Appearance>({ ...DEFAULT_APPEARANCE })
  const [selected, setSelected] = useState(0), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  useEffect(() => { document.title = 'Pembuat barcode — XVII Dev' }, [])
  const result = useMemo(() => {
    try {
      let rows: Row[] = []
      if (mode === 'batch') rows = parseRows(batch, format)
      else if (single) {
        try { rows = [{ line: 1, code: encode(single, format) }] }
        catch (error) { rows = [{ line: 1, error: (error as Error).message }] }
      }
      return { rows, error: '' }
    } catch (error) { return { rows: [] as Row[], error: (error as Error).message } }
  }, [mode, single, batch, format])
  const codes = result.rows.flatMap(row => row.code ? [row.code] : [])
  const errors = result.rows.filter(row => row.error)
  const index = Math.min(selected, Math.max(0, codes.length - 1)), current = codes[index]
  const ready = !!current && !result.error && errors.length === 0
  const svg = current ? svgCode(current, appearance) : ''
  const box = current ? geometry(current, appearance) : null
  function changed() { setSelected(0); setExportError('') }
  function updateAppearance<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    setAppearance(previous => ({ ...previous, [key]: value })); setExportError('')
  }
  async function save(type: 'svg' | 'png' | 'pdf') {
    if (!ready || exporting) return
    setExporting(true); setExportError('')
    try {
      if (type === 'pdf') {
        const { pdfBytes } = await import('./lib/pdf')
        download(new Blob([new Uint8Array(await pdfBytes(codes, appearance))], { type: 'application/pdf' }), 'barcode.pdf')
      } else download(type === 'svg' ? new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }) : await pngBlob(current, appearance), `barcode-${index + 1}.${type}`)
    } catch (error) { setExportError((error as Error).message) }
    finally { setExporting(false) }
  }
  return <>
    <div className="mb-6 flex flex-col gap-3"><h1 className="text-2xl font-medium">Pembuat barcode</h1><p className="max-w-2xl text-muted-foreground">Buat kode untuk produk atau inventaris. Isi datanya, atur ukuran, lalu unduh satuan atau cetak bersama.</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Isi barcode</CardTitle><CardDescription>Code 128 untuk kode internal; EAN-13 untuk nomor produk yang sudah Anda miliki.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">
          <FieldGroup><Field><FieldLabel htmlFor="barcode-format">Format barcode</FieldLabel><SelectInput id="barcode-format" className="w-full" value={format} onValueChange={value => { setFormat(value as Format); changed() }} options={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13' }]} /><FieldDescription>{format === 'CODE128' ? 'Huruf, angka, dan simbol ASCII; maksimal 80 karakter. Spasi di awal dan akhir dipertahankan.' : 'Isi 12 digit untuk menghitung digit pemeriksa otomatis, atau 13 digit untuk memvalidasi kode lengkap.'}</FieldDescription></Field></FieldGroup>
          <Tabs value={mode} onValueChange={value => { setMode(String(value)); changed() }}>
            <TabsList className="w-full" aria-label="Cara mengisi barcode"><TabsTrigger value="single">Satuan</TabsTrigger><TabsTrigger value="batch">Massal</TabsTrigger></TabsList>
            <TabsContent value="single" className="pt-4"><FieldGroup><Field data-invalid={errors.length > 0}><FieldLabel htmlFor="barcode-single">Isi kode</FieldLabel><Input id="barcode-single" value={single} maxLength={1000} inputMode={format === 'EAN13' ? 'numeric' : 'text'} aria-invalid={errors.length > 0} aria-describedby="barcode-single-hint" onChange={event => { setSingle(event.target.value); changed() }} placeholder={format === 'CODE128' ? 'BRG-0001' : '590123412345'} /><FieldDescription id="barcode-single-hint">Pratinjau diperbarui otomatis saat Anda mengetik.</FieldDescription></Field></FieldGroup></TabsContent>
            <TabsContent value="batch" className="pt-4"><FieldGroup><Field data-invalid={!!result.error || errors.length > 0}><FieldLabel htmlFor="barcode-batch">Daftar kode</FieldLabel><Textarea id="barcode-batch" className="min-h-40" value={batch} maxLength={200000} aria-invalid={!!result.error || errors.length > 0} aria-describedby="barcode-batch-hint" onChange={event => { setBatch(event.target.value); changed() }} placeholder={'BRG-0001\nBRG-0002\nBRG-0003'} /><FieldDescription id="barcode-batch-hint">Satu kode per baris, maksimal {MAX_CODES} kode. Baris kosong dilewati; kode duplikat tetap disertakan.</FieldDescription></Field></FieldGroup></TabsContent>
          </Tabs>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { if (mode === 'single') setSingle(format === 'CODE128' ? 'BRG-0001' : '590123412345'); else setBatch(format === 'CODE128' ? 'BRG-0001\nBRG-0002\nBRG-0003' : '590123412345\n400638133393'); changed() }}>Gunakan contoh</Button><Button variant="ghost" size="sm" onClick={() => { if (mode === 'single') setSingle(''); else setBatch(''); changed() }}>Kosongkan</Button></div>
          {(result.error || errors.length > 0) && <Alert variant="destructive"><AlertDescription><div className="flex flex-col gap-1" role="status">{result.error || <><p>Perbaiki isian berikut sebelum mengunduh:</p><ul className="list-inside list-disc">{errors.slice(0, 8).map(row => <li key={row.line}>Baris {row.line}: {row.error}</li>)}</ul>{errors.length > 8 && <p>Dan {errors.length - 8} baris lain yang belum valid.</p>}</>}</div></AlertDescription></Alert>}
          {format === 'EAN13' && <p className="text-sm text-muted-foreground">Alat ini menggambar barcode dari nomor Anda. Nomor contoh bukan nomor produk terdaftar milik Anda; digit pemeriksa yang valid tidak membuktikan kepemilikan nomor.</p>}
        </CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Ukuran &amp; tampilan</CardTitle><CardDescription>Batang hitam di atas latar putih, dengan ruang kosong yang ikut diunduh.</CardDescription></CardHeader><CardContent><FieldGroup>
          <Field><FieldLabel htmlFor="barcode-width">Lebar modul</FieldLabel><SelectInput id="barcode-width" className="w-full" value={String(appearance.moduleWidth)} onValueChange={value => updateAppearance('moduleWidth', Number(value))} options={[1, 2, 3, 4].map(value => ({ value: String(value), label: `${value} px` }))} /><FieldDescription>Lebar batang terkecil pada PNG dan SVG.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="barcode-height">Tinggi batang</FieldLabel><SelectInput id="barcode-height" className="w-full" value={String(appearance.height)} onValueChange={value => updateAppearance('height', Number(value))} options={[40, 60, 100, 160, 240].map(value => ({ value: String(value), label: `${value} px` }))} /></Field>
          <Field><FieldLabel htmlFor="barcode-margin">Ruang kosong di tepi</FieldLabel><SelectInput id="barcode-margin" className="w-full" value={String(appearance.margin)} onValueChange={value => updateAppearance('margin', Number(value))} options={[12, 20, 30, 40].map(value => ({ value: String(value), label: `${value} × lebar modul` }))} /><FieldDescription>Jangan potong ruang kosong ini agar pemindai dapat mengenali kode.</FieldDescription></Field>
          <Field orientation="horizontal"><Checkbox id="barcode-text" checked={appearance.showText} onCheckedChange={value => updateAppearance('showText', value)} /><FieldLabel htmlFor="barcode-text">Tampilkan teks di bawah barcode</FieldLabel></Field>
        </FieldGroup><Button variant="link" size="sm" className="mt-4" onClick={() => { setAppearance({ ...DEFAULT_APPEARANCE }); setExportError('') }}>Atur ulang tampilan</Button></CardContent></Card>
      </div>
      <section aria-labelledby="barcode-preview" className="min-w-0 lg:sticky lg:top-20"><Card><CardHeader><CardTitle id="barcode-preview" role="heading" aria-level={2}><BarcodeIcon className="mr-2 inline size-4" />Pratinjau</CardTitle><CardDescription>Tinjau kode sebelum mengunduh atau mencetak.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">
        <div className="flex min-h-64 min-w-0 items-center justify-center overflow-hidden border border-border bg-muted p-4">
          {current ? <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width={box!.width} height={box!.height} className="h-auto max-w-full" alt={`Pratinjau barcode ${current.value}`} /> : <Empty><EmptyHeader><EmptyTitle>{errors.length || result.error ? 'Periksa isian' : 'Mulai dari isi kode'}</EmptyTitle><EmptyDescription>Isi kode atau gunakan contoh untuk melihat barcode di sini.</EmptyDescription></EmptyHeader></Empty>}
        </div>
        {current && <><p className="break-all text-sm text-muted-foreground" role="status">{current.value} · {box!.width} × {box!.height} px</p>{codes.length > 1 && <div className="flex items-center justify-between gap-2"><Button variant="outline" size="icon" aria-label="Barcode sebelumnya" disabled={index === 0} onClick={() => setSelected(index - 1)}><ArrowLeftIcon /></Button><p className="text-sm" role="status">Kode {index + 1} dari {codes.length}</p><Button variant="outline" size="icon" aria-label="Barcode berikutnya" disabled={index === codes.length - 1} onClick={() => setSelected(index + 1)}><ArrowRightIcon /></Button></div>}</>}
        <div className="flex flex-wrap gap-3"><Button disabled={!ready || exporting} onClick={() => void save('png')}><DownloadIcon data-icon="inline-start" />Unduh PNG</Button><Button variant="outline" disabled={!ready || exporting} onClick={() => void save('svg')}>Unduh SVG</Button><Button variant="outline" disabled={!ready || exporting} onClick={() => void save('pdf')}>Unduh PDF{mode === 'batch' ? ' semua' : ''}</Button></div>
        {exporting && <p role="status" className="text-sm text-muted-foreground">Menyiapkan unduhan…</p>}
        {exportError && <Alert variant="destructive"><AlertDescription>{exportError}</AlertDescription></Alert>}
        <p className="text-sm text-muted-foreground">PNG dan SVG memuat kode yang ditampilkan. PDF memuat semua kode pada kertas A4, satu kolom, sesuai urutan isian. Semua baris harus valid sebelum mengunduh.</p>
        <p className="text-sm text-muted-foreground">PDF menyesuaikan kode yang terlalu lebar agar muat di halaman. Gunakan kode lebih pendek jika hasil cetak terlalu rapat. Cetak pada ukuran aktual dan uji pindai sebelum dipakai.</p>
        <p className="text-sm text-muted-foreground">Data diproses di perangkat Anda dan tidak disimpan. Memuat ulang halaman akan mengosongkan isian.</p>
      </CardContent></Card></section>
    </div>
  </>
}
