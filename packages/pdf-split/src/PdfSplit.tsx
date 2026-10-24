import { useEffect, useRef, useState } from 'react'
import { FileUpload } from '@xviidev/ui/components/file-upload'
import { Button } from '@xviidev/ui/components/button'
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@xviidev/ui/components/field'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@xviidev/ui/components/input-group'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@xviidev/ui/components/card'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { ScissorsIcon, FileTextIcon, DownloadIcon, ListOrderedIcon, HashIcon } from '@xviidev/ui/lib/icons'
import { formatFileSize } from '@xviidev/ui/lib/file'
import { MAX_FILE_BYTES, splitGroups } from '@xviidev/pdf-core/options'
import type { SplitMode } from '@xviidev/pdf-core/options'
import { usePdfJob, downloadOutput, errorMessage } from '@xviidev/pdf-core/client'
import { PdfPreview } from '@xviidev/pdf-core/preview'
import type { Output } from '@xviidev/pdf-core/client'
export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null), [pages, setPages] = useState(0), [error, setError] = useState('')
  const [mode, setMode] = useState<SplitMode>('ranges'), [range, setRange] = useState(''), [chunkSize, setChunkSize] = useState('1'), [output, setOutput] = useState<Output | null>(null)
  const job = usePdfJob(), generation = useRef(0)
  useEffect(() => { document.title = 'Pisah PDF — XVII Dev'; return () => { generation.current++ } }, [])
  let groups: number[][] = [], rangeError = ''
  if (pages) { try { groups = splitGroups(pages, mode, range, Number(chunkSize)) } catch (issue) { rangeError = errorMessage(issue) } }
  function clear() { generation.current++; job.stop(); setFile(null); setPages(0); setOutput(null); setError('') }
  async function load(next: File) {
    clear(); const version = generation.current; setFile(next)
    try { const [count] = await job.run<number[]>({ kind: 'info', files: [next] }); if (version !== generation.current) return; setPages(count); setMode('ranges'); setRange(`1-${count}`); setChunkSize('1') }
    catch (issue) { if (version === generation.current) { setFile(null); setError(errorMessage(issue)) } }
  }
  async function split() {
    if (!file || !pages || rangeError || job.busy) return
    const version = generation.current; setError(''); setOutput(null)
    try { const result = await job.run<Output>({ kind: 'split', file, mode, range, chunkSize: Number(chunkSize) }); if (version === generation.current) setOutput(result) }
    catch (issue) { if (version === generation.current) setError(errorMessage(issue)) }
  }
  function edited() { setOutput(null); setError('') }
  return <div className="mx-auto flex max-w-3xl flex-col gap-5">
    <div className="flex flex-col gap-2"><h1 className="text-2xl font-medium">Pisah PDF</h1><p className="text-sm text-muted-foreground">Ambil halaman tertentu atau bagi dokumen menjadi beberapa PDF.</p></div>
    <Field><FieldLabel htmlFor="split-file" className="sr-only">File PDF</FieldLabel><FileUpload compact id="split-file" file={file} fileDescription={pages ? `${pages} halaman` : undefined} accept=".pdf,application/pdf" maxSize={MAX_FILE_BYTES} icon={FileTextIcon} label="Pilih PDF" hint="Maksimal 100 MB · 1.000 halaman" busy={job.busy && !pages} disabled={job.busy && !!pages} onFileSelect={load} onClear={clear} /></Field>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {pages > 0 && file && <Card><CardContent><PdfPreview file={file} total={pages} selectedPages={groups.flat()} /></CardContent></Card>}
    {pages > 0 && <Card><CardHeader><CardTitle role="heading" aria-level={2}>Atur pemisahan</CardTitle><CardDescription>Dokumen memiliki {pages} halaman.</CardDescription></CardHeader><CardContent><FieldGroup>
      <Field><FieldLabel htmlFor="split-mode">Pisahkan berdasarkan</FieldLabel><SelectInput id="split-mode" icon={ScissorsIcon} value={mode} disabled={job.busy} className="w-full" onValueChange={value => { setMode(value as SplitMode); edited() }} options={[{ value: 'ranges', label: 'Rentang halaman' }, { value: 'pages', label: 'Setiap halaman' }, { value: 'chunks', label: 'Jumlah halaman per bagian' }]} /></Field>
      {mode === 'ranges' && <Field data-invalid={!!rangeError}><FieldLabel htmlFor="split-range">Rentang halaman</FieldLabel><InputGroup><InputGroupAddon><ListOrderedIcon /></InputGroupAddon><InputGroupInput id="split-range" value={range} disabled={job.busy} aria-invalid={!!rangeError} aria-describedby="split-range-help" placeholder="1-3; 4-6; 7, 9" onChange={event => { setRange(event.target.value); edited() }} /></InputGroup><FieldDescription id="split-range-help">Pisahkan bagian dengan titik koma (;). Contoh: 1-3; 4-6 menghasilkan dua PDF. Gunakan koma untuk memilih halaman dalam satu bagian.</FieldDescription></Field>}
      {mode === 'chunks' && <Field data-invalid={!!rangeError}><FieldLabel htmlFor="split-count">Halaman per bagian</FieldLabel><InputGroup><InputGroupAddon><HashIcon /></InputGroupAddon><InputGroupInput id="split-count" type="number" min={1} max={pages} value={chunkSize} disabled={job.busy} aria-invalid={!!rangeError} onChange={event => { setChunkSize(event.target.value); edited() }} /><InputGroupAddon align="inline-end"><InputGroupText>halaman</InputGroupText></InputGroupAddon></InputGroup><FieldDescription>Bagian terakhir berisi halaman yang tersisa.</FieldDescription></Field>}
      {rangeError ? <FieldError role="alert">{rangeError}</FieldError> : <p className="text-sm text-muted-foreground">{groups.length} PDF · {groups.reduce((sum, group) => sum + group.length, 0)} halaman hasil{groups.length > 1 ? ' · diunduh dalam ZIP' : ''}</p>}
    </FieldGroup></CardContent><CardFooter className="flex flex-wrap gap-3"><Button disabled={job.busy || !!rangeError} onClick={() => void split()}><ScissorsIcon data-icon="inline-start" />Pisahkan PDF</Button>{job.busy && <Button variant="outline" onClick={job.stop}>Batalkan</Button>}</CardFooter></Card>}
    {job.busy && <p role="status" className="text-sm text-muted-foreground">{job.progress}</p>}
    {output && <Card><CardHeader><CardTitle role="heading" aria-level={2}>Hasil siap diunduh</CardTitle><CardDescription>{output.count} PDF · {output.pages} halaman · {formatFileSize(output.bytes.length)}</CardDescription></CardHeader><CardFooter><Button onClick={() => downloadOutput(output)}><DownloadIcon data-icon="inline-start" />{output.count > 1 ? 'Unduh ZIP' : 'Unduh PDF'}</Button></CardFooter></Card>}
    <p className="text-xs text-muted-foreground">File diproses di perangkat Anda, tanpa unggah ke server.</p>
    <Accordion><AccordionItem value="info"><AccordionTrigger>Catatan dokumen</AccordionTrigger><AccordionContent>Teks dan gambar tetap dalam format PDF. Maksimal 200 PDF dan 1.000 halaman hasil per proses. PDF terenkripsi, formulir interaktif, dan tanda tangan digital belum didukung. Bookmark serta lampiran dokumen sumber tidak disalin.</AccordionContent></AccordionItem></Accordion>
  </div>
}
