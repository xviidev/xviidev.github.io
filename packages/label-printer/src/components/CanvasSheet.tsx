import { Stage, Layer, Rect, Group, Shape } from 'react-konva'
import type { PrintModel, FontKey, PlacedRun } from '../lib/print-layout'
import { PT_PER_MM } from '../lib/print-layout'
import type { LoadedFont } from '../lib/fonts'
import type { LabelSettings } from '../lib/labels'

export function drawRuns(canvas: CanvasRenderingContext2D, runs: PlacedRun[], fonts: Map<FontKey, LoadedFont>) {
  for (const run of runs) {
    const font = fonts.get(run.key)!.font
    canvas.save(); canvas.translate(run.x, run.baseline); canvas.scale(run.size / font.unitsPerEm, -run.size / font.unitsPerEm); canvas.fillStyle = run.color ?? '#111111'
    for (const glyph of font.layout(run.text).glyphs) {
      canvas.fill(new Path2D(glyph.path.toSVG()))
      canvas.translate(glyph.advanceWidth, 0)
    }
    canvas.restore()
    if (run.underline) { canvas.save(); canvas.fillStyle = run.color ?? '#111111'; canvas.fillRect(run.x, run.baseline + run.size * 0.12, run.width, Math.max(0.4, run.size / 18)); canvas.restore() }
  }
}

export function CanvasSheet({
  model, page, fonts, settings: s, width, columns, rows, draggable, onMove,
  viewMode = 'sheet', singleLabelIndex = 0, start = 1, onSelectStart, zoom = 1,
}: {
  model: PrintModel; page: number; fonts: Map<FontKey, LoadedFont>; settings: LabelSettings; width: number;
  columns: number; rows: number; draggable: boolean; onMove: (x: number, y: number) => void;
  viewMode?: 'sheet' | 'single'; singleLabelIndex?: number; start?: number; onSelectStart?: (slot: number) => void; zoom?: number;
}) {
  const paperWidth = s.paperWidth * PT_PER_MM, paperHeight = s.paperHeight * PT_PER_MM
  const labelWidth = s.labelWidth * PT_PER_MM, labelHeight = s.labelHeight * PT_PER_MM

  if (viewMode === 'single') {
    const targetScale = Math.min(2.5, Math.max(0.5, (width - 32) / labelWidth)) * zoom
    const targetSlot = model.pages.flatMap(p => p).find(slot => slot.index === singleLabelIndex)
    const laidLabel = targetSlot?.label
    return (
      <div role="img" aria-label={`Pratinjau label ke-${singleLabelIndex + 1}`} className="mx-auto flex flex-col items-center">
        <div style={{ width: labelWidth * targetScale, height: labelHeight * targetScale }} className="relative border border-border shadow-sm">
          <Stage width={labelWidth * targetScale} height={labelHeight * targetScale} scaleX={targetScale} scaleY={targetScale}>
            <Layer>
              <Rect width={labelWidth} height={labelHeight} fill="white" stroke="#222" strokeWidth={1} listening={false} />
              <Rect
                x={s.padding * PT_PER_MM}
                y={s.padding * PT_PER_MM}
                width={Math.max(0, labelWidth - 2 * s.padding * PT_PER_MM)}
                height={Math.max(0, labelHeight - 2 * s.padding * PT_PER_MM)}
                stroke="#cbd5e1"
                strokeWidth={0.5}
                dash={[3, 3]}
                listening={false}
              />
              {laidLabel && (
                <Group>
                  {laidLabel.overflow && <Rect width={labelWidth} height={labelHeight} fill="#fef2f2" stroke="#dc2626" strokeWidth={1} listening={false} />}
                  <Group draggable={draggable} onDragEnd={event => {
                    const position = event.target.position()
                    event.target.position({ x: 0, y: 0 })
                    onMove(position.x / PT_PER_MM, position.y / PT_PER_MM)
                  }}>
                    {laidLabel.barcode && <Group listening={false}>
                      <Rect x={laidLabel.barcode.x} y={laidLabel.barcode.y} width={laidLabel.barcode.width} height={laidLabel.barcode.height} fill="white" />
                      {laidLabel.barcode.bars.map((bar, index) => <Rect key={index} x={bar.x} y={laidLabel.barcode!.barY} width={bar.width} height={laidLabel.barcode!.barHeight} fill={laidLabel.barcode!.color} />)}
                    </Group>}
                    <Shape fill="#111" listening={draggable} hitFunc={(context, shape) => { context.beginPath(); context.rect(0, 0, labelWidth, labelHeight); context.closePath(); context.fillStrokeShape(shape) }} sceneFunc={context => {
                      drawRuns(context._context, laidLabel.runs, fonts)
                    }} />
                  </Group>
                </Group>
              )}
            </Layer>
          </Stage>
        </div>
      </div>
    )
  }

  const baseScale = Math.max(0.05, Math.min(1.333, width / paperWidth))
  const scale = baseScale * zoom

  return (
    <div role="img" aria-label={`Pratinjau canvas lembar ${page + 1}, ${model.pages[page]?.length ?? 0} label`} className="mx-auto" style={{ width: paperWidth * scale }}>
      <Stage width={paperWidth * scale} height={paperHeight * scale} scaleX={scale} scaleY={scale}>
        <Layer>
          <Rect width={paperWidth} height={paperHeight} fill="white" listening={false} />
          {Array.from({ length: columns * rows }, (_, index) => {
            const cellX = (s.marginLeft + (index % columns) * (s.labelWidth + s.gapX)) * PT_PER_MM
            const cellY = (s.marginTop + Math.floor(index / columns) * (s.labelHeight + s.gapY)) * PT_PER_MM
            const isSkippedOnPage0 = page === 0 && index + 1 < start
            return (
              <Group key={index}>
                <Rect
                  x={cellX}
                  y={cellY}
                  width={labelWidth}
                  height={labelHeight}
                  fill={isSkippedOnPage0 ? '#f1f5f9' : 'transparent'}
                  stroke={s.border ? '#222' : isSkippedOnPage0 ? '#cbd5e1' : '#737373'}
                  strokeWidth={s.border ? 0.5 : 1}
                  strokeScaleEnabled={s.border}
                  dash={s.border ? undefined : [5, 4]}
                  listening={!draggable && page === 0 && !!onSelectStart}
                  onClick={() => onSelectStart?.(index + 1)}
                  onTap={() => onSelectStart?.(index + 1)}
                />
              </Group>
            )
          })}
          {model.pages[page]?.map(slot => <Group key={slot.index} x={slot.x} y={slot.y}>
            {slot.label.overflow && <Rect width={labelWidth} height={labelHeight} fill="#fef2f2" stroke="#dc2626" strokeWidth={0.7} listening={false} />}
            <Group draggable={draggable} onDragEnd={event => {
              const position = event.target.position()
              event.target.position({ x: 0, y: 0 })
              onMove(position.x / PT_PER_MM, position.y / PT_PER_MM)
            }}>
              {slot.label.barcode && <Group listening={false}>
                <Rect x={slot.label.barcode.x} y={slot.label.barcode.y} width={slot.label.barcode.width} height={slot.label.barcode.height} fill="white" />
                {slot.label.barcode.bars.map((bar, index) => <Rect key={index} x={bar.x} y={slot.label.barcode!.barY} width={bar.width} height={slot.label.barcode!.barHeight} fill={slot.label.barcode!.color} />)}
              </Group>}
              <Shape fill="#111" listening={draggable} hitFunc={(context, shape) => { context.beginPath(); context.rect(0, 0, labelWidth, labelHeight); context.closePath(); context.fillStrokeShape(shape) }} sceneFunc={context => {
                drawRuns(context._context, slot.label.runs, fonts)
              }} />
            </Group>
          </Group>)}
        </Layer>
      </Stage>
    </div>
  )
}
