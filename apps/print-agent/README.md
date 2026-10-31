# Agen cetak lokal lintas platform

Agen Rust mendeteksi OS tempat binary berjalan, lalu memilih backend:

| Sistem | Backend | Persyaratan runtime |
| --- | --- | --- |
| Windows | Windows PrintDocument melalui PowerShell | PowerShell 5.1, .NET Framework 4.8, driver printer |
| macOS Intel/Apple Silicon | CUPS melalui `lp` dan `lpstat` | Printer ditambahkan melalui pengaturan sistem |
| Linux | CUPS melalui `lp` dan `lpstat` | CUPS aktif, paket klien CUPS, printer terkonfigurasi |
| Windows 7 SP1 x86/x64 | Build legacy, backend Windows yang sama | WMF 5.1, .NET Framework 4.8, driver Windows 7, runtime Visual C++ yang kompatibel |

Windows 7 adalah target kompatibilitas eksperimental: build dengan compiler lama
dapat diverifikasi di Windows modern, tetapi belum diuji menjalankan atau mencetak
di Windows 7 asli. Build standar dengan Rust modern tidak ditujukan untuk Windows 7.

## Unduhan untuk pengguna

Tombol di utilitas Cetak label memilih paket berdasarkan OS browser. Perangkat
mobile, ChromeOS, Linux ARM, dan OS/arsitektur yang tidak dikenali ditandai
Tidak didukung. Karena browser dapat menyamarkan Windows lama sebagai Windows 10,
semua unduhan Windows dari UI memakai build kompatibel Rust 1.77.2. Agen tetap
melaporkan OS sebenarnya melalui /v1/info setelah terhubung.

GitHub Actions menerbitkan paket setelah push ke master pada kanal release
`print-agent-latest`, termasuk SHA256SUMS.txt. Tautan unduhan baru tersedia
setelah workflow pertama selesai sukses. PR hanya membangun artefak dan tidak
menerbitkan release. macOS mendapat satu arsip berisi binary Intel dan ARM;
jalankan `mulai-agen.command` yang memilih arsitektur secara otomatis.
Binary belum ditandatangani/notarized, sehingga sistem dapat meminta persetujuan
untuk menjalankan unduhan. Pengguna cukup mengekstrak dan menjalankan agen,
tidak perlu memasang Rust.

## Menjalankan

Dari root repositori pada sistem tujuan:

```sh
cargo run --release --locked --manifest-path apps/print-agent/Cargo.toml
```

Atau jalankan binary untuk OS/arsitektur yang sesuai. Rust hanya diperlukan saat
membangun. Salin token terminal ke utilitas Cetak label, klik Hubungkan agen,
pilih printer, lalu Cetak melalui agen. Pesan koneksi menampilkan OS dari agen,
bukan tebakan browser. Token berubah setiap mulai dan tidak disimpan aplikasi.
Hentikan agen dengan Ctrl+C.

Origin bawaan `https://xviidev.github.io`. Untuk domain/pengembangan lain, atur
origin persis tanpa path sebelum menjalankan:

```powershell
$env:XVII_PRINT_ORIGIN = 'http://localhost:5173'
```

```sh
export XVII_PRINT_ORIGIN='http://localhost:5173'
```

Linux Debian/Ubuntu memerlukan `cups-client` dan layanan CUPS yang aktif.
Periksa `lpstat -e` pada macOS/Linux sebelum menghubungkan utilitas.

## Build Windows 7

Bangun pada Windows modern dengan MSVC Build Tools dan Windows SDK terpasang:

```powershell
rustup toolchain install 1.77.2 --profile minimal
rustup target add --toolchain 1.77.2 x86_64-pc-windows-msvc i686-pc-windows-msvc
cargo +1.77.2 build --release --locked --manifest-path apps/print-agent/Cargo.toml --target x86_64-pc-windows-msvc
cargo +1.77.2 build --release --locked --manifest-path apps/print-agent/Cargo.toml --target i686-pc-windows-msvc
```

Salin EXE dari `apps/print-agent/target/<target>/release/` ke komputer tujuan.
Gunakan x86 untuk Windows 7 32-bit. Dependensi UUID, tempfile, dan serialisasi
dikunci agar build legacy dapat diulang; commit Cargo.lock dan gunakan --locked.
Jangan regenerasi lockfile dengan format lebih baru tanpa menguji Rust 1.77.2.

Workflow `print-agent.yml` membangun artefak Windows modern, Windows 7 x64/x86,
Linux x64, dan macOS Intel/ARM serta menjalankan tes pada runner masing-masing.
Runner Windows modern tidak membuktikan kompatibilitas runtime Windows 7.
Aplikasi web tetap memerlukan browser yang dapat menjalankan aplikasi Vite;
kemampuan agen Windows 7 tidak menjamin seluruh UI berfungsi di browser lama.
Timeout koneksi menggunakan AbortController agar tidak bergantung pada
AbortSignal.timeout yang lebih baru.

## API dan perilaku

- Hanya `127.0.0.1:17831`; semua endpoint memerlukan token Bearer.
- `GET /v1/info`: `os`, `arch`, `os_version`, versi agen, dan nama backend.
- `GET /v1/printers`: daftar nama tujuan cetak terpasang.
- `POST /v1/jobs`: `{ printer, width_mm, height_mm, pages: [base64PNG] }`.
- Maksimal 100 halaman, 32 MiB JSON, 40 juta piksel per halaman, kertas 5–1.000 mm.
- PNG dari utilitas dirender pada 300 DPI. CUPS menerima seluruh halaman dalam
  satu pemanggilan `lp`, media Custom dalam mm, `ppi=300`, dan scaling dinonaktifkan.
  Berkas diteruskan ke filter CUPS, bukan RAW printer. Dukungan PNG/custom media
  bergantung pada filter/driver yang terpasang. Tidak ada fallback cetak otomatis.
- Pekerjaan diproses berurutan. `submitted` berarti penyerahan ke sistem cetak
  selesai, bukan bukti kertas keluar. Jika koneksi terputus/timeout, periksa
  antrean cetak sebelum mengulang agar tidak mencetak dua kali.
- Berkas sementara dihapus setelah backend selesai; penghentian paksa saat
  mencetak dapat meninggalkan direktori sementara.
- Browser dapat meminta izin jaringan lokal atau memblokir loopback.
- Driver dapat menolak/mengubah ukuran media atau memotong margin fisik.
  Uji satu lembar dengan penggaris sebelum mencetak banyak label.
- Belum mencakup installer, autostart, status spooler, atau ZPL/TSPL RAW.

## Verifikasi

```sh
cargo test --locked --manifest-path apps/print-agent/Cargo.toml
npm run check
npm test
npm run build
```

Uji fisik pada setiap OS: deteksi OS, daftar printer, satu halaman ukuran khusus,
beberapa halaman berurutan, printer offline, dan koneksi putus tanpa retry.
Untuk Windows 7, lakukan pengujian yang sama pada mesin/VM Windows 7 SP1 dengan
prasyarat terpasang sebelum menyatakan versi tersebut didukung penuh.

Referensi: [CUPS](https://www.cups.org/doc/options.html),
[PrintDocument](https://learn.microsoft.com/dotnet/api/system.drawing.printing.printdocument),
[perubahan minimum Windows Rust 1.78](https://blog.rust-lang.org/2024/02/26/Windows-7/).
