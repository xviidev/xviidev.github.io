import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { DEFAULT_SETTINGS } from './labels.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PresetDatabase, initialPresets, loadPresets, savePreset, removePreset, applyPaperPreset, paperSettings, PAPER_KEYS } from './presets.ts'

function database() { return new PresetDatabase(`test-presets-${crypto.randomUUID()}`) }
test('presets and active selection survive reopening the local database', async () => {
  const db = database()
  try {
    assert.equal((await loadPresets(db)).length, initialPresets().length)
    const value = { ...initialPresets()[0], id: 'custom', name: 'Label toko', description: 'Alamat pengiriman', updatedAt: 123 }
    await savePreset(db, value)
    db.close()
    await db.open()
    assert.deepEqual(await db.presets.get('custom'), value)
    assert.equal((await db.preferences.get('active'))?.value, 'custom')
    assert.equal((await loadPresets(db)).length, initialPresets().length + 1)
    assert.deepEqual(Object.keys((await db.presets.get('custom'))!).sort(), ['description','id','name','settings','updatedAt'])
  } finally { await db.delete() }
})
test('editing and deleting initial presets never resets them on initialization', async () => {
  const db = database()
  try {
    await loadPresets(db)
    await savePreset(db, { ...initialPresets()[0], name: 'Ukuran pribadi' })
    const all = await loadPresets(db)
    for (const item of all) {
      if (item.id !== initialPresets()[0].id) await removePreset(db, item.id)
    }
    const saved = await loadPresets(db)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].name, 'Ukuran pribadi')
    await assert.rejects(removePreset(db, saved[0].id), /minimal satu/)
  } finally { await db.delete() }
})
test('invalid preset changes are rejected without corrupting saved data', async () => {
  const db = database()
  try {
    await loadPresets(db)
    const initial = initialPresets()[0]
    await assert.rejects(savePreset(db, { ...initial, name: ' ' }), /nama preset/)
    await assert.rejects(savePreset(db, { ...initial, settings: { ...initial.settings, labelWidth: -1 } }), /tidak valid/)
    await assert.rejects(savePreset(db, { ...initial, description: 'a'.repeat(241) }), /240/)
    assert.deepEqual(await db.presets.get(initial.id), initial)
  } finally { await db.delete() }
})

test('paper presets preserve typography and never serialize text design', async () => {
  const db = database()
  try {
    await loadPresets(db)
    const current = { ...DEFAULT_SETTINGS, fontSize: 22, font: 'mono' as const, align: 'right' as const, offsetX: 3, padding: 1 }
    const changed = applyPaperPreset(current, initialPresets()[1].settings)
    assert.equal(changed.labelHeight, 38.1)
    for (const key of ['fontSize', 'font', 'align', 'offsetX', 'padding'] as const) assert.equal(changed[key], current[key])
    const value = { ...initialPresets()[0], settings: current, document: [{ runs: [{ text: 'Do not store this' }] }] }
    await savePreset(db, value)
    const saved = (await db.presets.get(value.id))!
    assert.deepEqual(Object.keys(saved.settings).sort(), [...PAPER_KEYS].sort())
    assert.equal('document' in saved, false)
  } finally { await db.delete() }
})
test('v1 database upgrades to geometry-only presets with a recovery archive', async () => {
  const name = `test-presets-upgrade-${crypto.randomUUID()}`
  const old = new Dexie(name)
  old.version(1).stores({ presets: 'id, name, updatedAt', preferences: 'key' })
  const value = { id: 'mine', name: 'Ukuran lama', description: 'Stiker A4', settings: { ...DEFAULT_SETTINGS, fontSize: 18 }, document: [{ runs: [{ text: '{{1}}', weight: 700 }] }], updatedAt: 42 }
  await old.table('presets').put(value)
  await old.table('preferences').bulkPut([{ key: 'initialized', value: '1' }, { key: 'active', value: 'mine' }])
  old.close()
  const db = new PresetDatabase(name)
  try {
    const loaded = await loadPresets(db)
    assert.equal(loaded.length, 1)
    assert.deepEqual(loaded[0], { id: value.id, name: value.name, description: value.description, settings: paperSettings(value.settings), updatedAt: 42 })
    assert.deepEqual(await db.table('legacyPresets').get('mine'), value)
    assert.equal((await db.preferences.get('active'))?.value, 'mine')
  } finally { await db.delete() }
})
