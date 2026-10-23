import { useEffect, useState } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { ButtonGroup, ButtonGroupSeparator } from '@xviidev/ui/components/button-group'
import { Input } from '@xviidev/ui/components/input'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Popover, PopoverContent, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription } from '@xviidev/ui/components/popover'
import { BarcodeIcon, ChevronDownIcon } from '@xviidev/ui/lib/icons'
import { barcodeExpression } from '../lib/barcode-template'
import { barcodeWidthRange } from '../lib/label-barcode'
import { formatCell } from '../lib/labels'
import type { LabelSettings } from '../lib/labels'
import type { BarcodeExpression, BarcodeOptions } from '../lib/barcode-template'

const mm = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)
export function BarcodeToolbar({ active, defaultSource = 1, rows, settings, onApply }: {
  active: BarcodeExpression | null; defaultSource?: number; rows: unknown[][]; settings: LabelSettings; onApply: (expression: BarcodeExpression) => void
}) {
  const [open, setOpen] = useState(false)
  const source = active?.source ?? defaultSource
  const [format, setFormat] = useState<'CODE128' | 'EAN13'>('CODE128'), [showText, setShowText] = useState(true)
  const [width, setWidth] = useState(''), [height, setHeight] = useState('')
  const activeKey = active ? barcodeExpression(active) : ''
  useEffect(() => {
    setFormat(active?.options.format ?? 'CODE128'); setShowText(active?.options.showText ?? true)
    setWidth(String(active?.options.width ?? '')); setHeight(String(active?.options.height ?? ''))
  }, [activeKey, open])
  const options: BarcodeOptions = { ...(format === 'EAN13' ? { format: 'EAN13' as const } : {}), ...(!showText ? { showText: false } : {}), ...(width !== '' ? { width: Number(width) } : {}), ...(height !== '' ? { height: Number(height) } : {}) }
  const available = settings.labelWidth - 2 * settings.padding
  const maxHeight = Math.floor((settings.labelHeight - 2 * settings.padding) * 10) / 10
  let range = barcodeWidthRange([], format, available), error = ''
  try {
    const values = typeof source === 'string' ? [source] : rows.map(row => typeof row[source - 1] === 'string' ? row[source - 1] as string : formatCell(row[source - 1])).filter(Boolean)
    range = barcodeWidthRange(values, format, available)
    barcodeExpression({ source, options })
    if (range.minimum > range.maximum) error = `Kode memerlukan minimal ${mm(range.minimum)} mm; area label hanya ${mm(range.maximum)} mm.`
    else if (width !== '' && (Number(width) < range.minimum || Number(width) > range.maximum)) error = `Lebar yang sesuai: ${mm(range.minimum)}–${mm(range.maximum)} mm. Kosongkan untuk otomatis.`
    else if (height !== '' && (Number(height) < 8 || Number(height) > maxHeight)) error = `Tinggi yang sesuai: 8–${mm(maxHeight)} mm.`
  } catch (issue) { error = (issue as Error).message }
  return <Popover open={open} onOpenChange={setOpen}>
    <ButtonGroup aria-label="Barcode template">
      <Button variant={active ? 'secondary' : 'ghost'} size="icon-compact" aria-label="Sisipkan barcode" title={active ? 'Gunakan barcode terpilih' : 'Sisipkan barcode'} onMouseDown={event => event.preventDefault()} onClick={() => onApply(active ?? { source, options: {} })}><BarcodeIcon /></Button>
      <ButtonGroupSeparator />
      <PopoverTrigger render={<Button variant="ghost" size="icon-narrow" aria-label="Pengaturan barcode" title="Pengaturan barcode (opsional)" />}><ChevronDownIcon /></PopoverTrigger>
    </ButtonGroup>
    <PopoverContent align="end" className="max-h-[min(var(--available-height),calc(100dvh-2rem))] w-72 max-w-[calc(100vw-2rem)] overflow-auto">
      <PopoverHeader><PopoverTitle>Tampilan barcode</PopoverTitle><PopoverDescription>Posisi, perataan, dan warna mengikuti template.</PopoverDescription></PopoverHeader>
      <FieldGroup className="gap-4">
        <Field><FieldLabel htmlFor="template-barcode-format">Format</FieldLabel><SelectInput id="template-barcode-format" value={format} onValueChange={value => setFormat(value as typeof format)} options={[{ value: 'CODE128', label: 'Code 128' }, { value: 'EAN13', label: 'EAN-13' }]} className="w-full" /></Field>
        <FieldGroup className="grid grid-cols-2 gap-3">
          <Field><FieldLabel htmlFor="template-barcode-width">Lebar (mm)</FieldLabel><Input id="template-barcode-width" type="number" min={Math.max(0.1, range.minimum)} max={range.maximum} step={0.1} placeholder="Otomatis" value={width} onChange={event => setWidth(event.target.value)} /></Field>
          <Field><FieldLabel htmlFor="template-barcode-height">Tinggi (mm)</FieldLabel><Input id="template-barcode-height" type="number" min={8} max={maxHeight} step={0.5} placeholder="12" value={height} onChange={event => setHeight(event.target.value)} /></Field>
        </FieldGroup>
        <FieldDescription>{range.hasData || format === 'EAN13' ? `Lebar ${mm(range.minimum)}–${mm(range.maximum)} mm. Kosongkan untuk otomatis.` : 'Lebar mengikuti data secara otomatis jika dikosongkan.'}</FieldDescription>
        <Field orientation="horizontal"><Checkbox id="template-barcode-text" checked={showText} onCheckedChange={setShowText} /><FieldLabel htmlFor="template-barcode-text">Tampilkan teks kode</FieldLabel></Field>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button disabled={!!error} onClick={() => { onApply({ source, options }); setOpen(false) }}>Terapkan</Button>
      </FieldGroup>
    </PopoverContent>
  </Popover>
}
