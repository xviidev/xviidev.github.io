import { PDFDocument, EncryptedPDFError, PDFDict, PDFName } from 'pdf-lib'
import { zipSync } from 'fflate'
import { MAX_PAGES, MAX_OUTPUT_BYTES, pagesFromRange, pdfName, splitGroups, validateFiles } from './options.ts'
import type { SplitMode } from './options.ts'
export type PdfInput = { file: File; range: string }
export type Output = { bytes: Uint8Array<ArrayBuffer>; name: string; type: string; pages: number; count: number }
export async function openPdf(file: Pick<File, 'arrayBuffer' | 'size'>) {
  validateFiles([file])
  let doc: PDFDocument
  try { doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }) }
  catch (error) {
    if (error instanceof EncryptedPDFError || /Input document to.*is encrypted/.test((error as Error).message)) throw new Error('PDF terenkripsi belum didukung. Gunakan salinan PDF tanpa proteksi.')
    throw new Error('PDF rusak atau tidak dapat dibaca. Pilih dokumen PDF yang valid.')
  }
  if (!doc.getPageCount() || doc.getPageCount() > MAX_PAGES) throw new Error(`PDF harus memiliki 1–${MAX_PAGES} halaman.`)
  // Page copies cannot preserve the AcroForm field tree. Reject these documents
  // instead of producing a PDF with missing values or broken interactive fields.
  const form = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)
  const hasWidgets = doc.getPages().some(page => page.node.Annots()?.asArray().some(ref => {
    const annotation = doc.context.lookup(ref)
    return annotation instanceof PDFDict && annotation.get(PDFName.of('Subtype')) === PDFName.of('Widget')
  }))
  if (form?.has(PDFName.of('XFA')) || hasWidgets || doc.getForm().getFields().length) throw new Error('PDF ini memiliki formulir interaktif atau tanda tangan. Gunakan salinan PDF statis agar isinya tetap utuh.')
  return doc
}
function bounded(bytes: Uint8Array) {
  if (bytes.length > MAX_OUTPUT_BYTES) throw new Error('Hasil melebihi 256 MB. Pilih lebih sedikit file atau halaman.')
  return new Uint8Array(bytes)
}
export async function mergePdfs(inputs: PdfInput[], progress: (value: string) => void = () => {}): Promise<Output> {
  validateFiles(inputs.map(input => input.file))
  if (inputs.length < 2) throw new Error('Tambahkan minimal dua PDF untuk digabung.')
  const output = await PDFDocument.create()
  for (const [i, input] of inputs.entries()) {
    progress(`Menggabungkan file ${i + 1} dari ${inputs.length}…`)
    const doc = await openPdf(input.file), pages = pagesFromRange(input.range, doc.getPageCount())
    if (output.getPageCount() + pages.length > MAX_PAGES) throw new Error(`Hasil maksimal ${MAX_PAGES} halaman.`)
    const copies = await output.copyPages(doc, pages)
    for (const page of copies) output.addPage(page)
  }
  progress('Menyiapkan PDF…')
  return { bytes: bounded(await output.save()), name: 'gabungan.pdf', type: 'application/pdf', pages: output.getPageCount(), count: 1 }
}
export async function splitPdf(file: File, mode: SplitMode, range: string, chunkSize: number, progress: (value: string) => void = () => {}): Promise<Output> {
  const doc = await openPdf(file), groups = splitGroups(doc.getPageCount(), mode, range, chunkSize)
  const files: Record<string, Uint8Array> = {}, base = pdfName(file.name)
  let bytesTotal = 0
  for (const [i, pages] of groups.entries()) {
    progress(`Memisahkan bagian ${i + 1} dari ${groups.length}…`)
    const output = await PDFDocument.create(), copies = await output.copyPages(doc, pages)
    for (const page of copies) output.addPage(page)
    const bytes = bounded(await output.save())
    bytesTotal += bytes.length
    if (bytesTotal > MAX_OUTPUT_BYTES) throw new Error('Total hasil melebihi 256 MB. Pilih lebih sedikit halaman.')
    files[`${base}-bagian-${String(i + 1).padStart(3, '0')}.pdf`] = bytes
  }
  const names = Object.keys(files), single = names.length === 1
  return { bytes: bounded(single ? files[names[0]] : zipSync(files, { level: 0 })), name: single ? names[0] : `${base}-terpisah.zip`, type: single ? 'application/pdf' : 'application/zip', pages: groups.reduce((sum, pages) => sum + pages.length, 0), count: groups.length }
}
