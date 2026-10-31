import { PrintControls } from './components/PrintControls'
import { usePrintClient } from './lib/use-print-client'
import { choosePrinter, choosePrintRoute, executePrint, printLimits } from './lib/print-choice'
import type { PrintPreference } from './lib/print-choice'
import { printInBrowser } from './lib/browser-print'
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
import { RulerIcon, TypeIcon, InfoIcon, DownloadIcon, PrinterIcon, FileTextIcon, CopyIcon, HashIcon, Rows3Icon, MoveHorizontalIcon, MoveVerticalIcon, FileSpreadsheetIcon, FilesIcon, ScanLineIcon, ZoomInIcon, ZoomOutIcon } from '@xviidev/ui/lib/icons'
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

function applyCase(val: string, mode: 'original' | 'title' | 'upper'): string {
  if (mode === 'upper') return val.toUpperCase()
  if (mode === 'title') return val.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  return val
}

export default function LabelPrinter() {
  const [printPreference, setPrintPreference] = useState<PrintPreference>('auto')
  const [preferredPrinter, setPreferredPrinter] = useState('')
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')
  const [manualText, setManualText] = useState('')
  const manualDoc = useMemo(() => fromText(manualText), [manualText])
  const [templateDoc, setTemplateDoc] = useState<RichDocument>(() => makeTemplate())
  const [templateRevision, setTemplateRevision] = useState(0)
  const [applyTemplate, setApplyTemplate] = useState(true)
  const [sheets, setSheets] = useState<WorkbookSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0), [header, setHeader] = useState(true)
  const [excelFile, setExcelFile] = useState<File | null>(null), [fileError, setFileError] = useState(''), [templateMessage, setTemplateMessage] = useState('')
  const [textCase, setTextCase] = useState<'original' | 'title' | 'upper'>('original')
  const [loading, setLoading] = useState(false), [exporting, setExporting] = useState(false), [printMessage, setPrintMessage] = useState('')
  const { connection, checking, refresh } = usePrintClient(exporting)
  const printer = choosePrinter(connection.printers, preferredPrinter)
  const [settings, setSettings] = useState<LabelSettings>({ ...DEFAULT_SETTINGS })
  const [preset, setPreset] = useState('24'), [paperChoice, setPaperChoice] = useState('a4')
  const [copies, setCopies] = useState(1), [start, setStart] = useState(1), [currentPage, setCurrentPage] = useState(0)
  const [previewWidth, setPreviewWidth] = useState(600), [dragMode, setDragMode] = useState(false)
  const [previewMode, setPreviewMode] = useState<'sheet' | 'single'>('sheet')
  const [singleLabelIndex, setSingleLabelIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [mobileTab, setMobileTab] = useState<'config' | 'preview'>('config')

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
      const values = doc.map(line => {
        const text = documentText([line])
        return textCase === 'original' ? text : applyCase(text, textCase)
      })
      return { document: applyTemplate ? resolveTemplate(templateDoc, values) : manualDocuments(doc)[0] ?? [], values, source: `Label manual ${index + 1}` }
    })
    return rows.slice(header ? 1 : 0).flatMap((row, index) => {
      if (!row.some(value => formatCell(value))) return []
      const transformedRow = textCase === 'original' ? row : row.map(cell => typeof cell === 'string' ? applyCase(cell, textCase) : cell)
      return [{ document: resolveTemplate(templateDoc, transformedRow), values: transformedRow, source: `Baris Excel ${index + (header ? 2 : 1)}` }]
    })
  }, [mode, applyTemplate, rawManual, manualDoc, templateDoc, rows, header, templateIssues, textCase])

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

  const limits = printLimits(pages.length, settings.paperWidth, settings.paperHeight)
  const printRoute = choosePrintRoute(printPreference, connection, limits)

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
    if (value.id === 'tj-103') setPreset('tj-103')
    else if (value.id === 'tj-121') setPreset('tj-121')
    else if (value.id === 'thermal-100x150') setPreset('thermal-100x150')
    else if (value.id === 'thermal-50x30') setPreset('thermal-50x30')
    else {
      const isA4 = next.paperWidth === 210 && next.paperHeight === 297
      setPreset(isA4 && next.labelWidth === 63.5 ? next.labelHeight === 33.9 ? '24' : next.labelHeight === 38.1 ? '21' : 'custom' : 'custom')
      setPaperChoice(isA4 ? 'a4' : next.paperWidth === 148 && next.paperHeight === 210 ? 'a5' : next.paperWidth === 215.9 && next.paperHeight === 279.4 ? 'letter' : 'custom')
    }
    setPrintMessage('')
  }

  function selectPreset(value: string) {
    setPreset(value); setStart(1)
    if (value === '24' || value === '21') {
      setPaperChoice('a4')
      setSettings(previous => ({ ...previous, paperWidth: 210, paperHeight: 297, labelWidth: 63.5, labelHeight: value === '24' ? 33.9 : 38.1,
        marginTop: value === '24' ? 12.9 : 15, marginBottom: value === '24' ? 12.9 : 15, marginLeft: 7.25, marginRight: 7.25, gapX: 2.5, gapY: 0 }))
    } else if (value === 'tj-103') {
      setPaperChoice('custom')
      setSettings(previous => ({ ...previous, paperWidth: 137, paperHeight: 205, labelWidth: 64, labelHeight: 32, marginLeft: 2, marginRight: 2, marginTop: 7, marginBottom: 6, gapX: 5, gapY: 0 }))
    } else if (value === 'tj-121') {
      setPaperChoice('custom')
      setSettings(previous => ({ ...previous, paperWidth: 154, paperHeight: 210, labelWidth: 75, labelHeight: 38, marginLeft: 2, marginRight: 2, marginTop: 10, marginBottom: 10, gapX: 0, gapY: 0 }))
    } else if (value === 'thermal-100x150') {
      setPaperChoice('custom')
      setSettings(previous => ({ ...previous, paperWidth: 100, paperHeight: 150, labelWidth: 100, labelHeight: 150, marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0, gapX: 0, gapY: 0 }))
    } else if (value === 'thermal-50x30') {
      setPaperChoice('custom')
      setSettings(previous => ({ ...previous, paperWidth: 50, paperHeight: 30, labelWidth: 50, labelHeight: 30, marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0, gapX: 0, gapY: 0 }))
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

  async function printTestSheet() {
    if (!model || !renderState) return
    setExporting(true); setPrintMessage('Menyiapkan lembar uji kalibrasi…')
    try {
      const testSettings: LabelSettings = { ...settings, border: true }
      const { generatePdf } = await import('./lib/pdf-export')
      const testModel: PrintModel = { ...model, pages: [model.pages[0] ?? []] }
      const bytes = await generatePdf(testModel, testSettings, async key => (await getFont(key)).bytes)
      download(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'lembar-uji-kalibrasi.pdf')
      setPrintMessage('Lembar uji PDF diunduh. Cetak pada kertas HVS biasa untuk mencocokkan garis stiker sebelum mencetak banyak.')
    } catch {
      setPrintMessage('Lembar uji belum dapat disiapkan.')
    } finally { setExporting(false) }
  }

  async function printLabels(preference = printPreference) {
    if (!canExport || !model || !renderState) return
    setExporting(true); setPrintMessage('Menyiapkan label…')
    let submitted = false
    try {
      const result = await executePrint({
        preference, limits, printer: preferredPrinter || printer,
        discover: refresh,
        client: async target => {
          const body = { printer: target, width_mm: settings.paperWidth, height_mm: settings.paperHeight, pages: rasterPages(model, settings, renderState.fonts) }
          if (new Blob([JSON.stringify(body)]).size > 32 * 1024 * 1024) throw new Error('Job too large')
          submitted = true
          await agentRequest('jobs', body)
        },
        browser: async () => {
          await printInBrowser(rasterPages(model, settings, renderState.fonts), settings.paperWidth, settings.paperHeight)
        },
        pdf: async () => {
          const { generatePdf } = await import('./lib/pdf-export')
          const bytes = await generatePdf(model, settings, async key => (await getFont(key)).bytes)
          download(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), 'label-siap-cetak.pdf')
        },
      })
      setPrintMessage({
        client: 'Label sudah dikirim ke printer. Periksa hasil cetak sebelum mencetak lagi.',
        browser: 'Jendela cetak browser telah dibuka. Pastikan skala 100% dan margin None.',
        pdf: 'PDF siap diunduh. Buka berkasnya untuk melihat atau mencetak label.',
        'choose-printer': 'Pilih printer terlebih dahulu, lalu klik Cetak label.',
      }[result])
    } catch {
      setPrintMessage(submitted
        ? 'Pekerjaan mungkin sudah diterima printer. Periksa antrean printer sebelum mencoba lagi agar label tidak tercetak dua kali.'
        : 'Label belum dapat disiapkan untuk dicetak. Coba pilih Simpan PDF, atau gunakan browser lain.')
    } finally { setExporting(false) }
  }

  return <>
    <div className="mb-6">
      <h1 className="mb-2 text-2xl font-medium">Cetak label</h1>
      <p className="max-w-2xl text-muted-foreground">Pilih ukuran kertas, isi data label, lalu cetak atau simpan sebagai PDF.</p>
      <p className="mt-3 text-sm text-muted-foreground">Data label diolah aman di browser dan tidak disimpan ke server. Data dihapus saat halaman dimuat ulang.</p>
    </div>

    <div className="mb-6 flex xl:hidden">
      <Tabs value={mobileTab} onValueChange={value => { if (value === 'config' || value === 'preview') setMobileTab(value) }} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="config" className="flex-1">Pengaturan &amp; Data</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">Pratinjau ({labelResult.labels.length} label)</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <div className={mobileTab === 'preview' ? 'hidden xl:block' : ''}>
      <DocumentPresets settings={settings} onApply={applyDocumentPreset}>
        <Card size="sm" aria-labelledby="layout-title">
          <CardHeader>
            <CardTitle id="layout-title" role="heading" aria-level={2}>
              <RulerIcon className="mr-2 inline size-4" />Kertas &amp; ukuran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="label-setting-2">Ukuran stiker siap pakai</FieldLabel>
                <SelectInput
                  id="label-setting-2"
                  className="w-full"
                  value={preset}
                  onValueChange={selectPreset}
                  options={[
                    { value: '24', label: 'A4 · 24 label (63,5 × 33,9 mm)' },
                    { value: '21', label: 'A4 · 21 label (63,5 × 38,1 mm)' },
                    { value: 'tj-103', label: 'Tom & Jerry 103 · Undangan (64 × 32 mm)' },
                    { value: 'tj-121', label: 'Tom & Jerry 121 · Nama / Arsip (75 × 38 mm)' },
                    { value: 'thermal-100x150', label: 'Thermal Resi Pengiriman (100 × 150 mm)' },
                    { value: 'thermal-50x30', label: 'Thermal Barcode Toko (50 × 30 mm)' },
                    { value: 'custom', label: 'Ukuran sendiri (kustom)' },
                  ]}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span aria-live="polite">
                  {paperLayout.errors.length ? 'Periksa ukuran: ' + paperLayout.errors.join(' ') : `${paperLayout.columns} kolom × ${paperLayout.rows} baris = ${paperLayout.capacity} label per lembar (${settings.labelWidth} × ${settings.labelHeight} mm)`}
                </span>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => { setSettings(previous => ({ ...previous, paperWidth: previous.paperHeight, paperHeight: previous.paperWidth })); setPreset('custom'); setPaperChoice('custom') }}>Putar arah kertas</Button>
              </div>

              <Accordion className="w-full">
                <AccordionItem value="measurements">
                  <AccordionTrigger className="text-sm">Sesuaikan ukuran milimeter secara manual ({preset === 'custom' ? 'Kustom' : 'Otomatis'})</AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-2">
                      <p className="hint mb-4">Ukur kertas stiker Anda dengan penggaris jika menggunakan ukuran sendiri. Margin adalah jarak dari tepi kertas ke label pertama. Tekan ikon info di samping isian untuk melihat ilustrasi.</p>
                      <Field className="mb-4">
                        <FieldLabel htmlFor="label-setting-3">Kertas dasar</FieldLabel>
                        <SelectInput id="label-setting-3" className="w-full" value={paperChoice} onValueChange={value => {
                          setPaperChoice(value)
                          const size = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4] }[value]
                          if (size) { setSettings(previous => ({ ...previous, paperWidth: size[0], paperHeight: size[1] })); setPreset('custom') }
                        }} options={[{ value: 'a4', label: 'A4' }, { value: 'a5', label: 'A5' }, { value: 'letter', label: 'Letter' }, { value: 'custom', label: 'Ukuran sendiri / khusus' }]} />
                      </Field>
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </FieldGroup>
          </CardContent>
        </Card>
      </DocumentPresets>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
      <div className={mobileTab === 'preview' ? 'hidden xl:block min-w-0' : 'min-w-0'}>
        <Card size="sm" aria-labelledby="data-title">
          <CardHeader>
            <CardTitle id="data-title" role="heading" aria-level={2}>Isi label</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Tabs value={mode} onValueChange={value => { if (value === 'manual' || value === 'excel') setMode(value) }}>
                <TabsList aria-label="Sumber data label" className="w-full">
                  <TabsTrigger value="manual">Isi manual</TabsTrigger>
                  <TabsTrigger value="excel">Dari Excel</TabsTrigger>
                </TabsList>
                <TabsContent value={mode} className="mt-4">
                  {mode === 'manual' ? <>
                    <Field>
                      <FieldLabel htmlFor="manual-data">Isi label manual</FieldLabel>
                      <InputGroup>
                        <InputGroupTextarea id="manual-data" aria-describedby="manual-data-help" className="min-h-56" value={manualText} onChange={event => setManualText(event.target.value)} placeholder={'Nama penerima\nAlamat\nKota\n\nNama penerima berikutnya\nAlamat\nKota'} />
                        <InputGroupAddon align="block-end">
                          <InputGroupText><FileTextIcon aria-hidden="true" />{rawManual.length ? `${rawManual.length} label terdeteksi` : 'Satu label per blok teks'}</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </Field>
                    <p id="manual-data-help" className="hint flex items-start gap-2">
                      <InfoIcon className="mt-0.5 size-4 shrink-0" />
                      <span>Enter untuk baris baru. Satu baris kosong memisahkan label. Baris yang hanya berisi - tidak ikut dicetak.</span>
                    </p>
                    <Button variant="link" size="sm" className="mt-3" onClick={useExample}>{documentText(manualDoc).trim() ? 'Ganti dengan contoh' : 'Isi contoh'}</Button>
                    <FieldSet>
                      <FieldLegend className="sr-only">Opsi label</FieldLegend>
                      <Field orientation="horizontal">
                        <Checkbox id="manual-template" checked={applyTemplate} onCheckedChange={setApplyTemplate} />
                        <FieldLabel htmlFor="manual-template">Terapkan desain yang sama ke semua label</FieldLabel>
                      </Field>
                    </FieldSet>
                    {applyTemplate && <p className="hint">Setiap baris manual menjadi kolom: baris 1 = {'{{1}}'}, baris 2 = {'{{2}}'}, dan seterusnya. Gunakan - untuk baris data yang kosong.</p>}
                  </> : <>
                    <Field>
                      <FieldLabel htmlFor="excel-file">Berkas Excel (.xlsx)</FieldLabel>
                      <FileUpload id="excel-file" file={excelFile} accept=".xlsx" maxSize={10 * 1024 * 1024} label="Pilih Excel" hint="XLSX · maksimal 10 MB" icon={FileSpreadsheetIcon} busy={loading} status={loading ? "Membaca berkas…" : undefined} onFileSelect={importExcel} onClear={() => { uploadVersion.current++; setLoading(false); setExcelFile(null); setSheets([]); setFileError(""); setTemplateMessage(""); setCurrentPage(0) }} />
                    </Field>
                    <p className="hint">Simpan nomor telepon dan kode berawalan nol sebagai teks.</p>
                    <Button role="link" nativeButton={false} variant="link" size="sm" render={<a href={exampleWorkbook} download="contoh-label.xlsx" />}>Unduh contoh Excel</Button>
                    {sheets.length > 0 && <div className="mt-4 flex flex-col gap-4">
                      <Field>
                        <FieldLabel htmlFor="label-setting-1">Sheet aktif</FieldLabel>
                        <SelectInput id="label-setting-1" className="w-full" value={String(sheetIndex)} onValueChange={value => { setSheetIndex(Number(value)); setCurrentPage(0) }} options={sheets.map((sheet, i) => ({ value: String(i), label: `${sheet.sheet} (${sheet.data.length} baris)` }))} />
                      </Field>
                      <FieldSet>
                        <FieldLegend className="sr-only">Opsi label</FieldLegend>
                        <Field orientation="horizontal">
                          <Checkbox id="excel-header" checked={header} onCheckedChange={setHeader} />
                          <FieldLabel htmlFor="excel-header">Baris pertama adalah judul kolom</FieldLabel>
                        </Field>
                      </FieldSet>

                      {rows.length > 0 && (
                        <Accordion className="w-full">
                          <AccordionItem value="excel-preview">
                            <AccordionTrigger className="text-sm">Pratinjau data Excel ({rows.length - (header ? 1 : 0)} data baris)</AccordionTrigger>
                            <AccordionContent>
                              <div className="overflow-x-auto border border-border">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-muted">
                                    <tr>
                                      <th className="border-b border-border p-2 font-medium text-muted-foreground">#</th>
                                      {Array.from({ length: Math.min(columnCount, 5) }, (_, c) => (
                                        <th key={c} className="border-b border-border p-2 font-medium">
                                          {header ? formatCell(rows[0]?.[c]) || `{{${c + 1}}}` : `{{${c + 1}}}`}
                                        </th>
                                      ))}
                                      {columnCount > 5 && <th className="border-b border-border p-2 font-medium text-muted-foreground">+{columnCount - 5} lainnya</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.slice(header ? 1 : 0, (header ? 1 : 0) + 4).map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-border/50">
                                        <td className="p-2 text-muted-foreground">{rIdx + 1}</td>
                                        {Array.from({ length: Math.min(columnCount, 5) }, (_, c) => (
                                          <td key={c} className="max-w-28 truncate p-2">{formatCell(row[c]) || '—'}</td>
                                        ))}
                                        {columnCount > 5 && <td className="p-2 text-muted-foreground">…</td>}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>}
                  </>}
                </TabsContent>
              </Tabs>

              {showTemplate && <p className="hint">Atur format baris dan pemetaan kolom di Desain label di bawah. {mode === 'excel' ? templateMessage : ''}</p>}

              <Field>
                <FieldLabel htmlFor="data-text-case">Format huruf data</FieldLabel>
                <SelectInput
                  id="data-text-case"
                  value={textCase}
                  onValueChange={value => setTextCase(value as typeof textCase)}
                  options={[
                    { value: 'original', label: 'Sesuai data asli' },
                    { value: 'title', label: 'Huruf Kapital Setiap Kata (Title Case)' },
                    { value: 'upper', label: 'HURUF BESAR SEMUA (UPPERCASE)' },
                  ]}
                />
              </Field>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <NumberField unit="kali" icon={CopyIcon} label="Salinan per label" value={copies} onChange={setCopies} min={1} max={100} step={1} />
                <NumberField icon={HashIcon} label="Mulai di label ke-" value={start} onChange={setStart} min={1} max={layout.capacity || 1} step={1} />
              </div>
              <p className="hint">Gunakan posisi awal jika sebagian stiker sudah terpakai pada lembar pertama (atau klik langsung stiker pada pratinjau).</p>
              <p className="hint font-medium">{labelResult.count} data label tercetak · maksimal 1.000 label termasuk salinan.</p>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card size="sm" className="mt-4" aria-labelledby="design-title">
          <CardHeader>
            <CardTitle id="design-title" role="heading" aria-level={2}>
              <TypeIcon className="mr-2 inline size-4" />Desain label
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="hint mb-4">Atur tebal, miring, ukuran huruf, warna, dan perataan langsung di editor. Barcode mengikuti posisi kursor.</p>
            {showTemplate && <>
              <FieldGroup className="gap-4">
                <p className="hint mb-3">Penanda {'{{1}}'} mengambil kolom/baris pertama data; {'{{2}}'} mengambil yang kedua. Nilai kosong diabaikan tanpa menyisakan ruang kosong.</p>
                <RichTextEditor key={`template-${templateRevision}`} ref={templateRef} fontFamily={settings.font === 'mono' ? 'JetBrains Mono' : 'Noto Sans'} fontSize={settings.fontSize} lineHeight={settings.lineHeight} label="Template label" settings={settings} rows={sourceLabels.map(source => source.values)} initialDocument={templateDoc} onChange={setTemplateDoc} />
                <p className="hint">Pilih penanda seperti {'{{3}}'} lalu tekan ikon barcode untuk mengubahnya menjadi {'{{barcode(3)}}'}. Panah di samping ikon membuka pengaturan format.</p>
                <p className="mt-4 mb-2 text-sm font-medium">Sisipkan kolom di posisi kursor</p>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-auto">
                  {Array.from({ length: Math.min(columnCount, 100) }, (_, column) => (
                    <Button key={column} variant="outline" size="sm" onMouseDown={event => event.preventDefault()} onClick={() => templateRef.current?.insertText(`{{${column + 1}}}`)}>
                      {`{{${column + 1}}}`} {mode === 'excel' && header ? formatCell(rows[0]?.[column]) : `Baris ${column + 1}`}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <Button variant="link" size="sm" onClick={() => setTemplate(makeTemplate(Math.min(columnCount, 3)))}>Template awal</Button>
                  <Button variant="link" size="sm" onClick={saveTemplate}>Unduh desain JSON</Button>
                  <Button variant="link" size="sm" onClick={() => templateFileRef.current?.click()}>Impor desain JSON</Button>
                  <Input ref={templateFileRef} className="hidden" type="file" aria-label="Muat template JSON" accept=".json,application/json" onChange={event => { void openTemplate(event.target.files?.[0]); event.target.value = '' }} />
                </div>
                <p className="hint" role="status">{templateMessage}</p>
              </FieldGroup>
              <Separator className="my-5" />
            </>}
            <FieldGroup className="gap-4">
              <FieldGroup className="grid grid-cols-2 gap-3">
                <NumberField help="padding" label="Ruang dalam (mm)" value={settings.padding} onChange={value => update('padding', value)} />
                <Field>
                  <FieldLabel htmlFor="label-setting-4">Huruf</FieldLabel>
                  <SelectInput id="label-setting-4" className="w-full" value={settings.font} onValueChange={value => update('font', value as LabelSettings['font'])} options={[{ value: 'sans', label: 'Sans (Noto Sans)' }, { value: 'mono', label: 'JetBrains Mono' }]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="label-setting-6">Posisi vertikal</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon><MoveVerticalIcon aria-hidden="true" /></InputGroupAddon>
                    <SelectInput id="label-setting-6" className="min-w-0 flex-1 border-0 px-2" value={settings.vertical} onValueChange={value => update('vertical', value as LabelSettings['vertical'])} options={[{ value: 'top', label: 'Atas' }, { value: 'center', label: 'Tengah' }, { value: 'bottom', label: 'Bawah' }]} />
                    <InputGroupAddon align="inline-end"><MeasurementHelp kind="vertical" label="Posisi vertikal" value={settings.vertical} /></InputGroupAddon>
                  </InputGroup>
                </Field>
                <NumberField help="lineHeight" unit="×" icon={Rows3Icon} label="Jarak baris" value={settings.lineHeight ?? 1.3} onChange={value => update('lineHeight', value)} min={1} max={3} step={0.1} />
                <NumberField help="offsetX" icon={MoveHorizontalIcon} label="Geser X (mm)" value={settings.offsetX ?? 0} onChange={value => update('offsetX', value)} min={-1000} />
                <NumberField help="offsetY" icon={MoveVerticalIcon} label="Geser Y (mm)" value={settings.offsetY ?? 0} onChange={value => update('offsetY', value)} min={-1000} />
              </FieldGroup>
              <Button variant="link" size="sm" className="mt-3" onClick={() => setSettings(previous => ({ ...previous, offsetX: 0, offsetY: 0 }))}>Atur ulang posisi teks</Button>
              <FieldSet>
                <FieldLegend className="sr-only">Opsi label</FieldLegend>
                <Field orientation="horizontal">
                  <Checkbox id="print-border" checked={settings.border} onCheckedChange={checked => update('border', checked)} />
                  <FieldLabel htmlFor="print-border">Cetak garis tepi label</FieldLabel>
                </Field>
              </FieldSet>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <section className={mobileTab === 'config' ? 'hidden xl:block min-w-0 xl:sticky xl:top-20' : 'min-w-0 xl:sticky xl:top-20'} aria-labelledby="preview-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="preview-title" className="text-xl font-medium">Pratinjau</h2>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canExport || (printRoute === 'client' && !printer)} onClick={() => { void printLabels() }}>
              {printRoute === 'pdf' ? <DownloadIcon data-icon="inline-start" /> : <PrinterIcon data-icon="inline-start" />}
              {exporting ? 'Menyiapkan…' : printRoute === 'pdf' ? 'Unduh PDF' : 'Cetak label'}
            </Button>
            {printRoute !== 'pdf' && (
              <Button variant="outline" disabled={!canExport} onClick={() => { void printLabels('pdf') }}>
                <DownloadIcon data-icon="inline-start" />Unduh PDF
              </Button>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {labelResult.labels.length} label · {pages.length} lembar · {layout.columns} kolom × {layout.rows} baris
        </p>

        {errors.length > 0 && <Alert variant="destructive" className="mb-4"><AlertDescription><ul className="list-disc pl-4">{errors.map(error => <li key={error}>{error}</li>)}</ul></AlertDescription></Alert>}
        {!!model?.overflow.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Isi pada label {model.overflow.slice(0, 8).map(i => i + 1).join(', ')}{model.overflow.length > 8 ? ', …' : ''} tidak muat. Kecilkan huruf atau tinggi barcode, atur posisi, atau perbesar label.</AlertDescription></Alert>}
        {!!model?.unsupported.length && <Alert variant="destructive" className="mb-4"><AlertDescription>Ada karakter yang tidak didukung font. Ganti karakter khusus atau emoji pada label {model.unsupported.slice(0, 8).map(i => i + 1).join(', ')} sebelum mengekspor.</AlertDescription></Alert>}

        <PrintControls preference={printPreference} onPreference={value => { setPrintPreference(value); setPrintMessage('') }} connection={connection} checking={checking} printer={printer} onPrinter={value => { setPreferredPrinter(value); setPrintMessage('') }} onRefresh={() => { void refresh() }} limits={limits} busy={exporting} />
        {printMessage && <p className="hint mb-4" role="status">{printMessage}</p>}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-1">
            <Button variant={previewMode === 'sheet' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPreviewMode('sheet')}>
              <FilesIcon className="mr-1.5 size-4" />Lembar penuh
            </Button>
            <Button variant={previewMode === 'single' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPreviewMode('single')}>
              <ScanLineIcon className="mr-1.5 size-4" />Perbesar 1 label
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-compact" aria-label="Perkecil" title="Perkecil" disabled={zoomLevel <= 0.6} onClick={() => setZoomLevel(z => Math.max(0.5, Math.round((z - 0.2) * 10) / 10))}>
              <ZoomOutIcon />
            </Button>
            <span className="min-w-10 text-center font-mono text-xs text-muted-foreground">{Math.round(zoomLevel * 100)}%</span>
            <Button variant="outline" size="icon-compact" aria-label="Perbesar" title="Perbesar" disabled={zoomLevel >= 2.5} onClick={() => setZoomLevel(z => Math.min(2.5, Math.round((z + 0.2) * 10) / 10))}>
              <ZoomInIcon />
            </Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" aria-pressed={dragMode} onClick={() => setDragMode(previous => !previous)}>
              Geser blok teks
            </Button>
            <Button variant="ghost" size="sm" disabled={!canExport} onClick={() => { void printTestSheet() }}>
              Cetak lembar uji (HVS)
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {dragMode ? 'Geser teks di canvas untuk semua label.' : previewMode === 'sheet' && displayedPage === 0 ? 'Klik stiker pada lembar untuk set posisi mulai.' : ''}
          </span>
        </div>

        <div className="border border-border bg-muted p-4">
          <div ref={previewRef} className="min-w-0 overflow-auto">
            {model && renderState && errors.length === 0 ? (
              <CanvasSheet
                model={model}
                page={displayedPage}
                fonts={renderState.fonts}
                settings={settings}
                columns={layout.columns}
                rows={layout.rows}
                width={previewWidth}
                draggable={dragMode}
                onMove={(x, y) => setSettings(previous => ({ ...previous, offsetX: Math.round(((previous.offsetX ?? 0) + x) * 10) / 10, offsetY: Math.round(((previous.offsetY ?? 0) + y) * 10) / 10 }))}
                viewMode={previewMode}
                singleLabelIndex={singleLabelIndex}
                start={start}
                onSelectStart={setStart}
                zoom={zoomLevel}
              />
            ) : (
              <Empty className="min-h-72">
                <EmptyHeader>
                  <EmptyTitle>{errors.length ? 'Periksa pengaturan' : labelResult.labels.length && !ready ? 'Menyiapkan pratinjau' : 'Belum ada label'}</EmptyTitle>
                  <EmptyDescription>{errors.length ? 'Perbaiki pengaturan untuk menampilkan pratinjau.' : labelResult.labels.length && !ready ? 'Font dan tata letak sedang disiapkan.' : 'Isi label atau unggah Excel untuk memulai.'}</EmptyDescription>
                </EmptyHeader>
                {!!labelResult.labels.length && !ready && <Skeleton className="h-24 w-full" />}
              </Empty>
            )}
          </div>
        </div>

        {previewMode === 'single' && labelResult.labels.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Button variant="outline" size="sm" disabled={singleLabelIndex === 0} onClick={() => setSingleLabelIndex(i => Math.max(0, i - 1))}>
              Label sebelumnya
            </Button>
            <span>Label {singleLabelIndex + 1} / {labelResult.labels.length}</span>
            <Button variant="outline" size="sm" disabled={singleLabelIndex >= labelResult.labels.length - 1} onClick={() => setSingleLabelIndex(i => Math.min(labelResult.labels.length - 1, i + 1))}>
              Label berikutnya
            </Button>
          </div>
        )}

        {previewMode === 'sheet' && pages.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Button variant="outline" size="sm" disabled={displayedPage === 0} onClick={() => setCurrentPage(displayedPage - 1)}>
              Sebelumnya
            </Button>
            <span>Lembar {displayedPage + 1} / {pages.length}</span>
            <Button variant="outline" size="sm" disabled={displayedPage >= pages.length - 1} onClick={() => setCurrentPage(displayedPage + 1)}>
              Berikutnya
            </Button>
          </div>
        )}

        {pages[displayedPage] && (
          <Accordion className="mt-4">
            <AccordionItem value="label-content">
              <AccordionTrigger>Lihat daftar isi teks lembar ini ({pages[displayedPage].filter(Boolean).length} stiker)</AccordionTrigger>
              <AccordionContent>
                <ol className="mt-3 max-h-60 flex flex-col gap-3 overflow-auto border border-border p-4">
                  {pages[displayedPage].flatMap(slot => slot ? [<li key={slot.index} className="whitespace-pre-wrap"><span className="text-muted-foreground">{slot.index + 1}. </span>{slot.text}</li>] : [])}
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <p className="hint mt-4">Pastikan ukuran kertas di driver printer sama dengan pengaturan label. Lakukan cetak uji pada kertas biasa sebelum mencetak stiker asli.</p>
      </section>
    </div>
  </>
}
