import { Button } from '@xviidev/ui/components/button'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@xviidev/ui/components/field'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText } from '@xviidev/ui/components/input-group'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Checkbox } from '@xviidev/ui/components/checkbox'
import { Slider } from '@xviidev/ui/components/slider'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@xviidev/ui/components/accordion'
import { ColorPicker } from '@xviidev/ui/components/color-picker'
import { Alert, AlertDescription } from '@xviidev/ui/components/alert'
import { ImageIcon, MoveHorizontalIcon, MoveVerticalIcon } from '@xviidev/ui/lib/icons'
import { FORMATS, proportionalSize } from '../lib/options'
import type { Options, Format } from '../lib/options'
import type { Source } from '../lib/client'

export function SidePanel({ source, options, setOptions, busy, error, cancel, retry }: {
  source: Source; options: Options; setOptions: (options: Options) => void; busy: boolean; error: string; cancel: () => void; retry: () => void
}) {
  const prefix = 'image-output', original = options.format === 'original'
  const losslessFormat = ['webp', 'avif', 'jxl'].includes(options.format)
  const hasQuality = ['jpeg', 'webp', 'avif', 'jxl'].includes(options.format)
  const rotated = options.rotate === 90 || options.rotate === 270
  function update<K extends keyof Options>(key: K, value: Options[K]) { setOptions({ ...options, [key]: value }) }
  function dimension(axis: 'width' | 'height', value: number) {
    const width = rotated ? source.height : source.width, height = rotated ? source.width : source.height
    setOptions({ ...options, ...(options.lockRatio ? proportionalSize(value, axis, width, height) : { [axis]: value }) })
  }
  return <div className="flex min-w-0 flex-col gap-4"><FieldGroup className="gap-5">
      <Field><FieldLabel htmlFor={`${prefix}-format`}>Format</FieldLabel><SelectInput id={`${prefix}-format`} icon={ImageIcon} className="w-full" value={options.format} options={FORMATS.filter(format => format.value !== 'original')} onValueChange={value => setOptions({ ...options, format: value as Format, effort: Math.min(options.effort, ['webp', 'png'].includes(value) ? 6 : 9) })} /></Field>
      {!original && <>
        {hasQuality && <Field><FieldLabel id={`${prefix}-quality-label`} htmlFor={`${prefix}-quality`}>Kualitas · {options.quality}</FieldLabel><Slider id={`${prefix}-quality`} aria-labelledby={`${prefix}-quality-label`} value={[options.quality]} min={0} max={100} step={1} disabled={losslessFormat && options.lossless} onValueChange={value => update('quality', Array.isArray(value) ? value[0] : value)} /><FieldDescription>{losslessFormat && options.lossless ? 'Kualitas asli dipertahankan.' : 'Lebih tinggi untuk mempertahankan detail.'}</FieldDescription></Field>}
        {losslessFormat && <Field orientation="horizontal"><Checkbox id={`${prefix}-lossless`} checked={options.lossless} onCheckedChange={value => update('lossless', value)} /><FieldLabel htmlFor={`${prefix}-lossless`}>Lossless</FieldLabel></Field>}
        <Accordion>
          <AccordionItem value="resize"><AccordionTrigger>Ubah ukuran</AccordionTrigger><AccordionContent><FieldGroup className="gap-4">
            <Field orientation="horizontal"><Checkbox id={`${prefix}-resize`} checked={options.resize} onCheckedChange={value => update('resize', value)} /><FieldLabel htmlFor={`${prefix}-resize`}>Aktifkan resize</FieldLabel></Field>
            {options.resize && <>
              <FieldGroup className="grid grid-cols-2 gap-3">{(['width', 'height'] as const).map(axis => <Field key={axis}><FieldLabel htmlFor={`${prefix}-${axis}`}>{axis === 'width' ? 'Lebar' : 'Tinggi'}</FieldLabel><InputGroup><InputGroupAddon>{axis === 'width' ? <MoveHorizontalIcon aria-hidden="true" /> : <MoveVerticalIcon aria-hidden="true" />}</InputGroupAddon><InputGroupInput id={`${prefix}-${axis}`} type="number" min={1} max={8192} value={options[axis] || ''} onChange={event => dimension(axis, Number(event.target.value))} /><InputGroupAddon align="inline-end"><InputGroupText>px</InputGroupText></InputGroupAddon></InputGroup></Field>)}</FieldGroup>
              <Field orientation="horizontal"><Checkbox id={`${prefix}-ratio`} checked={options.lockRatio} onCheckedChange={value => update('lockRatio', value)} /><FieldLabel htmlFor={`${prefix}-ratio`}>Kunci rasio</FieldLabel></Field>
              <Field><FieldLabel htmlFor={`${prefix}-method`}>Metode resize</FieldLabel><SelectInput id={`${prefix}-method`} className="w-full" value={options.method} onValueChange={value => update('method', value as Options['method'])} options={[{ value: 'lanczos3', label: 'Lanczos 3' }, { value: 'mitchell', label: 'Mitchell' }, { value: 'catrom', label: 'Catmull-Rom' }, { value: 'triangle', label: 'Triangle' }, { value: 'nearest', label: 'Nearest neighbor' }]} /></Field>
              <Field orientation="horizontal"><Checkbox id={`${prefix}-linear`} checked={options.linearRGB} onCheckedChange={value => update('linearRGB', value)} /><FieldLabel htmlFor={`${prefix}-linear`}>Linear RGB</FieldLabel></Field>
              <Field orientation="horizontal"><Checkbox id={`${prefix}-alpha`} checked={options.premultiply} onCheckedChange={value => update('premultiply', value)} /><FieldLabel htmlFor={`${prefix}-alpha`}>Premultiply alpha</FieldLabel></Field>
            </>}
          </FieldGroup></AccordionContent></AccordionItem>
          <AccordionItem value="transform"><AccordionTrigger>Putar &amp; balik</AccordionTrigger><AccordionContent><FieldGroup className="gap-4">
            <Field><FieldLabel htmlFor={`${prefix}-rotate`}>Rotasi</FieldLabel><SelectInput id={`${prefix}-rotate`} className="w-full" value={String(options.rotate)} onValueChange={value => { const rotate = Number(value) as Options['rotate']; const swap = rotate === 90 || rotate === 270; setOptions({ ...options, rotate, ...(options.lockRatio ? { width: swap ? source.height : source.width, height: swap ? source.width : source.height } : {}) }) }} options={[0, 90, 180, 270].map(value => ({ value: String(value), label: `${value}°` }))} /></Field>
            <Field orientation="horizontal"><Checkbox id={`${prefix}-flip-x`} checked={options.flipX} onCheckedChange={value => update('flipX', value)} /><FieldLabel htmlFor={`${prefix}-flip-x`}>Balik horizontal</FieldLabel></Field>
            <Field orientation="horizontal"><Checkbox id={`${prefix}-flip-y`} checked={options.flipY} onCheckedChange={value => update('flipY', value)} /><FieldLabel htmlFor={`${prefix}-flip-y`}>Balik vertikal</FieldLabel></Field>
          </FieldGroup></AccordionContent></AccordionItem>
          <AccordionItem value="palette"><AccordionTrigger>Kurangi warna</AccordionTrigger><AccordionContent><FieldGroup className="gap-4">
            <Field orientation="horizontal"><Checkbox id={`${prefix}-quantize`} checked={options.quantize} onCheckedChange={value => update('quantize', value)} /><FieldLabel htmlFor={`${prefix}-quantize`}>Aktifkan palet warna</FieldLabel></Field>
            {options.quantize && <><Field><FieldLabel htmlFor={`${prefix}-colors`}>Jumlah warna</FieldLabel><InputGroup><InputGroupInput id={`${prefix}-colors`} type="number" min={2} max={256} value={options.colors} onChange={event => update('colors', Number(event.target.value))} /></InputGroup></Field><Field orientation="horizontal"><Checkbox id={`${prefix}-dither`} checked={options.dither} onCheckedChange={value => update('dither', value)} /><FieldLabel htmlFor={`${prefix}-dither`}>Dithering</FieldLabel></Field></>}
            <FieldDescription>Pengurangan warna mengubah piksel, termasuk saat codec memakai mode lossless.</FieldDescription>
          </FieldGroup></AccordionContent></AccordionItem>
          <AccordionItem value="advanced"><AccordionTrigger>Pengaturan codec</AccordionTrigger><AccordionContent><FieldGroup className="gap-4">
            {['png', 'webp', 'avif', 'jxl'].includes(options.format) && <Field><FieldLabel id={`${prefix}-effort-label`}>Upaya kompresi · {options.effort}</FieldLabel><Slider aria-labelledby={`${prefix}-effort-label`} value={[options.effort]} min={1} max={options.format === 'jxl' ? 9 : ['png', 'webp'].includes(options.format) ? 6 : 9} step={1} onValueChange={value => update('effort', Array.isArray(value) ? value[0] : value)} /><FieldDescription>Lebih tinggi dapat memperkecil hasil, tetapi lebih lambat.</FieldDescription></Field>}
            {['jpeg', 'jxl'].includes(options.format) && <Field orientation="horizontal"><Checkbox id={`${prefix}-progressive`} checked={options.progressive} onCheckedChange={value => update('progressive', value)} /><FieldLabel htmlFor={`${prefix}-progressive`}>Progressive</FieldLabel></Field>}
            {options.format === 'webp' && <Field orientation="horizontal"><Checkbox id={`${prefix}-sharp`} checked={options.sharpYuv} onCheckedChange={value => update('sharpYuv', value)} /><FieldLabel htmlFor={`${prefix}-sharp`}>Sharp YUV</FieldLabel></Field>}
            {['jpeg', 'avif'].includes(options.format) && <Field><FieldLabel htmlFor={`${prefix}-subsample`}>Chroma subsampling</FieldLabel><SelectInput id={`${prefix}-subsample`} className="w-full" value={options.subsample} onValueChange={value => update('subsample', value as Options['subsample'])} options={[{ value: '420', label: '4:2:0 · lebih kecil' }, { value: '444', label: '4:4:4 · detail warna' }]} /></Field>}
            {options.format === 'jpeg' && <Field><FieldLabel htmlFor={`${prefix}-background`}>Latar transparansi</FieldLabel><ColorPicker id={`${prefix}-background`} value={options.background} label="Latar transparansi" onValueChange={value => update('background', value)} /></Field>}
            {options.format === 'qoi' && <FieldDescription>QOI mempertahankan piksel tanpa pengaturan kualitas.</FieldDescription>}
          </FieldGroup></AccordionContent></AccordionItem>
        </Accordion>
      </>}
    </FieldGroup>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {busy && <Button variant="outline" size="sm" onClick={cancel}>Batalkan</Button>}
    {error && <Button variant="outline" size="sm" onClick={retry}>Proses ulang</Button>}
    </div>
}
