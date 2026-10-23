import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@xviidev/ui/components/toggle-group'
import { Input } from '@xviidev/ui/components/input'
import { Button } from '@xviidev/ui/components/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@xviidev/ui/components/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton } from '@xviidev/ui/components/input-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@xviidev/ui/components/tabs'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from '@xviidev/ui/components/popover'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { QrCodeIcon, LinkIcon, WifiIcon, MessageCircleIcon, PaletteIcon, DownloadIcon, InfoIcon, EyeIcon, EyeOffIcon, ShieldCheckIcon } from '@xviidev/ui/lib/icons'
import { EMPTY_CONTENT, DEFAULT_APPEARANCE, payload, createMatrix, svgCode, pngBlob, readLogo } from './lib/qr'
import type { Mode, Level, Shape } from './lib/qr'
const STYLE_SAMPLES = ([{shape:'square',label:'Kotak'},{shape:'rounded',label:'Membulat'},{shape:'dots',label:'Titik'}] as const).map(item=>{
  const options={...DEFAULT_APPEARANCE,shape:item.shape}
  return {...item,src:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode(createMatrix('https://xvii.dev/',options),options))}`}
})
function Help({ title, children }: { title: string; children: string }) {
  return <Popover><PopoverTrigger render={<InputGroupButton size="icon-xs" aria-label={`Petunjuk ${title.toLowerCase()}`} />}><InfoIcon /></PopoverTrigger><PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]"><PopoverHeader><PopoverTitle>{title}</PopoverTitle><PopoverDescription>{children}</PopoverDescription></PopoverHeader></PopoverContent></Popover>
}
function download(blob: Blob, format: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `qr-code.${format}`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export default function QrCode() {
  const [content, setContent] = useState({ ...EMPTY_CONTENT })
  const [appearance, setAppearance] = useState({ ...DEFAULT_APPEARANCE })
  const [showPassword, setShowPassword] = useState(false), [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  const [uploading, setUploading] = useState(false)
  const uploadVersion = useRef(0)
  async function uploadLogo(file?: File) {
    if (!file) return
    const version = ++uploadVersion.current
    setUploading(true); setExportError('')
    try { const logo = await readLogo(file); if (version === uploadVersion.current) setAppearance(previous => ({...previous, logo, level:'H'})) }
    catch (error) { if (version === uploadVersion.current) setExportError((error as Error).message) }
    finally { if (version === uploadVersion.current) setUploading(false) }
  }
  useEffect(() => { document.title = 'Pembuat QR code — XVII Dev' }, [])
  function update<K extends keyof typeof content>(key: K, value: typeof content[K]) { setContent(previous => ({ ...previous, [key]: value })); setExportError('') }
  const input = useMemo(() => { try { return { text: payload(content), error: '' } } catch (error) { return { text: '', error: (error as Error).message } } }, [content])
  const deferred = useDeferredValue(input.text)
  const result = useMemo(() => {
    if (!deferred) return { matrix: null, svg: '', error: '' }
    try { const matrix = createMatrix(deferred, appearance); return { matrix, svg: svgCode(matrix, appearance), error: '' } }
    catch (error) { return { matrix: null, svg: '', error: (error as Error).message } }
  }, [deferred, appearance])
  const pending = deferred !== input.text, error = input.error || result.error
  const ready = !uploading && !pending && !error && !!input.text && !!result.matrix
  async function save(format: 'png' | 'svg') {
    if (!ready || !result.matrix) return
    setExporting(true); setExportError('')
    try { download(format === 'svg' ? new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }) : await pngBlob(result.matrix, appearance), format) }
    catch (error) { setExportError((error as Error).message) }
    finally { setExporting(false) }
  }
  return <>
    <div className="mb-6 flex flex-col gap-3"><h1 className="text-2xl font-medium">Pembuat QR code</h1><p className="max-w-2xl text-muted-foreground">Isi kontennya, sesuaikan tampilannya, lalu unduh. Untuk tautan, jaringan Wi-Fi, atau memulai percakapan.</p></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Isi QR code</CardTitle><CardDescription>Pilih apa yang ingin dibuka ketika kode dipindai.</CardDescription></CardHeader><CardContent>
          <Tabs value={content.mode} onValueChange={value => update('mode', value as Mode)}>
            <TabsList className="w-full" aria-label="Jenis QR code"><TabsTrigger value="text"><LinkIcon />Teks / tautan</TabsTrigger><TabsTrigger value="wifi"><WifiIcon />Wi-Fi</TabsTrigger><TabsTrigger value="whatsapp"><MessageCircleIcon />WhatsApp</TabsTrigger></TabsList>
            <TabsContent value="text" className="pt-4"><FieldGroup><Field><FieldLabel htmlFor="qr-text">Teks atau tautan</FieldLabel><InputGroup><InputGroupTextarea id="qr-text" className="min-h-36" value={content.text} onChange={event => update('text', event.target.value)} placeholder="https://contoh.com" aria-describedby="qr-text-hint" /><InputGroupAddon align="block-end"><InputGroupText><LinkIcon />Teks disalin persis seperti isian</InputGroupText></InputGroupAddon></InputGroup><FieldDescription id="qr-text-hint">Untuk membuka situs, gunakan alamat lengkap dengan https://. Teks biasa juga bisa.</FieldDescription></Field></FieldGroup><Button variant="link" size="sm" className="mt-3" onClick={() => update('text', 'https://xvii.dev/')}>Gunakan contoh</Button></TabsContent>
            <TabsContent value="wifi" className="pt-4"><FieldGroup className="gap-5">
              <Field><FieldLabel htmlFor="qr-ssid">Nama jaringan (SSID)</FieldLabel><InputGroup><InputGroupAddon><WifiIcon /></InputGroupAddon><InputGroupInput id="qr-ssid" value={content.ssid} onChange={event => update('ssid', event.target.value)} placeholder="Nama Wi-Fi" autoComplete="off" /></InputGroup><FieldDescription>Harus sama persis dengan nama jaringan, termasuk huruf besar dan spasi.</FieldDescription></Field>
              <Field><FieldLabel htmlFor="qr-security">Keamanan jaringan</FieldLabel><SelectInput id="qr-security" className="w-full" value={content.security} onValueChange={value => update('security', value as typeof content.security)} options={[{value:'WPA',label:'WPA / WPA2 Personal'},{value:'WEP',label:'WEP (jaringan lama)'},{value:'nopass',label:'Tanpa kata sandi'}]} /></Field>
              {content.security !== 'nopass' && <Field><FieldLabel htmlFor="qr-password">Kata sandi Wi-Fi</FieldLabel><InputGroup><InputGroupInput id="qr-password" type={showPassword ? 'text' : 'password'} value={content.password} onChange={event => update('password', event.target.value)} autoComplete="new-password" /><InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</InputGroupButton></InputGroupAddon></InputGroup></Field>}
              <Field orientation="horizontal"><Checkbox id="qr-hidden" checked={content.hidden} onCheckedChange={value => update('hidden', value)} /><FieldLabel htmlFor="qr-hidden">Jaringan tersembunyi</FieldLabel></Field>
              <p className="text-sm text-muted-foreground">QR code memuat akses jaringan. Bagikan kepada orang yang ingin Anda izinkan terhubung. Dukungan pemindaian Wi-Fi bergantung pada perangkat.</p>
            </FieldGroup></TabsContent>
            <TabsContent value="whatsapp" className="pt-4"><FieldGroup className="gap-5"><Field><FieldLabel htmlFor="qr-phone">Nomor WhatsApp</FieldLabel><InputGroup><InputGroupAddon><MessageCircleIcon /></InputGroupAddon><InputGroupInput id="qr-phone" type="tel" inputMode="tel" value={content.phone} onChange={event => update('phone',event.target.value)} placeholder="+6281234567890" aria-describedby="qr-phone-hint" /></InputGroup><FieldDescription id="qr-phone-hint">Sertakan kode negara. Nomor Indonesia berawalan 08 otomatis menjadi 628.</FieldDescription></Field><Field><FieldLabel htmlFor="qr-message">Pesan awal (opsional)</FieldLabel><InputGroup><InputGroupTextarea id="qr-message" className="min-h-24" value={content.message} onChange={event => update('message',event.target.value)} placeholder="Halo, saya ingin bertanya…" /></InputGroup><FieldDescription>Pesan diisi saat percakapan dibuka; pengunjung tetap memilih untuk mengirimnya.</FieldDescription></Field></FieldGroup></TabsContent>
          </Tabs>
        </CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Bentuk &amp; logo</CardTitle><CardDescription>Ubah karakter pola dan tambahkan identitas Anda.</CardDescription></CardHeader><CardContent><FieldGroup className="gap-5">
          <Field><FieldLabel id="qr-shape-label">Bentuk pola</FieldLabel><ToggleGroup variant="soft" aria-labelledby="qr-shape-label" className="grid w-full grid-cols-3" value={[appearance.shape]} onValueChange={values=>{if(values[0])setAppearance(previous=>({...previous,shape:values[0] as Shape}))}}>
            {STYLE_SAMPLES.map(({shape,label,src})=><ToggleGroupItem key={shape} value={shape} className="h-auto min-w-0 flex-col gap-1.5 px-2 py-2" aria-label={label}><img src={src} width={48} height={48} className="aspect-square size-12" alt="" aria-hidden="true" /><span>{label}</span></ToggleGroupItem>)}
          </ToggleGroup><FieldDescription>Contoh memakai gaya asli, termasuk penanda sudutnya. Setiap modul pada gaya titik berupa lingkaran utuh; gaya membulat mengikuti sambungannya.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="qr-logo">Logo atau ikon (opsional)</FieldLabel><Input id="qr-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={event=>{void uploadLogo(event.target.files?.[0]);event.target.value=''}} /><FieldDescription>PNG, JPG, atau WebP, maksimal 2 MB. Gambar transparan didukung; logo tetap di perangkat Anda.</FieldDescription></Field>
          {uploading && <p role="status" className="text-sm text-muted-foreground">Menyiapkan logo…</p>}
          {appearance.logo && <><div className="flex items-center gap-4"><img src={appearance.logo} width={48} height={48} className="size-12 object-contain" alt="Logo yang dipilih" /><Button variant="outline" size="sm" onClick={()=>{uploadVersion.current++;setUploading(false);setAppearance(previous=>({...previous,logo:undefined}));setExportError('')}}>Hapus logo</Button></div><Field><FieldLabel htmlFor="qr-logo-size">Ukuran logo</FieldLabel><SelectInput id="qr-logo-size" className="w-full" value={String(appearance.logoScale)} onValueChange={value=>setAppearance(previous=>({...previous,logoScale:Number(value)}))} options={[{value:'12',label:'Kecil (12%)'},{value:'16',label:'Sedang (16%)'},{value:'18',label:'Besar (18%)'}]} /><FieldDescription>Logo dipusatkan dengan ruang pemisah. Koreksi H otomatis digunakan. Tetap uji pindai sebelum dibagikan.</FieldDescription></Field></>}
        </FieldGroup></CardContent></Card>
        <Card size="sm"><CardHeader><CardTitle role="heading" aria-level={2}>Tampilan &amp; unduhan</CardTitle><CardDescription>Pola gelap, latar terang, dan ruang kosong membantu kode terbaca.</CardDescription></CardHeader><CardContent><FieldGroup className="grid grid-cols-2 gap-5">
          {([{key:'foreground',label:'Warna pola'},{key:'background',label:'Warna latar'}] as const).map(({key,label}) => <Field key={key}><FieldLabel htmlFor={`qr-${key}`}>{label}</FieldLabel><InputGroup><InputGroupAddon><PaletteIcon /></InputGroupAddon><InputGroupInput id={`qr-${key}`} value={appearance[key]} onChange={event => setAppearance(previous => ({...previous,[key]:event.target.value}))} spellCheck={false} maxLength={7} aria-describedby={`qr-${key}-hint`} /><InputGroupAddon align="inline-end"><Help title={label}>Gunakan kode warna enam digit, misalnya #111111 untuk hitam atau #ffffff untuk putih. Warna pola harus lebih gelap dari latarnya.</Help></InputGroupAddon></InputGroup><FieldDescription id={`qr-${key}-hint`}>Kode warna #RRGGBB.</FieldDescription></Field>)}
          <Field><FieldLabel htmlFor="qr-size">Ukuran PNG</FieldLabel><SelectInput id="qr-size" className="w-full" value={String(appearance.size)} onValueChange={value => setAppearance(previous => ({...previous,size:Number(value)}))} options={[256,512,1024,2048].map(size=>({value:String(size),label:`${size} × ${size} px`}))} /><FieldDescription>SVG tetap tajam saat diperbesar.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="qr-level">Koreksi kesalahan</FieldLabel><InputGroup><SelectInput disabled={!!appearance.logo} id="qr-level" className="min-w-0 flex-1 border-0" value={appearance.level} onValueChange={value => setAppearance(previous=>({...previous,level:value as Level}))} options={[{value:'L',label:'Rendah (L)'},{value:'M',label:'Sedang (M)'},{value:'Q',label:'Tinggi (Q)'},{value:'H',label:'Maksimal (H)'}]} /><InputGroupAddon align="inline-end"><Help title="Koreksi kesalahan">M membantu memulihkan sebagian data jika kode sedikit rusak. Q dan H memberi lebih banyak cadangan, tetapi pola menjadi lebih padat. Ini tidak menggantikan kontras dan cetak yang baik.</Help></InputGroupAddon></InputGroup><FieldDescription>{appearance.logo ? 'H aktif otomatis karena menggunakan logo.' : 'M cukup untuk penggunaan umum.'}</FieldDescription></Field>
        </FieldGroup><Button variant="link" size="sm" className="mt-5" onClick={()=>{uploadVersion.current++;setUploading(false);setAppearance({...DEFAULT_APPEARANCE});setExportError('')}}>Atur ulang tampilan</Button></CardContent></Card>
      </div>
      <section className="min-w-0 lg:sticky lg:top-20" aria-labelledby="qr-preview-title"><Card><CardHeader><CardTitle id="qr-preview-title" role="heading" aria-level={2}><QrCodeIcon className="mr-2 inline size-4" />Pratinjau</CardTitle><CardDescription>QR code statis, tanpa tautan perantara atau pelacakan.</CardDescription></CardHeader><CardContent className="flex flex-col gap-5">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex min-h-80 items-center justify-center border border-border bg-muted p-5" aria-busy={pending}>
          {ready ? <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`} width={288} height={288} className="aspect-square h-auto w-full max-w-72" alt="Pratinjau QR code dari isian Anda" /> : <Empty><EmptyHeader><EmptyTitle>{pending ? 'Menyiapkan QR code' : error ? 'Periksa isian' : 'Mulai dari isinya'}</EmptyTitle><EmptyDescription>{error ? 'Perbaiki isian untuk membuat kode yang dapat diunduh.' : 'Isi teks, nama Wi-Fi, atau nomor WhatsApp. Pratinjau muncul otomatis.'}</EmptyDescription></EmptyHeader></Empty>}
        </div>
        <p className="text-sm text-muted-foreground" role="status">{ready ? `${appearance.size} × ${appearance.size} px · koreksi ${appearance.level} · ${result.matrix!.size} × ${result.matrix!.size} modul` : 'PNG dan SVG tersedia setelah QR code siap.'}</p>
        <div className="flex flex-wrap gap-3"><Button disabled={!ready || exporting} onClick={()=>void save('png')}><DownloadIcon data-icon="inline-start" />Unduh PNG</Button><Button variant="outline" disabled={!ready || exporting} onClick={()=>void save('svg')}><DownloadIcon data-icon="inline-start" />Unduh SVG</Button></div>
        {exportError && <Alert variant="destructive"><AlertDescription>{exportError}</AlertDescription></Alert>}
        <p className="text-sm leading-relaxed text-muted-foreground">Ruang kosong di sekeliling kode ikut disertakan. Jangan dipotong. Uji pindai dengan ponsel sebelum mencetak atau membagikan hasilnya. QR code statis tetap berfungsi selama konten atau tujuan tautannya masih tersedia.</p>
        <div className="flex items-start gap-2 text-sm text-muted-foreground"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0" /><p>Isi QR code diproses di perangkat Anda dan tidak disimpan. Memuat ulang halaman akan mengosongkan isian.</p></div>
      </CardContent></Card></section>
    </div>
  </>
}
