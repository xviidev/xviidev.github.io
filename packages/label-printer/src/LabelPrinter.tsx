import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { Skeleton } from '@xviidev/ui/components/skeleton'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Button } from '@xviidev/ui/components/button'
import { Input } from '@xviidev/ui/components/input'
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@xviidev/ui/components/field'
import { NativeSelect, NativeSelectOption } from '@xviidev/ui/components/native-select'
import { ToggleGroup, ToggleGroupItem } from '@xviidev/ui/components/toggle-group'
import { Card, CardHeader, CardTitle, CardContent } from '@xviidev/ui/components/card'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import exampleWorkbook from '../public/contoh-label.xlsx?url'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { RichTextEditor } from './components/RichTextEditor'
import type { RichTextHandle } from './components/RichTextEditor'
import { CanvasSheet } from './components/CanvasSheet'
import { DEFAULT_SETTINGS, expandLabels, formatCell, getLayout, paginateLabels } from './lib/labels'
import type { LabelSettings } from './lib/labels'
import { documentText, fromText, makeTemplate, manualDocuments, resolveTemplate, templateErrors } from './lib/rich-text'
import type { RichDocument } from './lib/rich-text'
import { getFont, loadFonts, makeMeasure } from './lib/fonts'
import type { LoadedFont } from './lib/fonts'
import { layoutPages } from './lib/print-layout'
import type { FontKey, PrintModel } from './lib/print-layout'
import { decodeTemplate } from './lib/template-file'

interface WorkbookSheet { sheet: string; data: unknown[][] }
function NumberField({ label, value, onChange, min = 0, step = 0.1, max = 1000 }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number; max?: number }) {
  const id = useId()
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Input id={id} type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(Number(event.target.value))} /></Field>
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function LabelPrinter() {
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')
  const [manualDoc, setManualDoc] = useState<RichDocument>([])
  const [templateDoc, setTemplateDoc] = useState<RichDocument>(() => makeTemplate())
  const [manualRevision, setManualRevision] = useState(0), [templateRevision, setTemplateRevision] = useState(0)
  const [applyTemplate, setApplyTemplate] = useState(false)
  const [sheets, setSheets] = useState<WorkbookSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0), [header, setHeader] = useState(true)
  const [filename, setFilename] = useState(''), [fileError, setFileError] = useState(''), [templateMessage, setTemplateMessage] = useState('')
  const [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false), [printMessage, setPrintMessage] = useState('')
  const [settings, setSettings] = useState<LabelSettings>({ ...DEFAULT_SETTINGS })
  const [preset, setPreset] = useState('24'), [paperChoice, setPaperChoice] = useState('a4')
  const [copies, setCopies] = useState(1), [start, setStart] = useState(1), [currentPage, setCurrentPage] = useState(0)
  const [previewWidth, setPreviewWidth] = useState(600), [dragMode, setDragMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null), templateRef = useRef<RichTextHandle>(null)
  const uploadVersion = useRef(0)
  const rows = useMemo(() => sheets[sheetIndex]?.data ?? [], [sheets, sheetIndex])
  const rawManual = useMemo(() => manualDocuments(manualDoc, true), [manualDoc])
  const columnCount = useMemo(() => mode === 'excel' ? rows.reduce((max, row) => Math.max(max, row.length), 0) : Math.max(3, ...rawManual.map(document => document.length)), [mode, rows, rawManual])
  const showTemplate = mode === 'excel' || applyTemplate
  const templateIssues = useMemo(() => showTemplate && (mode !== 'excel' || sheets.length) ? templateErrors(templateDoc, columnCount) : [], [showTemplate, mode, sheets.length, templateDoc, columnCount])
  const sourceLabels = useMemo(() => {
    if (mode === 'manual') return applyTemplate ? rawManual.map(doc => resolveTemplate(templateDoc, doc.map(line => documentText([line])))).filter(doc => doc.length) : manualDocuments(manualDoc)
    return rows.slice(header ? 1 : 0).map(row => resolveTemplate(templateDoc, row)).filter(doc => doc.length)
  }, [mode, applyTemplate, rawManual, manualDoc, templateDoc, rows, header])
  const labelResult = useMemo(() => {
    try { return { labels: expandLabels(sourceLabels.map((_, i) => String(i)), copies).map(index => sourceLabels[Number(index)]), error: '' } }
    catch (error) { return { labels: [] as RichDocument[], error: error instanceof Error ? error.message : 'Data tidak valid.' } }
  }, [sourceLabels, copies])
  const layout = useMemo(() => getLayout(settings), [settings])
  const startError = !Number.isInteger(start) || start < 1 || (layout.capacity > 0 && start > layout.capacity) ? 'Posisi awal harus berada dalam jumlah label per lembar.' : ''
  const baseErrors = [...layout.errors, ...templateIssues, labelResult.error, startError, mode === 'excel' ? fileError : ''].filter(Boolean)
  const texts = useMemo(() => labelResult.labels.map(documentText), [labelResult.labels])
  const pages = useMemo(() => paginateLabels(texts, layout.capacity, start), [texts, layout.capacity, start])
  const job = useMemo(() => ({ documents: labelResult.labels, pages, settings, columns: layout.columns, valid: !baseErrors.length }), [labelResult.labels, pages, settings, layout.columns, baseErrors.join('|')])
  const [renderState, setRenderState] = useState<{ job: typeof job; model: PrintModel | null; fonts: Map<FontKey, LoadedFont>; error: string } | null>(null)
  const ready = renderState?.job === job
  const model = ready ? renderState.model : null
  const errors = [...baseErrors, ready ? renderState.error : ''].filter(Boolean)
  const displayedPage = Math.max(0, Math.min(currentPage, pages.length - 1))
  const canExport = ready && model !== null && pages.length > 0 && errors.length === 0 && !model.overflow.length && !model.unsupported.length && !loading && !exporting

  useEffect(() => { document.title = 'Cetak label — XVII Dev'; return () => { document.title = 'Utilitas — XVII Dev' } }, [])
  useEffect(() => {
    const element = previewRef.current
    if (!element) return
    const observer = new ResizeObserver(entries => setPreviewWidth(Math.max(50, entries[0].contentRect.width)))
    observer.observe(element); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (!job.valid || !job.documents.length) { setRenderState({ job, model: null, fonts: new Map(), error: '' }); return }
      void loadFonts(job.documents, job.settings).then(fonts => {
        if (!cancelled) setRenderState({ job, fonts, model: layoutPages(job.documents, job.pages, job.settings, job.columns, makeMeasure(fonts)), error: '' })
      }).catch(error => { if (!cancelled) setRenderState({ job, model: null, fonts: new Map(), error: error instanceof Error ? error.message : 'Pratinjau gagal disiapkan.' }) })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [job])

  function update<K extends keyof LabelSettings>(key: K, value: LabelSettings[K]) {
    setSettings(previous => ({ ...previous, [key]: value }))
    if (key === 'paperWidth' || key === 'paperHeight') setPaperChoice('custom')
    if (typeof value === 'number' && !['fontSize', 'padding', 'lineHeight', 'offsetX', 'offsetY'].includes(key)) setPreset('custom')
    setPrintMessage('')
  }
  function selectPreset(value: string) {
    setPreset(value); setStart(1)
    if (value === '24' || value === '21') {
      setPaperChoice('a4')
      setSettings(previous => ({ ...previous, paperWidth: 210, paperHeight: 297, labelWidth: 63.5, labelHeight: value === '24' ? 33.9 : 38.1,
        marginTop: value === '24' ? 12.9 : 15, marginBottom: value === '24' ? 12.9 : 15, marginLeft: 7.25, marginRight: 7.25, gapX: 2.5, gapY: 0 }))
    }
  }
  function setTemplate(document: RichDocument) { setTemplateDoc(document); setTemplateRevision(value => value + 1) }
  function useExample() {
    const doc = fromText('Budi Santoso\nJl. Persatuan No. 12\n-\nSinjai\n\nSari Wulandari\nJl. Pendidikan No. 8\n-\nMakassar')
    let first = true
    for (const line of doc) { if (!documentText([line]).trim()) { first = true; continue }; if (first) { line.runs = line.runs.map(run => ({ ...run, weight: 700 })); first = false } }
    setManualDoc(doc); setManualRevision(value => value + 1)
  }
  async function importExcel(file: File | undefined) {
    if (!file) return
    const version = ++uploadVersion.current
    setFileError(''); setSheets([]); setFilename(''); setLoading(true)
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Pilih berkas Excel .xlsx. Simpan ulang berkas .xls sebagai .xlsx terlebih dahulu.')
      if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran berkas maksimal 10 MB.')
      const { default: readWorkbook } = await import('read-excel-file/browser')
      const workbook = await readWorkbook(file).catch(() => { throw new Error('Berkas gagal dibaca. Pastikan .xlsx tidak rusak atau dilindungi sandi.') })
      if (version !== uploadVersion.current) return
      if (!workbook.some(sheet => sheet.data.some(row => row.some(value => formatCell(value))))) throw new Error('Berkas tidak memiliki data yang bisa dibaca.')
      if (workbook.some(sheet => sheet.data.length > 5001 || sheet.data.some(row => row.length > 100))) throw new Error('Maksimal 5.000 baris data dan 100 kolom per sheet.')
      const index = Math.max(0, workbook.findIndex(sheet => sheet.data.length > 0))
      const count = workbook[index].data.reduce((max, row) => Math.max(max, row.length), 0)
      setSheets(workbook); setSheetIndex(index); setFilename(file.name); setHeader(true); setTemplate(makeTemplate(Math.min(count, 3))); setCurrentPage(0)
    } catch (error) { if (version === uploadVersion.current) setFileError(error instanceof Error ? error.message : 'Berkas gagal dibaca.') }
    finally { if (version === uploadVersion.current) setLoading(false) }
  }
  function saveTemplate() {
    download(new Blob([JSON.stringify({ version: 1, document: templateDoc, settings }, null, 2)], { type: 'application/json' }), 'template-label.json')
    setTemplateMessage('Template disimpan. Daftar penerima tidak disertakan.')
  }
  async function openTemplate(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 1024 * 1024) throw new Error('Ukuran berkas template maksimal 1 MB.')
      const decoded = decodeTemplate(await file.text())
      setTemplate(decoded.document); setSettings(decoded.settings); setPreset('custom'); setPaperChoice('custom'); setApplyTemplate(true); setStart(1)
      setTemplateMessage('Template dimuat. Data penerima tetap menggunakan input saat ini.')
    } catch { setTemplateMessage('Template tidak valid. Gunakan berkas JSON dari tombol Simpan template.') }
  }
  async function exportPdf(open: boolean) {
    if (!canExport || !model) return
    const viewer = open ? window.open('about:blank', '_blank') : null
    if (viewer) viewer.opener = null
    setExporting(true); setPrintMessage('')
    try {
      const { generatePdf } = await import('./lib/pdf-export')
      const bytes = await generatePdf(model, settings, async key => (await getFont(key)).bytes)
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
      if (viewer) { const url = URL.createObjectURL(blob); viewer.location.replace(url); setTimeout(() => URL.revokeObjectURL(url), 300000) }
      else { download(blob, 'label-siap-cetak.pdf'); if (open) setPrintMessage('PDF diunduh karena jendela baru diblokir. Buka berkas itu untuk mencetak.') }
    } catch (error) { viewer?.close(); setPrintMessage(error instanceof Error ? error.message : 'PDF gagal dibuat. Coba kembali.') }
    finally { setExporting(false) }
  }
  return <>
    <div className="mb-8"><p className="mb-3 text-xs text-muted-foreground">Utilitas / Cetak label</p><h1 className="mb-3 text-2xl">Cetak label</h1>
      <p className="max-w-2xl text-muted-foreground">Tulis dan format per baris, gunakan template untuk data Excel, lalu unduh PDF siap cetak.</p>
      <p className="mt-3 text-xs text-muted-foreground">Data tetap di perangkat Anda. Data hilang saat keluar dari editor atau memuat ulang halaman.</p>
    </div>
    <nav aria-label="Bagian editor" className="mb-6 flex flex-wrap gap-4 border-y border-border py-3 text-xs lg:hidden"><a className="underline" href="#data-title">Data</a><a className="underline" href="#layout-title">Ukuran</a><a className="underline" href="#preview-title">Pratinjau</a></nav>
    <div className="grid items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className="min-w-0 flex flex-col gap-5">
        <Card size="sm" aria-labelledby="data-title"><CardHeader><CardTitle id="data-title">Data label</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
          <ToggleGroup className="mb-5" variant="outline" value={[mode]} onValueChange={values => { if (values[0] === 'manual' || values[0] === 'excel') setMode(values[0]) }}><ToggleGroupItem value="manual">Isi manual</ToggleGroupItem><ToggleGroupItem value="excel">Dari Excel</ToggleGroupItem></ToggleGroup>
          {mode === 'manual' ? <>
            <RichTextEditor key={`manual-${manualRevision}`} fontFamily={settings.font === 'mono' ? 'JetBrains Mono' : 'Noto Sans'} fontSize={settings.fontSize} lineHeight={settings.lineHeight} label="Isi label manual" initialDocument={manualDoc} onChange={setManualDoc} />
            <p className="hint">Enter untuk baris baru. Satu baris kosong memisahkan label. Baris yang hanya berisi - tidak ikut dicetak. Pilih teks untuk mengatur formatnya.</p>
            <Button variant="link" size="sm" className=" mt-3" onClick={useExample}>{documentText(manualDoc).trim() ? 'Ganti dengan contoh' : 'Isi contoh'}</Button>
            <FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="manual-template" checked={applyTemplate} onCheckedChange={checked => { if (checked && !applyTemplate && documentText(templateDoc) === documentText(makeTemplate())) setTemplate(makeTemplate(Math.min(columnCount, 100))); setApplyTemplate(checked) }} /><FieldLabel htmlFor="manual-template">Gunakan template untuk semua label manual</FieldLabel></Field></FieldSet>
            {applyTemplate && <p className="hint">Setiap baris manual menjadi kolom: baris 1 = {'{{1}}'}, baris 2 = {'{{2}}'}, dan seterusnya. Gunakan - untuk baris data yang kosong.</p>}
          </> : <>
            <Field><FieldLabel htmlFor="excel-file">Berkas Excel (.xlsx)</FieldLabel><Input id="excel-file" type="file" accept=".xlsx" onChange={event => { void importExcel(event.target.files?.[0]); event.target.value = '' }} /></Field>
            <p className="hint">Maksimal 10 MB. Simpan nomor telepon dan kode berawalan nol sebagai teks.</p><a className="text-action mt-3 inline-block" href={exampleWorkbook} download>Unduh contoh Excel</a>
            <p className="mt-3 text-xs text-muted-foreground" role="status">{loading ? 'Membaca berkas…' : filename}</p>
            {sheets.length > 0 && <div className="mt-4 flex flex-col gap-4"><Field className=""><FieldLabel htmlFor="label-setting-1">Sheet</FieldLabel><NativeSelect id="label-setting-1" value={sheetIndex} onChange={event => { setSheetIndex(Number(event.target.value)); setCurrentPage(0) }}>{sheets.map((sheet, i) => <NativeSelectOption key={i} value={i}>{sheet.sheet}</NativeSelectOption>)}</NativeSelect></Field><FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="excel-header" checked={header} onCheckedChange={setHeader} /><FieldLabel htmlFor="excel-header">Baris pertama adalah judul kolom</FieldLabel></Field></FieldSet></div>}
          </>}
          <div className="mt-5"><NumberField label="Salinan per label" value={copies} onChange={setCopies} min={1} max={100} step={1} /></div><p className="hint">{sourceLabels.length} data yang berisi teks · maksimal 1.000 label termasuk salinan.</p>
        </FieldGroup></CardContent></Card>
        {showTemplate && <Card size="sm" aria-labelledby="template-title"><CardHeader><CardTitle id="template-title">Template per baris</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
          <p className="hint mb-3">Contoh: baris {'{{1}}'} tebal, baris {'{{2}}'} normal. Nilai - atau kosong diabaikan tanpa menyisakan ruang. Jika semua kolom pada satu baris kosong, awalan teks baris itu juga dihapus.</p>
          <RichTextEditor key={`template-${templateRevision}`} ref={templateRef} fontFamily={settings.font === 'mono' ? 'JetBrains Mono' : 'Noto Sans'} fontSize={settings.fontSize} lineHeight={settings.lineHeight} label="Template label" initialDocument={templateDoc} onChange={setTemplateDoc} />
          <p className="mt-4 mb-2 text-xs">Sisipkan kolom di posisi kursor</p><div className="flex max-h-40 flex-wrap gap-2 overflow-auto">{Array.from({ length: Math.min(columnCount, 100) }, (_, column) => <Button key={column} variant="outline" size="sm" onMouseDown={event => event.preventDefault()} onClick={() => templateRef.current?.insertText(`{{${column + 1}}}`)}>{`{{${column + 1}}}`} {mode === 'excel' && header ? formatCell(rows[0]?.[column]) : `Baris ${column + 1}`}</Button>)}</div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs"><Button variant="link" size="sm" className="" onClick={() => setTemplate(makeTemplate(Math.min(columnCount, 3)))}>Template awal</Button><Button variant="link" size="sm" className="" onClick={saveTemplate}>Simpan template</Button><label className="text-action cursor-pointer">Muat template<input className="sr-only" type="file" aria-label="Muat template JSON" accept=".json,application/json" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = '' }} /></label></div>
          <p className="hint" role="status">{templateMessage}</p>
        </FieldGroup></CardContent></Card>}
          <Card size="sm" aria-labelledby="layout-title"><CardHeader><CardTitle id="layout-title">Kertas &amp; ukuran</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
            <Field className=""><FieldLabel htmlFor="label-setting-2">Mulai dari ukuran</FieldLabel><NativeSelect id="label-setting-2" value={preset} onChange={event => selectPreset(event.target.value)}><NativeSelectOption value="24">A4 · 24 label · 63,5 × 33,9 mm</NativeSelectOption><NativeSelectOption value="21">A4 · 21 label · 63,5 × 38,1 mm</NativeSelectOption><NativeSelectOption value="custom">Ukuran sendiri</NativeSelectOption></NativeSelect></Field>
            <p className="hint mb-4">Ukur lembar label Anda. Ukuran awal ini tidak terikat merek tertentu.</p>
            <Field className=" mb-4"><FieldLabel htmlFor="label-setting-3">Kertas</FieldLabel><NativeSelect id="label-setting-3" value={paperChoice} onChange={event => {
              setPaperChoice(event.target.value)
              const size = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4] }[event.target.value]
              if (size) { setSettings(previous => ({ ...previous, paperWidth: size[0], paperHeight: size[1] })); setPreset('custom') }
            }}><NativeSelectOption value="a4">A4</NativeSelectOption><NativeSelectOption value="a5">A5</NativeSelectOption><NativeSelectOption value="letter">Letter</NativeSelectOption><NativeSelectOption value="custom">Ukuran sendiri / lanskap</NativeSelectOption></NativeSelect></Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField label="Lebar kertas (mm)" value={settings.paperWidth} onChange={value => update('paperWidth', value)} min={1} />
              <NumberField label="Tinggi kertas (mm)" value={settings.paperHeight} onChange={value => update('paperHeight', value)} min={1} />
              <NumberField label="Lebar label (mm)" value={settings.labelWidth} onChange={value => update('labelWidth', value)} min={1} />
              <NumberField label="Tinggi label (mm)" value={settings.labelHeight} onChange={value => update('labelHeight', value)} min={1} />
              <NumberField label="Margin atas (mm)" value={settings.marginTop} onChange={value => update('marginTop', value)} />
              <NumberField label="Margin bawah (mm)" value={settings.marginBottom} onChange={value => update('marginBottom', value)} />
              <NumberField label="Margin kiri (mm)" value={settings.marginLeft} onChange={value => update('marginLeft', value)} step={0.05} />
              <NumberField label="Margin kanan (mm)" value={settings.marginRight} onChange={value => update('marginRight', value)} step={0.05} />
              <NumberField label="Jarak mendatar (mm)" value={settings.gapX} onChange={value => update('gapX', value)} />
              <NumberField label="Jarak menurun (mm)" value={settings.gapY} onChange={value => update('gapY', value)} />
            </FieldGroup>
            <Button variant="link" size="sm" className=" mt-4" onClick={() => { setSettings(previous => ({ ...previous, paperWidth: previous.paperHeight, paperHeight: previous.paperWidth })); setPreset('custom'); setPaperChoice('custom') }}>Putar kertas</Button>
            <div className="mt-4"><NumberField label="Mulai di posisi label ke-" value={start} onChange={setStart} min={1} max={layout.capacity || 1} step={1} /></div>
            <p className="hint">Urutan dari kiri ke kanan, lalu ke bawah. Posisi yang dilewati hanya berlaku di lembar pertama.</p>
          </FieldGroup></CardContent></Card>
          <Card size="sm" aria-labelledby="text-title"><CardHeader><CardTitle id="text-title">Tampilan dasar</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField label="Ukuran huruf (pt)" value={settings.fontSize} onChange={value => update('fontSize', value)} min={1} max={100} step={0.5} />
              <NumberField label="Ruang dalam (mm)" value={settings.padding} onChange={value => update('padding', value)} />
              <Field className=""><FieldLabel htmlFor="label-setting-4">Huruf</FieldLabel><NativeSelect id="label-setting-4" value={settings.font} onChange={event => update('font', event.target.value as LabelSettings['font'])}><NativeSelectOption value="sans">Sans (Noto Sans)</NativeSelectOption><NativeSelectOption value="mono">JetBrains Mono</NativeSelectOption></NativeSelect></Field>
              <Field className=""><FieldLabel htmlFor="label-setting-5">Rata teks</FieldLabel><NativeSelect id="label-setting-5" value={settings.align} onChange={event => update('align', event.target.value as LabelSettings['align'])}><NativeSelectOption value="left">Kiri</NativeSelectOption><NativeSelectOption value="center">Tengah</NativeSelectOption><NativeSelectOption value="right">Kanan</NativeSelectOption></NativeSelect></Field>
              <Field className=" col-span-2"><FieldLabel htmlFor="label-setting-6">Posisi vertikal</FieldLabel><NativeSelect id="label-setting-6" value={settings.vertical} onChange={event => update('vertical', event.target.value as LabelSettings['vertical'])}><NativeSelectOption value="top">Atas</NativeSelectOption><NativeSelectOption value="center">Tengah</NativeSelectOption><NativeSelectOption value="bottom">Bawah</NativeSelectOption></NativeSelect></Field>
            </FieldGroup>
            <FieldGroup className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="Jarak baris" value={settings.lineHeight ?? 1.3} onChange={value => update('lineHeight', value)} min={1} max={3} step={0.1} />
              <NumberField label="Geser X (mm)" value={settings.offsetX ?? 0} onChange={value => update('offsetX', value)} min={-1000} />
              <NumberField label="Geser Y (mm)" value={settings.offsetY ?? 0} onChange={value => update('offsetY', value)} min={-1000} />
            </FieldGroup>
            <p className="hint">Ukuran dasar berlaku pada teks yang tidak diberi ukuran khusus di editor.</p>
            <Button variant="link" size="sm" className=" mt-3" onClick={() => setSettings(previous => ({ ...previous, offsetX: 0, offsetY: 0 }))}>Atur ulang posisi teks</Button>
            <FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="print-border" checked={settings.border} onCheckedChange={checked => update('border', checked)} /><FieldLabel htmlFor="print-border">Cetak garis tepi label</FieldLabel></Field></FieldSet>
          </FieldGroup></CardContent></Card>
      </div>
      <section className="min-w-0 lg:sticky lg:top-6" aria-labelledby="preview-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="preview-title">Pratinjau</h2><div className="flex flex-wrap gap-2"><Button  disabled={!canExport} onClick={() => { void exportPdf(false) }}>{exporting ? 'Menyiapkan…' : 'Unduh PDF'}</Button><Button variant="outline" size="sm" disabled={!canExport} onClick={() => { void exportPdf(true) }}>Buka PDF untuk cetak</Button></div></div>
        <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">{labelResult.labels.length} label · {pages.length} lembar · {layout.columns} kolom × {layout.rows} baris</p>
        {errors.length > 0 && <Alert variant="destructive" className="mb-4"><AlertDescription><ul className="list-disc pl-4">{errors.map(error => <li key={error}>{error}</li>)}</ul></AlertDescription></Alert>}
        {!!model?.overflow.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Teks pada label {model.overflow.slice(0, 8).map(i => i + 1).join(', ')}{model.overflow.length > 8 ? ', …' : ''} tidak muat. Kecilkan huruf, atur posisi, atau perbesar label.</AlertDescription></Alert>}
        {!!model?.unsupported.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Ada karakter yang tidak didukung font. Ganti karakter khusus atau emoji pada label {model.unsupported.slice(0, 8).map(i => i + 1).join(', ')} sebelum mengekspor.</AlertDescription></Alert>}
        {printMessage && <p className="hint mb-4" role="status">{printMessage}</p>}
        <div className="mb-3 flex flex-wrap items-center gap-4"><Button variant="outline" size="sm" aria-pressed={dragMode} onClick={() => setDragMode(previous => !previous)}>Geser blok teks</Button><span className="text-[11px] text-muted-foreground">{dragMode ? 'Geser teks di canvas. Berlaku untuk semua label.' : 'Format teks tetap mengikuti editor dan template.'}</span></div>
        <div className="border border-border bg-muted p-4"><div ref={previewRef} className="min-w-0 overflow-hidden">
          {model && renderState && errors.length === 0 ? <CanvasSheet model={model} page={displayedPage} fonts={renderState.fonts} settings={settings} columns={layout.columns} rows={layout.rows} width={previewWidth} draggable={dragMode} onMove={(x, y) => setSettings(previous => ({ ...previous, offsetX: Math.round(((previous.offsetX ?? 0) + x) * 10) / 10, offsetY: Math.round(((previous.offsetY ?? 0) + y) * 10) / 10 }))} /> : <Empty className="min-h-72"><EmptyHeader><EmptyTitle>{errors.length ? 'Periksa pengaturan' : labelResult.labels.length && !ready ? 'Menyiapkan pratinjau' : 'Belum ada label'}</EmptyTitle><EmptyDescription>{errors.length ? 'Perbaiki pengaturan untuk menampilkan pratinjau.' : labelResult.labels.length && !ready ? 'Font dan tata letak sedang disiapkan.' : 'Isi label atau unggah Excel untuk memulai.'}</EmptyDescription></EmptyHeader>{!!labelResult.labels.length && !ready && <Skeleton className="h-24 w-full" />}</Empty>}
        </div></div>
        {pages.length > 0 && <div className="mt-4 flex items-center justify-between gap-3 text-xs"><Button variant="outline" size="sm" disabled={displayedPage === 0} onClick={() => setCurrentPage(displayedPage - 1)}>Sebelumnya</Button><span>Lembar {displayedPage + 1} / {pages.length}</span><Button variant="outline" size="sm" disabled={displayedPage >= pages.length - 1} onClick={() => setCurrentPage(displayedPage + 1)}>Berikutnya</Button></div>}
        {pages[displayedPage] && <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">Lihat isi label pada lembar ini</summary><ol className="mt-3 max-h-60 flex flex-col gap-3 overflow-auto border border-border p-4">{pages[displayedPage].flatMap(slot => slot ? [<li key={slot.index} className="whitespace-pre-wrap"><span className="text-muted-foreground">{slot.index + 1}. </span>{slot.text}</li>] : [])}</ol></details>}
        <p className="hint mt-4">PDF memakai ukuran fisik dan font tertanam. Buka PDF, pilih kertas yang sama, dan cetak pada skala 100% / ukuran asli. Garis putus-putus canvas tidak ikut diekspor. Lakukan cetak uji pada kertas biasa.</p>
      </section>
    </div>
  </>
}
