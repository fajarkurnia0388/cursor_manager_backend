# Cursor Account Manager

**Versi 4.0** - Arsitektur Hybrid Backend-First dengan Python Desktop GUI

Ekstensi Chrome yang komprehensif dengan backend Python untuk mengelola beberapa akun Cursor, auto-fill informasi pembayaran, testing keamanan bypass, dan otomasi pro trial. Menampilkan antarmuka sidebar terpadu, aplikasi desktop GUI, dan penyimpanan SQLite persisten.

[![English](https://img.shields.io/badge/English-blue.svg)](README.md) [![Bahasa Indonesia](https://img.shields.io/badge/Bahasa%20Indonesia-red.svg)](README_IN.md)

**🎉 Highlight v4.0:**

- ✨ **Installer Backend Satu-Klik** - Auto-generate dan download script installer sesuai platform
- 🖥️ **Desktop Python GUI** - Aplikasi standalone dengan 8 tab fitur (Generator, Bypass, Pro Trial, Dashboard)
- 🚀 **50% Lebih Ringan** - Hapus SQLite WASM (-2MB), sekarang pakai Python backend
- ⚡ **Indikator Koneksi Real-Time** - Status backend visual dengan auto-reconnect
- 💾 **Zero Data Loss** - Database SQLite persisten bertahan dari browser crash
- 🔄 **Offline Caching** - Fallback Chrome Storage dengan TTL 5 menit

## 🚀 Fitur

### Fitur Utama

- **👤 Dukungan Multi-Akun**: Simpan dan kelola akun Cursor tanpa batas
- **🔄 Beralih Satu Klik**: Klik pada akun apa pun untuk beralih secara instan
- **📋 Import JSON**: Tambahkan akun dengan menempelkan cookies JSON dari sumber apa pun
- **💾 Auto Export**: Semua akun disimpan ke folder Downloads/cursor_accounts/
- **📧 Deteksi Cerdas**: Secara otomatis mengekstrak email dan status langganan
- **🔐 Penyimpanan Aman**: Cookie disimpan secara lokal di penyimpanan aman Chrome

### Fitur Pembayaran 💳

- **💳 Manajemen Kartu Pembayaran**: Simpan dan kelola beberapa kartu pembayaran secara lokal
- **✨ Auto-Fill Checkout**: Secara otomatis mengisi formulir pembayaran di situs e-commerce
- **🎯 Dukungan Stripe**: Kompatibilitas yang ditingkatkan dengan formulir pembayaran Stripe
- **📂 Import Kartu**: Import data kartu dari teks atau file
- **🔍 Deteksi Field**: Secara otomatis mendeteksi field pembayaran di halaman saat ini

### Fitur Antarmuka

- **📌 Sidebar Terpadu**: Antarmuka sidebar tunggal menggantikan popup (Chrome 114+)
- **📑 Navigasi Tab**: Beralih antara tab Accounts dan Cards
- **🌓 Mode Gelap/Terang**: Deteksi tema otomatis dengan toggle manual
- **🔔 Notifikasi Cerdas**: Umpan balik non-intrusif untuk semua operasi
- **🐛 Panel Debug**: Alat debugging canggih (Ctrl+Shift+D)

## 📋 Cara Kerja

### Manajemen Akun

1. **Manajemen Cookie**: Menangkap dan menyimpan cookie sesi Cursor dengan aman
2. **Deteksi Cerdas**: Secara otomatis mengekstrak email dan info paket dari dashboard
3. **Beralih Instan**: Menghapus sesi saat ini dan memulihkan cookie akun yang dipilih
4. **Auto Export**: Menyimpan akun ke Downloads/cursor_accounts/ untuk backup
5. **Integrasi Halaman**: Menyuntikkan account switcher ke Cursor.com untuk akses cepat

### Auto-Fill Pembayaran

1. **Deteksi Form**: Secara otomatis mengidentifikasi field pembayaran di halaman checkout
2. **Pengisian Cerdas**: Mensimulasikan pengetikan manusia untuk kompatibilitas form yang lebih baik
3. **Integrasi Stripe**: Dukungan yang ditingkatkan untuk elemen pembayaran Stripe
4. **Dukungan Multi-Format**: Menangani berbagai tata letak dan struktur form pembayaran

## 🛠️ Instalasi

### Metode 1: Auto-Install Satu-Klik (Direkomendasikan) ⚡

1. **Install Extension:**

   - Clone repository ini atau unduh file ZIP
   - Buka Chrome dan navigasi ke `chrome://extensions/`
   - Aktifkan "Developer mode" di kanan atas
   - Klik "Load unpacked" dan pilih direktori ekstensi

2. **Auto-Install Backend:**
   - Buka extension sidebar (klik ikon extension)
   - Saat melihat dialog "Backend Not Installed":
     - Klik tombol **"📦 Auto Install Backend"**
     - Script akan otomatis download ke folder Downloads
     - Jalankan script yang didownload (`install_backend.bat` di Windows atau `install_backend.sh` di Unix)
     - Ikuti petunjuk (extension ID sudah terisi otomatis!)
     - Reload extension → Terkoneksi! ✅

**Selesai!** Auto-installer menangani semuanya: cek Python, navigasi ke folder, jalankan install.py, dan verifikasi instalasi.

### Metode 2: Instalasi Manual (Tradisional)

Untuk yang lebih suka kontrol manual:

1. **Install Extension** (langkah di atas)

2. **Install Python Backend:**

   ```bash
   cd backend
   python install.py
   ```

3. **Ikuti Prompt Installer:**

   - Masukkan extension ID Anda (copy dari halaman detail extension)
   - Pilih browser yang ingin dikonfigurasi (Chrome, Edge, Brave, dll.)
   - Konfirmasi instalasi

4. **Reload Extension:**
   - Buka `chrome://extensions/`
   - Klik "Reload" pada Cursor Manager
   - Backend akan terkoneksi otomatis

**Requirements:**

- Python 3.8+ terinstall di sistem Anda
- Browser Chrome/Edge/Brave (atau Chromium-based lainnya)

**Panduan Lengkap:** Lihat [`backend/INSTALLATION_GUIDE.md`](backend/INSTALLATION_GUIDE.md)

## 📖 Penggunaan

### Memulai

Klik ikon ekstensi untuk membuka **antarmuka sidebar terpadu**. Sidebar berisi dua tab utama:

- **👤 Accounts**: Kelola akun Cursor Anda
- **💳 Cards**: Kelola kartu pembayaran dan auto-fill

### Manajemen Akun

#### Menambah Akun

**Metode 1: Import dari JSON**

1. Di sidebar, buka tab **Accounts**
2. Klik "➕ Add Account"
3. Tempel cookies JSON Cursor Anda
4. Opsional berikan nama kustom
5. Tangani duplikat: Pilih "Replace" atau "Cancel" jika akun sudah ada

**Metode 2: Export Sesi Saat Ini**

1. Login ke akun Cursor Anda di browser
2. Di sidebar, klik "💾 Export"
3. Akun akan disimpan ke Downloads/cursor_accounts/

**Metode 3: Import File**

1. Klik "📁 Import Files"
2. Pilih satu atau beberapa file akun dari Downloads/cursor_accounts/
3. Ekstensi akan mengimpor semua akun yang valid dan melewatkan duplikat

**Metode 4: Alat Canggih**

1. Klik "⚙️ Advanced Tools" (di samping Import Files)
2. Gunakan "📂 Import Folder" untuk mengimpor seluruh direktori Downloads/cursor_accounts/
3. Gunakan "🔧 Fix Duplicates" untuk menggabungkan akun duplikat
4. Gunakan "🗑️ Clear All Data" untuk mereset ekstensi sepenuhnya

#### Beralih Akun

1. Di tab **Accounts**, klik pada kartu akun apa pun
2. Halaman akan otomatis reload dengan akun baru
3. Akun aktif ditandai dengan indikator hijau

#### Troubleshooting Akun

- **File Tidak Ditemukan**: Ekstensi akan menawarkan untuk re-export jika file backup hilang
- **Gagal Beralih**: Hapus data browser jika beralih gagal karena konflik cookie
- **Duplikat**: Ekstensi mencegah import duplikat dan menawarkan opsi penggantian

### Manajemen Kartu Pembayaran BARU! 💳

#### Menambah Kartu Pembayaran

**Metode 1: Import Manual**

1. Beralih ke tab **💳 Cards**
2. Klik "➕ Import Cards"
3. Tempel data kartu dalam format: `number|MM/YY|CVC` (satu per baris)
4. Pilih "Replace existing cards" atau gabungkan dengan yang ada

**Metode 2: Import File**

1. Siapkan data kartu dalam file `.md` atau `.txt`
2. Klik "➕ Import Cards" dan pilih file
3. Ekstensi akan mem-parsing dan mengimpor data kartu secara otomatis

#### Menggunakan Auto-Fill

1. Navigasi ke halaman checkout apa pun (mis., Stripe, situs e-commerce)
2. Klik "🔍 Find Fields" untuk mendeteksi form pembayaran
3. Klik tombol "✨" di samping kartu apa pun untuk auto-fill form
4. Ekstensi akan mensimulasikan pengetikan manusia untuk kompatibilitas yang lebih baik

#### Mengelola Kartu

- **Lihat Kartu**: Lihat semua kartu yang disimpan dengan nomor yang dimask
- **Hapus Kartu**: Klik tombol "🗑️" pada kartu individual
- **Hapus Semua**: Gunakan "🗑️ Clear All" untuk menghapus semua data pembayaran
- **Deteksi Field**: Deteksi otomatis form pembayaran Stripe dan generik

### Fitur Debug 🐛

Tekan **Ctrl+Shift+D** untuk mengaktifkan panel debug:

- **📄 Show Data**: Lihat semua data ekstensi yang disimpan
- **🔧 Fix Duplicates**: Konsolidasi duplikat canggih
- **🗑️ Clear All**: Reset ekstensi lengkap

### Dukungan Private Window

Ekstensi sekarang bekerja di jendela private/incognito dengan isolasi data yang tepat.

## 🎯 Ringkasan Fitur Utama

### Fitur Manajemen Akun

- **Desain Visual**: UI yang bersih dan modern dengan kartu akun menampilkan email dan status
- **Status Berwarna**: Free (biru), Pro (ungu), Business (hijau)
- **Indikator Aktif**: Titik hijau (🟢) menunjukkan akun yang sedang aktif
- **Klik untuk Beralih**: Cukup klik kartu akun apa pun untuk beralih secara instan
- **Auto Backup**: Semua akun otomatis disimpan ke Downloads/cursor_accounts/
- **Deteksi Duplikat yang Ditingkatkan**: Penanganan duplikat cerdas dengan opsi replace/cancel
- **Redirect Dashboard**: Otomatis redirect ke cursor.com/dashboard setelah beralih
- **Deteksi Kegagalan Beralih**: Memperingatkan ketika beralih akun gagal karena konflik cookie
- **Pembersih Data Browser**: Akses satu klik ke pengaturan hapus data browser (mendukung Chrome, Edge, Brave, Opera)
- **Sidebar Terpadu**: Desain antarmuka tunggal yang efisien (tidak ada popup lagi)
- **Import Folder**: Import seluruh folder Downloads/cursor_accounts/ sekaligus
- **Reveal File**: Tampilkan file akun di Windows Explorer dengan tombol 📁 (auto-export jika hilang)
- **Penghapusan Cerdas**: Opsi untuk menghapus akun saja atau termasuk file backup di folder Downloads
- **Manajemen File**: Pembersihan otomatis file backup duplikat selama konsolidasi
- **Dukungan Private Window**: Fungsionalitas lengkap dalam mode incognito dengan isolasi data

### Fitur Manajemen Pembayaran BARU!

- **Penyimpanan Kartu**: Simpan beberapa kartu pembayaran dengan aman secara lokal
- **Mesin Auto-Fill**: Pengisian form canggih dengan simulasi pengetikan seperti manusia
- **Integrasi Stripe**: Kompatibilitas yang ditingkatkan dengan Stripe Elements
- **Dukungan Form Generik**: Bekerja dengan sebagian besar form checkout e-commerce
- **Deteksi Field**: Secara otomatis mengidentifikasi field nomor kartu, expiry, dan CVC
- **Deteksi Tipe Kartu**: Secara otomatis mengidentifikasi Visa, MasterCard, dll.
- **Tampilan Dimask**: Tampilan nomor kartu yang aman (\***\*-\*\***-\*\*\*\*-1234)
- **Import File**: Import data kartu dari file .md/.txt
- **Manajemen Bulk**: Import beberapa kartu sekaligus
- **Umpan Balik Form**: Deteksi real-time field pembayaran di halaman saat ini

### Peningkatan Antarmuka

- **Navigasi Tab**: Pemisahan bersih antara Accounts dan Cards
- **Sidebar Terpadu**: Antarmuka tunggal menggantikan sistem popup/sidebar ganda
- **Alat Canggih**: Fitur canggih yang dikonsolidasikan dalam satu tempat
- **Panel Debug**: Alat developer untuk troubleshooting (Ctrl+Shift+D)
- **Penanganan Error yang Ditingkatkan**: Umpan balik pengguna yang lebih baik dan pemulihan error
- **Desain Responsif**: Dioptimalkan untuk penggunaan sidebar dengan scrolling yang tepat

## 🔧 Detail Teknis

### Izin yang Diperlukan

- `cookies`: Untuk membaca dan mengelola cookie Cursor.com
- `storage`: Untuk menyimpan data akun dan pembayaran secara lokal
- `tabs`: Untuk reload tab setelah beralih akun
- `scripting` & `activeTab`: Untuk fungsionalitas content script dan auto-fill
- `downloads`: Untuk menyimpan akun ke folder Downloads
- `sidePanel`: Untuk antarmuka sidebar terpadu (Chrome 114+)
- Izin host untuk semua URL (untuk manajemen cookie dan auto-fill form)

### Penyimpanan Data

**Data Akun:**

- Akun disimpan di local storage Chrome (kunci `cursor_accounts`)
- Setiap akun termasuk:
  - Alamat email
  - Status langganan (Free/Pro/Business)
  - Cookie sesi
  - Nama yang dihasilkan otomatis atau kustom
- Backup otomatis ke Downloads/cursor_accounts/

**Data Pembayaran:**

- Kartu pembayaran disimpan secara lokal (kunci `cursor_payment_cards`)
- Setiap kartu termasuk:
  - Nomor kartu yang dimask
  - Tanggal expiry (format MM/YY)
  - Kode CVC
  - Tipe kartu (Visa, MasterCard, dll.)
  - ID kartu unik
- Tidak ada data sensitif yang dikirim ke server eksternal

### Penyimpanan Data

- **Local Storage**: Semua data disimpan secara lokal di Chrome storage
- **Isolasi Domain**: Cookie hanya diakses untuk domain cursor.com
- **Tidak Ada Server Eksternal**: Tidak ada transmisi data ke layanan eksternal
- **Dukungan Incognito**: Kompatibilitas jendela private dengan isolasi data

### Arsitektur

- **Antarmuka Terpadu**: Sidebar tunggal menggantikan dualitas popup/sidebar
- **Service Worker**: Background script untuk manajemen akun dan pembayaran
- **Content Scripts**: Disuntikkan untuk deteksi form dan fungsionalitas auto-fill
- **Storage Services**: Manajemen data akun dan pembayaran yang modular
- **Tab Management**: Beralih cerdas dengan penanganan redirect otomatis

## 🤝 Berkontribusi

Kontribusi sangat diterima! Silakan kirim Pull Request.

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT.

## 🔄 Update Terbaru

### v4.0 - Arsitektur Backend-First & Installer Satu-Klik (Oktober 2025)

**Perubahan Breaking:**

- **Hapus SQLite WASM** - Extension sekarang menggunakan Python backend untuk penyimpanan data
- **Backend Dibutuhkan** - Fitur lengkap memerlukan Python backend (fallback Chrome Storage tersedia)

**Fitur Baru:**

- ✨ **Installer Backend Satu-Klik** - Auto-generate script installer sesuai platform dengan extension ID embedded
- 🖥️ **Python Desktop GUI** - Aplikasi 8-tab (Dashboard, Accounts, Cards, Generator, Bypass, Pro Trial, Settings, Statistics)
- 📦 **Card Generator** - Generate kartu berbasis BIN dengan validasi Luhn (algoritma Namso Gen)
- 🔒 **Bypass Tester** - Testing keamanan vulnerability dengan tracking hasil
- 🎯 **Otomasi Pro Trial** - Aktivasi dan renewal trial otomatis
- 📊 **Dashboard** - Overview sistem dengan quick stats dan monitoring kesehatan
- 🔄 **Indikator Koneksi Real-Time** - Status backend visual di sidebar extension
- 💾 **Operasi Batch** - Pembuatan dan manajemen akun/kartu secara bulk
- 📤 **Export/Import** - Export data dalam format JSON/CSV
- 🔍 **Monitoring Status** - Cek kesehatan sistem dan metrik performa

**Peningkatan:**

- 🚀 **50% Lebih Ringan** - Hapus dependency SQLite WASM (-2MB ukuran bundle)
- ⚡ **-53% Pengurangan Kode** - Kode extension berkurang dari 1867 menjadi 870 baris
- 🎨 **UI yang Ditingkatkan** - Python GUI modern dengan tema gelap dan styling profesional
- 🌐 **Dukungan Multi-Browser** - Generate manifest untuk Chrome, Edge, Brave, Chromium, Opera
- 💾 **Offline Caching** - Fallback Chrome Storage dengan TTL 5 menit untuk operasi offline
- 🔐 **CSP yang Disederhanakan** - Hapus 'wasm-unsafe-eval', kebijakan keamanan lebih bersih
- ✅ **100% Test Coverage** - 30 automated tests (20 unit + 10 integration), semua passing

**Teknis:**

- Python backend dengan JSON-RPC 2.0 via Native Messaging
- SQLite database (schema v2 dengan 7 tabel, 8 indeks)
- CLI tool untuk manajemen command-line
- Zero external dependencies (pure Python stdlib)
- Thread-safe database connection pooling

**Dokumentasi:**

- 📚 15+ file markdown dengan panduan komprehensif
- 📖 API Reference (600+ baris, 50 metode terdokumentasi)
- 🛠️ Installation Guide (500+ baris, step-by-step)
- 📊 Project Status dashboard dengan metrik
- 📝 CHANGELOG dengan riwayat versi

**Lihat:** [`CHANGELOG.md`](CHANGELOG.md) untuk riwayat versi lengkap.

## 🛡️ Pemberitahuan Privasi

Ekstensi ini beroperasi sepenuhnya secara lokal:

- **Zero Telemetry**: Tidak ada pengumpulan data penggunaan atau pelacakan
- **Local Storage**: Semua data tetap di perangkat Anda
- **Tidak Ada Network Requests**: Ekstensi tidak berkomunikasi dengan server eksternal
- **Open Source**: Semua kode dapat diaudit dan transparan

**Penting**: Ini adalah alat untuk kemudahan pribadi. Pengguna bertanggung jawab untuk mengamankan data mereka sendiri.

## 🙏 Ucapan Terima Kasih

Terinspirasi oleh beberapa ekstensi browser yang sangat baik:

- **[GitHub Account Switcher](https://github.com/yuezk/github-account-switcher)** - Untuk konsep beralih multi-akun dan pola desain UI
- **[Cookie Editor](https://github.com/Moustachauve/cookie-editor)** - Untuk manajemen cookie dan fungsionalitas import/export JSON
- **[Bookmark Sidebar](https://github.com/Kiuryy/Bookmark_Sidebar)** - Untuk desain antarmuka sidebar terpadu dan pendekatan navigasi tab

Pengujian kompatibilitas form pembayaran dilakukan dengan berbagai platform e-commerce dan implementasi Stripe.

---

**Disclaimer**: Ekstensi ini tidak berafiliasi dengan Cursor AI, Stripe, atau processor pembayaran apa pun. Gunakan atas risiko dan tanggung jawab Anda sendiri. Ini adalah alat kemudahan untuk penggunaan pribadi.
