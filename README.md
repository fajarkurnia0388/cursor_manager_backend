# Cursor Manager Workspace

Repositori ini kini dipisah menjadi tiga area utama supaya pengembangan extension
dan aplikasi desktop lebih terorganisir.

- `extension/` &mdash; seluruh kode Chrome Extension (manifest, skrip, assets,
  dokumentasi, `package.json`, dsb). Jalankan perintah npm/yarn dari folder ini
  ketika membangun atau menguji extension.
- `backend/` &mdash; backend Python + aplikasi desktop (native messaging host dan
  GUI). Dokumentasi backend berada di dalam folder ini.
- `arsip/` &mdash; proyek lama/eksperimen sebelumnya yang disimpan sebagai arsip
  (`cursor_manager_old`, `warp.dev_account_manager`).

Untuk detail fitur extension, lihat `extension/README.md`. Panduan backend berada
di `backend/README.md`.

> Tip: setelah menyalin struktur baru ini, pastikan tooling/CI Anda diperbarui
> agar menunjuk ke jalur baru, misalnya `extension/manifest.json` atau
> `extension/package.json`.

Panduan penggunaan terpadu (install backend, menjalankan GUI, serta memasang
extension) tersedia di `USAGE_GUIDE.md`. Untuk roadmap dan daftar peningkatan
selanjutnya, lihat `IMPROVEMENT_PLAN.md`.

## Highlight Pembaruan

- **Tema tersinkronisasi** — aplikasi desktop kini menyimpan preferensi tema
  (light/dark/system) dan menyediakan sakelar cepat di header serta menu
  Settings.
- **Automation Scheduler** — backend Python dilengkapi penjadwal APScheduler
  dengan kontrol di Settings (mengatur interval refresh status, pembersihan
  hasil bypass, dan pruning event sinkronisasi).
- **Event Bridge** — setiap perubahan akun/kartu ataupun batch akan dicatat di
  tabel `sync_events` dan dapat diambil extension melalui endpoint
  `events.get`, membantu sinkronisasi realtime.

> Pastikan meng-install dependensi backend terbaru:
>
> ```bash
> pip install -r backend/requirements.txt
> ```
