import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { bars, geometry } from './barcode.ts'
import type { Appearance, Code } from './barcode.ts'

// Use vector bars, preserving relative module widths and quiet zones on paper.
export async function pdfBytes(codes: Code[], appearance: Appearance): Promise<Uint8Array> {
  if (!codes.length) throw new Error('Belum ada barcode untuk dicetak.')
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Courier)
  let page = document.addPage([595.28, 841.89]), top = 805.89
  for (const code of codes) {
    const box = geometry(code, appearance)
    const scale = Math.min(0.75, (595.28 - 72) / box.width)
    const height = box.height * scale
    if (top - height < 36) { page = document.addPage([595.28, 841.89]); top = 805.89 }
    const left = (595.28 - box.width * scale) / 2
    for (const bar of bars(code, appearance)) page.drawRectangle({ x: left + bar.x * scale, y: top - (box.quiet + appearance.height) * scale, width: bar.width * scale, height: appearance.height * scale, color: rgb(0, 0, 0) })
    if (appearance.showText) {
      const size = 16 * scale
      page.drawText(code.value, { x: (595.28 - font.widthOfTextAtSize(code.value, size)) / 2, y: top - (box.quiet + appearance.height + 20) * scale, size, font })
    }
    top -= height + 16
  }
  return document.save()
}
