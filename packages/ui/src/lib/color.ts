/** Canonical opaque sRGB HEX; accepts shorthand and pasted codes without #. */
export function normalizeHexColor(value: string): string | undefined {
  const hex = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(hex)) return '#' + [...hex.toLowerCase()].map(char => char + char).join('')
  if (/^[0-9a-f]{6}$/i.test(hex)) return '#' + hex.toLowerCase()
  return undefined
}
