import { useEffect, useRef, useState } from 'react'
import { Button } from '@xviidev/ui/components/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@xviidev/ui/components/card'
import { Badge } from '@xviidev/ui/components/badge'
import { Slider } from '@xviidev/ui/components/slider'
import { Field, FieldLabel } from '@xviidev/ui/components/field'
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon, ArrowLeftRightIcon } from '@xviidev/ui/lib/icons'
import type { Result, Source } from '../lib/client'

export function Comparison({ source, left, right, busyA, busyB }: { source: Source; left: Result | null; right: Result | null; busyA: boolean; busyB: boolean }) {
  const surface = useRef<HTMLDivElement>(null), card = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(50), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [size, setSize] = useState({ width: 500, height: 500 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  useEffect(() => { const node = surface.current!; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect() }, [])
  useEffect(() => { setPan({ x: 0, y: 0 }); setZoom(1); setSplit(50) }, [source])
  const fit = Math.min(size.width / source.width, size.height / source.height) * 0.95
  const scale = fit * zoom
  const style = { position: 'absolute' as const, width: source.width * scale, height: source.height * scale, left: '50%', top: '50%', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`, objectFit: 'contain' as const, maxWidth: 'none', pointerEvents: 'none' as const }
  function divide(clientX: number) { const rect = surface.current!.getBoundingClientRect(); setSplit(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100))) }
  return <Card ref={card} data-image-comparison-card className="min-w-0 md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:sticky xl:top-20">
    <CardHeader><CardTitle role="heading" aria-level={2}>Bandingkan gambar</CardTitle><CardDescription>Geser pembatas untuk melihat detail. Tarik gambar untuk menggeser tampilan.</CardDescription></CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" aria-label="Perkecil tampilan" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value / 1.5))}><ZoomOutIcon /></Button><span className="min-w-12 text-center text-xs">{Math.round(scale * 100)}%</span><Button variant="ghost" size="icon-sm" aria-label="Perbesar tampilan" disabled={zoom >= 16} onClick={() => setZoom(value => Math.min(16, value * 1.5))}><ZoomInIcon /></Button></div>
        <div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Pas</Button><Button variant="ghost" size="sm" onClick={() => { setZoom(1 / fit); setPan({ x: 0, y: 0 }) }}>100%</Button><Button variant="ghost" size="icon-sm" aria-label="Layar penuh pembanding" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void card.current?.requestFullscreen().catch(() => {}) }}><MaximizeIcon /></Button></div>
      </div>
      <div ref={surface} className="image-comparison relative h-[min(58vh,540px)] min-h-72 min-w-0 touch-none overflow-hidden border border-border" onPointerDown={event => { if ((event.target as HTMLElement).closest('button')) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y } }} onPointerMove={event => { if (drag.current) setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y }) }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <img src={left?.url ?? source.url} alt={left ? 'Hasil sisi A' : 'Sisi A belum siap; menampilkan gambar asli'} style={style} draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}><img src={right?.url ?? source.url} alt={right ? 'Hasil sisi B' : 'Sisi B belum siap; menampilkan gambar asli'} style={style} draggable={false} /></div>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-2"><Badge variant="secondary">A{busyA ? ' · memproses' : left ? '' : ' · belum siap'}</Badge><Badge variant="secondary">B{busyB ? ' · memproses' : right ? '' : ' · belum siap'}</Badge></div>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground" style={{ left: `${split}%` }}><Button variant="secondary" size="icon-sm" className="pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none cursor-ew-resize" aria-label="Geser pembatas gambar" title="Geser atau gunakan tombol panah" onPointerDown={event => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); divide(event.clientX) }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { event.stopPropagation(); divide(event.clientX) } }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setSplit(value => Math.max(0, Math.min(100, value + (event.key === 'ArrowLeft' ? -5 : 5)))) } }}><ArrowLeftRightIcon /></Button></div>
      </div>
      <Field><FieldLabel id="image-split-label">Pembanding A / B</FieldLabel><Slider aria-labelledby="image-split-label" value={[split]} min={0} max={100} step={1} onValueChange={value => setSplit(Array.isArray(value) ? value[0] : value)} /></Field>
      <p className="text-xs text-muted-foreground">Kedua sisi memakai posisi dan zoom yang sama. Gambar diunduh sesuai ukuran piksel hasil, tanpa pembatas pratinjau.</p>
    </CardContent>
  </Card>
}
