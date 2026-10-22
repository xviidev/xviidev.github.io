# @xviidev/ui

Komponen bersama seluruh utilitas. Sumber shadcn/ui Base UI dengan preset `b6RfRCplyq` (sera, neutral, JetBrains Mono, Space Grotesk).

Impor komponen dari `@xviidev/ui/components/button`, `@xviidev/ui/components/input`, dan seterusnya. Host mengimpor `@xviidev/ui/styles.css` sekali.

Tambahkan komponen dari root monorepo:

```sh
npx shadcn@latest add <component> -c apps/web
```

Konfigurasi host mengarahkan semua komponen ke package ini. Ekspor direktori eksplisit diperlukan agar resolver shadcn bekerja pada Windows dengan nama folder yang mengandung titik. Jangan salin komponen atau membuat tema tersendiri di setiap utilitas.
