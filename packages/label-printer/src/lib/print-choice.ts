export type PrintPreference = 'auto' | 'browser' | 'pdf'
export type PrintRoute = 'client' | 'browser' | 'pdf'
export interface PrintConnection { status: 'checking' | 'ready' | 'empty' | 'unavailable'; printers: string[] }
export interface PrintLimits { raster: boolean; client: boolean; browser: boolean }

export async function discoverPrinters(request: () => Promise<unknown>): Promise<PrintConnection> {
  try {
    const result = await request()
    if (!Array.isArray(result) || !result.every(name => typeof name === 'string' && name.trim().length > 0)) throw new Error('Invalid printer list')
    const printers = [...new Set(result as string[])]
    return { status: printers.length ? 'ready' : 'empty', printers }
  } catch { return { status: 'unavailable', printers: [] } }
}

export function choosePrinter(printers: string[], previous: string): string {
  if (previous) return printers.includes(previous) ? previous : ''
  return printers.length === 1 ? printers[0] : ''
}

export function printLimits(pages: number, width: number, height: number): PrintLimits {
  const raster = pages >= 0 && pages <= 100 && width > 0 && height > 0 && Math.ceil(width / 25.4 * 300) * Math.ceil(height / 25.4 * 300) <= 40_000_000
  const pixels = Math.ceil(width / 25.4 * 300) * Math.ceil(height / 25.4 * 300)
  return { raster, browser: raster && pixels * pages <= 100_000_000, client: raster && width >= 5 && height >= 5 && width <= 1000 && height <= 1000 }
}

export function choosePrintRoute(preference: PrintPreference, connection: PrintConnection, limits: PrintLimits): PrintRoute {
  if (preference === 'pdf' || !limits.raster) return 'pdf'
  if (preference === 'auto' && connection.status === 'ready' && limits.client) return 'client'
  return limits.browser ? 'browser' : 'pdf'
}

/** A failed submission is never retried through another route: it may already be printing. */
export async function executePrint(options: {
  preference: PrintPreference; limits: PrintLimits; printer: string;
  discover: () => Promise<PrintConnection>;
  client: (printer: string) => Promise<void>;
  browser: () => Promise<void>;
  pdf: () => Promise<void>;
}): Promise<PrintRoute | 'choose-printer'> {
  const connection = options.preference === 'auto' && options.limits.client
    ? await options.discover() : { status: 'unavailable' as const, printers: [] }
  const route = choosePrintRoute(options.preference, connection, options.limits)
  if (route === 'client') {
    const printer = choosePrinter(connection.printers, options.printer)
    if (!printer) return 'choose-printer'
    await options.client(printer)
  } else if (route === 'browser') await options.browser()
  else await options.pdf()
  return route
}
