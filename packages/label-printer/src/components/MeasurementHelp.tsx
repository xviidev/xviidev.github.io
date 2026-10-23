import { useId } from 'react'
import { InputGroupButton } from '@xviidev/ui/components/input-group'
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from '@xviidev/ui/components/popover'
import { InfoIcon, MoveHorizontalIcon, MoveVerticalIcon, PanelTopIcon, PanelBottomIcon, PanelLeftIcon, PanelRightIcon, RectangleHorizontalIcon } from '@xviidev/ui/lib/icons'

export type MeasurementKind = 'paperWidth' | 'paperHeight' | 'labelWidth' | 'labelHeight' | 'gapX' | 'gapY' | 'marginTop' | 'marginBottom' | 'marginLeft' | 'marginRight' | 'padding'
export const measurementIcons = {
  paperWidth: MoveHorizontalIcon, paperHeight: MoveVerticalIcon,
  labelWidth: MoveHorizontalIcon, labelHeight: MoveVerticalIcon,
  gapX: MoveHorizontalIcon, gapY: MoveVerticalIcon,
  marginTop: PanelTopIcon, marginBottom: PanelBottomIcon,
  marginLeft: PanelLeftIcon, marginRight: PanelRightIcon, padding: RectangleHorizontalIcon,
} satisfies Record<MeasurementKind, typeof InfoIcon>
const descriptions: Record<MeasurementKind, string> = {
  paperWidth: 'Ukuran seluruh lembar kertas dari tepi kiri ke tepi kanan, termasuk margin. Bukan lebar satu stiker. A4 tegak memiliki lebar 210 mm.',
  paperHeight: 'Ukuran seluruh lembar kertas dari tepi atas ke tepi bawah, termasuk margin. A4 tegak memiliki tinggi 297 mm. Gunakan Putar kertas untuk menukar lebar dan tinggi.',
  labelWidth: 'Lebar satu stiker dari tepi kiri ke tepi kanan. Jangan sertakan sela antarstiker atau margin kertas.',
  labelHeight: 'Tinggi satu stiker dari tepi atas ke tepi bawah. Jangan sertakan sela antarbaris atau margin kertas.',
  gapX: 'Sela antara tepi kanan satu label dan tepi kiri label di sebelahnya. Bukan jarak dari pusat ke pusat label.',
  gapY: 'Sela antara tepi bawah satu label dan tepi atas label pada baris berikutnya.',
  marginTop: 'Jarak dari tepi atas kertas ke tepi atas baris label pertama.',
  marginBottom: 'Ruang minimum dari tepi bawah baris label terakhir ke tepi bawah kertas. Ruang tersisa bisa lebih besar jika satu baris lagi tidak muat.',
  marginLeft: 'Jarak dari tepi kiri kertas ke tepi kiri kolom label pertama.',
  marginRight: 'Ruang minimum dari tepi kanan kolom label terakhir ke tepi kanan kertas. Ruang tersisa bisa lebih besar jika satu kolom lagi tidak muat.',
  padding: 'Jarak aman di dalam label, dari tepi stiker ke area teks. Berlaku pada keempat sisi.',
}
function MeasurementDiagram({ kind, value, label }: { kind: MeasurementKind; value: number; label: string }) {
  const arrow = `measure-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const number = Number.isFinite(value) ? value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'
  const arrowProps = { stroke: 'currentColor', strokeWidth: 2, markerStart: `url(#${arrow})`, markerEnd: `url(#${arrow})` }
  const cell = (x: number, y: number, width: number, height: number, text?: string) => <g><rect x={x} y={y} width={width} height={height} className="fill-muted stroke-muted-foreground" strokeWidth={1.5} />{text && <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="currentColor" fontSize={13}>{text}</text>}</g>
  return <svg viewBox="0 0 300 205" className="block h-auto w-full" role="img" aria-label={`Ilustrasi ${label.toLocaleLowerCase('id-ID')}, ${number} milimeter`}>
    <defs><marker id={arrow} viewBox="0 0 6 6" refX={3} refY={3} markerWidth={5} markerHeight={5} orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill="currentColor" /></marker></defs>
    {kind === 'paperWidth' || kind === 'paperHeight' || kind === 'labelWidth' || kind === 'labelHeight' ? <>
      <rect x={55} y={18} width={170} height={144} className="fill-background stroke-muted-foreground" strokeWidth={1.5} />
      {cell(77, 40, 58, 40)}{cell(148, 40, 58, 40)}{cell(77, 94, 58, 40)}{cell(148, 94, 58, 40)}
      {kind === 'paperWidth' && <><path d="M55 165V183M225 165V183" className="stroke-muted-foreground" /><line x1={60} x2={220} y1={176} y2={176} {...arrowProps} /></>}
      {kind === 'paperHeight' && <><path d="M228 18H254M228 162H254" className="stroke-muted-foreground" /><line x1={246} x2={246} y1={23} y2={157} {...arrowProps} /></>}
      {kind === 'labelWidth' && <><rect x={77} y={40} width={58} height={40} fill="none" stroke="currentColor" strokeWidth={2} /><line x1={82} x2={130} y1={62} y2={62} {...arrowProps} /></>}
      {kind === 'labelHeight' && <><rect x={77} y={40} width={58} height={40} fill="none" stroke="currentColor" strokeWidth={2} /><line x1={106} x2={106} y1={45} y2={75} {...arrowProps} /></>}
      <text x={150} y={201} textAnchor="middle" fill="currentColor" fontSize={14}>{label}: {number} mm</text>
    </> : kind === 'gapX' ? <>
      {cell(24, 42, 100, 64, 'Label A')}{cell(value === 0 ? 124 : 164, 42, 100, 64, 'Label B')}
      {value === 0 ? <line x1={124} x2={124} y1={35} y2={124} stroke="currentColor" strokeWidth={2} /> : <><path d="M124 110V138M164 110V138" className="stroke-muted-foreground" fill="none" /><line x1={128} x2={160} y1={126} y2={126} {...arrowProps} /></>}
      <text x={150} y={163} textAnchor="middle" fill="currentColor" fontSize={14}>Jarak mendatar: {number} mm</text>
    </> : kind === 'gapY' ? <>
      {cell(48, 24, 160, 52, 'Label A')}{cell(48, value === 0 ? 76 : 116, 160, 52, 'Label B')}
      {value === 0 ? <line x1={40} x2={220} y1={76} y2={76} stroke="currentColor" strokeWidth={2} /> : <><path d="M212 76H244M212 116H244" className="stroke-muted-foreground" fill="none" /><line x1={234} x2={234} y1={80} y2={112} {...arrowProps} /></>}
      <text x={150} y={196} textAnchor="middle" fill="currentColor" fontSize={14}>Jarak menurun: {number} mm</text>
    </> : kind === 'padding' ? <>
      {cell(24, 24, 252, 136)}<rect x={56} y={50} width={188} height={84} className="fill-background stroke-muted-foreground" strokeDasharray="5 4" />
      <text x={150} y={96} textAnchor="middle" fill="currentColor" fontSize={14}>Area teks</text><line x1={29} x2={51} y1={92} y2={92} {...arrowProps} />
      <text x={150} y={192} textAnchor="middle" fill="currentColor" fontSize={14}>Ruang dalam: {number} mm</text>
    </> : <>
      <rect x={20} y={14} width={260} height={160} className="fill-background stroke-muted-foreground" strokeWidth={1.5} />
      {cell(60, 50, 80, 40)}{cell(160, 50, 80, 40)}{cell(60, 110, 80, 40)}{cell(160, 110, 80, 40)}
      {kind === 'marginLeft' && <line x1={25} x2={55} y1={70} y2={70} {...arrowProps} />}
      {kind === 'marginRight' && <line x1={245} x2={275} y1={70} y2={70} {...arrowProps} />}
      {kind === 'marginTop' && <line x1={100} x2={100} y1={19} y2={45} {...arrowProps} />}
      {kind === 'marginBottom' && <line x1={100} x2={100} y1={155} y2={169} {...arrowProps} />}
      <text x={150} y={199} textAnchor="middle" fill="currentColor" fontSize={14}>{label}: {number} mm</text>
    </>}
  </svg>
}
export function MeasurementHelp({ kind, label, value }: { kind: MeasurementKind; label: string; value: number }) {
  return <Popover><PopoverTrigger render={<InputGroupButton size="icon-xs" aria-label={`Contoh ${label.toLocaleLowerCase('id-ID')}`} />}><InfoIcon /></PopoverTrigger>
    <PopoverContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-2rem)]">
      <PopoverHeader><PopoverTitle>{label}</PopoverTitle><PopoverDescription>{descriptions[kind]}</PopoverDescription></PopoverHeader>
      <MeasurementDiagram kind={kind} value={value} label={label} />
      <p className="text-sm text-muted-foreground">{(kind === 'gapX' || kind === 'gapY') && value === 0 ? '0 mm berarti kedua label berdempetan, tanpa sela. ' : ''}Ilustrasi tidak berskala. Ukur lembar stiker asli dengan penggaris.</p>
    </PopoverContent>
  </Popover>
}
