# XVII Dev

Monorepo untuk xvii.dev. Antarmuka tetap berbahasa Indonesia.

## Struktur

- `apps/web`: homepage Astro.
- `apps/utilities`: aplikasi utilitas React + Vite + TanStack Router.
- `packages/ui`: komponen shadcn/ui bersama, preset `b6RfRCplyq`, tema, dan token desain.
- `packages/label-printer`: utilitas cetak label, Lexical, pratinjau Konva, impor Excel, dan ekspor PDF.
- `packages/barcode`: pembuat Code 128 dan EAN-13, input satuan atau massal hingga 200 kode, serta ekspor PNG, SVG, dan PDF A4.
- `packages/pdf-to-image`: konversi halaman PDF ke PNG/JPG melalui PDF.js, dengan pratinjau, rentang halaman, dan unduh ZIP melalui fflate.
- `packages/speed-test`: tes download, upload, ping HTTP, jitter, grafik sampel, dan riwayat lokal melalui Cloudflare Speedtest.
- `packages/pdf-merge`: gabung beberapa PDF, urutkan file, dan pilih halaman tiap file.
- `packages/pdf-split`: ekstrak rentang, pisah per halaman atau per sejumlah halaman; hasil jamak diunduh sebagai ZIP.
- `packages/pdf-core`: pemrosesan PDF bersama melalui pdf-lib dan fflate di worker.
- `packages/image-compressor`: pembanding gambar asli dan hasil kompresi dengan codec WebAssembly jSquash, resize, transformasi, dan pengurangan warna.

Satu package untuk satu utilitas, bukan satu kategori. Kategori hanya metadata pada katalog. Utilitas baru menggunakan komponen dari `@xviidev/ui`, bukan menyalinnya.

## Pengembangan

Node.js 24+. Jalankan dari root:

```sh
npm ci
npm run dev           # utilitas, port 4326
npm run dev:web       # homepage, port 4321
npm run check
npm test
npm run build
```

Homepage: `/`; katalog: `/utilities/`; cetak label: `/utilities/labels/`.

Kompres gambar: `/utilities/image-compressor/`. Gambar asli berada di kiri dan hasil edit di kanan dalam satu kanvas dengan pembatas yang dapat digeser. Satu pengaturan hasil menyediakan MozJPEG, WebP, AVIF, OxiPNG, JPEG XL, atau QOI. Pratinjau menampilkan hasil decode file kompresi, dengan pan, zoom, dan layar penuh. Mendukung resize Lanczos/Triangle/Catmull-Rom/Mitchell/Nearest, kunci rasio, rotasi, flip, kuantisasi palet 2–256 warna, dithering, dan pengaturan codec. Gambar dapat dipilih, dijatuhkan, atau ditempel dari clipboard; maksimal 40 MB, 16 juta piksel, sisi 8192 px, atau 4 juta piksel untuk kuantisasi. Animasi menjadi satu gambar statis; hasil kompresi tidak membawa metadata sumber. JPEG meratakan transparansi ke warna latar pilihan. Codec diproses pada worker terpisah dan diunduh saat diperlukan, dengan WASM single-thread agar berfungsi di GitHub Pages tanpa header isolasi. Perubahan pengaturan membatalkan worker lama; unduhan hanya tersedia untuk hasil pengaturan terbaru. Lisensi codec disertakan sebagai aset build.

PDF ke gambar: `/utilities/pdf-to-image/`. Pilih PDF hingga 100 MB, termasuk dokumen dengan kata sandi, lalu unduh halaman yang ditampilkan atau rentang halaman dalam ZIP. Kualitas Standar/Tajam/Sangat tajam memakai 150/200/300 DPI; DPI khusus 72–600 tersedia. Render dilakukan per halaman, maksimal 24 juta piksel dan sisi 8192 px; ZIP dibatasi 256 MB. PNG/JPG memakai latar putih. File, worker, font, CMap, dan decoder PDF diproses/disajikan dari situs sendiri, tanpa layanan konversi atau CDN. File pendukung PDF.js disalin melalui konfigurasi Vite agar tersedia pada mode pengembangan dan GitHub Pages.

Pembuat barcode: `/utilities/barcode/`. EAN-13 menerima 12 digit dengan digit pemeriksa otomatis atau memvalidasi 13 digit lengkap. PNG dan SVG mengunduh kode yang ditampilkan; PDF memuat seluruh daftar sesuai urutan. Unduhan tersedia setelah semua baris valid. Data barcode diproses lokal dan tidak disimpan.

Pada Cetak label, ikon barcode di ujung toolbar langsung menyisipkan fungsi; pilih {{3}} terlebih dahulu untuk mengubahnya menjadi {{barcode(3)}}. Panah di samping ikon membuka pengaturan tampilan opsional yang hanya berisi format, lebar, tinggi, dan pilihan teks kode. Sumber data mengikuti fungsi template, tanpa isian kolom atau baris tambahan. Barcode dirender tanpa padding internal dan mewarisi warna teks fungsinya. Enter, spasi awal/akhir, dan spasi berulang dipertahankan; barcode di tengah paragraf mengalir bersama teks tanpa menambahkan baris baru. Perataan dan posisi vertikal berlaku pada keseluruhan isi label. Lebar kosong berarti otomatis berdasarkan data dan area label; rentang lebar yang valid ditampilkan untuk ukuran manual. Contoh: {{barcode(3, {format: "EAN13", height: 12, width: 40})}}. Warna teks tetap tersimpan di desain JSON dan PDF. Desain lama dikonversi menjadi fungsi ketika diimpor. Preset kertas tetap hanya menyimpan geometri.

Build menggabungkan `apps/web/dist` dan `apps/utilities/dist` ke `dist/` di root. `npm run preview` membuka hasil gabungan pada port 4325. GitHub Actions memvalidasi semua workspace dan menerbitkannya ke GitHub Pages dengan domain xvii.dev.

Data penerima diproses lokal di browser; tidak diunggah atau disimpan otomatis. Baris kosong memisahkan label manual, dan baris yang hanya berisi `-` diabaikan. Template dapat disimpan sebagai JSON tanpa data penerima. Cetak PDF pada skala 100% setelah menguji kecocokan dengan lembar label.

## Menambah utilitas

Buat `packages/nama-utilitas` dengan satu entry React dan dependensi `@xviidev/ui`. Daftarkan metadata pada `apps/utilities/src/lib/metadata.ts`, lalu ikon dan pemuat entry package pada `apps/utilities/src/lib/utilities.ts`. Katalog, sidebar, pencarian cepat, route client, dan halaman statis GitHub Pages mengikuti daftar ini secara otomatis. Tema dan komponen tetap di `packages/ui`; utilitas memakai Source Sans 3 untuk body dan Geist Mono untuk heading, label dengan huruf biasa, dan jarak huruf normal. Font dokumen cetak terpisah dari font aplikasi. Untuk menambah komponen bersama: `npx shadcn@latest add <component> -c apps/utilities`.

## Layout utilitas

Aplikasi utilitas berdiri sendiri dengan entry React di `apps/utilities/src/main.tsx`; homepage tetap memakai Astro. Katalog memiliki pencarian, tab kategori, dan kartu utilitas. Di halaman alat, `UtilityShell` menyediakan sidebar, pencarian cepat (Ctrl+K), tema, dan navigasi yang sama untuk setiap package. Metadata ringan diekspor oleh masing-masing utilitas; halaman statis dibuat dari daftar metadata dan implementasi dimuat saat diperlukan.

Semua kontrol menggunakan `packages/ui`, termasuk Select (bukan NativeSelect), Tabs, Button, Input, Checkbox, Accordion, dan Sidebar. `npm run check:ui` memeriksa kontrak ini pada semua package utilitas.

Preset dokumen cetak label disimpan di IndexedDB melalui Dexie. Preset mencakup nama, keterangan, ukuran kertas, ukuran label, margin, dan jarak antarlabel; isi label dan data penerima tidak disimpan. Cadangan preset dapat diekspor/impor sebagai JSON melalui panel Atur preset. Menghapus data browser menghapus preset. Path `/utilitas/`, `/utilitas/cetak-label/`, `/utilitas/label-printer/`, dan `/utilities/label-printer/` dialihkan ke alamat baru. Migrasi Dexie v2 mempertahankan preset kertas dan menyimpan salinan data v1 pada tabel legacyPresets. Format teks dan posisi blok hanya diatur melalui panel Desain label, terpisah dari preset kertas. Ukuran huruf diterapkan langsung pada seleksi atau baris aktif, termasuk teks baru pada baris kosong. Semua panel utilitas menggunakan sudut lancip.

Gabung PDF: `/utilities/pdf-merge/`. Unggah beberapa file sekaligus atau bertahap, urutkan dengan panah, dan pilih halaman setiap file (kosong berarti semua halaman). Urutan halaman mengikuti isian; nomor berulang dalam satu rentang dideduplikasi. Maksimal 50 file, 100 MB per file, 200 MB total, dan 1.000 halaman hasil.

Pisah PDF: `/utilities/pdf-split/`. Mode rentang menerima koma dalam satu bagian dan titik koma antarbagian, misalnya `1-3; 4, 6`. Tersedia pemisahan per halaman atau per sejumlah halaman, dengan bagian terakhir berisi sisa halaman. Satu hasil diunduh sebagai PDF; beberapa hasil menjadi ZIP. Maksimal 200 PDF dan 1.000 halaman hasil per proses, dengan total hasil 256 MB.

Kedua utilitas PDF memproses file secara lokal melalui worker yang dapat dibatalkan. Halaman disalin sebagai PDF tanpa rasterisasi, sehingga teks, gambar, ukuran, dan rotasinya tetap dipertahankan. PDF terenkripsi, formulir interaktif (termasuk XFA dan widget yatim), serta tanda tangan digital ditolak agar tidak menghasilkan data formulir yang hilang. Bookmark dan lampiran dokumen sumber tidak disalin. Hasil lama dihapus saat sumber atau pengaturan berubah.

Pratinjau PDF tersedia di Gabung PDF untuk setiap file dan di Pisah PDF untuk dokumen sumber. Gunakan panah atau nomor halaman untuk berpindah; badge menunjukkan apakah halaman masuk pilihan saat ini. PDF.js dan aset font/worker disajikan secara lokal. Dokumen pratinjau dimuat saat area terlihat dan dilepas saat keluar layar; render dibatasi 720/1.200 px pada sisi terpanjang serta dibatalkan saat halaman atau sumber berubah.

Pembanding gambar mendukung scroll untuk zoom dengan posisi kursor sebagai titik acuan (5%–3.200%), latar transparansi/putih/gelap, dan toggle smoothing piksel. Latar serta smoothing hanya memengaruhi pratinjau. Pegangan pembatas berukuran 24 × 24 px dengan area tarik lebih luas, navigasi keyboard, dan klik dua kali untuk kembali ke tengah. Petunjuk kontrol tersedia melalui tooltip.

Kedua sisi pembanding memakai frame tampilan bersama pada resolusi acuan gambar asli. Rotasi dan flip diterapkan juga pada pratinjau sumber; hasil resize diskalakan ke frame yang sama agar posisi, bentuk, dan ukuran tampilan sejajar. Resize nonproporsional memakai rasio keluaran untuk kedua sisi. File sumber tetap utuh dan ukuran ekspor mengikuti pengaturan. Preset 25/50/75/100/150/200% dihitung dari dimensi sumber setelah rotasi; preset yang melewati batas dimensi/piksel dinonaktifkan. Mengubah rotasi mempertahankan skala resize yang dipilih.

Tes kecepatan internet: `/utilities/speed-test/`, kategori Jaringan. Menggunakan `@cloudflare/speedtest` 1.15.0 yang dimuat setelah tombol Mulai ditekan. Mode Hemat merencanakan 6,6 MB payload, mode Standar 78,6 MB, di luar overhead atau pengulangan permintaan. Pengukuran adaptif dapat melewati ukuran lebih besar pada koneksi lambat. Tersedia ping saat idle dan saat download/upload, jitter, grafik SVG dari sampel aktual, serta 20 riwayat terakhir di LocalStorage dan ekspor CSV. Tidak ada nilai kecepatan yang disimulasikan; nilai kosong tetap ditampilkan sebagai tanda pisah.

Tes memakai endpoint Cloudflare `__down`/`__up`, sehingga trafik dan alamat IP diterima server pengujian. Pengiriman ringkasan dan log tambahan dimatikan melalui `logAimApiUrl: null` dan `logMeasurementApiUrl: null`; kredensial cookie tidak disertakan. Pembatalan, pindah utilitas, pagehide, kehilangan koneksi, kegagalan engine, batas 15 detik per permintaan, atau batas total 120 detik menghentikan pengukuran aktif. Hanya hasil lengkap yang masuk riwayat; callback dari sesi lama diabaikan. Riwayat gagal/terblokir tetap dapat digunakan dalam memori. Tes tidak mengukur ICMP atau packet loss dan tidak menjamin kecepatan ke seluruh tujuan internet.
