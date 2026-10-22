import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PresetDatabase, initialPresets, loadPresets, savePreset, removePreset } from './presets.ts'

function database() { return new PresetDatabase(`test-presets-${crypto.randomUUID()}`) }
test('presets and active selection survive reopening the local database', async () => {
  const db = database()
  try {
    assert.equal((await loadPresets(db)).length, 2)
    const value = { ...initialPresets()[0], id: 'custom', name: 'Label toko', description: 'Alamat pengiriman', updatedAt: 123 }
    await savePreset(db, value)
    db.close()
    await db.open()
    assert.deepEqual(await db.presets.get('custom'), value)
    assert.equal((await db.preferences.get('active'))?.value, 'custom')
    assert.equal((await loadPresets(db)).length, 3)
    assert.deepEqual(Object.keys((await db.presets.get('custom'))!).sort(), ['description','document','id','name','settings','updatedAt'])
  } finally { await db.delete() }
})
test('editing and deleting initial presets never resets them on initialization', async () => {
  const db = database()
  try {
    await loadPresets(db)
    await savePreset(db, { ...initialPresets()[0], name: 'Ukuran pribadi' })
    await removePreset(db, 'a4-21')
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
