import { Dexie } from 'dexie'
import type { Table } from 'dexie'
import { DEFAULT_SETTINGS, getLayout } from './labels.ts'
import type { LabelSettings } from './labels.ts'

export const PAPER_KEYS = ['paperWidth', 'paperHeight', 'labelWidth', 'labelHeight', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gapX', 'gapY'] as const
export type PaperSettings = Pick<LabelSettings, typeof PAPER_KEYS[number]>
export interface DocumentPreset {
  id: string
  name: string
  description: string
  settings: PaperSettings
  updatedAt: number
}
export function paperSettings(settings: PaperSettings): PaperSettings {
  return Object.fromEntries(PAPER_KEYS.map(key => [key, settings[key]])) as PaperSettings
}
export function applyPaperPreset(current: LabelSettings, paper: PaperSettings): LabelSettings {
  return { ...current, ...paperSettings(paper) }
}
export class PresetDatabase extends Dexie {
  presets!: Table<DocumentPreset, string>
  preferences!: Table<{ key: string; value: string }, string>
  constructor(name = 'xviidev-label-printer') {
    super(name)
    this.version(1).stores({ presets: 'id, name, updatedAt', preferences: 'key' })
    this.version(2).stores({ presets: 'id, name, updatedAt', preferences: 'key', legacyPresets: 'id' }).upgrade(async transaction => {
      const old = await transaction.table('presets').toArray()
      // Keep a recovery copy of previous presets; new presets contain geometry only.
      await transaction.table('legacyPresets').bulkPut(old)
      await transaction.table('presets').bulkPut(old.map(value => ({ id: value.id, name: value.name, description: value.description, settings: paperSettings(value.settings), updatedAt: value.updatedAt })))
    })
  }
}
export function initialPresets(): DocumentPreset[] {
  return [24, 21].map(count => ({
    id: `a4-${count}`, name: `A4 · ${count} label`,
    description: `3 kolom × ${count / 3} baris. Label 63,5 × ${count === 24 ? '33,9' : '38,1'} mm.`,
    settings: paperSettings({ ...DEFAULT_SETTINGS, ...(count === 21 ? { labelHeight: 38.1, marginTop: 15, marginBottom: 15 } : {}) }), updatedAt: 0,
  }))
}
export function validatePreset(value: DocumentPreset): DocumentPreset {
  if (typeof value.name !== 'string' || typeof value.description !== 'string') throw new Error('Nama dan keterangan preset harus berupa teks.')
  const name = value.name.trim(), description = value.description.trim()
  if (!name || name.length > 80) throw new Error('Isi nama preset, maksimal 80 karakter.')
  if (description.length > 240) throw new Error('Keterangan maksimal 240 karakter.')
  const settings = paperSettings(value.settings)
  if (PAPER_KEYS.some(key => typeof settings[key] !== 'number' || !Number.isFinite(settings[key]))) throw new Error('Ukuran kertas tidak valid.')
  const errors = getLayout({ ...DEFAULT_SETTINGS, ...settings, padding: 0 }).errors
  if (errors.length) throw new Error(`Ukuran kertas tidak valid. ${errors.join(' ')}`)
  return { id: value.id, name, description, settings, updatedAt: value.updatedAt }
}
export function decodePaperPreset(text: string): DocumentPreset {
  const value = JSON.parse(text)
  if (![1, 2].includes(value?.version) || !value.settings) throw new Error('Gunakan berkas preset kertas yang valid.')
  return validatePreset({ id: crypto.randomUUID(), name: value.name ?? 'Preset impor', description: value.description ?? '', settings: value.settings, updatedAt: Date.now() })
}
export async function loadPresets(db: PresetDatabase) {
  await db.transaction('rw', db.presets, db.preferences, async () => {
    if (!(await db.preferences.get('initialized'))) {
      if (await db.presets.count() === 0) await db.presets.bulkAdd(initialPresets())
      await db.preferences.put({ key: 'initialized', value: '1' })
    }
  })
  return db.presets.orderBy('name').toArray()
}
export async function savePreset(db: PresetDatabase, value: DocumentPreset) {
  const validated = validatePreset(value)
  await db.transaction('rw', db.presets, db.preferences, async () => {
    await db.presets.put(validated)
    await db.preferences.put({ key: 'active', value: validated.id })
  })
  return validated
}
export async function removePreset(db: PresetDatabase, id: string) {
  await db.transaction('rw', db.presets, db.preferences, async () => {
    if (await db.presets.count() <= 1) throw new Error('Sisakan minimal satu preset. Buat preset lain sebelum menghapus ini.')
    await db.presets.delete(id)
    if ((await db.preferences.get('active'))?.value === id) await db.preferences.delete('active')
  })
}
export const presetDatabase = new PresetDatabase()
