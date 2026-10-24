import { useEffect, useRef, useState } from 'react'
import type { ReactNode, ReactElement } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@xviidev/ui/components/card'
import { Toggle } from '@xviidev/ui/components/toggle'
import { SelectInput } from '@xviidev/ui/components/select-input'
import { Tooltip, TooltipTrigger, TooltipContent } from '@xviidev/ui/components/tooltip'
import { ComparisonDivider } from '@xviidev/ui/components/comparison-divider'
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon, MinimizeIcon, SquareDashedIcon, WavesIcon, InfoIcon, ScanLineIcon, FocusIcon } from '@xviidev/ui/lib/icons'
import { cn } from '@xviidev/ui/lib/utils'
import { formatFileSize } from '@xviidev/ui/lib/file'
import { previewGeometry } from '../lib/options'
import type { Options } from '../lib/options'
import type { Result, Source } from '../lib/client'

function Hint({ text, children }: { text: string; children: ReactElement }) { return <Tooltip><TooltipTrigger render={children} /><TooltipContent>{text}</TooltipContent></Tooltip> }

export function Comparison({ source, result, options, summary, children }: { source: Source; result: Result | null; options: Options; summary: ReactNode; children: ReactNode }) {
  const surface = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(50), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [size, setSize] = useState({ width: 500, height: 500 })
  const [background, setBackground] = useState('checker'), [smoothing, setSmoothing] = useState(true)
  const view = useRef({ fit: 1, zoom: 1, pan: { x: 0, y: 0 } })
  const [fullscreen, setFullscreen] = useState(false)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(surface.current!); return () => observer.disconnect() }, [])
  useEffect(() => { setSplit(50); setPan({ x: 0, y: 0 }); setZoom(1) }, [source])
  useEffect(() => { const changed = () => setFullscreen(document.fullscreenElement === container.current); document.addEventListener('fullscreenchange', changed); return () => document.removeEventListener('fullscreenchange', changed) }, [])
  const geometry = previewGeometry(source.width, source.height, options)
  const fit = Math.min(1, Math.max(1, size.width - 32) / geometry.width, Math.max(1, size.height - 32) / geometry.height)
  const scale = fit * zoom
  view.current = { fit, zoom, pan }
  useEffect(() => {
    const node = surface.current!
    function wheel(event: WheelEvent) {
      if (!event.deltaY) return
      event.preventDefault()
      const current = view.current, rect = node.getBoundingClientRect()
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1)
      const oldScale = current.fit * current.zoom, nextScale = Math.max(0.05, Math.min(32, oldScale * Math.exp(-Math.max(-1000, Math.min(1000, delta)) * 0.002)))
      const ratio = nextScale / oldScale, x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2
      const nextPan = { x: x - (x - current.pan.x) * ratio, y: y - (y - current.pan.y) * ratio }
      view.current = { fit: current.fit, zoom: nextScale / current.fit, pan: nextPan }
      setZoom(nextScale / current.fit); setPan(nextPan)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [])

  function imageStyle(width: number, height: number, original = false) { return { position: 'absolute' as const, width: width * scale, height: height * scale, left: '50%', top: '50%', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))${original ? ` scale(${options.flipX ? -1 : 1}, ${options.flipY ? -1 : 1}) rotate(${options.rotate}deg)` : ''}`, objectFit: 'fill' as const, maxWidth: 'none', pointerEvents: 'none' as const, imageRendering: smoothing ? 'auto' as const : 'pixelated' as const } }

  return <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
    <Card size="sm" ref={container} data-image-comparison-card className={cn('min-w-0 gap-0 bg-background', fullscreen && 'h-dvh')}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-3"><CardTitle role="heading" aria-level={2}>Pratinjau</CardTitle><div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Perkecil tampilan" title="Perkecil tampilan" disabled={scale <= 0.05} onClick={() => setZoom(value => Math.max(0.05 / fit, value / 1.5))}><ZoomOutIcon /></Button><span className="min-w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span><Button variant="ghost" size="icon-sm" aria-label="Perbesar tampilan" title="Perbesar tampilan" disabled={scale >= 32} onClick={() => setZoom(value => Math.min(32 / fit, value * 1.5))}><ZoomInIcon /></Button>
        <Hint text="Sesuaikan gambar dengan kanvas"><Button variant="ghost" size="icon-sm" aria-label="Pas" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><ScanLineIcon /></Button></Hint><Hint text="Tampilkan ukuran piksel asli (100%)"><Button variant="ghost" size="icon-sm" aria-label="Ukuran asli 100%" onClick={() => { setZoom(1 / fit); setPan({ x: 0, y: 0 }) }}><FocusIcon /></Button></Hint><Button variant="ghost" size="icon-sm" aria-label={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh pembanding'} title={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void container.current?.requestFullscreen().catch(() => {}) }}>{fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}</Button>
        <SelectInput label="Latar kanvas" icon={SquareDashedIcon} size="sm" className="w-36" value={background} onValueChange={setBackground} options={[{ value: 'checker', label: 'Transparansi' }, { value: 'light', label: 'Putih' }, { value: 'dark', label: 'Gelap' }]} />
        <Hint text="Smoothing: haluskan piksel saat diperbesar. Hanya mengubah pratinjau."><Toggle size="icon-sm" variant="soft" aria-label="Smoothing pratinjau" pressed={smoothing} onPressedChange={setSmoothing}><WavesIcon /></Toggle></Hint>
        <Hint text="Scroll di atas gambar untuk zoom ke posisi kursor. Tarik gambar untuk menggeser. Klik dua kali pembatas untuk kembali ke tengah."><Button variant="ghost" size="icon-sm" aria-label="Petunjuk pratinjau"><InfoIcon /></Button></Hint>
      </div></CardHeader>
      <CardContent className="min-h-0 min-w-0 flex-1 px-0">
        <div ref={surface} data-background={background} className={cn('image-comparison relative min-w-0 touch-none overflow-hidden border-y border-border', fullscreen ? 'h-full' : 'h-[clamp(20rem,calc(100dvh-25rem),42rem)]')} onPointerDown={event => { if ((event.target as HTMLElement).closest('[data-comparison-divider]')) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y } }} onPointerMove={event => { if (drag.current) setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y }) }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
          <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}><img src={source.url} alt="Gambar asli" style={imageStyle(geometry.sourceWidth, geometry.sourceHeight, true)} draggable={false} /></div>
          <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>{result && <img src={result.url} alt="Hasil edit" style={imageStyle(geometry.width, geometry.height)} draggable={false} />}</div>
          <ComparisonDivider value={split} onValueChange={setSplit} />
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-1 items-center gap-4 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><div className="flex flex-col gap-2"><p className="text-xl font-semibold tabular-nums">{formatFileSize(source.file.size)}</p><p className="text-xs text-muted-foreground">{source.width} × {source.height} px</p></div>{summary}</CardFooter>
    </Card>
    {children}
  </div>
}
