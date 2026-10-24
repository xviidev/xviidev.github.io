import { Button } from '@xviidev/ui/components/button'
import { DownloadIcon } from '@xviidev/ui/lib/icons'
import { formatFileSize } from '@xviidev/ui/lib/file'
import { FORMATS, outputName, sizeChange } from '../lib/options'
import type { Options } from '../lib/options'
import type { Result, Source } from '../lib/client'

export function ResultSummary({ source, options, result, busy, error }: {
  source: Source; options: Options; result: Result | null; busy: boolean; error: string
}) {
  function save() {
    if (!result || busy) return
    const url = URL.createObjectURL(result.blob), anchor = document.createElement('a')
    anchor.href = url; anchor.download = outputName(source.file.name, options.format); anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  return <section aria-label="Ukuran hasil" className="flex min-w-0 items-center justify-between gap-3">
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2"><span className="truncate text-sm text-muted-foreground">{FORMATS.find(item => item.value === options.format)?.label}</span></div>
      <div role="status" aria-live="polite">{busy ? <p className="text-sm text-muted-foreground">Memproses…</p> : error ? <p className="text-sm text-destructive">Hasil belum tersedia.</p> : result ? <><p className="text-xl font-semibold tabular-nums">{formatFileSize(result.blob.size)}</p><p className="mt-1 text-xs text-muted-foreground">{options.format === 'original' ? 'Ukuran asli' : sizeChange(source.file.size, result.blob.size)} · {result.width} × {result.height} px</p></> : <p className="text-sm text-muted-foreground">Menyiapkan hasil…</p>}</div>
    </div>
    <Button variant="default" size="sm" disabled={!result || busy} onClick={save}><DownloadIcon data-icon="inline-start" />Unduh hasil</Button>
  </section>
}
