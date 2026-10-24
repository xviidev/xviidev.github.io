import { useId, useRef, useState } from 'react'
import { cn } from 'cn'
import type { LucideIcon } from 'lucide-react'
import { UploadIcon, FileTextIcon, XIcon, LoaderCircleIcon } from '../lib/icons'
import { formatFileSize, validateFile } from '../lib/file'
import { Button } from './button'
import { FieldError } from './field'

export interface FileUploadProps {
  id?: string
  accept?: string
  maxSize?: number
  file?: { name: string; size: number } | null
  onFileSelect: (file: File) => void | Promise<void>
  onFilesSelect?: (files: File[]) => void | Promise<void>
  onClear?: () => void
  label?: string
  hint?: string
  icon?: LucideIcon
  preview?: string
  busy?: boolean
  status?: string
  disabled?: boolean
  className?: string
  compact?: boolean
  fileDescription?: string
  'aria-describedby'?: string
}

/** File picker with a keyboard trigger and the same validation for drops. */
export function FileUpload({ id, accept, maxSize, file, onFileSelect, onFilesSelect, onClear, label = 'Pilih file', hint, icon: Icon = UploadIcon, preview, busy = false, status, disabled = false, className, compact = false, fileDescription, 'aria-describedby': describedBy }: FileUploadProps) {
  const generatedId = useId(), controlId = id ?? generatedId
  const input = useRef<HTMLInputElement>(null), dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false), [error, setError] = useState('')
  const unavailable = busy || disabled
  const condensed = compact && !!file
  function select(files: FileList | null) {
    if (unavailable || !files?.length) return
    if (!onFilesSelect && files.length !== 1) { setError('Pilih satu file setiap kali mengunggah.'); return }
    const selected = Array.from(files), issue = selected.map(file => validateFile(file, accept, maxSize)).find(Boolean) || ''
    setError(issue)
    if (!issue) {
      try { void Promise.resolve(onFilesSelect ? onFilesSelect(selected) : onFileSelect(selected[0])).catch(() => setError('File gagal dibuka. Coba kembali.')) }
      catch { setError('File gagal dibuka. Coba kembali.') }
    }
  }
  return <div data-slot="file-upload" aria-busy={busy} className={cn('flex min-w-0 flex-col gap-3', className)}>
    <input ref={input} id={`${controlId}-input`} type="file" hidden multiple={!!onFilesSelect} accept={accept} disabled={unavailable} aria-label={label} onChange={event => { select(event.target.files); event.target.value = '' }} />
    <div data-dragging={dragging || undefined} data-disabled={disabled || undefined} className={cn('flex min-w-0 gap-3 border border-border transition-colors data-[dragging=true]:border-ring data-[dragging=true]:bg-muted data-[disabled=true]:opacity-50', condensed ? 'flex-row flex-wrap items-center p-3' : 'flex-col border-dashed p-4')}
      onDragEnter={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); dragDepth.current++; if (!unavailable) setDragging(true) } }}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = unavailable ? 'none' : 'copy' } }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); select(event.dataTransfer.files) }}>
      {file && <div className={cn('flex min-w-0 items-center gap-3', condensed && 'flex-1 basis-40')}>
        {preview ? <img src={preview} alt="" aria-hidden="true" className="size-10 shrink-0 object-contain" /> : <FileTextIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1"><p className="truncate text-sm font-medium" title={file.name}>{file.name}</p><p className="flex flex-wrap gap-x-1 text-xs text-muted-foreground"><span className="whitespace-nowrap">{formatFileSize(file.size)}</span>{fileDescription && <><span aria-hidden="true">·</span><span className="whitespace-nowrap">{fileDescription}</span></>}</p></div>
        {onClear && <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label={busy ? 'Batalkan pemuatan file' : `Hapus ${file.name}`} onClick={() => { setError(''); onClear() }}><XIcon aria-hidden="true" /></Button>}
      </div>}
      <Button id={controlId} type="button" variant={file ? 'outline' : 'ghost'} disabled={unavailable} className={cn(!condensed && (file ? 'w-full' : 'h-auto w-full flex-col gap-2 py-4 whitespace-normal'))} aria-describedby={[describedBy, hint && !condensed ? `${controlId}-hint` : '', error ? `${controlId}-error` : ''].filter(Boolean).join(' ') || undefined} aria-invalid={!!error} onClick={() => input.current?.click()}>
        {busy ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" /> : <Icon aria-hidden="true" data-icon={file ? 'inline-start' : undefined} />}
        <span>{busy ? 'Memproses file…' : file ? 'Ganti file' : label}</span>
        {!file && !busy && <span className="text-xs font-normal text-muted-foreground">atau tarik dan lepas file di sini</span>}
      </Button>
      {hint && !condensed && <p id={`${controlId}-hint`} className="text-center text-xs text-muted-foreground">{hint}</p>}
    </div>
    {error && <FieldError id={`${controlId}-error`} role="alert">{error}</FieldError>}
    {(busy || status) && <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{status || 'Memproses file…'}</p>}
  </div>
}
