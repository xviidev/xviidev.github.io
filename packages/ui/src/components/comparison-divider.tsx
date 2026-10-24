import { useRef, useState } from 'react'
import { cn } from '../lib/utils'
import { CodeIcon } from '../lib/icons'
import { Button } from './button'

/** A full-height drag target with a visible grip for image comparisons. */
export function ComparisonDivider({ value, onValueChange }: { value: number; onValueChange: (value: number) => void }) {
  const root = useRef<HTMLDivElement>(null), pointer = useRef<{ id: number; offset: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const position = Math.max(0, Math.min(100, value))
  function finish() { pointer.current = null; setDragging(false) }
  return <div ref={root} data-comparison-divider className="pointer-events-none absolute inset-0">
    <span aria-hidden="true" className="absolute inset-y-0 w-px -translate-x-1/2 bg-(--comparison-handle) shadow-[1px_0_0_color-mix(in_oklch,var(--comparison-handle-foreground)_60%,transparent)]" style={{ left: `${position}%` }} />
    <Button variant="ghost" role="slider" aria-label="Pembatas perbandingan" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position)} aria-valuetext={`${Math.round(position)}% gambar asli`} title="Tarik untuk membandingkan. Klik dua kali untuk kembali ke tengah." data-dragging={dragging || undefined}
      className="group/divider pointer-events-auto absolute inset-y-0 h-full w-11 -translate-x-1/2 touch-none cursor-ew-resize data-[dragging=true]:cursor-grabbing rounded-none border-0 p-0 transition-none hover:bg-transparent focus-visible:border-transparent focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0"
      style={{ left: `${position}%` }}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        event.stopPropagation(); event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId)
        const rect = root.current!.getBoundingClientRect()
        pointer.current = { id: event.pointerId, offset: event.clientX - rect.left - rect.width * position / 100 }; setDragging(true)
      }}
      onPointerMove={event => {
        if (pointer.current?.id !== event.pointerId) return
        event.stopPropagation(); const rect = root.current!.getBoundingClientRect()
        onValueChange(Math.max(0, Math.min(100, (event.clientX - rect.left - pointer.current.offset) / rect.width * 100)))
      }}
      onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}
      onDoubleClick={() => onValueChange(50)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const increment = event.shiftKey || event.key.startsWith('Page') ? 10 : 5
        onValueChange(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : Math.max(0, Math.min(100, position + (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(event.key) ? -increment : increment))))
      }}>
      <span aria-hidden="true" className={cn('flex size-6 items-center justify-center rounded-none border border-(--comparison-handle-foreground)/20 bg-(--comparison-handle) text-(--comparison-handle-foreground) shadow-sm transition-colors duration-100 group-active/divider:bg-(--comparison-handle-active) group-focus-visible/divider:bg-(--comparison-handle-active) motion-reduce:transition-none', dragging && 'bg-(--comparison-handle-active)')}><CodeIcon className="size-3.5" /></span>
    </Button>
  </div>
}
