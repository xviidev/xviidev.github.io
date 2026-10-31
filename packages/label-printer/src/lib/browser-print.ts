/** Print only the prepared sheets, at their physical size, without the application UI. */
export async function printInBrowser(pages: string[], width: number, height: number): Promise<void> {
  const frame = document.createElement('iframe')
  frame.title = 'Label siap cetak'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0'
  document.body.append(frame)
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => { clearTimeout(cleanupTimer); frame.remove() }
  try {
    const doc = frame.contentDocument, view = frame.contentWindow
    if (!doc || !view || typeof view.print !== 'function') throw new Error('Printing unavailable')
    doc.documentElement.lang = 'id'
    doc.title = 'Label siap cetak'
    const style = doc.createElement('style')
    style.textContent = `@page{size:${width}mm ${height}mm;margin:0}html,body{margin:0;padding:0}img{display:block;width:${width}mm;height:${height}mm;break-inside:avoid;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}`
    doc.head.append(style)
    await Promise.all(pages.map((page, index) => new Promise<void>((resolve, reject) => {
      const img = doc.createElement('img')
      img.alt = `Lembar ${index + 1}`
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Print image failed'))
      img.src = `data:image/png;base64,${page}`
      doc.body.append(img)
    })))
    // Keep images available while non-blocking print dialogs (e.g. Safari) are open.
    view.addEventListener('afterprint', () => { clearTimeout(cleanupTimer); cleanupTimer = setTimeout(cleanup, 60000) }, { once: true })
    cleanupTimer = setTimeout(cleanup, 10 * 60000)
    view.focus()
    view.print()
  } catch (error) { cleanup(); throw error }
}
