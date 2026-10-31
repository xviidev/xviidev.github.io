# Aplikasi cetak XVII Dev

Aplikasi ini menghubungkan halaman Cetak label dengan printer di komputer Anda.
Tanpa aplikasi ini, Anda tetap bisa mencetak lewat browser atau menyimpan PDF.

## Mulai menggunakan

1. Ekstrak berkas unduhan terlebih dahulu.
2. Buka aplikasi yang sesuai dengan komputer Anda:

   | Komputer | Berkas yang dibuka |
   | --- | --- |
   | Windows | xviidev-print-agent.exe |
   | Mac dengan chip Apple (M1, M2, dan seterusnya) | xviidev-print-agent-arm64 |
   | Mac Intel | xviidev-print-agent-x64 |
   | Linux | xviidev-print-agent |

3. Tunggu sampai muncul **Aplikasi cetak siap**. Biarkan jendelanya terbuka.
4. Buka **Cetak label** di [xvii.dev](https://xvii.dev) atau
   [xviidev.github.io](https://xviidev.github.io).
5. Isi label dan sesuaikan ukuran kertas. Pilih **Otomatis** pada Cara mencetak.
6. Pilih printer yang muncul, lalu tekan **Cetak label**.

Halaman mencari printer secara berkala. Jika baru membuka aplikasi, kembali ke
halaman dan tunggu sebentar, atau tekan **Periksa printer lagi**. Jika browser
meminta izin mengakses perangkat di komputer ini, izinkan agar printer ditemukan.

Di Linux, jika berkas belum bisa dijalankan, buka Properti berkas dan izinkan
berkas dijalankan sebagai program. Anda juga dapat membuka Terminal di folder
hasil ekstrak, lalu menjalankan `./xviidev-print-agent`.

Untuk Windows 7, diperlukan Windows 7 SP1, PowerShell 5.1, .NET Framework 4.8,
dan printer yang sudah terpasang pada komputer. Versi Windows 7 masih dalam
pengujian.

## Memilih cara mencetak

- **Otomatis:** memakai aplikasi cetak jika printer ditemukan. Jika belum
  terhubung, jendela cetak browser akan digunakan.
- **Cetak lewat browser:** membuka pilihan printer milik browser, meskipun
  aplikasi cetak sudah terbuka.
- **Simpan PDF:** mengunduh label untuk dibuka atau dicetak nanti.

Untuk jumlah lembar atau ukuran kertas yang terlalu besar untuk cetak langsung,
halaman akan menyiapkan PDF. Tombol cetak akan berubah menjadi **Unduh PDF**.

Pada jendela cetak browser atau pembaca PDF, gunakan ukuran kertas yang sama
dengan pengaturan label, skala **100% / ukuran asli**, dan matikan header/footer
jika muncul. Lakukan cetak uji satu lembar sebelum mencetak banyak label.

## Jika belum berhasil

**Printer belum muncul:** pastikan aplikasi cetak masih terbuka dan printer
tersedia di pengaturan komputer. Kembali ke halaman lalu tekan Periksa printer
lagi. Anda tetap bisa memilih cetak lewat browser atau menyimpan PDF.

**Aplikasi sudah terbuka, tetapi halaman belum terhubung:** periksa izin akses
perangkat di browser. Pastikan Anda memakai halaman resmi XVII Dev dan aplikasi
cetak dari unduhan terbaru, lalu muat ulang halaman.

**Ukuran cetak bergeser atau terpotong:** periksa ukuran kertas pada halaman
label dan pengaturan printer. Sesuaikan margin serta posisi label, kemudian
lakukan cetak uji kembali.

**Ada pesan bahwa pekerjaan mungkin sudah diterima:** periksa antrean printer
dan hasil cetak sebelum menekan Cetak label lagi. Aplikasi tidak mengulang
pekerjaan tersebut secara otomatis agar label tidak tercetak dua kali.

Untuk berhenti, tutup jendela aplikasi cetak. Halaman web tetap dapat dipakai
untuk mencetak lewat browser atau mengunduh PDF.
