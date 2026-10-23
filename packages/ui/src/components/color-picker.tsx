"use client"

import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cn } from 'cn'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover'
import { ToggleGroup, ToggleGroupItem } from './toggle-group'
import { FieldError } from './field'
import { normalizeHexColor } from '../lib/color'
import { Button } from './button'

const DEFAULT_PRESETS = [
  { value: '#111111', label: 'Hitam' }, { value: '#64748b', label: 'Abu-abu' },
  { value: '#1e3a8a', label: 'Biru' }, { value: '#166534', label: 'Hijau' },
  { value: '#9f1239', label: 'Merah' }, { value: '#c2410c', label: 'Jingga' },
  { value: '#facc15', label: 'Kuning' }, { value: '#ffffff', label: 'Putih' },
] as const

export interface ColorPickerProps {
  id?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  label?: string
  disabled?: boolean
  className?: string
  /** Compact toolbar swatch with no text entry or visible color codes. */
  compact?: boolean
  'aria-describedby'?: string
  presets?: readonly { value: string; label: string }[]
  /** Optional trailing input actions, for example a help popover. */
  children?: ReactNode
}

/** Shared opaque color input. Only valid six-digit HEX values reach consumers. */
export function ColorPicker({
  id, value, defaultValue = '#111111', onValueChange, label = 'Warna',
  disabled = false, className, compact = false, presets = DEFAULT_PRESETS, children,
  'aria-describedby': describedBy,
}: ColorPickerProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const [internalValue, setInternalValue] = useState(normalizeHexColor(defaultValue) ?? '#111111')
  const current = normalizeHexColor(value ?? internalValue) ?? '#111111'
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(current)
  const [invalid, setInvalid] = useState(false)
  useEffect(() => { setDraft(current); setInvalid(false) }, [current])

  function update(next: string) {
    const color = normalizeHexColor(next)
    if (!color) return
    setDraft(color)
    setInvalid(false)
    if (value === undefined) setInternalValue(color)
    if (color !== current) onValueChange?.(color)
  }
  function commitDraft() {
    if (normalizeHexColor(draft)) update(draft)
    else setInvalid(true)
  }

  return <Popover open={open && !disabled} onOpenChange={setOpen}>
    {compact ? <PopoverTrigger id={id} disabled={disabled} render={<Button variant="ghost" size="icon-compact" className={className} aria-label={`Pilih ${label.toLowerCase()}`} aria-describedby={describedBy} title={label} />}><span aria-hidden="true" className="size-4 border border-foreground/20" style={{ backgroundColor: current }} /></PopoverTrigger> : <div data-slot="color-picker" className={cn('flex min-w-0 flex-col gap-2', className)}>
      <InputGroup data-disabled={disabled || undefined}>
        <InputGroupAddon>
          <PopoverTrigger disabled={disabled} render={<InputGroupButton size="icon-sm" aria-label={`Pilih ${label.toLowerCase()}`} />}>
            <span aria-hidden="true" className="size-5 border border-foreground/20" style={{ backgroundColor: current }} />
          </PopoverTrigger>
        </InputGroupAddon>
        <InputGroupInput id={inputId} aria-label={label} value={draft} disabled={disabled}
          spellCheck={false} autoComplete="off" autoCapitalize="off" maxLength={7}
          aria-invalid={invalid || undefined} aria-describedby={[describedBy, invalid ? errorId : undefined].filter(Boolean).join(' ') || undefined}
          onChange={event => {
            const next = event.target.value
            setDraft(next)
            setInvalid(false)
            if (/^#?[0-9a-f]{6}$/i.test(next)) update(next)
          }}
          onBlur={commitDraft}
          onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); commitDraft() }
            if (event.key === 'Escape') { setDraft(current); setInvalid(false) }
          }} />
        {children && <InputGroupAddon align="inline-end">{children}</InputGroupAddon>}
      </InputGroup>
      {invalid && <FieldError id={errorId}>Gunakan kode HEX, misalnya #1e3a8a atau #fff.</FieldError>}
    </div>}
    <PopoverContent align="start" className="max-h-[min(var(--available-height),calc(100dvh-2rem))] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto" data-slot="color-picker-panel">
      <PopoverHeader><PopoverTitle>{label}</PopoverTitle><PopoverDescription>{compact ? 'Pilih warna di bidang atau gunakan warna pilihan.' : 'Geser untuk memilih warna, atau isi kode HEX.'}</PopoverDescription></PopoverHeader>
      <HexColorPicker color={current} onChange={update} aria-label={`Pemilih ${label.toLowerCase()}`} />
      {presets.length > 0 && <ToggleGroup aria-label="Warna pilihan" variant="soft" size="icon-sm"
        className="grid w-full grid-cols-4" value={[current]} onValueChange={values => { if (values[0]) update(values[0]) }}>
        {presets.filter(preset => normalizeHexColor(preset.value)).map(preset => <ToggleGroupItem
          key={preset.value} value={normalizeHexColor(preset.value)!} aria-label={compact ? preset.label : `${preset.label}, ${preset.value}`} className="w-full">
          <span aria-hidden="true" className="size-5 border border-foreground/20" style={{ backgroundColor: normalizeHexColor(preset.value) }} />
        </ToggleGroupItem>)}
      </ToggleGroup>}
      <p className="text-xs text-muted-foreground">Gunakan tombol panah untuk mengatur warna.</p>
    </PopoverContent>
  </Popover>
}
