# XVII Dev

Monorepo untuk xvii.dev. Antarmuka tetap berbahasa Indonesia.

## Struktur

- `apps/web`: homepage Astro dan host utilitas dengan React + TanStack Router.
- `packages/ui`: komponen shadcn/ui bersama, preset `b6RfRCplyq`, tema, dan token desain.
- `packages/label-printer`: utilitas cetak label, Lexical, pratinjau Konva, impor Excel, dan ekspor PDF.

Satu package untuk satu utilitas, bukan satu kategori. Kategori hanya metadata pada katalog. Utilitas baru menggunakan komponen dari `@xviidev/ui`, bukan menyalinnya.

## Pengembangan

Node.js 24+. Jalankan dari root:

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

Homepage: `/`; katalog: `/utilitas/`; cetak label: `/utilitas/label-printer/`.

Build menghasilkan `apps/web/dist`. GitHub Actions memvalidasi semua workspace dan menerbitkannya ke GitHub Pages dengan domain xvii.dev.

Data penerima diproses lokal di browser; tidak diunggah atau disimpan otomatis. Baris kosong memisahkan label manual, dan baris yang hanya berisi `-` diabaikan. Template dapat disimpan sebagai JSON tanpa data penerima. Cetak PDF pada skala 100% setelah menguji kecocokan dengan lembar label.

## Menambah utilitas

Buat `packages/nama-utilitas` dengan satu entry React dan dependensi `@xviidev/ui`. Daftarkan metadata, ikon, dan pemuat entry package pada `apps/web/src/lib/utilities.ts`. Katalog, sidebar, pencarian cepat, route client, dan halaman statis GitHub Pages mengikuti daftar ini secara otomatis. Tema dan komponen tetap di `packages/ui`. Untuk menambah komponen bersama: `npx shadcn@latest add <component> -c apps/web`.

## Layout utilitas

`UtilityLayout` terpisah dari layout portfolio. Katalog memiliki pencarian, tab kategori, dan kartu utilitas. Di halaman alat, `UtilityShell` menyediakan sidebar, pencarian cepat (Ctrl+K), tema, dan navigasi yang sama untuk setiap package. Metadata ringan diekspor oleh masing-masing utilitas; halaman statis dibuat dari daftar metadata dan implementasi dimuat saat diperlukan.

Semua kontrol menggunakan `packages/ui`, termasuk Select (bukan NativeSelect), Tabs, Button, Input, Checkbox, Accordion, dan Sidebar. `npm run check:ui` memeriksa kontrak ini pada semua package utilitas.

Preset dokumen cetak label disimpan di IndexedDB melalui Dexie. Preset mencakup nama, keterangan, ukuran kertas, susunan label, dan format baris; isi label dan data penerima tidak disimpan. Cadangan preset dapat diekspor/impor sebagai JSON melalui panel Atur preset. Menghapus data browser menghapus preset. Path lama `/utilitas/cetak-label/` mengarah ke path baru.
