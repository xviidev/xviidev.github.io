import { AGENT_RELEASE, AGENT_DOWNLOADS, detectAgentDownload } from './lib/agent-download'
import { agentRequest, rasterPages } from './lib/local-print'
import { FileUpload } from '@xviidev/ui/components/file-upload'
import { MeasurementHelp, measurementIcons } from './components/MeasurementHelp'
import type { MeasurementKind } from './components/MeasurementHelp'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupTextarea } from '@xviidev/ui/components/input-group'
import { applyPaperPreset, paperSettings } from './lib/presets'
import { Separator } from '@xviidev/ui/components/separator'
import { DocumentPresets } from './components/DocumentPresets'
import { barcodeExpression } from './lib/barcode-template'
import { prepareLabelData } from './lib/label-data'
import { RulerIcon, TypeIcon, InfoIcon, DownloadIcon, PrinterIcon, FileTextIcon, CopyIcon, HashIcon, Rows3Icon, MoveHorizontalIcon, MoveVerticalIcon, FileSpreadsheetIcon } from '@xviidev/ui/lib/icons'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@xviidev/ui/components/empty'
import { Skeleton } from '@xviidev/ui/components/skeleton'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Button } from '@xviidev/ui/components/button'
import { Input } from '@xviidev/ui/components/input'
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@xviidev/ui/components/field'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@xviidev/ui/components/tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { Card, CardHeader, CardTitle, CardContent } from '@xviidev/ui/components/card'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import exampleWorkbook from '../public/contoh-label.xlsx?url'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { RichTextEditor } from './components/RichTextEditor'
import type { RichTextHandle } from './components/RichTextEditor'
import { CanvasSheet } from './components/CanvasSheet'
import { DEFAULT_SETTINGS, formatCell, getLayout, paginateLabels } from './lib/labels'
import type { LabelSettings } from './lib/labels'
import { documentText, fromText, makeTemplate, manualDocuments, resolveTemplate, templateErrors } from './lib/rich-text'
import type { RichDocument } from './lib/rich-text'
import { getFont, loadFonts, makeMeasure } from './lib/fonts'
import type { LoadedFont } from './lib/fonts'
import { layoutPages } from './lib/print-layout'
import type { FontKey, PrintModel } from './lib/print-layout'
import { decodeTemplate } from './lib/template-file'
import type { DocumentPreset } from './lib/presets'

interface WorkbookSheet { sheet: string; data: unknown[][] }
function NumberField({ label, value, onChange, min = 0, step = 0.1, max = 1000, unit, help, icon = RulerIcon }: { icon?: typeof RulerIcon; label: string; value: number; onChange: (value: number) => void; min?: number; step?: number; max?: number; unit?: string; help?: MeasurementKind }) {
  const id = useId()
  const suffix = unit ?? (label.endsWith(' (mm)') ? 'mm' : undefined)
  const Icon = help ? measurementIcons[help] : icon
  const title = label.replace(/ \(mm\)$/, '')
  return <Field><FieldLabel htmlFor={id}>{title}</FieldLabel><InputGroup>
    <InputGroupAddon><Icon aria-hidden="true" /></InputGroupAddon>
    <InputGroupInput id={id} aria-label={label} type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(Number(event.target.value))} />
    {(suffix || help) && <InputGroupAddon align="inline-end">{suffix && <InputGroupText>{suffix}</InputGroupText>}{help && <MeasurementHelp kind={help} label={title} value={value} />}</InputGroupAddon>}
  </InputGroup></Field>
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function LabelPrinter() {
  const recommendedAgent = detectAgentDownload(navigator.userAgent, navigator.maxTouchPoints)
  const [agentVersion, setAgentVersion] = useState('auto')
  const selectedAgent = AGENT_DOWNLOADS.find(item => item.value === agentVersion)
  const agentDownload = selectedAgent ? { asset: selectedAgent.value, label: 'Unduh aplikasi cetak ' + selectedAgent.label } : { ...recommendedAgent, label: recommendedAgent.label.replace('Unduh agen ', 'Unduh aplikasi cetak ') }
  const [printers, setPrinters] = useState<string[]>([]), [printer, setPrinter] = useState(''), [agentBusy, setAgentBusy] = useState(false)
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')
  const [manualText, setManualText] = useState('')
  const manualDoc = useMemo(() => fromText(manualText), [manualText])
  const [templateDoc, setTemplateDoc] = useState<RichDocument>(() => makeTemplate())
  const [templateRevision, setTemplateRevision] = useState(0)
  const [applyTemplate, setApplyTemplate] = useState(true)
  const [sheets, setSheets] = useState<WorkbookSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0), [header, setHeader] = useState(true)
  const [excelFile, setExcelFile] = useState<File | null>(null), [fileError, setFileError] = useState(''), [templateMessage, setTemplateMessage] = useState('')
  const [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false), [printMessage, setPrintMessage] = useState('')
  const [settings, setSettings] = useState<LabelSettings>({ ...DEFAULT_SETTINGS })
  const [preset, setPreset] = useState('24'), [paperChoice, setPaperChoice] = useState('a4')
  const [copies, setCopies] = useState(1), [start, setStart] = useState(1), [currentPage, setCurrentPage] = useState(0)
  const [previewWidth, setPreviewWidth] = useState(600), [dragMode, setDragMode] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null), templateRef = useRef<RichTextHandle>(null), templateFileRef = useRef<HTMLInputElement>(null)
  const uploadVersion = useRef(0)
  const rows = useMemo(() => sheets[sheetIndex]?.data ?? [], [sheets, sheetIndex])
  const rawManual = useMemo(() => manualDocuments(manualDoc, true), [manualDoc])
  const columnCount = useMemo(() => mode === 'excel' ? rows.reduce((max, row) => Math.max(max, row.length), 0) : Math.max(3, ...rawManual.map(document => document.length)), [mode, rows, rawManual])
  const showTemplate = mode === 'excel' || applyTemplate
  const templateIssues = useMemo(() => showTemplate && (mode !== 'excel' || sheets.length) ? templateErrors(templateDoc, columnCount) : [], [showTemplate, mode, sheets.length, templateDoc, columnCount])
  const sourceLabels = useMemo(() => {
    if (templateIssues.length) return []
    if (mode === 'manual') return rawManual.map((doc, index) => {
      const values = doc.map(line => documentText([line]))
      return { document: applyTemplate ? resolveTemplate(templateDoc, values) : manualDocuments(doc)[0] ?? [], values, source: `Label manual ${index + 1}` }
    })
    return rows.slice(header ? 1 : 0).flatMap((row, index) => row.some(value => formatCell(value)) ? [{ document: resolveTemplate(templateDoc, row), values: row, source: `Baris Excel ${index + (header ? 2 : 1)}` }] : [])
  }, [mode, applyTemplate, rawManual, manualDoc, templateDoc, rows, header, templateIssues])
  const labelResult = useMemo(() => {
    try { return { ...prepareLabelData(sourceLabels, copies, settings.barcode), error: '' } }
    catch (error) { return { labels: [] as RichDocument[], barcodeValues: [] as string[], errors: [] as string[], count: 0, error: error instanceof Error ? error.message : 'Data tidak valid.' } }
  }, [sourceLabels, copies, settings.barcode])
  const layout = useMemo(() => getLayout(settings), [settings])
  const paperLayout = useMemo(() => getLayout({ ...DEFAULT_SETTINGS, ...paperSettings(settings), padding: 0 }), [settings])
  const startError = !Number.isInteger(start) || start < 1 || (layout.capacity > 0 && start > layout.capacity) ? 'Posisi awal harus berada dalam jumlah label per lembar.' : ''
  const baseErrors = [...layout.errors, ...templateIssues, ...labelResult.errors, labelResult.error, startError, mode === 'excel' ? fileError : ''].filter(Boolean)
  const texts = useMemo(() => labelResult.labels.map(documentText), [labelResult.labels])
  const pages = useMemo(() => paginateLabels(texts, layout.capacity, start), [texts, layout.capacity, start])
  const job = useMemo(() => ({ documents: labelResult.labels, barcodeValues: labelResult.barcodeValues, pages, settings, columns: layout.columns, valid: !baseErrors.length }), [labelResult.labels, labelResult.barcodeValues, pages, settings, layout.columns, baseErrors.join('|')])
  const [renderState, setRenderState] = useState<{ job: typeof job; model: PrintModel | null; fonts: Map<FontKey, LoadedFont>; error: string } | null>(null)
  const ready = renderState?.job === job
  const model = ready ? renderState.model : null
  const errors = [...baseErrors, ...(model?.barcodeErrors ?? []), ready ? renderState.error : ''].filter(Boolean)
  const displayedPage = Math.max(0, Math.min(currentPage, pages.length - 1))
  const canExport = ready && model !== null && pages.length > 0 && errors.length === 0 && !model.overflow.length && !model.unsupported.length && !loading && !exporting

  useEffect(() => { void connectAgent() }, [])
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
        if (!cancelled) setRenderState({ job, fonts, model: layoutPages(job.documents, job.pages, job.settings, job.columns, makeMeasure(fonts), job.barcodeValues), error: '' })
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
  function applyDocumentPreset(value: DocumentPreset) {
    const next = value.settings
    setSettings(previous => applyPaperPreset(previous, next)); setStart(1)
    const isA4 = next.paperWidth === 210 && next.paperHeight === 297
    setPreset(isA4 && next.labelWidth === 63.5 ? next.labelHeight === 33.9 ? '24' : next.labelHeight === 38.1 ? '21' : 'custom' : 'custom')
    setPaperChoice(isA4 ? 'a4' : next.paperWidth === 148 && next.paperHeight === 210 ? 'a5' : next.paperWidth === 215.9 && next.paperHeight === 279.4 ? 'letter' : 'custom')
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
    setManualText('Budi Santoso\nJl. Persatuan No. 12\nSinjai\n\nSari Wulandari\n-\nMakassar')
  }
  async function importExcel(file: File | undefined) {
    if (!file) return
    const version = ++uploadVersion.current
    setFileError(''); setSheets([]); setExcelFile(null); setLoading(true)
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
      setSheets(workbook); setSheetIndex(index); setExcelFile(file); setHeader(true); setTemplateMessage(`Berkas memiliki ${count} kolom. Sesuaikan pemetaan kolom di Desain label jika diperlukan.`); setCurrentPage(0)
    } catch (error) { if (version === uploadVersion.current) setFileError(error instanceof Error ? error.message : 'Berkas gagal dibaca.') }
    finally { if (version === uploadVersion.current) setLoading(false) }
  }
  function saveTemplate() {
    download(new Blob([JSON.stringify({ version: 1, document: templateDoc, settings }, null, 2)], { type: 'application/json' }), 'template-label.json')
    setTemplateMessage('Desain diunduh. Berkas desain terpisah dari preset kertas.')
  }
  async function openTemplate(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 1024 * 1024) throw new Error('Ukuran berkas template maksimal 1 MB.')
      const decoded = decodeTemplate(await file.text())
      if (decoded.settings.barcode?.enabled) {
        const old = decoded.settings.barcode
        const expression = barcodeExpression({ source: old.source === 'fixed' ? old.value : old.column + 1, options: { format: old.format, width: old.width, height: old.height, showText: old.showText } })
        decoded.document = [...decoded.document, { runs: [{ text: expression }] }]
      }
      delete decoded.settings.barcode
      setTemplate(decoded.document); setSettings(previous => ({ ...decoded.settings, ...paperSettings(previous) })); setApplyTemplate(true)
      setTemplateMessage('Template dimuat. Data penerima tetap menggunakan input saat ini.')
    } catch { setTemplateMessage('Desain tidak valid. Gunakan berkas JSON dari tombol Unduh desain JSON.') }
  }
  async function connectAgent() {
    setAgentBusy(true)
    try {
      const info = await agentRequest('info')
      if (!info || typeof info !== 'object' || !('os' in info) || !['windows', 'macos', 'linux'].includes(String(info.os))) throw new Error('Sistem operasi agen tidak didukung.')
      const osName = { windows: 'Windows', macos: 'macOS', linux: 'Linux' }[String(info.os)] ?? String(info.os)
      const result = await agentRequest('printers')
      if (!Array.isArray(result) || !result.every(item => typeof item === 'string')) throw new Error('Respons agen tidak valid.')
      setPrinters(result); setPrinter(result[0] ?? ''); setPrintMessage(`Pencetakan ${osName} siap. ${result.length ? 'Pilih printer, lalu klik Cetak label.' : 'Belum ada printer terpasang.'}`)
    } catch { setPrinters([]); setPrinter(''); setPrintMessage('Aplikasi cetak belum terhubung. Jalankan aplikasi cetak di komputer ini, lalu klik Cari printer.') }
    finally { setAgentBusy(false) }
  }
  async function printLocal() {
    if (!canExport || !model || !renderState || !printer || agentBusy) return
    setAgentBusy(true); setExporting(true); setPrintMessage('Menyiapkan pekerjaan cetak…')
    try {
      await agentRequest('jobs', { printer, width_mm: settings.paperWidth, height_mm: settings.paperHeight, pages: rasterPages(model, settings, renderState.fonts) })
      setPrintMessage('Pekerjaan diteruskan ke antrean cetak sistem. Periksa printer untuk hasil cetak.')
    } catch (error) { setPrintMessage('Status cetak belum pasti. Periksa antrean cetak sistem sebelum mencoba lagi. ' + (error instanceof Error ? error.message : '')) }
    finally { setAgentBusy(false); setExporting(false) }
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
    <div className="mb-6"><h1 className="mb-2 text-2xl font-medium">Cetak label</h1>
      <p className="max-w-2xl text-muted-foreground">Pilih kertas, isi label, lalu cetak. Format teks diatur di Desain label.</p>
      <p className="mt-3 text-sm text-muted-foreground">Isi label tidak diunggah atau disimpan. Preset tetap tersedia di browser ini; isi label dihapus saat halaman dimuat ulang.</p>
    </div>
    <DocumentPresets settings={settings} onApply={applyDocumentPreset}>
      <Card size="sm" aria-labelledby="layout-title"><CardHeader><CardTitle id="layout-title" role="heading" aria-level={2}><RulerIcon className="mr-2 inline size-4" />Kertas &amp; ukuran</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
            <Field className=""><FieldLabel htmlFor="label-setting-2">Isi cepat ukuran lembar</FieldLabel><SelectInput id="label-setting-2" className="w-full" value={preset} onValueChange={selectPreset} options={[{value:'24',label:'A4 · 24 label · 63,5 × 33,9 mm'},{value:'21',label:'A4 · 21 label · 63,5 × 38,1 mm'},{value:'custom',label:'Ukuran sendiri'}]} /></Field>
            <p className="hint mb-4">Ukur kertas stiker Anda dengan penggaris. Margin adalah jarak dari tepi kertas ke label pertama; jarak label adalah sela antarstiker. Semua ukuran dalam milimeter (mm). Tekan ikon info di samping isian untuk melihat contoh.</p>
            <Field className=" mb-4"><FieldLabel htmlFor="label-setting-3">Kertas</FieldLabel><SelectInput id="label-setting-3" className="w-full" value={paperChoice} onValueChange={value => {
              setPaperChoice(value)
              const size = { a4: [210,297], a5:[148,210], letter:[215.9,279.4] }[value]
              if (size) { setSettings(previous=>({...previous,paperWidth:size[0],paperHeight:size[1]}));setPreset('custom') }
            }} options={[{value:'a4',label:'A4'},{value:'a5',label:'A5'},{value:'letter',label:'Letter'},{value:'custom',label:'Ukuran sendiri / lanskap'}]} /></Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField help="paperWidth" label="Lebar kertas (mm)" value={settings.paperWidth} onChange={value => update('paperWidth', value)} min={1} />
              <NumberField help="paperHeight" label="Tinggi kertas (mm)" value={settings.paperHeight} onChange={value => update('paperHeight', value)} min={1} />
              <NumberField help="labelWidth" label="Lebar label (mm)" value={settings.labelWidth} onChange={value => update('labelWidth', value)} min={1} />
              <NumberField help="labelHeight" label="Tinggi label (mm)" value={settings.labelHeight} onChange={value => update('labelHeight', value)} min={1} />
              <NumberField help="marginTop" label="Margin atas (mm)" value={settings.marginTop} onChange={value => update('marginTop', value)} />
              <NumberField help="marginBottom" label="Margin bawah (mm)" value={settings.marginBottom} onChange={value => update('marginBottom', value)} />
              <NumberField help="marginLeft" label="Margin kiri (mm)" value={settings.marginLeft} onChange={value => update('marginLeft', value)} step={0.05} />
              <NumberField help="marginRight" label="Margin kanan (mm)" value={settings.marginRight} onChange={value => update('marginRight', value)} step={0.05} />
              <NumberField help="gapX" label="Jarak mendatar (mm)" value={settings.gapX} onChange={value => update('gapX', value)} />
              <NumberField help="gapY" label="Jarak menurun (mm)" value={settings.gapY} onChange={value => update('gapY', value)} />
            </FieldGroup>
            <p className="hint" aria-live="polite">{paperLayout.errors.length ? 'Periksa ukuran: ' + paperLayout.errors.join(' ') : `${paperLayout.columns} kolom × ${paperLayout.rows} baris = ${paperLayout.capacity} label per lembar.`}</p>
            <Button variant="link" size="sm" className=" mt-4" onClick={() => { setSettings(previous => ({ ...previous, paperWidth: previous.paperHeight, paperHeight: previous.paperWidth })); setPreset('custom'); setPaperChoice('custom') }}>Putar kertas</Button>

          </FieldGroup></CardContent></Card>
    </DocumentPresets>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0">
        <Card size="sm" aria-labelledby="data-title"><CardHeader><CardTitle id="data-title" role="heading" aria-level={2}>Isi label</CardTitle></CardHeader><CardContent><FieldGroup className="gap-4">
          <Tabs value={mode} onValueChange={value=>{if(value==='manual'||value==='excel')setMode(value)}}>
           <TabsList aria-label="Sumber data label" className="w-full"><TabsTrigger value="manual">Isi manual</TabsTrigger><TabsTrigger value="excel">Dari Excel</TabsTrigger></TabsList>
           <TabsContent value={mode} className="mt-4">
          {mode === 'manual' ? <>
            <Field><FieldLabel htmlFor="manual-data">Isi label manual</FieldLabel><InputGroup>
              <InputGroupTextarea id="manual-data" aria-describedby="manual-data-help" className="min-h-56" value={manualText} onChange={event => setManualText(event.target.value)} placeholder={'Nama penerima\nAlamat\nKota\n\nNama penerima berikutnya\nAlamat\nKota'} />
              <InputGroupAddon align="block-end"><InputGroupText><FileTextIcon aria-hidden="true" />Satu label per blok teks</InputGroupText></InputGroupAddon>
            </InputGroup></Field>
            <p id="manual-data-help" className="hint flex items-start gap-2"><InfoIcon className="mt-0.5 size-4 shrink-0" /><span>Enter untuk baris baru. Satu baris kosong memisahkan label. Baris yang hanya berisi - tidak ikut dicetak. Atur tebal, miring, ukuran, dan perataan pada template di Desain label.</span></p>
            <Button variant="link" size="sm" className=" mt-3" onClick={useExample}>{documentText(manualDoc).trim() ? 'Ganti dengan contoh' : 'Isi contoh'}</Button>
            <FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="manual-template" checked={applyTemplate} onCheckedChange={setApplyTemplate} /><FieldLabel htmlFor="manual-template">Terapkan desain yang sama ke semua label</FieldLabel></Field></FieldSet>
            {applyTemplate && <p className="hint">Setiap baris manual menjadi kolom: baris 1 = {'{{1}}'}, baris 2 = {'{{2}}'}, dan seterusnya. Gunakan - untuk baris data yang kosong.</p>}
          </> : <>
            <Field><FieldLabel htmlFor="excel-file">Berkas Excel (.xlsx)</FieldLabel><FileUpload id="excel-file" file={excelFile} accept=".xlsx" maxSize={10 * 1024 * 1024} label="Pilih Excel" hint="XLSX · maksimal 10 MB" icon={FileSpreadsheetIcon} busy={loading} status={loading ? "Membaca berkas…" : undefined} onFileSelect={importExcel} onClear={() => { uploadVersion.current++; setLoading(false); setExcelFile(null); setSheets([]); setFileError(""); setTemplateMessage(""); setCurrentPage(0) }} /></Field>
            <p className="hint">Simpan nomor telepon dan kode berawalan nol sebagai teks.</p><Button role="link" nativeButton={false} variant="link" size="sm" render={<a href={exampleWorkbook} download="contoh-label.xlsx" />}>Unduh contoh Excel</Button>
            {sheets.length > 0 && <div className="mt-4 flex flex-col gap-4"><Field className=""><FieldLabel htmlFor="label-setting-1">Sheet</FieldLabel><SelectInput id="label-setting-1" className="w-full" value={String(sheetIndex)} onValueChange={value => { setSheetIndex(Number(value)); setCurrentPage(0) }} options={sheets.map((sheet,i)=>({value:String(i),label:sheet.sheet}))} /></Field><FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="excel-header" checked={header} onCheckedChange={setHeader} /><FieldLabel htmlFor="excel-header">Baris pertama adalah judul kolom</FieldLabel></Field></FieldSet></div>}
          </>}
           </TabsContent>
          </Tabs>
          {showTemplate && <p className="hint">Atur format baris dan pemetaan kolom di Desain label di bawah. {mode === 'excel' ? templateMessage : ''}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3"><NumberField unit="kali" icon={CopyIcon} label="Salinan per label" value={copies} onChange={setCopies} min={1} max={100} step={1} /><NumberField icon={HashIcon} label="Mulai di label ke-" value={start} onChange={setStart} min={1} max={layout.capacity || 1} step={1} /></div><p className="hint">Posisi dihitung dari kiri ke kanan, lalu ke bawah. Gunakan posisi awal jika sebagian stiker sudah terpakai.</p><p className="hint">{labelResult.count} data label · maksimal 1.000 label termasuk salinan.</p>
        </FieldGroup></CardContent></Card>
        <Card size="sm" className="mt-4" aria-labelledby="design-title"><CardHeader><CardTitle id="design-title" role="heading" aria-level={2}><TypeIcon className="mr-2 inline size-4" />Desain label</CardTitle></CardHeader><CardContent>
          <p className="hint mb-4">Atur tebal, miring, ukuran huruf, dan perataan langsung di editor. Pengaturan di bawah berlaku untuk seluruh label dan tidak ikut disimpan dalam preset kertas.</p>
          {showTemplate && <><FieldGroup className="gap-4">
          <p className="hint mb-3">Penanda {'{{1}}'} mengambil kolom pertama Excel atau baris pertama input manual; {'{{2}}'} mengambil yang kedua. Pilih penandanya untuk mengatur huruf. Contoh: baris {'{{1}}'} tebal, baris {'{{2}}'} normal. Nilai - atau kosong diabaikan tanpa menyisakan ruang. Jika semua kolom pada satu baris kosong, awalan teks baris itu juga dihapus.</p>
          <RichTextEditor key={`template-${templateRevision}`} ref={templateRef} fontFamily={settings.font === 'mono' ? 'JetBrains Mono' : 'Noto Sans'} fontSize={settings.fontSize} lineHeight={settings.lineHeight} label="Template label" settings={settings} rows={sourceLabels.map(source => source.values)} initialDocument={templateDoc} onChange={setTemplateDoc} />
          <p className="hint">Pilih penanda seperti {'{{3}}'} lalu tekan ikon barcode untuk mengubahnya menjadi {'{{barcode(3)}}'}. Panah di samping ikon membuka pengaturan tampilan opsional. Barcode mengikuti posisi, perataan, dan warna teks. Enter serta spasi template dipertahankan.</p>
          <p className="mt-4 mb-2 text-sm">Sisipkan kolom di posisi kursor</p><div className="flex max-h-40 flex-wrap gap-2 overflow-auto">{Array.from({ length: Math.min(columnCount, 100) }, (_, column) => <Button key={column} variant="outline" size="sm" onMouseDown={event => event.preventDefault()} onClick={() => templateRef.current?.insertText(`{{${column + 1}}}`)}>{`{{${column + 1}}}`} {mode === 'excel' && header ? formatCell(rows[0]?.[column]) : `Baris ${column + 1}`}</Button>)}</div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm"><Button variant="link" size="sm" className="" onClick={() => setTemplate(makeTemplate(Math.min(columnCount, 3)))}>Template awal</Button><Button variant="link" size="sm" className="" onClick={saveTemplate}>Unduh desain JSON</Button><Button variant="link" size="sm" onClick={()=>templateFileRef.current?.click()}>Impor desain JSON</Button><Input ref={templateFileRef} className="hidden" type="file" aria-label="Muat template JSON" accept=".json,application/json" onChange={event => { void openTemplate(event.target.files?.[0]);event.target.value='' }} /></div>
          <p className="hint" role="status">{templateMessage}</p>
        </FieldGroup><Separator className="my-5" /></>}
          <FieldGroup className="gap-4">
            <FieldGroup className="grid grid-cols-2 gap-3">
              <NumberField help="padding" label="Ruang dalam (mm)" value={settings.padding} onChange={value => update('padding', value)} />
              <Field className=""><FieldLabel htmlFor="label-setting-4">Huruf</FieldLabel><SelectInput id="label-setting-4" className="w-full" value={settings.font} onValueChange={value => update('font',value as LabelSettings['font'])} options={[{value:'sans',label:'Sans (Noto Sans)'},{value:'mono',label:'JetBrains Mono'}]} /></Field>
              <Field><FieldLabel htmlFor="label-setting-6">Posisi vertikal</FieldLabel><InputGroup><InputGroupAddon><MoveVerticalIcon aria-hidden="true" /></InputGroupAddon><SelectInput id="label-setting-6" className="min-w-0 flex-1 border-0 px-2" value={settings.vertical} onValueChange={value => update('vertical',value as LabelSettings['vertical'])} options={[{value:'top',label:'Atas'},{value:'center',label:'Tengah'},{value:'bottom',label:'Bawah'}]} /><InputGroupAddon align="inline-end"><MeasurementHelp kind="vertical" label="Posisi vertikal" value={settings.vertical} /></InputGroupAddon></InputGroup></Field>
              <NumberField help="lineHeight" unit="×" icon={Rows3Icon} label="Jarak baris" value={settings.lineHeight ?? 1.3} onChange={value => update('lineHeight', value)} min={1} max={3} step={0.1} />
              <NumberField help="offsetX" icon={MoveHorizontalIcon} label="Geser X (mm)" value={settings.offsetX ?? 0} onChange={value => update('offsetX', value)} min={-1000} />
              <NumberField help="offsetY" icon={MoveVerticalIcon} label="Geser Y (mm)" value={settings.offsetY ?? 0} onChange={value => update('offsetY', value)} min={-1000} />
            </FieldGroup>
            <Button variant="link" size="sm" className=" mt-3" onClick={() => setSettings(previous => ({ ...previous, offsetX: 0, offsetY: 0 }))}>Atur ulang posisi teks</Button>
            <FieldSet><FieldLegend className="sr-only">Opsi label</FieldLegend><Field orientation="horizontal"><Checkbox id="print-border" checked={settings.border} onCheckedChange={checked => update('border', checked)} /><FieldLabel htmlFor="print-border">Cetak garis tepi label</FieldLabel></Field></FieldSet>
          </FieldGroup>
        </CardContent></Card>
      </div>
      <section className="min-w-0 xl:sticky xl:top-20" aria-labelledby="preview-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="preview-title">Pratinjau</h2><div className="flex flex-wrap gap-2"><Button disabled={!canExport || !printer || agentBusy} onClick={() => { void printLocal() }}><PrinterIcon />{agentBusy ? 'Memproses…' : 'Cetak label'}</Button></div></div>
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">{labelResult.labels.length} label · {pages.length} lembar · {layout.columns} kolom × {layout.rows} baris</p>
        {errors.length > 0 && <Alert variant="destructive" className="mb-4"><AlertDescription><ul className="list-disc pl-4">{errors.map(error => <li key={error}>{error}</li>)}</ul></AlertDescription></Alert>}
        {!!model?.overflow.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Isi pada label {model.overflow.slice(0, 8).map(i => i + 1).join(', ')}{model.overflow.length > 8 ? ', …' : ''} tidak muat. Kecilkan huruf atau tinggi barcode, atur posisi, atau perbesar label.</AlertDescription></Alert>}
        {!!model?.unsupported.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Ada karakter yang tidak didukung font. Ganti karakter khusus atau emoji pada label {model.unsupported.slice(0, 8).map(i => i + 1).join(', ')} sebelum mengekspor.</AlertDescription></Alert>}
        <FieldGroup className="mb-4">
          <Field><Button variant="outline" disabled={agentBusy} onClick={() => { void connectAgent() }}>{agentBusy ? 'Mencari…' : 'Cari printer'}</Button></Field>
          {printers.length > 0 && <Field><FieldLabel htmlFor="agent-printer">Printer</FieldLabel><SelectInput id="agent-printer" value={printer} onValueChange={setPrinter} disabled={agentBusy} options={printers.map(name => ({ value: name, label: name }))} /></Field>}
          <p className="text-sm text-muted-foreground">Pencetakan memakai aplikasi cetak lokal. Browser dapat meminta izin jaringan lokal. Isi label diproses di komputer ini.</p>
        </FieldGroup>
        <Accordion className="mb-4"><AccordionItem value="install-agent"><AccordionTrigger>Unduh aplikasi cetak</AccordionTrigger><AccordionContent><FieldGroup>          <Field><FieldLabel htmlFor="agent-version">Versi unduhan</FieldLabel><SelectInput id="agent-version" value={agentVersion} onValueChange={setAgentVersion} options={[{ value: 'auto', label: 'Otomatis — ' + (recommendedAgent.asset ? recommendedAgent.label.replace('Unduh agen ', '') : 'Tidak didukung') }, ...AGENT_DOWNLOADS]} /></Field>
          <Field>{agentDownload.asset ? <Button variant="outline" render={<a href={AGENT_RELEASE + agentDownload.asset} />} nativeButton={false}><DownloadIcon />{agentDownload.label}</Button> : <p role="status">Tidak didukung — aplikasi cetak belum tersedia untuk sistem atau arsitektur perangkat ini.</p>}</Field>
          {agentDownload.asset && <p className="text-sm text-muted-foreground">Ekstrak unduhan, jalankan aplikasi cetak, lalu klik Cari printer. macOS: jalankan berkas mulai-agen.command. Linux: jalankan xviidev-print-agent.</p>}
          {agentDownload.asset?.includes('windows7') && <p className="text-sm text-muted-foreground">Build Windows lama bersifat eksperimental. Windows 7 memerlukan SP1, PowerShell 5.1 dan .NET Framework 4.8.</p>}
</FieldGroup></AccordionContent></AccordionItem><AccordionItem value="manual-print"><AccordionTrigger>Unduh PDF atau cetak manual</AccordionTrigger><AccordionContent><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!canExport} onClick={() => { void exportPdf(false) }}><DownloadIcon />Unduh PDF</Button><Button variant="outline" disabled={!canExport} onClick={() => { void exportPdf(true) }}><PrinterIcon />Cetak PDF</Button></div></AccordionContent></AccordionItem></Accordion>
        {printMessage && <p className="hint mb-4" role="status">{printMessage}</p>}
        <div className="mb-3 flex flex-wrap items-center gap-4"><Button variant="outline" size="sm" aria-pressed={dragMode} onClick={() => setDragMode(previous => !previous)}>Geser blok teks</Button><span className="text-sm text-muted-foreground">{dragMode ? 'Geser teks di canvas. Berlaku untuk semua label.' : 'Format teks tetap mengikuti editor dan template.'}</span></div>
        <div className="border border-border bg-muted p-4"><div ref={previewRef} className="min-w-0 overflow-hidden">
          {model && renderState && errors.length === 0 ? <CanvasSheet model={model} page={displayedPage} fonts={renderState.fonts} settings={settings} columns={layout.columns} rows={layout.rows} width={previewWidth} draggable={dragMode} onMove={(x, y) => setSettings(previous => ({ ...previous, offsetX: Math.round(((previous.offsetX ?? 0) + x) * 10) / 10, offsetY: Math.round(((previous.offsetY ?? 0) + y) * 10) / 10 }))} /> : <Empty className="min-h-72"><EmptyHeader><EmptyTitle>{errors.length ? 'Periksa pengaturan' : labelResult.labels.length && !ready ? 'Menyiapkan pratinjau' : 'Belum ada label'}</EmptyTitle><EmptyDescription>{errors.length ? 'Perbaiki pengaturan untuk menampilkan pratinjau.' : labelResult.labels.length && !ready ? 'Font dan tata letak sedang disiapkan.' : 'Isi label atau unggah Excel untuk memulai.'}</EmptyDescription></EmptyHeader>{!!labelResult.labels.length && !ready && <Skeleton className="h-24 w-full" />}</Empty>}
        </div></div>
        {pages.length > 0 && <div className="mt-4 flex items-center justify-between gap-3 text-sm"><Button variant="outline" size="sm" disabled={displayedPage === 0} onClick={() => setCurrentPage(displayedPage - 1)}>Sebelumnya</Button><span>Lembar {displayedPage + 1} / {pages.length}</span><Button variant="outline" size="sm" disabled={displayedPage >= pages.length - 1} onClick={() => setCurrentPage(displayedPage + 1)}>Berikutnya</Button></div>}
        {pages[displayedPage] && <Accordion className="mt-4"><AccordionItem value="label-content"><AccordionTrigger>Lihat isi label pada lembar ini</AccordionTrigger><AccordionContent><ol className="mt-3 max-h-60 flex flex-col gap-3 overflow-auto border border-border p-4">{pages[displayedPage].flatMap(slot => slot ? [<li key={slot.index} className="whitespace-pre-wrap"><span className="text-muted-foreground">{slot.index + 1}. </span>{slot.text}</li>] : [])}</ol></AccordionContent></AccordionItem></Accordion>}
        <p className="hint mt-4">Pastikan ukuran kertas di driver sesuai dengan pengaturan label. Lakukan cetak uji pada kertas biasa sebelum mencetak banyak label. Garis putus-putus pratinjau tidak ikut dicetak.</p>
      </section>
    </div>
  </>
}
