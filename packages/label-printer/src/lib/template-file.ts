import { DEFAULT_SETTINGS, getLayout } from './labels.ts'
import type { LabelSettings } from './labels.ts'
import { isRichDocument } from './rich-text.ts'
import { isLabelBarcode } from './label-barcode.ts'

export function decodeTemplate(text: string) {
  const value = JSON.parse(text)
  if (value?.version !== 1 || !isRichDocument(value.document) || !value.settings || typeof value.settings !== 'object') throw new Error('Berkas template tidak valid atau versinya belum didukung.')
  const settings = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof LabelSettings)[]) {
    const incoming = value.settings[key]
    if (typeof incoming !== typeof DEFAULT_SETTINGS[key]) throw new Error('Pengaturan template tidak lengkap atau tidak valid.')
    if (typeof incoming === 'number' && !Number.isFinite(incoming)) throw new Error('Ukuran pada template tidak valid.')
    Object.assign(settings, { [key]: incoming })
  }
  if (!['sans', 'mono'].includes(settings.font) || !['left', 'center', 'right'].includes(settings.align) || !['top', 'center', 'bottom'].includes(settings.vertical) || getLayout(settings).errors.length) throw new Error('Ukuran atau pilihan font pada template tidak valid.')
  if (value.settings.barcode !== undefined) {
    if (!isLabelBarcode(value.settings.barcode)) throw new Error('Pengaturan barcode pada desain tidak valid.')
    settings.barcode = { ...value.settings.barcode }
  }
  return { document: value.document, settings }
}
