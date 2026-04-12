# 🗺️ Roadmap Pengembangan Ngepos
Terakhir Diperbarui: 11 April 2026 (Status: Step 1 Selesai)

Dokumen ini merangkum rencana pengembangan fitur-fitur utama untuk membawa **Ngepos** dari status MVP ke aplikasi POS yang matang, aman, dan siap skala.

---

## 🚀 Prioritas Utama (Quick Wins & Core Security)

Fase ini fokus pada memberikan nilai tambah langsung kepada pengguna dan memperkuat fondasi akses aplikasi.

### 1. Ekspor Laporan (Document Export)
*   **Tujuan:** Memungkinkan pengguna mengunduh data penjualan/pengeluaran untuk keperluan audit atau pembukuan eksternal.
*   **Output:** Format Excel (.xlsx) dan PDF (.pdf).
*   **Status:** 📅 Segera Dimulai.

### 2. Visualisasi Laporan (Financial Charts)
*   **Tujuan:** Memberikan kemudahan bagi pemilik untuk membaca tren bisnis secara visual (grafik batang/garis).
*   **Komponen:** Grafik omset vs HPP per hari/minggu dan persentase metode pembayaran.
*   **Status:** 📅 Segera Dimulai.

### 3. Keamanan Akses (Halaman Login)
*   **Tujuan:** Melindungi data lokal agar tidak bisa diakses oleh orang yang tidak berwenang pada perangkat yang sama.
*   **Fitur:** Login via PIN atau Password, session management (SolidJS state).
*   **Status:** 📅 Direncanakan.

### 4. Sinkronisasi Cloud (Secure API)
*   **Tujuan:** Keamanan data (backup) dan sinkronisasi antar-perangkat secara menyeluruh.
*   **Cara:** Koneksi ke Backend (Drizzle/Postgres) via REST API dengan otentikasi JWT.
*   **Status Saat Ini (Tersinkronisasi):**
    *   ✅ Transaksi & Item Transaksi (Sales Data)
    *   ✅ Pengeluaran (Expenses)
*   **Roadmap Entitas Belum Tersinkronisasi (Task Berikutnya):**
    *   ⏳ Master Produk & Kategori (Products, Categories)
    *   ⏳ Bahan Baku & Riwayat Stok (Raw Material Library, Inventory Logs)
    *   ⏳ Variasi & Opsi (Variant Templates)
    *   ⏳ Manajemen Karyawan & Hak Akses (Staff, Roles)
    *   ⏳ Manajemen Pelanggan & Loyalitas (Customers, Stempel, Rewards, Loyalty Programs)
    *   ⏳ Promosi & Diskon (Discounts, Bundles, Campaigns)
    *   ⏳ Konfigurasi Sistem (Settings, Pajak, dsb)

### 5. Fitur PWA Penuh (Full App Experience)
*   **Tujuan:** Membuat aplikasi dapat "diinstal" di homescreen HP dan berjalan lebih stabil secara offline dengan caching aset yang lebih baik.
*   **Fitur:** Manifest PWA, Service Worker, Push Notifications (opsional).
*   **Status:** 📅 Direncanakan.

---

### 🛠️ Penguatan Operasional (Next Phase)

Setelah fondasi keamanan dan pelaporan stabil, fase berikutnya akan fokus pada fitur operasional lanjutan.

#### 1. Otomatisasi Stok (Smart Inventory)
Pengurangan jumlah stok produk dan bahan baku secara otomatis setiap kali transaksi "Bayar" diselesaikan.

#### 2. Dukungan Barcode Scanning
Interaksi cepat menggunakan barcode scanner (HID/Camera) untuk memasukkan produk ke keranjang tanpa pencarian manual.

#### 3. Pembayaran Terpisah (Split Payment)
Fleksibilitas pembayaran dalam satu transaksi (misal: 50% Tunai, 50% Transfer/QRIS).

#### 4. Log Aktivitas (Audit Trail)
Pencatatan setiap aksi staff (tambah produk, hapus transaksi, ubah harga) untuk transparansi dan akuntabilitas.

---

## 📈 Target Keberhasilan
- **Offline Reliability:** 100% (Data tersimpan lokal dulu, lalu sync ke cloud).
- **Fast Checkout:** Rata-rata transaksi selesai di bawah 20 detik.
- **Data Safety:** Seluruh data krusial tersinkronisasi ke cloud secara berkala.
- **Portability:** Laporan dapat diekspor dan dibagikan dalam waktu < 5 detik.

---

> [!NOTE]
> Roadmap ini bersifat fleksibel dan dapat diperbarui berdasarkan kebutuhan prioritas bisnis dan feedback pengguna.
