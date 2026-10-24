import { useEffect, useState } from 'react'
import { FileUpload } from '@xviidev/ui/components/file-upload'
import { Button } from '@xviidev/ui/components/button'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@xviidev/ui/components/input-group'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@xviidev/ui/components/card'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { FilesIcon, ArrowUpIcon, ArrowDownIcon, Trash2Icon, DownloadIcon, ListOrderedIcon, FileTextIcon } from '@xviidev/ui/lib/icons'
import { formatFileSize } from '@xviidev/ui/lib/file'
import { MAX_FILE_BYTES, MAX_PAGES, pagesFromRange, pdfName, validateFiles } from '@xviidev/pdf-core/options'
import { usePdfJob, downloadOutput, errorMessage } from '@xviidev/pdf-core/client'
import { PdfPreview } from '@xviidev/pdf-core/preview'
import type { Output } from '@xviidev/pdf-core/client'
type Item = { id: string; file: File; pages: number; range: string }
export default function PdfMerge() {
  const [items, setItems] = useState<Item[]>([]), [error, setError] = useState(''), [output, setOutput] = useState<Output | null>(null), [name, setName] = useState('gabungan')
  const job = usePdfJob()
  useEffect(() => { document.title = 'Gabung PDF — XVII Dev' }, [])
  let total = 0, selectionError = ''
  for (const item of items) { try { total += pagesFromRange(item.range, item.pages).length } catch (issue) { selectionError = `${item.file.name}: ${errorMessage(issue)}`; break } }
  if (total > MAX_PAGES) selectionError = `Hasil maksimal ${MAX_PAGES} halaman.`
  function selected(item: Item) { try { return pagesFromRange(item.range, item.pages) } catch { return [] } }
  function change(next: Item[]) { setItems(next); setOutput(null); setError('') }
  async function add(files: File[]) {
    setError(''); setOutput(null)
    try {
      validateFiles([...items.map(item => item.file), ...files])
      const counts = await job.run<number[]>({ kind: 'info', files })
      change([...items, ...files.map((file, i) => ({ id: crypto.randomUUID(), file, pages: counts[i], range: '' }))])
    } catch (issue) { setError(errorMessage(issue)) }
  }
  function move(index: number, step: number) { const next = [...items]; [next[index], next[index + step]] = [next[index + step], next[index]]; change(next) }
  async function merge() {
    if (job.busy || items.length < 2 || selectionError) return
    setError(''); setOutput(null)
    try { setOutput(await job.run<Output>({ kind: 'merge', inputs: items.map(({ file, range }) => ({ file, range })) })) }
    catch (issue) { setError(errorMessage(issue)) }
  }
  return <div className="mx-auto flex max-w-4xl flex-col gap-5">
    <div className="flex flex-col gap-2"><h1 className="text-2xl font-medium">Gabung PDF</h1><p className="text-sm text-muted-foreground">Susun file sesuai urutan, lalu satukan menjadi satu PDF.</p></div>
    <Field><FieldLabel htmlFor="merge-files" className="sr-only">File PDF</FieldLabel><FileUpload id="merge-files" accept=".pdf,application/pdf" maxSize={MAX_FILE_BYTES} icon={FilesIcon} label={items.length ? 'Tambah PDF' : 'Pilih beberapa PDF'} hint="Maksimal 50 file · 100 MB per file · total 200 MB" disabled={job.busy} onFileSelect={file => add([file])} onFilesSelect={add} /></Field>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {items.length > 0 && <Card><CardHeader><CardTitle role="heading" aria-level={2}>Urutan file</CardTitle><CardDescription>{items.length} file · {total} halaman dipilih. Gunakan panah untuk mengubah urutan.</CardDescription></CardHeader><CardContent><ol className="flex flex-col gap-4">{items.map((item, index) => <li key={item.id} className="flex min-w-0 flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-medium" title={item.file.name}>{index + 1}. {item.file.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.pages} halaman · {formatFileSize(item.file.size)}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon-sm" disabled={job.busy || index === 0} aria-label={`Naikkan ${item.file.name}`} onClick={() => move(index, -1)}><ArrowUpIcon /></Button><Button variant="ghost" size="icon-sm" disabled={job.busy || index === items.length - 1} aria-label={`Turunkan ${item.file.name}`} onClick={() => move(index, 1)}><ArrowDownIcon /></Button><Button variant="ghost" size="icon-sm" disabled={job.busy} aria-label={`Hapus ${item.file.name}`} onClick={() => change(items.filter(entry => entry.id !== item.id))}><Trash2Icon /></Button></div></div>
      <Field><FieldLabel htmlFor={`pages-${item.id}`}>Halaman yang digabung</FieldLabel><InputGroup><InputGroupAddon><ListOrderedIcon /></InputGroupAddon><InputGroupInput id={`pages-${item.id}`} placeholder={`Semua halaman (1–${item.pages})`} value={item.range} disabled={job.busy} onChange={event => change(items.map(entry => entry.id === item.id ? { ...entry, range: event.target.value } : entry))} /></InputGroup><FieldDescription>Kosongkan untuk semua halaman, atau isi misalnya 1-3, 5.</FieldDescription></Field>
      <PdfPreview file={item.file} total={item.pages} selectedPages={selected(item)} compact />
    </li>)}</ol></CardContent><CardFooter className="flex flex-wrap justify-between gap-3"><p className="text-sm text-muted-foreground">{formatFileSize(items.reduce((sum, item) => sum + item.file.size, 0))} total</p><Button variant="ghost" size="sm" disabled={job.busy} onClick={() => change([])}>Hapus semua</Button></CardFooter></Card>}
    {items.length > 0 && <Card><CardContent><FieldGroup><Field><FieldLabel htmlFor="merge-name">Nama hasil</FieldLabel><InputGroup><InputGroupAddon><FileTextIcon /></InputGroupAddon><InputGroupInput id="merge-name" value={name} disabled={job.busy} onChange={event => setName(event.target.value)} /><InputGroupAddon align="inline-end"><InputGroupText>.pdf</InputGroupText></InputGroupAddon></InputGroup></Field>{selectionError && <Alert variant="destructive"><AlertDescription>{selectionError}</AlertDescription></Alert>}<div className="flex flex-wrap items-center gap-3"><Button disabled={job.busy || items.length < 2 || !!selectionError} onClick={() => void merge()}><FilesIcon data-icon="inline-start" />Gabungkan PDF</Button>{items.length < 2 && <p className="text-sm text-muted-foreground">Tambahkan minimal dua PDF.</p>}</div></FieldGroup></CardContent></Card>}
    {job.busy && <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-sm text-muted-foreground">{job.progress}</p><Button variant="outline" onClick={job.stop}>Batalkan</Button></div>}
    {output && <Card><CardHeader><CardTitle role="heading" aria-level={2}>PDF siap diunduh</CardTitle><CardDescription>{output.pages} halaman · {formatFileSize(output.bytes.length)}</CardDescription></CardHeader><CardFooter><Button onClick={() => downloadOutput({ ...output, name: `${pdfName(name)}.pdf` })}><DownloadIcon data-icon="inline-start" />Unduh PDF</Button></CardFooter></Card>}
    <p className="text-xs text-muted-foreground">File diproses di perangkat Anda, tanpa unggah ke server.</p>
    <Accordion><AccordionItem value="info"><AccordionTrigger>Catatan dokumen</AccordionTrigger><AccordionContent>Teks dan gambar tetap dalam format PDF. Maksimal 1.000 halaman hasil. PDF terenkripsi, formulir interaktif, dan tanda tangan digital belum didukung. Bookmark serta lampiran dokumen sumber tidak disalin.</AccordionContent></AccordionItem></Accordion>
  </div>
}
