import { useState } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Field, FieldGroup, FieldLabel } from '@xviidev/ui/components/field'
import { Alert, AlertTitle, AlertDescription } from '@xviidev/ui/components/alert'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { DownloadIcon } from '@xviidev/ui/lib/icons'
import { AGENT_RELEASE, AGENT_DOWNLOADS, detectAgentDownload } from '../lib/agent-download'
import { choosePrintRoute } from '../lib/print-choice'
import type { PrintConnection, PrintLimits, PrintPreference } from '../lib/print-choice'

export function PrintControls({ preference, onPreference, connection, checking, printer, onPrinter, onRefresh, limits, busy }: {
  preference: PrintPreference; onPreference: (value: PrintPreference) => void;
  connection: PrintConnection; checking: boolean; printer: string; onPrinter: (value: string) => void;
  onRefresh: () => void; limits: PrintLimits; busy: boolean;
}) {
  const [version, setVersion] = useState('auto')
  const recommended = detectAgentDownload(navigator.userAgent, navigator.maxTouchPoints)
  const selected = AGENT_DOWNLOADS.find(item => item.value === version)
  const asset = selected?.value ?? recommended.asset
  const downloadLabel = selected ? 'Unduh untuk ' + selected.label : recommended.label.replace('Unduh agen ', 'Unduh untuk ')
  const route = choosePrintRoute(preference, connection, limits)
  const status = route === 'pdf'
    ? preference === 'pdf' ? 'Label akan disimpan sebagai PDF, siap dibuka dan dicetak kapan saja.' : 'Untuk jumlah lembar atau ukuran kertas ini, label akan disiapkan sebagai PDF.'
    : preference === 'browser' ? 'Label akan dibuka di jendela cetak browser. Pilih printer di jendela tersebut.'
    : connection.status === 'ready' && limits.client ? printer ? `Siap mencetak ke ${printer}.` : 'Pilih printer yang ingin digunakan.'
    : connection.status === 'checking' ? 'Sedang mencari printer di komputer ini. Opsi browser dan PDF tetap tersedia.'
    : connection.status === 'empty' ? 'Belum ada printer yang tersedia di aplikasi cetak. Anda tetap bisa mencetak lewat browser atau menyimpan PDF.'
    : 'Siap mencetak lewat browser. Anda juga dapat menyimpan label sebagai PDF.'
  const downloadControls = <FieldGroup className="gap-3">
    <Field><FieldLabel htmlFor="print-download-version">Unduhan untuk</FieldLabel><SelectInput id="print-download-version" value={version} onValueChange={setVersion} options={[{ value: 'auto', label: 'Perangkat ini — ' + (recommended.asset ? recommended.label.replace('Unduh agen ', '') : 'Tidak didukung') }, ...AGENT_DOWNLOADS]} /></Field>
    {asset ? <>
      <Field><Button variant="outline" render={<a href={AGENT_RELEASE + asset} />} nativeButton={false}><DownloadIcon data-icon="inline-start" />{downloadLabel}</Button></Field>
      <ol className="list-decimal pl-5 text-sm text-muted-foreground">
        <li>Ekstrak berkas yang diunduh, lalu buka aplikasi cetak.</li>
        <li>Biarkan aplikasi tetap terbuka selama mencetak.</li>
        <li>Kembali ke halaman ini. Printer akan dicari otomatis.</li>
      </ol>
      {asset.includes('macos') && <p className="text-sm text-muted-foreground">Mac dengan chip Apple: buka xviidev-print-agent-arm64. Mac Intel: buka xviidev-print-agent-x64.</p>}
      {asset.includes('windows7') && <p className="text-sm text-muted-foreground">Windows 7 memerlukan SP1, PowerShell 5.1 dan .NET Framework 4.8.</p>}
    </> : <p className="text-sm text-muted-foreground">Aplikasi cetak belum tersedia untuk perangkat ini. Gunakan cetak lewat browser atau simpan PDF.</p>}
  </FieldGroup>
  return <div className="mb-4 flex flex-col gap-4">
    <FieldGroup className="gap-3">
      <Field><FieldLabel htmlFor="print-method">Cara mencetak</FieldLabel><SelectInput id="print-method" value={preference} disabled={busy} onValueChange={value => onPreference(value as PrintPreference)} options={[{ value: 'auto', label: 'Otomatis (disarankan)' }, { value: 'browser', label: 'Cetak lewat browser' }, { value: 'pdf', label: 'Simpan PDF' }]} /></Field>
      {preference === 'auto' && connection.status === 'ready' && limits.client && <Field><FieldLabel htmlFor="print-destination">Printer</FieldLabel><SelectInput id="print-destination" value={printer} disabled={busy} label="Pilih printer" onValueChange={onPrinter} options={connection.printers.map(name => ({ value: name, label: name }))} /></Field>}
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
      {preference === 'auto' && <Field><Button variant="link" size="sm" disabled={busy || checking} onClick={onRefresh}>Periksa printer lagi</Button></Field>}
      {route === 'browser' && <div className="border border-border bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <span className="mb-1 block font-medium text-foreground">Pengaturan penting di jendela cetak browser:</span>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><strong>Margin:</strong> Pilih <em>None / Tanpa margin</em> agar posisi stiker tidak melenceng.</li>
          <li><strong>Skala:</strong> Atur ke <em>100%</em> (jangan pilih <em>Fit to page</em>).</li>
          <li><strong>Header &amp; footer:</strong> Hilangkan centang jika muncul.</li>
        </ul>
      </div>}
    </FieldGroup>
    {preference === 'auto' && connection.status === 'unavailable' ? <Alert role="region" aria-label="Siapkan pencetakan langsung">
      <AlertTitle>Tampilkan printer di halaman ini</AlertTitle>
      <AlertDescription>Unduh dan buka aplikasi cetak di komputer ini. Halaman akan tersambung otomatis. Jika diminta, izinkan akses ke perangkat di komputer ini.</AlertDescription>
      {downloadControls}
    </Alert> : <Accordion><AccordionItem value="print-download"><AccordionTrigger>Unduh aplikasi cetak</AccordionTrigger><AccordionContent>{downloadControls}</AccordionContent></AccordionItem></Accordion>}
  </div>
}
