# Cursor Manager – Rencana Peningkatan Terpadu

Dokumen ini merangkum arah pengembangan selanjutnya untuk menjadikan kombinasi
Chrome Extension dan aplikasi desktop Python semakin lengkap, powerful, serta
mudah digunakan. Setiap bagian dibagi menurut prioritas tinggi ► rendah dan
menyertakan catatan teknis yang bisa langsung ditindaklanjuti.

> **Catatan:** Item keamanan (enkripsi, master password, dsb.) tidak
> menjadi kebutuhan . Fokuskan effort pada sinkronisasi, UI, dan UX
> security tidak dibutuhkan.

---

## 1. Tujuan Utama

1. **UX/Consistency** – selaraskan pengalaman antara extension dan desktop, termasuk
   state sharing dan tema visual.
2. **Automation & Power Features** – perluas otomatisasi (pro-trial, bypass, data
   batch) agar cocok untuk power-user.
3. **Reliability & Security** – kuatkan penanganan error, enkripsi data sensitif, dan
   monitoring kesehatan sistem.
4. **Packaging & Distribution** – permudah instalasi lintas OS, sediakan bundel
   siap pakai untuk user non-teknis.

---

## 2. High Priority Backlog

| Area             | Item                                   | Deskripsi                                                                                                                              | Catatan                                                                   |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Integration**  | Sinkronisasi realtime                  | Gunakan mekanisme event (WebSocket lokal / polling ringan) agar perubahan data dari extension langsung muncul di GUI dan sebaliknya.   | Perlu endpoint “notifier” pada native host + listener di extension / GUI. |
| **Automation**   | Scheduler Otomatis                     | Tambahkan task scheduler (mis. APScheduler) di backend untuk menjalankan bypass test batch atau perpanjang pro-trial secara terjadwal. | UI Settings tab butuh editor jadwal & toggle per modul.                   |
| **Security**     | ~~Enkripsi data~~ **TIDAK DIPERLUKAN** | ❌ **DIBATALKAN** - Security features explicitly NOT needed per design decision. Data remains plaintext.                               | Item ini dihapus dari backlog. DO NOT implement security features.        |
| **Distribution** | Bundling aplikasi                      | Sediakan paket executable (PyInstaller) + script install extension otomatis.                                                           | Sertakan check depends, integrasi manifest.                               |
| **Extension UX** | Side panel rework                      | Bangun ulang UI di `extension/` dengan framework modular (mis. Svelte/React) agar sejajar dengan tampilan CustomTkinter.               | Kaji ulang `manifest.json` + dev server (Vite) untuk build modern.        |

---

## 3. Peningkatan Chrome Extension

1. **UI & Theming**

   - Porting ke stack modern (Svelte/React + Tailwind) dengan mode gelap/terang sinkron
     terhadap desktop.
   - Tambahkan layout grid untuk daftar akun & kartu, termasuk quick filters berbasis tag.
   - Integrasi status backend (online/offline) + latency indicator.

2. **Enhanced Automation Controls**

   - Widget scheduler sederhana untuk bypass runner langsung dari side panel.
   - Konfigurasi autopilot pro-trial: pilih kartu default, interval reminder, notifikasi
     desktop menggunakan `chrome.notifications`.

3. **Browser Integration**

   - Content script granular: injeksikan mini-panel ke `cursor.com` untuk switching cepat.
   - Implementasi context menu (right-click) untuk menyimpan cookies/kartu saat browsing.
   - Data validation UI sebelum dikirim ke backend (highlight field wajib).

4. **Testing & Build**
   - Setup e2e test (Playwright) untuk memverifikasi login switching & komunikasi native.
   - Konfigurasi CI pipeline khusus extension (lint + unit + e2e).
   - Document `yarn dev` / `yarn build` (atau npm) di `extension/README.md`.

---

## 4. Peningkatan Backend Desktop

1. **CustomTkinter UI Enhancements**

   - Tambahkan toggle tema + penyimpanan preferensi `~/.cursor_manager/settings.json`.
   - Buat widget statistik (progress bar, sparkline) untuk bypass dan scheduler di Dashboard.
   - Tambahkan multi-select di tabel + aksi batch (hapus, ubah status, tag).

2. **Data Handling**

   - Pagination / virtualized list (ttk Treeview atau custom canvas) untuk ribuan entri.
   - Optimasi query (LIMIT, OFFSET) + state cache (mis. `functools.lru_cache`).
   - Implementasi undi undo/redo stack untuk operasi akun/kartu (helpful saat pakai batch).

3. **Automation / Services**

   - Scheduler terintegrasi (lihat High Priority).
   - Bypass runner langsung dari GUI dengan hasil real-time (progress + log panel).
   - Export komprehensif (ZIP berisi JSON, CSV, log) + import wizard bertahap.

4. **Reliability**
   - Health monitor background thread menuliskan status ke status bar (CPU, DB latency).
   - Logging tersentralisasi (rotate log, level per modul) + viewer minimal di Settings tab.
   - Tambahkan unit test untuk scheduler & bypass export; siapkan stub data besar.

---

## 5. API & Native Messaging

1. **API Versioning**

   - Tambahkan `system.getCapabilities` untuk mengumumkan fitur backend (enkripsi, scheduler, dsb).
   - Siapkan JSON schema untuk request/response guna validasi di extension sebelum kirim.

2. **Error Handling**

   - Standarisasi kode error JSON-RPC (e.g. `E_BACKEND_DOWN`, `E_VALIDATION_FAILED`) + notifikasi user-friendly.
   - Retry mechanism / exponential backoff di extension untuk request kritikal.

3. **Security & Auth**
   - ~~Pertimbangkan local token (PIN) untuk operasi sensitif~~ ❌ **DIBATALKAN** - Security features NOT needed
   - ✅ **DONE** - Audit manifest native host: `allowed_origins` sudah restricted ke extension ID specific
   - ⚠️ **POLICY**: NO encryption, NO PIN auth, NO master password - data stored in plaintext by design

---

## 6. Dokumentasi & DX

1. **Docs**

   - Tambahkan _Getting Started_ gabungan (extension + backend) dengan screenshot CustomTkinter terbaru.
   - Buat wiki/FAQ: error umum (native host, enkripsi, install), troubleshooting runbook.
   - Diagram komunikasi (Mermaid) yang menunjukkan alur Extension ⇄ Native ⇄ GUI.

2. **Developer Experience**

   - Tambahkan `Makefile`/`justfile` untuk perintah umum (`setup`, `lint`, `test`, `build`).
   - Gunakan pre-commit hooks (black/ruff/isort) untuk backend; ESLint/Prettier untuk extension.
   - Rencanakan deployment sandbox (Docker Compose) untuk backend headless + CI.

3. **Community / Release**
   - Siapkan changelog terstruktur, gunakan semver.
   - Pertimbangkan channel rilis “beta” vs “stable”.
   - Tangani issue template & contribution guide.

---

## 7. Roadmap Tahapan

| Tahap                      | Fokus                                                                           | Estimasi   |
| -------------------------- | ------------------------------------------------------------------------------- | ---------- |
| **T1 – Stabilitas**        | Tema toggle, sinkronisasi realtime, basic scheduler (tanpa pekerjaan security). | 4–6 minggu |
| **T2 – Automation Pro**    | Bypass runner GUI, advanced scheduler, extension UI baru, paket installer.      | 6–8 minggu |
| **T3 – Quality & Release** | Testing menyeluruh, packaging, dokumentasi lengkap, first public beta.          | 4 minggu   |

Setiap tahap dapat dipecah menjadi sprint 2 minggu dengan deliverable jelas (UI, API,
instrumen). Prioritas bisa disesuaikan menurut kebutuhan pengguna/internal.

---

## 8. Improvement Items dari Audit (2025-10-11)

Berdasarkan audit komprehensif Chrome Native Messaging dan CustomTkinter compliance:

### Kritis (Sudah Diperbaiki ✅)

1. ✅ **Native Host Path (Windows)** - Batch wrapper sekarang digunakan di install.py
2. ✅ **Message Size Validation** - 1MB/64MB limits implemented di native_host.py
3. ✅ **Origin Validation** - Validasi chrome-extension:// origin dari sys.argv[1]

### Prioritas Tinggi (Belum)

4. ⚠️ **Windows Registry Registration** - Tambah fallback registry-based installation

   - File: `backend/install.py`
   - Benefit: Lebih robust daripada file-based manifest
   - Implementation:
     ```python
     def _register_windows_registry(self):
         import winreg
         key_path = rf"SOFTWARE\Google\Chrome\NativeMessagingHosts\{self.HOST_NAME}"
         manifest_path = str(self.manifest_dir / f"{self.HOST_NAME}.json")
         with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
             winreg.SetValue(key, "", winreg.REG_SZ, manifest_path)
     ```

5. ⚠️ **Error Message Sanitization** - Prevent info disclosure di production

   - File: `backend/native_host.py`
   - Tambah DEBUG_MODE flag untuk kontrol detail error
   - Production: generic errors, Development: full traceback

6. ⚠️ **Padding Constants** - Define consistent spacing di GUI
   - File: `backend/gui.py`
   - Constants: `PADDING_LARGE=20`, `PADDING_MEDIUM=12`, `PADDING_SMALL=8`
   - Benefit: UI consistency

### Prioritas Medium

7. ⏸️ **Comprehensive Testing** - Unit tests untuk critical paths

   - Native messaging protocol tests
   - Scheduler job execution tests
   - Database migration tests
   - GUI integration tests

8. ⏸️ **Documentation Updates**

   - Update EXTENSION_BACKEND_CONNECTION.md dengan batch wrapper info
   - Add troubleshooting guide untuk common native messaging errors
   - Document message size limits dan chunking strategies

9. ⏸️ **Log Rotation** - Implement proper log rotation

   - File: `backend/native_host.py`
   - Use Python's `logging.handlers.RotatingFileHandler`
   - Max size: 10MB, backup count: 5

10. ⏸️ **CI/CD Pipeline**
    - GitHub Actions untuk lint + test
    - Automated build untuk PyInstaller executable
    - Extension packaging automation

### Prioritas Rendah

11. ⏸️ **Performance Monitoring** - Add metrics collection
12. ⏸️ **gRPC Migration** - Consider gRPC over Native Messaging untuk better performance
13. ⏸️ **Remote Backend Support** - WebSocket fallback untuk cloud sync

---

## 9. Langkah Berikutnya

### Segera (Next Sprint)

1. ✅ **DONE** - Fix critical native messaging issues (batch wrapper, size limits, origin)
2. 🔄 **IN PROGRESS** - Test installation Windows dengan batch wrapper
3. ⏸️ Implement Windows Registry registration sebagai opsi
4. ⏸️ Add unit tests untuk native messaging protocol
5. ⏸️ Update dokumentasi dengan findings dari audit

### Medium Term (1-2 Bulan)

- Multi-select + batch operations di tabel GUI
- Pagination untuk large datasets
- Log rotation implementation
- CI/CD pipeline setup
- Comprehensive testing suite

### Long Term (3-6 Bulan)

- Extension UI modernization (Svelte/React)
- Real-time push notifications (WebSocket)
- Performance monitoring dashboard
- Cloud sync support

Dengan roadmap ini dan perbaikan dari audit, Cursor Manager sekarang memiliki fondasi
yang solid dan compliant dengan standar Chrome Native Messaging serta best practices
CustomTkinter. Fokus selanjutnya adalah testing, documentation, dan user experience
enhancements.
