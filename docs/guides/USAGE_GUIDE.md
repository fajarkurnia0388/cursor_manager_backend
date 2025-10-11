# Panduan Penggunaan Cursor Manager

Dokumen ini menjelaskan cara menyiapkan backend Python, menjalankan aplikasi
desktop, dan menginstal Chrome Extension setelah pemisahan struktur direktori.
Seluruh langkah menggunakan bahasa Indonesia agar mudah diikuti.

> **Catatan:** Proyek ini memodernisasi alur kerja `warp.dev_account_manager`
> (GUI desktop Python + manajemen akun) namun dengan kode baru berbasis Tkinter
> dan layanan backend yang sudah ada. Beberapa istilah dan fitur mirip, tetapi
> struktur dan implementasinya telah disesuaikan dengan arsitektur Cursor
> Manager v4.

---

## 1. Prasyarat

- Python 3.10 atau lebih baru (direkomendasikan 3.11+).
- Pip siap digunakan untuk menginstal paket tambahan (GUI membutuhkan
  `customtkinter`).
- Node.js + npm (untuk membangun extension jika perlu).
- Google Chrome/Chromium (untuk memuat extension secara `Load unpacked`).

Struktur direktori yang relevan sekarang:

```text
.
├── backend/      # Backend Python & aplikasi desktop
├── extension/    # Seluruh kode Chrome Extension
└── arsip/        # Proyek lama (warp.dev_account_manager, cursor_manager_old)
```

---

## 2. Menyiapkan Backend Python

1. **Masuk ke folder backend**  
   ```bash
   cd backend
   ```

2. **Opsional: buat virtual environment**  
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/macOS
   .venv\Scripts\activate     # Windows PowerShell
   ```

3. **Instal dependency Python**  
   ```bash
   pip install -r requirements.txt
   ```
   (akan memasang `customtkinter` untuk antarmuka desktop dan `apscheduler`
   untuk Automation Scheduler)

4. **(Opsional) Jalankan tes untuk memverifikasi**  
   ```bash
   python run_tests.py
   ```
   Seluruh 20 tes seharusnya lulus (`[OK] ALL TESTS PASSED`).

5. **Jalankan GUI desktop**  
   ```bash
   python gui.py
   ```
   Aplikasi Tkinter akan terbuka dengan tab:
   - **Dashboard**: Statistik akun, kartu, bypass, pro-trial.
   - **Accounts**: CRUD akun, kelola tags, impor/ekspor JSON, lihat cookies.
   - **Payment Cards**: CRUD kartu, generator, kelola tags, ekspor CSV/JSON.
   - **Automation Suite**: Quick generator, bypass suite viewer,
     pengelola pro-trial (mirip fitur Warp).
   - **Settings**: Backup/restore DB, pengaturan tema (light/dark/system),
     Automation Scheduler (mengatur interval job), health check, buka folder data.

7. **Mengatur Automation Scheduler (opsional)**  
   Di tab Settings aktifkan sakelar *Automation Scheduler* untuk menjalankan
   job latar-belakang:
   - `refresh_accounts` — menandai akun untuk pengecekan status berkala.
   - `cleanup_bypass` — menghapus hasil bypass lama (default setiap 7 hari).
   - `prune_sync_events` — merapikan log sinkronisasi agar feed tetap ringan.

   Interval bisa diubah via dropdown (5&ndash;1440 menit). Riwayat eksekusi
   terakhir tampil di panel bawah Settings dan ringkasannya muncul di
   Dashboard → Automation Snapshot.

6. **Instal Native Messaging Host (opsional)**  
   Untuk integrasi langsung dengan extension, jalankan:
   ```bash
   python install.py
   ```
   Perbarui `EXTENSION_ID` di `install.py` sebelum menjalankan agar manifest
   native messaging sesuai dengan ID extension Anda.

---

## 3. Menjalankan Chrome Extension

1. **Masuk ke folder extension**  
   ```bash
   cd extension
   ```

2. **Pasang dependensi (jika diperlukan)**  
   Banyak fitur berbasis JavaScript bekerja tanpa build tambahan, tetapi untuk
   memastikan lingkungan siap:
   ```bash
   npm install
   ```

3. **Buka Chrome > chrome://extensions**  
   - Aktifkan **Developer mode**.
   - Pilih **Load unpacked**.
   - Arahkan ke folder `extension/` (yang berisi `manifest.json`).

4. **Sambungkan ke backend**  
   - Pastikan backend (`python gui.py` atau `native_host.py`) berjalan
     sehingga icon indikator koneksi di extension menunjukkan status terhubung.
   - Jika menggunakan native messaging: pastikan manifest yang dibuat
     `install.py` berada di direktori NativeMessagingHosts Chrome.

5. **Fitur utama extension**  
   - Switching akun dan kartu langsung dari side panel (`manifest.json`
     menggunakan side panel pada Chrome 114+).
   - Integrasi penuh dengan backend melalui JSON-RPC (native messaging).
   - Bypass tester, generator kartu, otomasi pro-trial menggunakan data dari
     backend (sinkron dengan GUI desktop).

---

## 4. Diagram Alur Singkat

```
┌────────────────────┐        Native Messaging         ┌─────────────────────┐
│ Chrome Extension    │ ─────────────────────────────▶ │ Python Backend       │
│ (extension/)        │                                │ (backend/native_host)│
│ - UI, cookies, DOM  │ ◀───────────────────────────── │ - Database SQLite    │
│ - Side panel, autof │        JSON-RPC Response       │ - Services (Account, │
│ - Mengirim event    │                                │   Card, Bypass, dsb) │
└────────────────────┘                                └─────────────────────┘
           │
           │(opsional)
           ▼
┌────────────────────┐
│ Desktop GUI (Tk)   │
│ - Dashboard        │
│ - Manajemen data   │
│ - Automasi proTrial│
└────────────────────┘
```

Backend dan GUI menggunakan database yang sama (`%USERPROFILE%/cursor_manager`
atau `~/cursor_manager`). Extension berkomunikasi lewat native messaging sehingga
perubahan data terlihat di kedua sisi secara real time.

---

## 5. Troubleshooting Singkat

| Masalah | Solusi |
| --- | --- |
| Extension tidak bisa terhubung ke backend | Pastikan `python gui.py` atau `native_host.py` berjalan, dan `EXTENSION_ID` di `install.py` sudah benar sebelum instalasi. |
| Error `Native messaging host not found` | Jalankan `python install.py` setelah mengubah `EXTENSION_ID`, kemudian restart Chrome. |
| Data akun/kartu kosong di GUI | Cek file database pada folder `%HOME%/cursor_manager/data.db`. Gunakan fitur `Settings → Health Check` untuk memverifikasi integritas. |
| Ingin menjalankan generator kartu dari GUI | Buka tab **Payment Cards** > **Generate Cards** atau gunakan **Automation Suite → Quick Card Generator**. |

---

## 6. Kesesuaian dengan warp.dev_account_manager

- **Fitur Inti**: Manajemen akun, kartu, bypass tester, generator, dan pro-trial
  semuanya tersedia (bahkan lebih terstruktur lewat tab terpisah).
- **Teknologi GUI**: Menggunakan Tkinter + ttk theme, bukan PyQt5 seperti Warp,
  tetapi layout dan alur kerjanya meniru pengalaman multi-tab Warp.
- **Backend**: Menggunakan service layer yang modular (`account_service`,
  `cards_service`, `bypass_service`, dll.) sehingga lebih sesuai dengan proyek
  Cursor Manager versi terbaru.

Dengan kata lain, proyek saat ini sekelas Warp Account Manager dari sisi fitur,
namun disusun ulang agar sejalan dengan stack Cursor Manager (Python stdlib,
Tkinter, JSON-RPC, SQLite).
