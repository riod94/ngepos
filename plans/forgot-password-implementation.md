# Rencana Implementasi Fitur Lupa Password & Perbaikan Email Deliverability

## 📋 Ringkasan
Dokumen ini berisi rencana implementasi lengkap untuk fitur lupa password dan perbaikan masalah email masuk spam pada proyek Ngepos.

---

## 🔐 Bagian 1: Perbaikan Email Deliverability

### Status Saat Ini
✅ **SSL sudah terkonfigurasi dengan benar**
- Konfigurasi nodemailer di `src/server/utils/mail.ts` sudah menggunakan `secure: true` untuk port 465
- SMTP Sumopod sudah menggunakan port SSL standar 465
- Masuk spam BUKAN disebabkan oleh masalah SSL

### Penyebab Email Masuk Spam
1.  ❌ Belum ada SPF/DKIM/DMARC record di DNS domain
2.  ❌ Header email kurang lengkap
3.  ❌ Email konten memiliki pola yang terdeteksi spam
4.  ❌ Tidak ada reverse DNS (PTR record) untuk IP pengirim

### Langkah Perbaikan
| No | Tindakan | Lokasi File |
|---|---|---|
| 1 | Tambahkan header email tambahan untuk anti spam | `src/server/utils/mail.ts` |
| 2 | Tambahkan `Message-ID` yang valid dengan domain sendiri | `src/server/utils/mail.ts` |
| 3 | Tambahkan `List-Id` header | `src/server/utils/mail.ts` |
| 4 | Tambahkan `Return-Path` header | `src/server/utils/mail.ts` |
| 5 | Tambahkan record SPF di DNS domain | DNS Panel |
| 6 | Tambahkan record DKIM di DNS domain | DNS Panel |
| 7 | Tambahkan record DMARC di DNS domain | DNS Panel |

---

## 🔑 Bagian 2: Implementasi Fitur Lupa Password

### Alur Kerja Fitur
```mermaid
flowchart LR
    A[User buka halaman login] --> B[Klik link Lupa Password]
    B --> C[Masukkan alamat email]
    C --> D[Cek apakah email terdaftar]
    D -->|Tidak terdaftar| E[Tampilkan pesan sukses (untuk keamanan)]
    D -->|Terdaftar| F[Generate token reset password unik]
    F --> G[Simpan token ke database dengan expiry 1 jam]
    G --> H[Kirim email berisi link reset password]
    H --> E
    E --> I[User buka link dari email]
    I --> J[Validasi token reset password]
    J -->|Token tidak valid / expired| K[Tampilkan pesan error]
    J -->|Token valid| L[User memasukkan password baru]
    L --> M[Update password user di database]
    M --> N[Hapus token reset password]
    N --> O[Redirect ke halaman login]
```

### Daftar File Yang Perlu Dibuat / Dimodifikasi

#### 1. Database Schema
| File | Perubahan |
|---|---|
| `src/server/db/schema.ts` | Tambah tabel `passwordResetTokens` |
| `drizzle/xxxx_password_reset_tokens.sql` | Buat migrasi database |

#### 2. Server Utils
| File | Perubahan |
|---|---|
| `src/server/utils/mail.ts` | Tambah fungsi `sendPasswordResetEmail()` |

#### 3. API Endpoints
| File | Kegunaan |
|---|---|
| `src/routes/api/auth/forgot-password.ts` | Endpoint request reset password |
| `src/routes/api/auth/reset-password.ts` | Endpoint konfirmasi reset password |

#### 4. Halaman UI
| File | Kegunaan |
|---|---|
| `src/routes/forgot-password.tsx` | Halaman form lupa password |
| `src/routes/reset-password.tsx` | Halaman form reset password |

#### 5. Modifikasi File Yang Ada
| File | Perubahan |
|---|---|
| `src/routes/login.tsx` | Tambahkan link "Lupa Password" |

---

## ✅ Checklist Implementasi

### Tahap 1: Database
- [ ] Tambah schema tabel `passwordResetTokens`
- [ ] Generate dan jalankan migrasi drizzle
- [ ] Tambah index pada kolom `email` dan `token`

### Tahap 2: Backend
- [ ] Tambah fungsi kirim email reset password
- [ ] Buat endpoint `POST /api/auth/forgot-password`
- [ ] Tambah rate limiting 5 request per 15 menit
- [ ] Buat endpoint `POST /api/auth/reset-password`
- [ ] Validasi token expiry dan penggunaan
- [ ] Hash password baru dengan bcrypt

### Tahap 3: Frontend
- [ ] Buat halaman form lupa password
- [ ] Buat halaman form reset password
- [ ] Tambahkan link di halaman login
- [ ] Tambahkan validasi form client side
- [ ] Tambahkan loading state dan pesan error

### Tahap 4: Perbaikan Email
- [ ] Tambahkan header email tambahan anti spam
- [ ] Perbaiki konten email agar tidak terdeteksi spam
- [ ] Tambahkan plain text fallback untuk semua email
- [ ] Tambahkan konfigurasi TLS rejectUnauthorized false jika diperlukan

---

## 🔒 Catatan Keamanan
1.  Jangan pernah memberitahu user apakah email terdaftar atau tidak (untuk mencegah enumerasi email)
2.  Token reset password hanya bisa digunakan 1 kali
3.  Token expiry maksimal 1 jam
4.  Rate limiting pada endpoint forgot-password
5.  Password baru harus memenuhi policy password yang sama dengan register
6.  Setelah password direset, semua session user yang aktif harus dihapus

---

## 📌 Prioritas Pengerjaan
1.  Perbaikan header email (cepat selesai, dampak besar)
2.  Implementasi backend fitur lupa password
3.  Implementasi frontend fitur lupa password
4.  Setup DNS record SPF/DKIM/DMARC
