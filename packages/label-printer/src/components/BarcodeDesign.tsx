import { Button } from '@xviidev/ui/components/button'
import { Input } from '@xviidev/ui/components/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { BarcodeIcon } from '@xviidev/ui/lib/icons'
import { DEFAULT_BARCODE } from '../lib/label-barcode'
import type { LabelBarcode } from '../lib/label-barcode'
import type { LabelSettings } from '../lib/labels'

export function BarcodeDesign({ settings, mode, columns, onChange }: {
  settings: LabelSettings; mode: 'manual' | 'excel'; columns: { value: string; label: string }[]; onChange: (value: LabelBarcode) => void
}) {
  const barcode = settings.barcode ?? DEFAULT_BARCODE
  function update<K extends keyof LabelBarcode>(key: K, value: LabelBarcode[K]) { onChange({ ...barcode, [key]: value }) }
  return <section aria-labelledby="barcode-design-title" className="flex flex-col gap-4">
    <h3 id="barcode-design-title" className="flex items-center gap-2"><BarcodeIcon className="size-4" />Barcode pada label</h3>
    {!barcode.enabled ? <><p className="hint">Tambahkan satu barcode dari nilai tetap atau data setiap label.</p><Button variant="outline" className="self-start" onClick={() => onChange(settings.barcode ? { ...barcode, enabled: true } : { ...DEFAULT_BARCODE, enabled: true, x: settings.padding, width: Math.min(50, settings.labelWidth - 2 * settings.padding), y: Math.max(settings.padding, settings.labelHeight - settings.padding - 12) })}>Tambah barcode</Button></> : <>
      <FieldGroup className="gap-4">
        <Field><FieldLabel htmlFor="label-barcode-format">Format barcode</FieldLabel><SelectInput id="label-barcode-format" className="w-full" value={barcode.format} onValueChange={value => update('format', value as LabelBarcode['format'])} options={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13' }]} /><FieldDescription>{barcode.format === 'EAN13' ? '12 digit: digit pemeriksa otomatis. 13 digit: kode lengkap divalidasi.' : 'Huruf, angka, dan simbol ASCII, maksimal 80 karakter.'}</FieldDescription></Field>
        <Field><FieldLabel htmlFor="label-barcode-source">Sumber nilai barcode</FieldLabel><SelectInput id="label-barcode-source" className="w-full" value={barcode.source} onValueChange={value => update('source', value as LabelBarcode['source'])} options={[{ value: 'fixed', label: 'Nilai tetap untuk semua label' }, { value: 'column', label: mode === 'excel' ? 'Kolom Excel' : 'Baris input manual' }]} /></Field>
        {barcode.source === 'fixed' ? <Field><FieldLabel htmlFor="label-barcode-value">Nilai barcode</FieldLabel><Input id="label-barcode-value" value={barcode.value} maxLength={80} placeholder={barcode.format === 'CODE128' ? 'BRG-0001' : '590123412345'} onChange={event => update('value', event.target.value)} /><FieldDescription>Nilai ini ikut disimpan ketika desain JSON diunduh.</FieldDescription></Field> : <Field><FieldLabel htmlFor="label-barcode-column">{mode === 'excel' ? 'Kolom barcode' : 'Baris barcode'}</FieldLabel><SelectInput id="label-barcode-column" className="w-full" value={String(barcode.column)} onValueChange={value => update('column', Number(value))} options={columns} /><FieldDescription>Nilai diambil sebelum pemetaan teks. Simpan kode berawalan nol di Excel sebagai teks. Nilai kosong pada label akan dilaporkan.</FieldDescription></Field>}
        <FieldGroup className="grid grid-cols-2 gap-3">
          {([{ key: 'x', label: 'Posisi X barcode', min: 0 }, { key: 'y', label: 'Posisi Y barcode', min: 0 }, { key: 'width', label: 'Lebar barcode', min: 1 }, { key: 'height', label: 'Tinggi barcode', min: 8 }] as const).map(({ key, label, min }) => <Field key={key}><FieldLabel htmlFor={`label-barcode-${key}`}>{label} (mm)</FieldLabel><Input id={`label-barcode-${key}`} type="number" min={min} max={1000} step={0.1} value={Number.isFinite(barcode[key]) ? barcode[key] : ''} onChange={event => update(key, Number(event.target.value))} /></Field>)}
        </FieldGroup>
        <Field orientation="horizontal"><Checkbox id="label-barcode-text" checked={barcode.showText} onCheckedChange={value => update('showText', value)} /><FieldLabel htmlFor="label-barcode-text">Tampilkan teks barcode</FieldLabel></Field>
      </FieldGroup>
      <p className="hint">Posisi diukur dari kiri dan atas label. Ukuran mencakup ruang kosong dan teks barcode. Teks label otomatis memakai area di atas barcode dengan sela 1 mm. Uji pindai hasil cetak pada skala 100%.</p>
      <Button variant="outline" className="self-start" onClick={() => update('enabled', false)}>Hapus barcode dari label</Button>
    </>}
  </section>
}
