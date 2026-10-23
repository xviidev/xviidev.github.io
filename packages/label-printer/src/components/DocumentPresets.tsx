import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { Input } from '@xviidev/ui/components/input'
import { Field, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@xviidev/ui/components/sheet'
import { FileTextIcon, SlidersHorizontalIcon, SaveIcon, CopyIcon, Trash2Icon, ShieldCheckIcon } from '@xviidev/ui/lib/icons'
import { initialPresets, loadPresets, presetDatabase as db, removePreset, savePreset } from '../lib/presets'
import type { DocumentPreset } from '../lib/presets'
import type { LabelSettings } from '../lib/labels'
import type { RichDocument } from '../lib/rich-text'

interface Props { settings: LabelSettings; document: RichDocument; onApply: (preset: DocumentPreset) => void; children: ReactNode }
function fingerprint(settings: LabelSettings, document: RichDocument) {
  return JSON.stringify([settings, document.map(line => ({ align: line.align || settings.align, runs: line.runs.map(run => ({ text: run.text, weight: run.weight ?? 400, italic: !!run.italic, underline: !!run.underline, size: run.size ?? settings.fontSize })) }))])
}
export function DocumentPresets({ settings, document, onApply, children }: Props) {
  const [presets, setPresets] = useState(initialPresets)
  const [active, setActive] = useState('a4-24')
  const [name, setName] = useState('A4 · 24 label'), [description, setDescription] = useState(initialPresets()[0].description)
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(true)
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [confirmDelete, setConfirmDelete] = useState(false)
  const selected = presets.find(preset => preset.id === active)
  const dirty = !!selected && (name !== selected.name || description !== selected.description || fingerprint(settings, document) !== fingerprint(selected.settings, selected.document))
  function apply(preset: DocumentPreset) {
    setActive(preset.id); setName(preset.name); setDescription(preset.description); setConfirmDelete(false); setMessage(''); onApply(preset)
  }
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const saved = await loadPresets(db)
        const id = (await db.preferences.get('active'))?.value
        if (cancelled) return
        setPresets(saved)
        const chosen = saved.find(preset => preset.id === id) ?? saved.find(preset => preset.id === 'a4-24') ?? saved[0]
        if (chosen) apply(chosen)
      } catch { if (!cancelled) setError('Penyimpanan browser tidak tersedia. Anda tetap bisa mencetak, tetapi preset belum dapat disimpan. Periksa izin penyimpanan browser, lalu muat ulang halaman.') }
      finally { if (!cancelled) setBusy(false) }
    })()
    return () => { cancelled = true }
  }, [])
  async function choose(id: string) {
    const preset = presets.find(item => item.id === id)
    if (!preset) return
    apply(preset)
    try { await db.preferences.put({ key: 'active', value: id }) }
    catch { setError('Pilihan preset tidak tersimpan. Penyimpanan browser mungkin penuh atau tidak diizinkan.') }
  }
  async function save(copy: boolean) {
    setBusy(true); setError(''); setMessage(''); setConfirmDelete(false)
    try {
      const value = await savePreset(db, { id: copy ? crypto.randomUUID() : active, name: copy && name === selected?.name ? `${name} (salinan)` : name, description, settings, document, updatedAt: Date.now() })
      setPresets(await loadPresets(db)); setActive(value.id); setName(value.name); setDescription(value.description)
      setMessage('Preset tersimpan di browser ini. Bisa dipilih lagi saat Anda kembali.')
    } catch (error) { setError(error instanceof Error && error.name === 'Error' ? error.message : 'Preset gagal disimpan. Periksa izin dan ruang penyimpanan browser Anda.') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setBusy(true); setError('')
    try {
      await removePreset(db, active)
      const remaining = await loadPresets(db)
      setPresets(remaining); apply(remaining[0])
      await db.preferences.put({ key: 'active', value: remaining[0].id })
      setMessage('Preset dihapus. Preset lain sudah dipilih.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Preset gagal dihapus.') }
    finally { setBusy(false); setConfirmDelete(false) }
  }
  return <>
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <FileTextIcon className="mb-2 hidden size-5 text-muted-foreground sm:block" />
        <Field className="min-w-0 flex-1 basis-48"><FieldLabel htmlFor="document-preset">Preset dokumen</FieldLabel><SelectInput id="document-preset" className="w-full" disabled={busy} value={active} onValueChange={id => { void choose(id) }} options={presets.map(preset => ({ value: preset.id, label: preset.name }))} /></Field>
        <Button variant="outline" disabled={busy} onClick={() => setOpen(true)}><SlidersHorizontalIcon />Atur preset</Button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selected?.description || 'Ukuran kertas, susunan label, dan format baris dalam satu preset.'}</p>
      {dirty && <p className="mt-2 text-sm text-muted-foreground">Ada perubahan preset yang belum disimpan. Buka Atur preset untuk menyimpannya sebelum berpindah preset.</p>}
    </div>
    {error && !open && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
    <Sheet open={open} onOpenChange={value => { setOpen(value); setConfirmDelete(false) }}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="pb-4"><SheetTitle>Atur preset dokumen</SheetTitle><SheetDescription>Siapkan ukuran lembar dan format baris sekali. Untuk membuat preset baru, beri nama lalu pilih Simpan sebagai baru.</SheetDescription></SheetHeader>
        <div className="flex flex-col gap-6 px-6 pb-8 sm:px-8">
          <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-sm leading-relaxed"><ShieldCheckIcon className="size-4 shrink-0" /><p>Disimpan hanya di browser ini, tanpa isi label atau daftar penerima. Menghapus data browser juga menghapus preset. Gunakan cadangan JSON untuk memindahkannya.</p></div>
          <Field><FieldLabel htmlFor="preset-name">Nama preset</FieldLabel><Input id="preset-name" maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Label alamat toko" /><FieldDescription>Gunakan nama yang mudah dikenali saat mencetak lagi.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="preset-description">Keterangan</FieldLabel><Input id="preset-description" maxLength={240} value={description} onChange={event => setDescription(event.target.value)} placeholder="Contoh: Kertas stiker A4, 3 kolom, nama dicetak tebal" /><FieldDescription>Jelaskan ukuran, jenis kertas, atau kegunaan preset ini.</FieldDescription></Field>
          {children}
          <div className="sticky bottom-0 -mx-6 border-t border-border bg-popover px-6 py-4 sm:-mx-8 sm:px-8">
            {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
            {message && <p role="status" className="mb-3 text-sm leading-relaxed">{message}</p>}
            <div className="flex flex-wrap gap-2"><Button disabled={busy || !name.trim()} onClick={() => { void save(false) }}><SaveIcon />Simpan perubahan</Button><Button variant="outline" disabled={busy || !name.trim()} onClick={() => { void save(true) }}><CopyIcon />Simpan sebagai baru</Button></div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><Button variant="ghost" size="sm" disabled={busy || presets.length <= 1} onClick={() => { void remove() }}><Trash2Icon />{confirmDelete ? 'Ya, hapus preset ini' : 'Hapus preset'}</Button>{confirmDelete && <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Batal</Button>}<span className="text-sm text-muted-foreground">{dirty ? 'Perubahan belum disimpan' : 'Preset siap digunakan'}</span></div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </>
}
