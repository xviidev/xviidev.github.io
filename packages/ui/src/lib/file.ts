export function formatFileSize(bytes: number) {
  const unit = bytes >= 1024 * 1024 ? 'MB' : bytes >= 1024 ? 'KB' : 'B'
  const value = bytes / (unit === 'MB' ? 1024 * 1024 : unit === 'KB' ? 1024 : 1)
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)} ${unit}`
}

export function validateFile(file: { name: string; size: number; type: string }, accept = '', maxSize?: number) {
  if (!file.size) return 'File kosong. Pilih file lain.'
  if (maxSize && file.size > maxSize) return `Ukuran file maksimal ${formatFileSize(maxSize)}.`
  const types = accept.toLowerCase().split(',').map(value => value.trim()).filter(Boolean)
  if (types.length && !types.some(type => type.startsWith('.') ? file.name.toLowerCase().endsWith(type) : type.endsWith('/*') ? file.type.toLowerCase().startsWith(type.slice(0, -1)) : file.type.toLowerCase() === type)) return 'Format file tidak didukung. Pilih file sesuai jenis yang diminta.'
  return ''
}
