import { drawRuns } from '../components/CanvasSheet'
import { PT_PER_MM } from './print-layout'
import type { PrintModel, FontKey } from './print-layout'
import type { LoadedFont } from './fonts'
import type { LabelSettings } from './labels'

export async function agentRequest(route: string, body?: unknown) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), body ? 300000 : 10000)
  try {
    const response = await fetch(`http://127.0.0.1:17831/v1/${route}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(await response.text())
    return await response.json() as unknown
  } finally { clearTimeout(timer) }
}

export function rasterPages(model: PrintModel, s: LabelSettings, fonts: Map<FontKey, LoadedFont>): string[] {
  if (model.pages.length > 100) throw new Error('Maksimal 100 halaman per pekerjaan agen.')
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(s.paperWidth / 25.4 * 300)
  canvas.height = Math.ceil(s.paperHeight / 25.4 * 300)
  if (canvas.width * canvas.height > 40000000) throw new Error('Ukuran kertas terlalu besar untuk agen.')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Gambar cetak gagal dibuat.')
  return model.pages.map(slots => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(canvas.width / (s.paperWidth * PT_PER_MM), canvas.height / (s.paperHeight * PT_PER_MM))
    for (const slot of slots) {
      ctx.save(); ctx.translate(slot.x, slot.y)
      if (s.border) { ctx.strokeStyle = '#222'; ctx.lineWidth = 0.5; ctx.strokeRect(0, 0, s.labelWidth * PT_PER_MM, s.labelHeight * PT_PER_MM) }
      const barcode = slot.label.barcode
      if (barcode) {
        ctx.fillStyle = 'white'; ctx.fillRect(barcode.x, barcode.y, barcode.width, barcode.height)
        ctx.fillStyle = barcode.color
        for (const bar of barcode.bars) ctx.fillRect(bar.x, barcode.barY, bar.width, barcode.barHeight)
      }
      drawRuns(ctx, slot.label.runs, fonts)
      ctx.restore()
    }
    return canvas.toDataURL('image/png').split(',')[1]
  })
}
