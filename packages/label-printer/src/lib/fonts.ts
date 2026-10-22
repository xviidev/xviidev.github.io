import fontkit from '@pdf-lib/fontkit'
import type { Font } from '@pdf-lib/fontkit'
import type { FontKey, Measure } from './print-layout.ts'
import { fontKey } from './print-layout.ts'
import type { RichDocument } from './rich-text.ts'
import type { LabelSettings } from './labels.ts'
import sans300normal from '@fontsource/noto-sans/files/noto-sans-latin-300-normal.woff?url'
import sans300italic from '@fontsource/noto-sans/files/noto-sans-latin-300-italic.woff?url'
import sans400normal from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?url'
import sans400italic from '@fontsource/noto-sans/files/noto-sans-latin-400-italic.woff?url'
import sans500normal from '@fontsource/noto-sans/files/noto-sans-latin-500-normal.woff?url'
import sans500italic from '@fontsource/noto-sans/files/noto-sans-latin-500-italic.woff?url'
import sans600normal from '@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff?url'
import sans600italic from '@fontsource/noto-sans/files/noto-sans-latin-600-italic.woff?url'
import sans700normal from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?url'
import sans700italic from '@fontsource/noto-sans/files/noto-sans-latin-700-italic.woff?url'
import mono300normal from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-300-normal.woff?url'
import mono300italic from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-300-italic.woff?url'
import mono400normal from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff?url'
import mono400italic from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff?url'
import mono500normal from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff?url'
import mono500italic from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-italic.woff?url'
import mono600normal from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff?url'
import mono600italic from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-italic.woff?url'
import mono700normal from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url'
import mono700italic from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-italic.woff?url'
const urls: Record<FontKey, string> = {
  'sans:300:normal': sans300normal,
  'sans:300:italic': sans300italic,
  'sans:400:normal': sans400normal,
  'sans:400:italic': sans400italic,
  'sans:500:normal': sans500normal,
  'sans:500:italic': sans500italic,
  'sans:600:normal': sans600normal,
  'sans:600:italic': sans600italic,
  'sans:700:normal': sans700normal,
  'sans:700:italic': sans700italic,
  'mono:300:normal': mono300normal,
  'mono:300:italic': mono300italic,
  'mono:400:normal': mono400normal,
  'mono:400:italic': mono400italic,
  'mono:500:normal': mono500normal,
  'mono:500:italic': mono500italic,
  'mono:600:normal': mono600normal,
  'mono:600:italic': mono600italic,
  'mono:700:normal': mono700normal,
  'mono:700:italic': mono700italic,
}
export interface LoadedFont { font: Font; bytes: Uint8Array }
const cache = new Map<FontKey, Promise<LoadedFont>>()
export function getFont(key: FontKey): Promise<LoadedFont> {
  let result = cache.get(key)
  if (!result) {
    result = fetch(urls[key]).then(async response => {
      if (!response.ok) throw new Error('Font gagal dimuat. Coba kembali setelah koneksi tersedia.')
      const bytes = new Uint8Array(await response.arrayBuffer())
      return { bytes, font: fontkit.create(bytes) }
    }).catch(error => { cache.delete(key); throw error })
    cache.set(key, result)
  }
  return result
}
export async function loadFonts(documents: RichDocument[], settings: LabelSettings): Promise<Map<FontKey, LoadedFont>> {
  const keys = new Set(documents.flatMap(doc => doc.flatMap(line => line.runs.map(run => fontKey(run, settings)))))
  return new Map(await Promise.all([...keys].map(async key => [key, await getFont(key)] as const)))
}
export function makeMeasure(fonts: Map<FontKey, LoadedFont>): Measure {
  return (text, size, key) => {
    const font = fonts.get(key)!.font
    const glyphs = font.layout(text).glyphs
    return {
      width: glyphs.reduce((width, glyph) => width + glyph.advanceWidth, 0) / font.unitsPerEm * size,
      ascent: font.ascent / font.unitsPerEm * size, descent: -font.descent / font.unitsPerEm * size,
      supported: [...text].every(char => /\s/.test(char) || font.hasGlyphForCodePoint(char.codePointAt(0)!)),
    }
  }
}
