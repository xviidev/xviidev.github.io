# XVII Dev

Monorepo untuk xvii.dev. Antarmuka tetap berbahasa Indonesia.

## Struktur

- `apps/web`: homepage Astro.
- `apps/utilities`: aplikasi utilitas React + Vite + TanStack Router.
- `packages/ui`: komponen shadcn/ui bersama, preset `b6RfRCplyq`, tema, dan token desain.
- `packages/label-printer`: utilitas cetak label, Lexical, pratinjau Konva, impor Excel, dan ekspor PDF.
- `packages/barcode`: pembuat Code 128 dan EAN-13, input satuan atau massal hingga 200 kode, serta ekspor PNG, SVG, dan PDF A4.

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

Pembuat barcode: `/utilities/barcode/`. EAN-13 menerima 12 digit dengan digit pemeriksa otomatis atau memvalidasi 13 digit lengkap. PNG dan SVG mengunduh kode yang ditampilkan; PDF memuat seluruh daftar sesuai urutan. Unduhan tersedia setelah semua baris valid. Data barcode diproses lokal dan tidak disimpan.

Pada Cetak label, buka **Desain label → Barcode pada label → Tambah barcode**. Pilih Code 128 atau EAN-13 dan sumber dari nilai tetap, kolom Excel, atau baris manual. Posisi dan ukuran barcode memakai milimeter dan mencakup ruang kosong serta teks kode. Teks label menempati area di atas barcode dengan sela 1 mm; posisi atau isi yang tidak muat memblokir ekspor. Barcode digambar sebagai vektor pada PDF. Salinan dan posisi awal lembar mempertahankan pasangan teks dan kode. Desain JSON menyertakan konfigurasi serta nilai tetap barcode; preset kertas tetap hanya menyimpan geometri.

Build menggabungkan `apps/web/dist` dan `apps/utilities/dist` ke `dist/` di root. `npm run preview` membuka hasil gabungan pada port 4325. GitHub Actions memvalidasi semua workspace dan menerbitkannya ke GitHub Pages dengan domain xvii.dev.

Data penerima diproses lokal di browser; tidak diunggah atau disimpan otomatis. Baris kosong memisahkan label manual, dan baris yang hanya berisi `-` diabaikan. Template dapat disimpan sebagai JSON tanpa data penerima. Cetak PDF pada skala 100% setelah menguji kecocokan dengan lembar label.

## Menambah utilitas

Buat `packages/nama-utilitas` dengan satu entry React dan dependensi `@xviidev/ui`. Daftarkan metadata pada `apps/utilities/src/lib/metadata.ts`, lalu ikon dan pemuat entry package pada `apps/utilities/src/lib/utilities.ts`. Katalog, sidebar, pencarian cepat, route client, dan halaman statis GitHub Pages mengikuti daftar ini secara otomatis. Tema dan komponen tetap di `packages/ui`; utilitas memakai Source Sans 3 untuk body dan Geist Mono untuk heading, label dengan huruf biasa, dan jarak huruf normal. Font dokumen cetak terpisah dari font aplikasi. Untuk menambah komponen bersama: `npx shadcn@latest add <component> -c apps/utilities`.

## Layout utilitas

Aplikasi utilitas berdiri sendiri dengan entry React di `apps/utilities/src/main.tsx`; homepage tetap memakai Astro. Katalog memiliki pencarian, tab kategori, dan kartu utilitas. Di halaman alat, `UtilityShell` menyediakan sidebar, pencarian cepat (Ctrl+K), tema, dan navigasi yang sama untuk setiap package. Metadata ringan diekspor oleh masing-masing utilitas; halaman statis dibuat dari daftar metadata dan implementasi dimuat saat diperlukan.

Semua kontrol menggunakan `packages/ui`, termasuk Select (bukan NativeSelect), Tabs, Button, Input, Checkbox, Accordion, dan Sidebar. `npm run check:ui` memeriksa kontrak ini pada semua package utilitas.

Preset dokumen cetak label disimpan di IndexedDB melalui Dexie. Preset mencakup nama, keterangan, ukuran kertas, ukuran label, margin, dan jarak antarlabel; isi label dan data penerima tidak disimpan. Cadangan preset dapat diekspor/impor sebagai JSON melalui panel Atur preset. Menghapus data browser menghapus preset. Path `/utilitas/`, `/utilitas/cetak-label/`, `/utilitas/label-printer/`, dan `/utilities/label-printer/` dialihkan ke alamat baru. Migrasi Dexie v2 mempertahankan preset kertas dan menyimpan salinan data v1 pada tabel legacyPresets. Format teks dan posisi blok hanya diatur melalui panel Desain label, terpisah dari preset kertas. Ukuran huruf diterapkan langsung pada seleksi atau baris aktif, termasuk teks baru pada baris kosong. Semua panel utilitas menggunakan sudut lancip.
