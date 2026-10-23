import { PDFDocument, rgb } from 'pdf-lib'
import type { PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PrintModel, FontKey } from './print-layout.ts'
import { PT_PER_MM } from './print-layout.ts'
import type { LabelSettings } from './labels.ts'

export async function generatePdf(model: PrintModel, s: LabelSettings, loadBytes: (key: FontKey) => Promise<Uint8Array>): Promise<Uint8Array> {
  if (model.overflow.length || model.unsupported.length) throw new Error('Perbaiki teks yang tidak muat atau karakter yang tidak didukung sebelum membuat PDF.')
  if (!model.pages.length) throw new Error('Tambahkan data label terlebih dahulu.')
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('Label siap cetak')
  pdf.setCreator('XVII Dev / Utilitas dokumen')
  const keys = new Set(model.pages.flatMap(page => page.flatMap(slot => slot.label.runs.map(run => run.key))))
  const fonts = new Map<FontKey, PDFFont>()
  for (const key of keys) fonts.set(key, await pdf.embedFont(await loadBytes(key), { subset: true }))
  const height = s.paperHeight * PT_PER_MM
  for (const slots of model.pages) {
    const page = pdf.addPage([s.paperWidth * PT_PER_MM, height])
    for (const slot of slots) {
      if (s.border) page.drawRectangle({ x: slot.x, y: height - slot.y - s.labelHeight * PT_PER_MM, width: s.labelWidth * PT_PER_MM, height: s.labelHeight * PT_PER_MM, borderWidth: 0.5, borderColor: rgb(0, 0, 0) })
      for (const run of slot.label.runs) {
        const x = slot.x + run.x, y = height - slot.y - run.baseline
        page.drawText(run.text, { x, y, size: run.size, font: fonts.get(run.key)!, color: rgb(0, 0, 0) })
        if (run.underline) page.drawLine({ start: { x, y: y - run.size * 0.12 }, end: { x: x + run.width, y: y - run.size * 0.12 }, thickness: Math.max(0.4, run.size / 18), color: rgb(0, 0, 0) })
      }
    }
  }
  return pdf.save()
}
