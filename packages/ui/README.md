# @xviidev/ui

Komponen bersama seluruh utilitas. Sumber shadcn/ui Base UI dengan preset `b6RfRCplyq` (sera, neutral, JetBrains Mono, Space Grotesk).

Impor komponen dari `@xviidev/ui/components/button`, `@xviidev/ui/components/input`, dan seterusnya. Host mengimpor `@xviidev/ui/styles.css` sekali.

Tambahkan komponen dari root monorepo:

```sh
npx shadcn@latest add <component> -c apps/web
```

Konfigurasi host mengarahkan semua komponen ke package ini. Ekspor direktori eksplisit diperlukan agar resolver shadcn bekerja pada Windows dengan nama folder yang mengandung titik. Jangan salin komponen atau membuat tema tersendiri di setiap utilitas.

Kontrol Select memakai `select-input` atau komposisi `select` dengan Group dan Item. Tautan yang memakai Button menggunakan `nativeButton={false}` bersama `render`. CommandDialog menyediakan konteks Command dan judul aksesibel.

## Color picker

Impor `ColorPicker` dari `@xviidev/ui/components/color-picker`. Komponen memakai
Popover dan InputGroup bersama, dengan panel saturasi/kecerahan, hue, serta warna
pilihan. Gaya panel sudah termasuk dalam `@xviidev/ui/styles.css`.

```tsx
<ColorPicker
  id="warna-teks"
  label="Warna teks"
  value={color}
  onValueChange={setColor}
/>
```

`onValueChange` selalu menerima HEX enam digit tanpa transparansi, misalnya
`#1e3a8a`. Isian menerima HEX pendek dan kode tanpa `#`; kode pendek diterapkan
saat Enter atau pindah fokus. Masukan yang salah tetap berupa draft dengan pesan
kesalahan, sementara nilai terakhir yang valid dipertahankan. Escape membatalkan
draft. Pembaruan `value` dari luar (termasuk reset) tersinkron ke input dan panel.

Gunakan `defaultValue` tanpa `value` untuk state internal. `disabled` menonaktifkan
input dan menutup panel. `presets` menerima daftar `{ value, label }`; kirim `[]`
untuk menyembunyikannya. `children` menambahkan aksi di ujung InputGroup, misalnya
popover petunjuk. `id` dan `aria-describedby` mendukung FieldLabel/FieldDescription
milik pemanggil. Aturan khusus seperti kontras QR tetap ditangani utilitasnya.
