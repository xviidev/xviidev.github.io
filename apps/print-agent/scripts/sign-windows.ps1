param([Parameter(Mandatory = $true)][string]$Binary)
$ErrorActionPreference = 'Stop'
foreach ($name in @('WINDOWS_SIGNING_PFX_BASE64', 'WINDOWS_SIGNING_PFX_PASSWORD')) {
    if (![Environment]::GetEnvironmentVariable($name)) { throw "Secret $name belum diatur." }
}
$binaryPath = (Resolve-Path -LiteralPath $Binary).Path
$kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
$signtool = Get-ChildItem -LiteralPath $kits -Filter signtool.exe -Recurse | Where-Object { $_.Directory.Name -eq 'x64' } | Sort-Object FullName -Descending | Select-Object -First 1
if (!$signtool) { throw 'SignTool Windows SDK tidak ditemukan.' }
$certificatePath = Join-Path $env:RUNNER_TEMP ([Guid]::NewGuid().ToString() + '.pfx')
$certificate = $null
try {
    [IO.File]::WriteAllBytes($certificatePath, [Convert]::FromBase64String($env:WINDOWS_SIGNING_PFX_BASE64))
    $password = ConvertTo-SecureString $env:WINDOWS_SIGNING_PFX_PASSWORD -AsPlainText -Force
    $signers = @(Import-PfxCertificate -FilePath $certificatePath -Password $password -CertStoreLocation Cert:\CurrentUser\My | Where-Object { $_.HasPrivateKey })
    if ($signers.Count -ne 1) { throw 'PFX harus berisi tepat satu sertifikat signing dengan private key.' }
    $certificate = $signers[0]
    if (!$certificate.HasPrivateKey) { throw 'Sertifikat tidak berisi private key.' }
    & $signtool.FullName sign /sha1 $certificate.Thumbprint /s My /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $binaryPath
    if ($LASTEXITCODE -ne 0) { throw 'Signing Windows gagal.' }
    & $signtool.FullName verify /pa /all /v $binaryPath
    if ($LASTEXITCODE -ne 0) { throw 'Verifikasi signature Windows gagal.' }
} finally {
    if ($certificate) { Remove-Item -LiteralPath (Join-Path 'Cert:\CurrentUser\My' $certificate.Thumbprint) -Force }
    if (Test-Path -LiteralPath $certificatePath) { Remove-Item -LiteralPath $certificatePath -Force }
}
