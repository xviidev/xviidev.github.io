# Signing dan verifikasi build

Workflow `.github/workflows/print-agent.yml` menyediakan dua lapisan:

- **Attestation GitHub** otomatis untuk arsip release. Memverifikasi repo,
  workflow, dan commit asal unduhan tanpa sertifikat berbayar.
- **Code signing OS** opsional sebelum binary dikemas: Authenticode Windows atau
  Developer ID + notarization macOS. Ini membutuhkan identitas/sertifikat sendiri.

Attestation/checksum bukan pengganti code signing Windows/macOS dan tidak
menghilangkan pesan Unknown publisher atau seluruh peringatan sistem.
Build saat ini belum ditandatangani dengan identitas penerbit OS karena
sertifikat belum disediakan. Signing hanya berjalan pada branch master,
bukan pull request. Jika diaktifkan tetapi secrets/signing/verifikasi gagal,
workflow gagal dan tidak menerbitkan paket baru.

## Windows

1. Dapatkan sertifikat code signing yang dipercaya Windows dari penyedia yang
   memverifikasi identitas penerbit. Sertifikat HTTPS/domain bukan code signing.
   Tanyakan dukungan GitHub Actions, SHA-256, timestamp RFC3161, dan Windows 7
   sebelum memilih layanan. Signing tidak menjamin SmartScreen langsung hilang.
2. Konfigurasi yang disediakan memakai PFX + private key yang boleh diekspor.
   Banyak layanan sertifikat publik kini memakai token/HSM/cloud sehingga tidak
   menyediakan PFX. Jangan membeli layanan dengan asumsi bisa ekspor PFX:
   jika provider memakai HSM/cloud, ganti langkah Sign Windows executable dengan
   integrasi resmi provider. Jangan mengekspor key yang dilarang oleh provider.
3. Di GitHub repo → Settings → Secrets and variables → Actions, tambahkan
   **repository secrets**:

   | Nama | Isi |
   | --- | --- |
   | WINDOWS_SIGNING_PFX_BASE64 | Isi PFX dalam base64 |
   | WINDOWS_SIGNING_PFX_PASSWORD | Password PFX |

   Contoh menyalin base64 lokal ke clipboard, bukan mencetak private key ke log:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\sertifikat\code-signing.pfx')) | Set-Clipboard
   ```

4. Tambahkan **repository variable** `ENABLE_WINDOWS_SIGNING` dengan nilai `true`.
5. Jalankan Build print agent melalui Actions → Run workflow pada master.
   Script mengimpor key sementara pada runner, memakai SignTool SHA-256 dan
   timestamp, memverifikasi hasil, lalu menghapus key/cert sementara.
6. Sesudah mengunduh dan mengekstrak:

   ```powershell
   Get-AuthenticodeSignature .\xviidev-print-agent.exe | Format-List Status,SignerCertificate
   ```

Sertifikat self-signed hanya cocok untuk pengujian/perangkat yang sengaja
mempercayai sertifikat tersebut. Tidak otomatis dipercaya pengguna umum.
Jangan mengunggah PFX, password, atau private key ke repo/chat.
Windows 7 harus memiliki pembaruan SHA-2/root certificates yang sesuai. Signature
yang valid di Windows 11 belum membuktikan trust/runtime Windows 7; uji terpisah.

## macOS

1. Daftar Apple Developer Program dan buat **Developer ID Application** certificate
   (bukan Apple Development atau Mac App Distribution).
2. Ekspor certificate beserta private key sebagai P12 berpassword melalui Keychain
   Access. Buat app-specific password Apple ID untuk notarization.
3. Tambahkan repository secrets berikut:

   | Nama | Isi |
   | --- | --- |
   | MACOS_CERTIFICATE_P12_BASE64 | P12 dalam base64 |
   | MACOS_CERTIFICATE_PASSWORD | Password P12 |
   | MACOS_SIGNING_IDENTITY | Nama lengkap Developer ID Application: Nama (TEAMID) |
   | APPLE_ID | Email akun Apple Developer |
   | APPLE_APP_PASSWORD | App-specific password untuk notarytool |
   | APPLE_TEAM_ID | Team ID Apple Developer |

   ```sh
   base64 -i developer-id.p12 | pbcopy
   ```

4. Tambahkan repository variable `ENABLE_MACOS_SIGNING=true` lalu jalankan
   workflow pada master. Setiap arsitektur ditandatangani dengan hardened runtime,
   diverifikasi, lalu dikirim ke Apple melalui notarytool. Status harus Accepted.
5. Runner membuat keychain sementara dan membersihkannya setelah selesai.
   Paket macOS gabungan mempertahankan signature binary Intel/ARM.

Binary CLI mandiri tidak bisa ditempeli ticket melalui stapler seperti .app,
.pkg, atau .dmg; pemeriksaan notarization memakai koneksi online. Launcher shell
bukan aplikasi .app yang ditandatangani. Jika perlu pengalaman instalasi macOS
penuh beserta ticket offline, langkah berikutnya adalah membuat paket .pkg/.dmg
atau .app dan menandatangani/notarize paket tersebut.

## Linux dan verifikasi asal unduhan

Paket Linux memakai SHA256SUMS.txt dan attestation GitHub. Tidak membutuhkan
sertifikat Windows/Apple. Gunakan GitHub CLI terbaru yang mendukung attestation:

```sh
gh attestation verify print-agent-linux-x64.tar.gz --repo xviidev/xviidev.github.io
```

Perintah yang sama bisa digunakan untuk arsip Windows/macOS dengan mengganti
nama berkas. Attestation mengikat digest arsip ke workflow pembuatnya. Hash dari
release yang sama hanya memeriksa kesesuaian berkas; gunakan attestation untuk
memverifikasi asal build.

## Referensi

- [Microsoft SignTool](https://learn.microsoft.com/windows/win32/seccrypto/signtool)
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
