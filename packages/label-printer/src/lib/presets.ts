import { Dexie } from 'dexie'
import type { Table } from 'dexie'
import { DEFAULT_SETTINGS } from './labels.ts'
import type { LabelSettings } from './labels.ts'
import { makeTemplate } from './rich-text.ts'
import type { RichDocument } from './rich-text.ts'
import { decodeTemplate } from './template-file.ts'

export interface DocumentPreset {
  id: string
  name: string
  description: string
  settings: LabelSettings
  document: RichDocument
  updatedAt: number
}
export class PresetDatabase extends Dexie {
  presets!: Table<DocumentPreset, string>
  preferences!: Table<{ key: string; value: string }, string>
  constructor(name = 'xviidev-label-printer') {
    super(name)
    this.version(1).stores({ presets: 'id, name, updatedAt', preferences: 'key' })
  }
}
export function initialPresets(): DocumentPreset[] {
  return [24, 21].map(count => ({
    id: `a4-${count}`, name: `A4 · ${count} label`,
    description: `3 kolom × ${count / 3} baris. Setiap label 63,5 × ${count === 24 ? '33,9' : '38,1'} mm. Cocok untuk nama dan alamat.`,
    settings: { ...DEFAULT_SETTINGS, ...(count === 21 ? { labelHeight: 38.1, marginTop: 15, marginBottom: 15 } : {}) },
    document: makeTemplate(), updatedAt: 0,
  }))
}
export function validatePreset(value: DocumentPreset): DocumentPreset {
  const name = value.name.trim(), description = value.description.trim()
  if (!name || name.length > 80) throw new Error('Isi nama preset, maksimal 80 karakter.')
  if (description.length > 240) throw new Error('Keterangan maksimal 240 karakter.')
  const decoded = decodeTemplate(JSON.stringify({ version: 1, document: value.document, settings: value.settings }))
  return { id: value.id, name, description, settings: decoded.settings, document: decoded.document, updatedAt: value.updatedAt }
}
export async function loadPresets(db: PresetDatabase) {
  // Seed only a completely new database. Deleted or edited examples must stay that way.
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
