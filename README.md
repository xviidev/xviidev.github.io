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

Homepage: `/`; katalog: `/utilitas/`; cetak label: `/utilitas/cetak-label/`.

Build menghasilkan `apps/web/dist`. GitHub Actions memvalidasi semua workspace dan menerbitkannya ke GitHub Pages dengan domain xvii.dev.

Data penerima diproses lokal di browser; tidak diunggah atau disimpan otomatis. Baris kosong memisahkan label manual, dan baris yang hanya berisi `-` diabaikan. Template dapat disimpan sebagai JSON tanpa data penerima. Cetak PDF pada skala 100% setelah menguji kecocokan dengan lembar label.

## Menambah utilitas

Buat `packages/nama-utilitas` dengan satu entry React dan dependensi `@xviidev/ui`. Daftarkan package pada host, tambahkan halaman Astro untuk akses langsung di GitHub Pages, lalu tautkan dari katalog. Tema dan komponen tetap di `packages/ui`. Untuk menambah komponen bersama: `npx shadcn@latest add <component> -c apps/web`.
