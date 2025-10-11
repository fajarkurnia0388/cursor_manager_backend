# Analisis Koneksi Extension ke Backend

## Gambaran Umum

Extension Cursor Account Manager (dibangun sebagai extension Chrome) terhubung ke aplikasi backend berbasis Python menggunakan **Chrome Native Messaging**. Ini memungkinkan extension berbasis JavaScript untuk berkomunikasi dengan proses native (backend Python) di mesin lokal pengguna. Native Messaging ideal untuk setup ini karena memungkinkan komunikasi bidirectional yang aman antara extension browser dan aplikasi lokal tanpa mengekspos port atau memerlukan server HTTP.

Manfaat utama:

- **Keamanan**: Pesan dipertukarkan melalui pipa standard input/output (stdio), terisolasi dari web.
- **Performa**: Komunikasi lokal langsung, tanpa latensi jaringan.
- **Protokol**: Menggunakan **JSON-RPC 2.0** untuk request/response terstruktur, memastikan type safety dan penanganan error.
- **Fallback**: Jika backend tidak tersedia, extension kembali ke penyimpanan SQLite lokal.

Koneksi dibuat on-demand (lazy connection) dan mendukung upaya rekoneksi (hingga 3 kali) saat disconnect.

## Arsitektur

### Alur Tingkat Tinggi

1. **Inisialisasi Extension**: Extension memuat `backend-service.js`, yang mengelola koneksi.
2. **Setup Koneksi**: Ketika operasi backend diperlukan (misalnya, mengambil akun), extension memanggil `chrome.runtime.connectNative("com.cursor.manager")` untuk membuka port ke native host.
3. **Pertukaran Pesan**:
   - Extension mengirim request JSON-RPC via `port.postMessage()`.
   - Backend membaca dari `stdin`, memproses request menggunakan layanan yang di-route, dan menulis response ke `stdout`.
4. **Native Host**: Script Python (`backend/native_host.py`) bertindak sebagai host, menangani I/O stdio dengan JSON length-prefixed (header panjang 4-byte + payload JSON).
5. **Layanan**: Backend meroute request ke layanan khusus (misalnya, `AccountService`, `CardsService`) yang berinteraksi dengan database SQLite lokal.
6. **Disconnect/Error**: Extension menangani disconnect, menolak pending request, dan mencatat error.

### Komponen

- **Sisi Extension**:
  - `extension/manifest.json`: Mendeklarasikan permission `"nativeMessaging"` dan host permissions.
  - `extension/services/backend-service.js`: Lapisan komunikasi inti (singleton class `BackendService`).
  - Layanan lain (misalnya, `account-backend.js`) menggunakan `BackendService` untuk panggilan API.
- **Sisi Backend**:
  - `extension/manifest_native_host.json.template`: Mendefinisikan manifest native host (nama: `"com.cursor.manager"`, tipe: `"stdio"`, path ke executable Python).
  - `backend/native_host.py`: Entry point utama; menginisialisasi layanan dan menangani routing JSON-RPC.
  - Layanan: `account_service.py`, `cards_service.py`, dll., untuk logika bisnis.
  - Database: SQLite lokal (`database.py`).
- **Setup Registry**: Di Windows, native host didaftarkan via `backend/native_host.bat` atau edit registry manual (di bawah `HKCU\Software\Mozilla\NativeMessagingHosts` atau equivalent Chrome).

## Sisi Extension (JavaScript)

### File Utama: `extension/services/backend-service.js`

Singleton class ini menangani semua interaksi backend.

#### Koneksi

- **Metode**: `connect()` – Membuat port native menggunakan `chrome.runtime.connectNative(this.hostName)` dimana `hostName = "com.cursor.manager"`.
- **Event Listener**:
  - `onMessage`: Menerima response dan menyelesaikan pending promise.
  - `onDisconnect`: Menangani penutupan, menolak pending request, dan mencoba rekoneksi (backoff eksponensial: 1s, 2s, 3s).
- **Cek Status**: `isAvailable()` ping backend dan kembali ke mode lokal jika tidak tersedia.

#### Request/Response

- **Protokol**: JSON-RPC 2.0.
- **Kirim Request**: `request(method, params)` – Menghasilkan `id` unik, menyimpan promise di `pendingRequests` (Map), kirim via `postMessage`.
  - Contoh Request:
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "accounts.getAll",
      "params": { "status": "active" }
    }
    ```
- **Penanganan Response**: `_handleMessage(message)` – Cocokkan `id`, resolve/reject promise berdasarkan `result` atau `error`.
- **Error**: Reject dengan `Error(message.error.message)`.

#### Metode API

Diekspos sebagai metode async yang membungkus `request()`:

- **Akun**: `getAllAccounts()`, `createAccount(email, password, cookies)`, `updateAccount(id, updates)`, dll.
- **Kartu**: `getAllCards()`, `createCard(cardNumber, cardHolder, expiry, cvv)`, dll.
- **Sistem**: `ping()`, `getVersion()`, `createBackup()`.
- **Lainnya**: Bypass testing, pro trial, export/import, batch operations, events.

#### Logging

- Console log untuk request/response, koneksi, dan error.
- Peringatan jika backend tidak tersedia: "Extension will use fallback mode."

### Konfigurasi Manifest

Dari `extension/manifest.json`:

```json
{
  "permissions": ["nativeMessaging", ...],
  "host_permissions": ["<all_urls>"]
}
```

Dari `extension/manifest_native_host.json.template` (dihasilkan saat install):

```json
{
  "name": "com.cursor.manager",
  "description": "Native messaging host for Cursor Manager Extension",
  "path": "REPLACE_WITH_PYTHON_PATH", // e.g., "C:\\Python\\python.exe backend\\native_host.py"
  "type": "stdio",
  "allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID_HERE/"]
}
```

- Diinstall via `backend/install.py` atau setup manual.

## Sisi Backend (Python)

### File Utama: `backend/native_host.py`

Berjalan sebagai proses long-lived, mendengarkan di stdio.

#### Inisialisasi

- Import layanan: `AccountService`, `CardsService`, `Database`, dll.
- Setup logging ke `~/cursor_manager/logs/backend.log`.
- Membuat instance `NativeHost` dengan semua layanan diinjeksi.

#### Penanganan I/O

- **Baca**: `read_message()` – Membaca panjang 4-byte (uint32), lalu payload JSON dari `stdin.buffer`.
- **Tulis**: `send_message(message)` – Encode JSON, prepend panjang, tulis ke `stdout.buffer` dan flush.
- **Loop**: `run()` – Loop tak terbatas: baca → tangani → kirim, sampai EOF.

#### Pemrosesan Request

- **Metode**: `handle_request(request)` – Parse JSON-RPC, route berdasarkan prefix (misalnya, "accounts." → `_handle_accounts`).
- **Routing**:
  - `accounts.*`: Panggil metode `AccountService` (get_all, create, update, dll.).
  - `cards.*`: `CardsService`.
  - `system.*`: Ping, version, backup.
  - `bypass.*`, `proTrial.*`, `export.*`, dll.: Layanan khusus.
- **Penanganan Error**: Tangkap exception, kembalikan error JSON-RPC (`code: -32603`, `message: str(e)`). Log dengan traceback.
- **Response**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": { "accounts": [...] }  // atau "error": { ... }
  }
  ```

#### Integrasi Layanan

- **Database**: SQLite via `database.py` (tabel untuk akun, kartu, events).
- **Logika Bisnis**: Setiap layanan menangani CRUD, validasi (misalnya, Luhn untuk kartu), dan integrasi (misalnya, cek status API).
- **Events**: `EventService` log semua operasi untuk audit.

#### Entry Point

- `main()`: Buat `NativeHost()` dan panggil `run()`.
- Jalankan via: `python backend/native_host.py` atau file bat.

# Native Messaging — Penjelasan Mendetail (dari Sisi Extension ↔ Native App)

Native Messaging adalah mekanisme resmi (Chrome/Edge/Firefox) yang memungkinkan extension berkomunikasi **langsung** dengan aplikasi native yang terpasang di mesin pengguna. Browser akan **menjalankan proses native** dan komunikasi terjadi lewat `stdin` / `stdout` menggunakan pesan JSON ber-frame (panjang pesan + payload). Ini bukan WebSocket/HTTP — browser memanggil program lokal dan bertukar pesan via pipe. ([Chrome for Developers][1])

## Alur Kerja Singkat

1. Kamu buat **native manifest** (JSON) yang mendefinisikan `name`, `path`, `type`, dan `allowed_origins` (Chrome) / `allowed_extensions` (Firefox).
2. Manifest disimpan di lokasi tertentu (atau didaftarkan di registry Windows).
3. Extension memanggil `runtime.connectNative()` atau `runtime.sendNativeMessage()` dengan `name` yang sama.
4. Browser mem-start proses host dan mengirimkan pesan ke `stdin` host; host membalas lewat `stdout`. ([Chrome for Developers][1])

## Struktur Berkas Manifest (Contoh Chrome)

Contoh `com.cursor.manager.json`:

```json
{
  "name": "com.cursor.manager",
  "description": "Native messaging host for Cursor Manager Extension",
  "path": "C:\\Python\\python.exe backend\\native_host.py",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<EXT_ID>/"]
}
```

Keterangan penting:

- `name`: string yang dipanggil extension. (format terbatas: huruf kecil, angka, underscore, titik).
- `path`: path ke executable native (di Linux/macOS harus **absolute**).
- `type`: sekarang hanya `"stdio"`.
- `allowed_origins`: Array untuk mendukung multiple browser (Chrome, Edge, Brave, dll.). Gunakan `chrome-extension://<EXT_ID>/` dimana `<EXT_ID>` adalah ID extension yang sama untuk semua browser Chromium-based. Untuk mendapatkan ID, buka chrome://extensions/ (atau edge://extensions/, brave://extensions/), dan salin ID dari URL seperti ?id=hlkenndednhfkekhgcdicdfddnkalmdm. Jika ID berbeda per browser, tambahkan origins tambahan ke array. **Firefox** pakai `allowed_extensions` dengan ID extension sebagai string array (beda nama key). ([Chrome for Developers][1])

## Lokasi / Pendaftaran Manifest (Ringkas)

- **Windows**: manifest bisa diletakkan di mana saja, _tetapi_ installer harus membuat registry key:

  - `HKCU\Software\Google\Chrome\NativeMessagingHosts\<name>` atau
  - `HKLM\Software\Google\Chrome\NativeMessagingHosts\<name>`
    dan nilai default key = path ke file manifest (.json). (contoh `REG ADD` ada di dokumentasi). ([Chrome for Developers][1])

- **macOS / Linux**: lokasi berbeda untuk Chrome/Chromium; contoh user-level Chrome:

  - `~/.config/google-chrome/NativeMessagingHosts/<name>.json` (Linux)
  - `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/<name>.json` (macOS)
    Untuk Firefox lokasi berbeda lagi (lihat MDN). ([Chrome for Developers][1])

Catatan: **Chrome OS**: third-party native messaging hosts tidak didukung (keterbatasan platform). ([Stack Overflow][2])

## Protokol Pesan (Teknis Penting)

- Pesan dikirim sebagai JSON (UTF-8).
- **Frame**: setiap pesan didahului header 32-bit (4 byte) yang menyatakan panjang pesan dalam _native byte order_ (platform byte order). Setelah header, datang payload JSON dalam UTF-8. Host dan browser menggunakan format **yang sama** ke dua arah.
- Batas ukuran: dari **host → browser** maksimum 1 MB; dari **browser → host** maksimum 64 MB.
- Chrome mengoper **origin** pemanggil sebagai argumen pertama ke proses host (berguna untuk memverifikasi sumber). Pada Windows ada arg tambahan `--parent-window=...` jika relevan. ([Chrome for Developers][1])

## Contoh Python Native Host (Robust, Siap Dipakai)

Simpan file mis. `native_host.py`. Jalankan sebagai executable (di Windows biasanya di-wrap jadi `.exe` atau gunakan file association).

```python
#!/usr/bin/env python3
import sys, struct, json, os

def read_message():
    raw_len = sys.stdin.buffer.read(4)
    if len(raw_len) == 0:
        return None
    # gunakan native byte order (struct 'I' default = native)
    msg_len = struct.unpack('I', raw_len)[0]
    if msg_len == 0:
        return None
    data = sys.stdin.buffer.read(msg_len)
    return json.loads(data.decode('utf-8'))

def send_message(obj):
    encoded = json.dumps(obj).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def main():
    # arg1 biasanya origin (mis. chrome-extension://<EXT_ID>/)
    origin = sys.argv[1] if len(sys.argv) > 1 else None

    # contoh: loop menerima pesan dan echo + add info origin
    while True:
        msg = read_message()
        if msg is None:
            break
        # proses pesan (selalu validasi / sanitasi)
        print(f"DEBUG: received message keys: {list(msg.keys())}", file=sys.stderr)
        resp = {
            "ok": True,
            "received": msg,
            "from_origin": origin
        }
        send_message(resp)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"Host error: {e}", file=sys.stderr)
        sys.exit(1)
```

Catatan:

- Pakai `sys.stdin.buffer` / `sys.stdout.buffer` untuk I/O biner — jangan print debug ke `stdout` karena akan merusak framing; gunakan `stderr` untuk log/debug.
- `struct.pack('I', ...)` dan `struct.unpack('I', ...)` memakai **native byte order** sesuai yang diharapkan browser. ([Chrome for Developers][1])

## Contoh Sisi Extension (JS)

**connectNative** (port — proses hidup selama port terbuka):

```javascript
// service worker / background script
const port = chrome.runtime.connectNative("com.cursor.manager");
port.onMessage.addListener((msg) => {
  console.log("Dari native host:", msg);
});
port.onDisconnect.addListener(() => {
  console.log("Native host disconnected");
});
port.postMessage({ text: "halo, host!" });
```

**sendNativeMessage** (one-shot — proses dijalankan per pesan dan Chrome akan menutupnya setelah respon):

```javascript
chrome.runtime.sendNativeMessage(
  "com.cursor.manager",
  { text: "satu pesan" },
  function (response) {
    console.log("response", response);
  }
);
```

Jangan lupa deklarasi permission `"nativeMessaging"` di `manifest.json`. ([Chrome for Developers][1])

## Cara Registrasi di Windows (Contoh Cepat)

Bisa dibuat oleh installer (.msi / .exe) atau reg file:

`.reg` contoh:

```
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.cursor.manager]
@="C:\\path\\to\\com.cursor.manager.json"
```

Atau gunakan `REG ADD` di command prompt (lihat docs). Pastikan path JSON benar dan executable pada `path` ada & boleh dijalankan. ([Chrome for Developers][1])

## Debugging & Jebakan Umum

- **Manifest tidak ditemukan / nama tidak cocok** — cek `name` sama persis antara manifest dan `connectNative()` / `sendNativeMessage()`. ([Chrome for Developers][1])
- **allowed_origins / allowed_extensions**: bila extension tidak tercantum → akses ditolak. Chrome pakai origin (`chrome-extension://ID/`), Firefox pakai ID extension. ([Chrome for Developers][1])
- **I/O rusak karena debug prints ke stdout** — gunakan `stderr` untuk logging. Browser akan menganggap output `stdout` harus sesuai protokol. ([Chrome for Developers][1])
- **Byte order / struct length** — header 4 byte harus dalam _native byte order_. Jika host menggunakan packing yang salah (mis. 8 byte), komunikasi gagal. ([Chrome for Developers][1])
- **Permissions / executable flags** di Linux/macOS: pastikan `chmod +x` jika mengeksekusi script.
- Untuk melihat log: jalankan Chrome dari terminal (Linux/macOS) atau enable logging di Windows (`--enable-logging`) lalu amati error terkait native messaging. ([Chrome for Developers][1])

## Keamanan & Best-Practices

- **Batasi `allowed_origins`** hanya ke extension yang kamu kontrol — jangan buka wildcard. ([Chrome for Developers][1])
- **Validasi input** di host — jangan trust pesan dari extension tanpa cek.
- **Jangan keluarkan debug ke stdout.**
- **Installer** harus menaruh manifest pada lokasi yang sesuai / registrasi registry; extension **tidak** bisa sendiri menulis registry/manifest (karena alasan keamanan).
- Pertimbangkan code signing / packaging host jadi `.exe` untuk Windows agar lebih mudah di-manage oleh installer.

## Perbedaan Chrome vs Firefox — Singkat

- Chrome: manifest `allowed_origins` (origin URL: `chrome-extension://<ID>/`). Lokasi manifest berbeda per Chrome/Chromium dan per platform; di Windows: registry key menunjuk ke file JSON. ([Chrome for Developers][1])
- Firefox: manifest property bernama `allowed_extensions` (pakai extension ID string) dan lokasi manifest berbeda (lihat MDN). Firefox juga memeriksa registry di Windows. ([MDN Web Docs][3])

## Contoh Langkah Cepat (Checklist Implementasi)

1. Buat `native_host.py` (contoh di atas). Test manual lewat CLI (agar tidak keluar error). ([chromium.googlesource.com][4])
2. Buat manifest JSON sesuai contoh, sesuaikan `path` & `name`. ([Chrome for Developers][1])
3. Daftarkan manifest (registry di Windows / file path di Linux/macOS). ([Chrome for Developers][1])
4. Di extension: minta permission `nativeMessaging` dan gunakan `connectNative()` / `sendNativeMessage()`. ([Chrome for Developers][1])
5. Debug: jalankan Chrome dari terminal / cek stderr logs, pastikan framing benar. ([Chrome for Developers][1])

## Protokol Pesan: JSON-RPC 2.0 over Stdio

- **Framing**: Length-prefixed (4 bytes big-endian uint32) + UTF-8 JSON.
- **Struktur Request**:
  ```json
  {
    "jsonrpc": "2.0",
    "id": <unique integer>,
    "method": "<namespace.action>",  // e.g., "accounts.create"
    "params": { <key-value pairs> }
  }
  ```
- **Struktur Response**:
  - Sukses: `"result": <any>`
  - Error: `"error": { "code": <int>, "message": "<string>" }`
- **Batching**: Tidak didukung (request tunggal).
- **Notifications**: Tidak digunakan (semua request mengharapkan response).

### Contoh Pertukaran

1. Extension: Kirim panjang 4 + JSON request untuk `accounts.getAll`.
2. Backend: Baca, panggil `account_service.get_all()`, kirim panjang 4 + JSON result `{ "accounts": [...] }`.
3. Extension: Terima, resolve promise.

## Setup dan Instalasi

### Instalasi Extension

- Load unpacked di VSCode/Chrome: `chrome://extensions/` → Load direktori `extension/`.
- Extension ID auto-generated; update `manifest_native_host.json`.

### Instalasi Backend

1. Install dependensi Python: `pip install -r backend/requirements.txt`.
2. Jalankan installer: `python backend/install.py` (daftarkan native host di registry).
   - Di Windows: Tambah ke `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cursor.manager` yang menunjuk ke manifest JSON.
3. Start backend: `backend/native_host.bat` (jalankan script Python).
4. Opsi GUI: `backend/gui.py` untuk management (hubung via subprocess).

### Verifikasi

- Extension: Panggil `BackendService.ping()` → Harus kembalikan `{ "status": "ok" }`.
- Logs: Cek `~/cursor_manager/logs/backend.log` dan browser console.

## Penanganan Error dan Troubleshooting

### Error Umum

- **Koneksi Gagal**: "Backend not available" – Cek jika path Python di manifest benar; pastikan backend diinstall/daftar.
- **Disconnect**: Rekoneksi dicoba; jika gagal >3 kali, fallback ke DB lokal.
- **Metode Tidak Valid**: Error JSON-RPC `-32601`: Metode tidak diketahui.
- **Error Internal**: `-32603`: Log full traceback di backend.log.
- **Masalah Stdio**: Pastikan tidak ada buffering; Python gunakan `buffer` untuk I/O biner.

### Debugging

- **Extension**: Browser console (F12) untuk log JS.
- **Backend**: Tail `backend.log`; tambah `print` untuk test cepat.
- **Test Koneksi**: Gunakan tool test native messaging Chrome atau `isAvailable()` extension.
- **Cek Registry**: Windows Registry Editor → Cari "com.cursor.manager".

### Mode Fallback

- Jika backend tidak tersedia, extension gunakan `sql.js` (WASM SQLite) di `extension/libs/`.
- Sync data: `database-sync.js` coba sync backend secara periodik saat tersedia.

## Pertimbangan Keamanan

- **Permissions**: Extension minta perms minimal; native host terisolasi.
- **Data**: Sensitif (akun, kartu) disimpan terenkripsi di DB; gunakan password aman.
- **Validasi**: Sanitasi input di layanan; cek Luhn untuk kartu.
- **Origins**: Manifest batasi ke extension ID saja.
- **Compliance**: Layanan seperti `compliance-manager.js` enforce aturan.

## Peningkatan Masa Depan

- WebSocket fallback untuk backend remote.
- gRPC over Native Messaging untuk performa lebih baik.
- Auto-update backend via extension.

Dokumentasi ini berdasarkan analisis kode versi 4.0.0. Untuk update, lihat `CHANGELOG.md`.
