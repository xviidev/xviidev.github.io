$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'Memerlukan Windows PowerShell 5.1 (WMF 5.1).' }
if ($env:XVII_PRINT_MODE -eq 'version') { [Environment]::OSVersion.Version.ToString(); exit }
Add-Type -AssemblyName System.Drawing
if ($env:XVII_PRINT_MODE -eq 'printers') {
    ConvertTo-Json -InputObject @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ForEach-Object { "$_" }) -Compress
    exit
}
$job = Get-Content -LiteralPath $env:XVII_PRINT_JOB -Raw -Encoding UTF8 | ConvertFrom-Json
$doc = [System.Drawing.Printing.PrintDocument]::new()
try {
    $doc.PrinterSettings.PrinterName = $job.printer
    if (!$doc.PrinterSettings.IsValid) { throw 'Printer tidak tersedia.' }
    if ($doc.PrinterSettings.PrintToFile) { throw 'Pilih printer fisik.' }
    $doc.DocumentName = 'Label XVII Dev'
    $doc.PrintController = [System.Drawing.Printing.StandardPrintController]::new()
    $doc.DefaultPageSettings.PaperSize = [System.Drawing.Printing.PaperSize]::new('Label', [int][Math]::Round($job.width_mm / 25.4 * 100), [int][Math]::Round($job.height_mm / 25.4 * 100))
    $doc.DefaultPageSettings.Margins = [System.Drawing.Printing.Margins]::new(0, 0, 0, 0)
    $doc.DefaultPageSettings.Landscape = $false
    $script:page = 0
    $doc.add_PrintPage({
        param($sender, $e)
        $stream = [System.IO.MemoryStream]::new([Convert]::FromBase64String($job.pages[$script:page]))
        $image = $null
        try {
            $image = [System.Drawing.Image]::FromStream($stream)
            $e.Graphics.TranslateTransform(-$e.PageSettings.HardMarginX, -$e.PageSettings.HardMarginY)
            $e.Graphics.DrawImage($image, [single]0, [single]0, [single]($job.width_mm / 25.4 * 100), [single]($job.height_mm / 25.4 * 100))
        } finally { if ($image) { $image.Dispose() }; $stream.Dispose() }
        $script:page++
        $e.HasMorePages = $script:page -lt $job.pages.Count
    })
    $doc.Print()
} finally { $doc.Dispose() }
