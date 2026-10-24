import { useEffect, useRef, useState } from 'react'
import { Empty, EmptyHeader, EmptyDescription } from '@xviidev/ui/components/empty'
import { display } from './lib/model'
import type { Point } from './lib/model'
export function SpeedChart({ download, upload, elapsed }: { download: Point[]; upload: Point[]; elapsed: number }) {
  const root = useRef<HTMLDivElement>(null), [width, setWidth] = useState(600)
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width))); observer.observe(root.current!); return () => observer.disconnect() }, [])
  const maxY = Math.max(1, ...download.map(p => p.mbps), ...upload.map(p => p.mbps)) * 1.1
  const maxX = Math.max(1, elapsed, ...download.map(p => p.seconds), ...upload.map(p => p.seconds))
  const x = (seconds: number) => 52 + seconds / maxX * (width - 68), y = (mbps: number) => 190 - mbps / maxY * 170
  function line(points: Point[]) { return points.map((point, i) => `${i ? 'L' : 'M'}${x(point.seconds).toFixed(2)},${y(point.mbps).toFixed(2)}`).join(' ') }
  const series = [{ points: download, label: 'Download', color: 'text-foreground', dash: undefined }, { points: upload, label: 'Upload', color: 'text-muted-foreground', dash: '5 4' }]
  return <div ref={root} className="min-w-0">
    {!download.length && !upload.length ? <Empty className="min-h-52 p-4"><EmptyHeader><EmptyDescription>Grafik muncul setelah sampel download atau upload tersedia.</EmptyDescription></EmptyHeader></Empty> : <svg role="img" aria-label="Grafik kecepatan download dan upload dalam Mbps" viewBox={`0 0 ${width} 220`} className="h-56 w-full overflow-visible">
      {[0, 0.5, 1].map(fraction => <g key={fraction}><line x1={52} x2={width - 16} y1={y(maxY * fraction)} y2={y(maxY * fraction)} stroke="currentColor" className="text-border" /><text x={44} y={y(maxY * fraction) + 4} textAnchor="end" fill="currentColor" className="text-muted-foreground" fontSize={11}>{display(maxY * fraction)}</text></g>)}
      <text x={52} y={12} fill="currentColor" className="text-muted-foreground" fontSize={11}>Mbps</text><text x={52} y={213} fill="currentColor" className="text-muted-foreground" fontSize={11}>0 dtk</text><text x={width - 16} y={213} fill="currentColor" className="text-muted-foreground" fontSize={11} textAnchor="end">{display(maxX)} dtk</text>
      {series.map(({ points, label, color, dash }) => <g key={label} className={color}>{points.length > 1 && <path data-series={label} d={line(points)} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray={dash} strokeLinejoin="round" />}{points.length > 0 && <circle cx={x(points.at(-1)!.seconds)} cy={y(points.at(-1)!.mbps)} r={3} fill="currentColor" />}</g>)}
    </svg>}
    <div className="mt-2 flex justify-center gap-5 text-xs text-muted-foreground">{series.map(item => <span key={item.label} className="flex items-center gap-2"><svg aria-hidden="true" width={20} height={8} className={item.color}><line x1={0} x2={20} y1={4} y2={4} stroke="currentColor" strokeWidth={2} strokeDasharray={item.dash} /></svg>{item.label}</span>)}</div>
  </div>
}
