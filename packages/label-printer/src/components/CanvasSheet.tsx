import { Stage, Layer, Rect, Group, Shape } from 'react-konva'
import type { PrintModel, FontKey, PlacedRun } from '../lib/print-layout'
import { PT_PER_MM } from '../lib/print-layout'
import type { LoadedFont } from '../lib/fonts'
import type { LabelSettings } from '../lib/labels'

function drawRuns(canvas: CanvasRenderingContext2D, runs: PlacedRun[], fonts: Map<FontKey, LoadedFont>) {
  for (const run of runs) {
    const font = fonts.get(run.key)!.font
    canvas.save(); canvas.translate(run.x, run.baseline); canvas.scale(run.size / font.unitsPerEm, -run.size / font.unitsPerEm); canvas.fillStyle = '#111'
    for (const glyph of font.layout(run.text).glyphs) {
      canvas.fill(new Path2D(glyph.path.toSVG()))
      canvas.translate(glyph.advanceWidth, 0)
    }
    canvas.restore()
    if (run.underline) { canvas.save(); canvas.fillStyle = '#111'; canvas.fillRect(run.x, run.baseline + run.size * 0.12, run.width, Math.max(0.4, run.size / 18)); canvas.restore() }
  }
}

export function CanvasSheet({ model, page, fonts, settings: s, width, columns, rows, draggable, onMove }: {
  model: PrintModel; page: number; fonts: Map<FontKey, LoadedFont>; settings: LabelSettings; width: number;
  columns: number; rows: number; draggable: boolean; onMove: (x: number, y: number) => void
}) {
  const paperWidth = s.paperWidth * PT_PER_MM, paperHeight = s.paperHeight * PT_PER_MM
  const scale = Math.max(0.05, Math.min(1.333, width / paperWidth))
  const labelWidth = s.labelWidth * PT_PER_MM, labelHeight = s.labelHeight * PT_PER_MM
  return <div role="img" aria-label={`Pratinjau canvas lembar ${page + 1}, ${model.pages[page]?.length ?? 0} label`} className="mx-auto" style={{ width: paperWidth * scale }}>
    <Stage width={paperWidth * scale} height={paperHeight * scale} scaleX={scale} scaleY={scale}>
      <Layer>
        <Rect width={paperWidth} height={paperHeight} fill="white" listening={false} />
        {Array.from({ length: columns * rows }, (_, index) => <Rect key={index}
          x={(s.marginLeft + (index % columns) * (s.labelWidth + s.gapX)) * PT_PER_MM}
          y={(s.marginTop + Math.floor(index / columns) * (s.labelHeight + s.gapY)) * PT_PER_MM}
          width={labelWidth} height={labelHeight} stroke={s.border ? '#222' : '#737373'} strokeWidth={s.border ? 0.5 : 1} strokeScaleEnabled={s.border} dash={s.border ? undefined : [5, 4]} listening={false} />)}
        {model.pages[page]?.map(slot => <Group key={slot.index} x={slot.x} y={slot.y}>
          {slot.label.overflow && <Rect width={labelWidth} height={labelHeight} fill="#fef2f2" stroke="#dc2626" strokeWidth={0.7} listening={false} />}
          {slot.label.barcode && <Group listening={false}>
            <Rect x={slot.label.barcode.x} y={slot.label.barcode.y} width={slot.label.barcode.width} height={slot.label.barcode.height} fill="white" />
            {slot.label.barcode.bars.map((bar, index) => <Rect key={index} x={bar.x} y={slot.label.barcode!.barY} width={bar.width} height={slot.label.barcode!.barHeight} fill="black" />)}
            {slot.label.barcode.text && <Shape sceneFunc={context => drawRuns(context._context, [slot.label.barcode!.text!], fonts)} />}
          </Group>}
          <Group draggable={draggable} onDragEnd={event => {
            const position = event.target.position()
            event.target.position({ x: 0, y: 0 })
            onMove(position.x / PT_PER_MM, position.y / PT_PER_MM)
          }}>
            <Shape fill="#111" listening={draggable} hitFunc={(context, shape) => { context.beginPath(); context.rect(0, 0, labelWidth, labelHeight); context.closePath(); context.fillStrokeShape(shape) }} sceneFunc={context => {
              drawRuns(context._context, slot.label.runs.filter(run => run !== slot.label.barcode?.text), fonts)
            }} />
          </Group>
        </Group>)}
      </Layer>
    </Stage>
  </div>
}
