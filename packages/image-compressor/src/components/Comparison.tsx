import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@xviidev/ui/components/card'
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon, MinimizeIcon } from '@xviidev/ui/lib/icons'
import { formatFileSize } from '@xviidev/ui/lib/file'
import type { Result, Source } from '../lib/client'

export function Comparison({ source, result, busy, error, summary, children }: { source: Source; result: Result | null; busy: boolean; error: string; summary: ReactNode; children: ReactNode }) {
  const surface = useRef<HTMLDivElement>(null), container = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [size, setSize] = useState({ width: 500, height: 400 })
  const [fullscreen, setFullscreen] = useState(false)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  useEffect(() => { const node = surface.current!; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect() }, [])
  useEffect(() => { setPan({ x: 0, y: 0 }); setZoom(1) }, [source])
  useEffect(() => { const changed = () => setFullscreen(document.fullscreenElement === container.current); document.addEventListener('fullscreenchange', changed); return () => document.removeEventListener('fullscreenchange', changed) }, [])
  const fit = Math.min(1, Math.max(1, size.width - 32) / Math.max(source.width, result?.width ?? 0), Math.max(1, size.height - 32) / Math.max(source.height, result?.height ?? 0))
  const scale = fit * zoom
  function preview(edited: boolean) {
    const width = edited ? result?.width ?? source.width : source.width, height = edited ? result?.height ?? source.height : source.height
    return <div ref={edited ? undefined : surface} className="image-comparison relative h-[clamp(16rem,45dvh,32rem)] min-w-0 touch-none overflow-hidden border-y border-border" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y } }} onPointerMove={event => { if (drag.current) setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y }) }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      {(!edited || result) && <img src={edited ? result!.url : source.url} alt={edited ? 'Hasil edit' : 'Gambar asli'} draggable={false} style={{ position: 'absolute', width: width * scale, height: height * scale, left: '50%', top: '50%', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`, objectFit: 'contain', maxWidth: 'none', pointerEvents: 'none' }} />}
      {edited && !result && <p role="status" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">{busy ? 'Memproses…' : error ? 'Periksa pengaturan di bawah.' : 'Menyiapkan hasil…'}</p>}
    </div>
  }
  return <div ref={container} className="min-w-0 bg-background" data-image-comparison-card>
    <div className="mb-3 flex flex-wrap items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Perkecil tampilan" title="Perkecil tampilan" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value / 1.5))}><ZoomOutIcon /></Button><span className="min-w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span><Button variant="ghost" size="icon-sm" aria-label="Perbesar tampilan" title="Perbesar tampilan" disabled={zoom >= 16} onClick={() => setZoom(value => Math.min(16, value * 1.5))}><ZoomInIcon /></Button>
      <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Pas</Button><Button variant="ghost" size="sm" onClick={() => { setZoom(1 / fit); setPan({ x: 0, y: 0 }) }}>100%</Button><Button variant="ghost" size="icon-sm" aria-label={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh pembanding'} title={fullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void container.current?.requestFullscreen().catch(() => {}) }}>{fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}</Button>
    </div>
    <div className="grid items-start gap-4 md:grid-cols-2">
      <Card size="sm" className="min-w-0 gap-0"><CardHeader className="pb-3"><CardTitle role="heading" aria-level={2}>Gambar asli</CardTitle></CardHeader><CardContent className="px-0">{preview(false)}</CardContent><CardFooter className="flex flex-wrap justify-between gap-2 pt-4"><p className="font-semibold tabular-nums">{formatFileSize(source.file.size)}</p><p className="text-xs text-muted-foreground">{source.width} × {source.height} px</p></CardFooter></Card>
      <div className="flex min-w-0 flex-col gap-4"><Card size="sm" className="min-w-0 gap-0"><CardHeader className="pb-3"><CardTitle role="heading" aria-level={2}>Hasil edit</CardTitle></CardHeader><CardContent className="px-0">{preview(true)}</CardContent><CardFooter className="block pt-4">{summary}</CardFooter></Card>{children}</div>
    </div>
  </div>
}
