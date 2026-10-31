export interface AgentDownload { label: string; asset?: string }
export const AGENT_RELEASE = 'https://github.com/xviidev/xviidev.github.io/releases/download/print-agent-latest/'

/** Browser detection is a download hint; the connected agent reports its actual OS. */
export function detectAgentDownload(ua: string, touchPoints = 0): AgentDownload {
  const unsupported = { label: 'Tidak didukung' }
  if (/Android|iPhone|iPad|iPod|CrOS/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) return unsupported
  if (/Windows/i.test(ua)) {
    if (/ARM|aarch64/i.test(ua)) return unsupported
    const version = /Windows NT (\d+\.\d+)/i.exec(ua)?.[1]
    if (!version || !['6.1', '6.2', '6.3', '10.0'].includes(version)) return unsupported
    const x64 = /Win64|WOW64|x86_64|amd64/i.test(ua)
    // Chromium can report Windows 10 on Windows 7. Use the compatible build
    // for all Windows downloads rather than risk handing Win7 a modern binary.
    return { label: `Unduh agen ${version === '6.1' ? 'Windows 7' : 'Windows'} ${x64 ? '64' : '32'}-bit`, asset: `print-agent-windows7-${x64 ? 'x64' : 'x86'}.zip` }
  }
  if (/Macintosh|Mac OS X/i.test(ua)) return { label: 'Unduh agen macOS', asset: 'print-agent-macos.tar.gz' }
  if (/Linux/i.test(ua) && /x86_64|amd64/i.test(ua)) return { label: 'Unduh agen Linux 64-bit', asset: 'print-agent-linux-x64.tar.gz' }
  return unsupported
}
