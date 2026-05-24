# Dokumentasi Backend KOPMA — Koperasi Digital Mahasiswa

## Daftar Isi

1. [Sekilas Sistem](#1-sekilas-sistem)
2. [Technology Stack](#2-technology-stack)
3. [Struktur Proyek](#3-struktur-proyek)
4. [Model Data (Database)](#4-model-data-database)
5. [Modul & Dependency Graph](#5-modul--dependency-graph)
6. [Autentikasi & Otorisasi](#6-autentikasi--otorisasi)
7. [API Reference](#7-api-reference)
   - [Auth](#71-auth)
   - [Users](#72-users)
   - [Payments](#73-payments)
   - [Withdrawals](#74-withdrawals)
   - [Savings](#75-savings)
   - [Reports](#76-reports)
   - [Dashboard](#77-dashboard)
   - [Notifications](#78-notifications)
   - [Announcements](#79-announcements)
   - [Fakultas](#710-fakultas)
   - [Email](#711-email)
8. [WebSocket (Real-time)](#8-websocket-real-time)
9. [File Storage](#9-file-storage)
10. [Email Service](#10-email-service)
11. [Environment Variables](#11-environment-variables)
12. [Cara Menjalankan](#12-cara-menjalankan)
13. [Testing](#13-testing)

---

## 1. Sekilas Sistem

Backend **KOPMA (Koperasi Mahasiswa)** adalah sistem informasi keuangan koperasi berbasis web yang melayani dua peran pengguna:

- **ANGGOTA** — Mahasiswa yang dapat melakukan pembayaran simpanan dan mengajukan penarikan.
- **ADMIN** — Pengelola yang memverifikasi pembayaran & penarikan, membuat pengumuman, dan melihat laporan.

Sistem mencakup manajemen simpanan (Pokok, Wajib, Sukarela), verifikasi pembayaran, penarikan dana, dashboard real-time, notifikasi (WebSocket + REST + Email), dan sistem autentikasi dengan refresh token rotation.

---

## 2. Technology Stack

| Layer | Teknologi |
|-------|-----------|
| **Runtime** | Node.js (v18+) |
| **Framework** | NestJS v11 |
| **Bahasa** | TypeScript v5 (target ES2023) |
| **ORM** | Prisma v7 + `@prisma/adapter-pg` |
| **Database** | PostgreSQL |
| **Autentikasi** | JWT + Passport + bcrypt |
| **Real-time** | Socket.IO (WebSocket) |
| **File Upload** | Multer — Local storage (Cloudinary optional) |
| **Email** | Resend API |
| **Validasi** | class-validator + class-transformer |
| **Testing** | Jest + fast-check + Supertest |

---

## 3. Struktur Proyek

```
backend/
├── .env                          # Environment variables
├── .env.example                  # Template environment
├── package.json
├── tsconfig.json
├── nest-cli.json
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Migrasi database
│   ├── seed.js                   # Seeder utama
│   ├── seed-admin.js             # Seed akun admin
│   ├── seed-anggota.js           # Seed anggota dari CSV
│   ├── seed-simpanan.js          # Seed data simpanan
│   ├── fakultas.json             # Data fakultas & jurusan (UAD)
│   └── DATA-ANGGOTA.csv          # Data anggota
│
├── src/
│   ├── main.ts                   # Entry point aplikasi
│   ├── app.module.ts             # Root module
│   ├── app.controller.ts         # Root controller
│   ├── app.service.ts            # Root service
│   │
│   ├── prisma/                   # Prisma ORM
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts     # Koneksi database
│   │
│   ├── common/                   # Global modules
│   │   ├── common.module.ts      # JWT + Guards global
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts    # @Public()
│   │   │   └── roles.decorator.ts     # @Roles('ADMIN')
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts      # JWT global guard
│   │       └── roles.guard.ts         # Role-based guard
│   │
│   ├── auth/                     # Autentikasi
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── refresh-token.service.ts   # Token rotation
│   │   ├── login-history.controller.ts
│   │   ├── login-history.service.ts
│   │   └── dto/
│   │
│   ├── users/                    # Manajemen user
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── payments/                 # Pembayaran
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── dto/
│   │
│   ├── withdrawals/              # Penarikan
│   │   ├── withdrawals.controller.ts
│   │   ├── withdrawals.service.ts
│   │   └── dto/
│   │
│   ├── savings/                  # Simpanan
│   │   ├── savings.controller.ts
│   │   └── savings.service.ts
│   │
│   ├── reports/                  # Laporan (admin)
│   │   ├── reports.controller.ts
│   │   └── reports.service.ts
│   │
│   ├── dashboard/                # Dashboard
│   │   ├── dashboard.controller.ts
│   │   └── dashboard.service.ts
│   │
│   ├── notifications/            # Notifikasi (REST + WS)
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.gateway.ts  # Socket.IO
│   │   └── dto/
│   │
│   ├── announcements/            # Pengumuman
│   │   ├── announcements.controller.ts
│   │   ├── announcements.service.ts
│   │   └── dto/
│   │
│   ├── fakultas/                 # Data fakultas & jurusan
│   │   ├── fakultas.controller.ts
│   │   └── fakultas.service.ts
│   │
│   ├── email/                    # Email service
│   │   ├── email.controller.ts
│   │   └── email.service.ts
│   │
│   ├── storage/                  # File storage lokal
│   │   ├── storage.module.ts
│   │   └── storage.service.ts
│   │
│   └── cloudinary/               # Cloudinary (opsional)
│       ├── cloudinary.module.ts
│       ├── cloudinary.provider.ts
│       └── cloudinary.service.ts
│
├── test/                         # E2E tests
│   └── app.e2e-spec.ts
│
└── uploads/                      # File uploads
    ├── profiles/                 # Foto profil
    └── proofs/                   # Bukti pembayaran
```

---

## 4. Model Data (Database)

### Entity Relationship

```
User (1) ── (N) Payment
User (1) ── (N) Withdrawal
User (1) ── (1) Saving
User (1) ── (N) RefreshToken
User (1) ── (N) LoginHistory
User (1) ── (N) Notification
User (1) ── (N) Announcement (as creator)
User (1) ── (N) MandatorySaving
User (1) ── (N) VoluntarySaving

Payment (1) ── (1) MandatorySaving (optional)
Payment (1) ── (1) VoluntarySaving (optional)
RefreshToken (1) ── (1) RefreshToken (self: token rotation chain)
```

### Enums

| Enum | Values |
|------|--------|
| `Role` | `ANGGOTA`, `ADMIN` |
| `PaymentStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `PaymentMethod` | `Cash`, `QRIS`, `BankTransfer` |
| `WithdrawalStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `WithdrawalPaymentMethod` | `Cash`, `BankTransfer` |
| `SavingType` | `Pokok`, `Wajib`, `Sukarela`, `Semua` |
| `MandatorySavingStatus` | `UNPAID`, `PAID` |

### Model: User (`users`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `name` | String | Nama lengkap |
| `email` | String (unique) | |
| `password` | String | bcrypt hash |
| `role` | Role enum | `ANGGOTA` / `ADMIN` |
| `angkatan` | String? | Tahun angkatan |
| `nim` | String? | Nomor Induk Mahasiswa |
| `fakultas` | String? | |
| `prodi` | String? | Program studi |
| `birthDate` | DateTime? | Tanggal lahir |
| `address` | String? | Alamat |
| `phone` | String? | Nomor HP |
| `photo` | String? | URL foto profil |
| `isActive` | Boolean | Soft delete flag |

### Model: Payment (`payments`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK) | Pembayar |
| `nominal` | Decimal(15,2) | Jumlah |
| `proofImage` | String | URL bukti bayar |
| `status` | PaymentStatus | `PENDING` / `APPROVED` / `REJECTED` |
| `description` | String? | Deskripsi (menentukan jenis simpanan) |
| `paymentMethod` | PaymentMethod | `Cash` / `QRIS` / `BankTransfer` |
| `verifiedBy` | String? (FK) | Admin verifikator |
| `verifiedAt` | DateTime? | Waktu verifikasi |

**Logika deskripsi:**
- Jika deskripsi mengandung `"pokok"` → Simpanan Pokok (hanya mempengaruhi total Saving)
- Jika deskripsi mengandung `"wajib"` → Simpanan Wajib (dicatat di `MandatorySaving`)
- Selainnya → Simpanan Sukarela (dicatat di `VoluntarySaving`)

### Model: Withdrawal (`withdrawals`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK) | Penarik |
| `nominal` | Decimal(15,2) | Jumlah |
| `reason` | String | Alasan penarikan |
| `savingType` | SavingType | `Pokok` / `Wajib` / `Sukarela` / `Semua` |
| `paymentMethod` | WithdrawalPaymentMethod | `Cash` / `BankTransfer` |
| `status` | WithdrawalStatus | `PENDING` / `APPROVED` / `REJECTED` |
| `rejectionReason` | String? | Alasan ditolak |
| `verifiedBy` | String? (FK) | Admin verifikator |
| `verifiedAt` | DateTime? | |

### Model: Saving (`savings`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK, unique) | Satu user = satu record |
| `total` | Decimal(15,2) | Total simpanan (di-increment saat pembayaran approved, di-decrement saat penarikan approved) |

### Model: RefreshToken (`refresh_tokens`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `token` | String (unique) | SHA-256 hash token |
| `userId` | String (FK) | |
| `userAgent` | String? | |
| `expiresAt` | DateTime | |
| `revokedAt` | DateTime? | |
| `replacedByTokenId` | String? (unique) | ID token pengganti (chain) |

**Token rotation**: Setiap refresh membuat token baru. Jika token lama digunakan kembali setelah di-refresh, seluruh keluarga token di-revoke (theft detection).

### Model: LoginHistory (`login_history`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK) | |
| `ipAddress` | String | IP address (mendukung X-Forwarded-For) |
| `userAgent` | String | |
| `browser` | String? | (parsed via ua-parser-js) |
| `browserVersion` | String? | |
| `os` | String? | |
| `osVersion` | String? | |
| `device` | String? | Desktop / Mobile / Tablet |
| `deviceBrand` | String? | |
| `deviceModel` | String? | |
| `country` / `city` / `region` | String? | GeoIP (via geoip-lite) |
| `status` | String | `SUCCESS` / `FAILED` |
| `failureReason` | String? | |

### Model: Notification (`notifications`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String? (FK) | Null = broadcast untuk admin |
| `type` | String | `payment` / `withdrawal` / `system` |
| `title` | String | |
| `message` | String | |
| `isRead` | Boolean | |
| `actionUrl` | String? | URL terkait |
| `isAdmin` | Boolean | True = visible untuk semua admin |

### Model: Announcement (`announcements`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `title` | String | |
| `message` | String | |
| `startDate` / `endDate` | DateTime | Periode tayang |
| `isActive` | Boolean | |
| `createdBy` | String (FK) | Pembuat |

### Model: MandatorySaving (`mandatory_savings`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK) | |
| `month` / `year` | Int | Periode (unique per user+month+year) |
| `nominal` | Decimal(15,2) | |
| `status` | MandatorySavingStatus | `UNPAID` / `PAID` |
| `paidAt` | DateTime? | |
| `paymentId` | String? (FK, unique) | Pembayaran terkait |

### Model: VoluntarySaving (`voluntary_savings`)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID (PK) | |
| `userId` | String (FK) | |
| `nominal` | Decimal(15,2) | |
| `paymentId` | String? (FK, unique) | Pembayaran terkait |

---

## 5. Modul & Dependency Graph

```
AppModule
├── CommonModule (global: JWT + Guards)
├── PrismaModule (global)
├── AuthModule → NotificationsModule
├── UsersModule → StorageModule, NotificationsModule
├── PaymentsModule → StorageModule, EmailModule, NotificationsModule
├── WithdrawalsModule → EmailModule, NotificationsModule
├── SavingsModule
├── ReportsModule
├── DashboardModule
├── NotificationsModule → CommonModule
├── AnnouncementsModule
├── FakultasModule
├── EmailModule
├── StorageModule
└── CloudinaryModule
```

---

## 6. Autentikasi & Otorisasi

### Global JWT Guard

Semua route **dilindungi secara default** oleh `JwtAuthGuard` yang terdaftar sebagai `APP_GUARD` global. Route yang ingin publik harus didekorasi `@Public()`.

- Header: `Authorization: Bearer <access_token>`
- Token expired: default **15 menit** (konfigurabel via `JWT_EXPIRES_IN`)
- Payload JWT: `{ sub, email, role, name }`

### Role-based Access Control

`RolesGuard` global membaca dekorator `@Roles('ADMIN')`. Jika tidak ada dekorator, semua user terautentikasi dapat mengakses.

### Refresh Token System

- Token refresh disimpan di **httpOnly cookie** (path: `/`).
- Dua mode:
  - **Biasa**: 1 hari expiry
  - **Remember Me**: 30 hari expiry
- **Token rotation**: Setiap refresh menghasilkan token baru, token lama ditandai. Jika token lama digunakan lagi → seluruh keluarga token di-revoke (theft detection).
- Token disimpan di DB dengan **SHA-256 hashing**.

---

## 7. API Reference

Base URL: `{BASE_URL}/api`

### 7.1 Auth

Semua endpoint auth bersifat publik (`@Public()`), kecuali dinyatakan lain.

#### POST `/auth/login`

Login dengan email & password.

**Request Body:**
```json
{
  "email": "anggota@email.com",
  "password": "password123",
  "rememberMe": true
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "Nama Anggota",
    "email": "anggota@email.com",
    "role": "ANGGOTA",
    "photo": "/uploads/profiles/xxx.jpg",
    "angkatan": "2022"
  }
}
```

*Refresh token dikirim sebagai httpOnly cookie (`refresh_token`).*

#### POST `/auth/refresh`

Refresh access token. Token diambil dari cookie `refresh_token` atau body.

**Request Body (opsional):**
```json
{
  "refresh_token": "token_dari_body_jika_tidak_pakai_cookie"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/auth/logout`

Logout, revoke token, hapus cookie.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

#### POST `/auth/logout-all`

`[Authenticated]` Logout dari semua perangkat.

**Response (200):**
```json
{
  "message": "Logged out from all devices successfully"
}
```

#### POST `/auth/change-password`

`[Authenticated]` Ganti password.

**Request Body:**
```json
{
  "currentPassword": "password_lama",
  "newPassword": "password_baru_min_8_karakter",
  "confirmPassword": "password_baru_min_8_karakter"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password berhasil diubah. Silakan login ulang."
}
```

#### GET `/auth/me`

`[Authenticated]` Profil user saat ini.

#### GET `/auth/login-history`

`[Authenticated]` Riwayat login user sendiri (paginated).

**Query:** `?page=1&limit=20`

#### GET `/auth/login-history/all`

`[Admin]` Riwayat login semua user (paginated, filterable).

**Query:** `?page=1&limit=20&userId=xxx&status=SUCCESS&country=ID`

---

### 7.2 Users

#### POST `/users`

`[Admin]` Buat user baru. Password di-generate otomatis dari NIM jika tidak diisi.

**Request Body:**
```json
{
  "name": "Nama Anggota",
  "email": "anggota@email.com",
  "nim": "2200012345",
  "angkatan": "2022",
  "fakultas": "Fakultas Teknik",
  "prodi": "Informatika",
  "birthDate": "2004-05-17",
  "address": "Jl. Contoh No. 1",
  "phone": "08123456789",
  "role": "ANGGOTA"
}
```

#### GET `/users`

`[Admin]` Daftar semua anggota.

#### GET `/users/me`

`[Authenticated]` Profil user sendiri.

#### PATCH `/users/me`

`[Authenticated]` Update profil sendiri.

**Request Body:** (partial)

#### PATCH `/users/me/photo`

`[Authenticated]` Upload foto profil sendiri.

**Body:** `multipart/form-data` dengan field `photo`

#### GET `/users/delinquent/mandatory-payment`

`[Admin]` Anggota yang belum bayar wajib >= 5 bulan.

#### GET `/users/:id`

`[Admin]` Detail user by ID.

#### PATCH `/users/:id`

`[Admin]` Update user.

#### DELETE `/users/:id`

`[Admin]` Soft-delete (set `isActive = false`).

#### PATCH `/users/:id/photo`

`[Admin]` Upload foto user.

#### DELETE `/users/:id/photo`

`[Admin]` Hapus foto user.

---

### 7.3 Payments

#### POST `/payments`

`[Authenticated]` Ajukan pembayaran dengan bukti gambar.

**Body:** `multipart/form-data`
- `proofImage` (file) — **wajib**
- `nominal` (number)
- `description` (string) — menentukan jenis simpanan
- `paymentMethod` (enum: `Cash` / `QRIS` / `BankTransfer`)

**Response (201):**
```json
{
  "message": "Payment submitted successfully",
  "payment": { ... }
}
```

#### GET `/payments`

`[Authenticated]` Daftar pembayaran (filtered by role).

**Query:** `?userId=xxx&startDate=2024-01-01&endDate=2024-12-31&status=PENDING`

- `ANGGOTA`: hanya melihat milik sendiri
- `ADMIN`: bisa filter `userId`

#### GET `/payments/:id`

`[Authenticated]` Detail pembayaran.

#### PATCH `/payments/:id/approve`

`[Admin]` Verifikasi pembayaran (approve/reject).

**Request Body:**
```json
{
  "status": "APPROVED"
}
```

**Business Logic (transactional):**
1. Update status payment
2. Jika `APPROVED`: `Saving.total` increment
3. Jika deskripsi mengandung `"wajib"`: upsert `MandatorySaving` (PAID)
4. Jika bukan `"wajib"`/`"pokok"`: create `VoluntarySaving`
5. Kirim notifikasi: WebSocket → REST → Email

---

### 7.4 Withdrawals

#### POST `/withdrawals`

`[Authenticated]` Ajukan penarikan.

**Request Body:**
```json
{
  "nominal": 500000,
  "reason": "Biaya semester",
  "savingType": "Sukarela",
  "paymentMethod": "Cash"
}
```

Validasi:
- Cek saldo cukup
- Cegah duplikat pending withdrawal
- Hitung breakdown simpanan per jenis
- Validasi saldo per jenis simpanan mencukupi

#### POST `/withdrawals/withdraw-all`

`[Authenticated]` Penarikan semua saldo (untuk lulus/meninggalkan koperasi).

**Request Body:**
```json
{
  "reason": "Lulus",
  "paymentMethod": "BankTransfer"
}
```

#### GET `/withdrawals`

`[Authenticated]` Daftar penarikan (filtered by role). Query params sama seperti payments.

#### GET `/withdrawals/:id`

`[Authenticated]` Detail penarikan.

#### PATCH `/withdrawals/:id/approve`

`[Admin]` Verifikasi penarikan.

**Request Body:**
```json
{
  "status": "APPROVED",
  "rejectionReason": "Saldo tidak mencukupi"
}
```

**Business Logic (transactional):**
1. Update status withdrawal
2. Jika `APPROVED`: `Saving.total` decrement
3. Kirim notifikasi: WebSocket → REST → Email

---

### 7.5 Savings

#### GET `/savings/me`

`[Authenticated]` Total simpanan sendiri.

```json
{
  "total": 2500000,
  "userId": "uuid"
}
```

#### GET `/savings/me/breakdown`

`[Authenticated]` Rincian simpanan per jenis (Pokok / Wajib / Sukarela).

#### GET `/savings/me/chart`

`[Authenticated]` Data chart 6 bulan (saldo per bulan).

#### GET `/savings`

`[Admin]` Semua simpanan anggota.

#### GET `/savings/:id/breakdown`

`[Admin]` Rincian simpanan user tertentu.

#### GET `/savings/history/:userId`

`[Admin]` Riwayat simpanan (mandatory + voluntary).

---

### 7.6 Reports

Semua endpoint `[Admin]`.

#### GET `/reports/daily?date=2024-01-15`

Laporan harian transaksi (payment & withdrawal).

#### GET `/reports/angkatan?angkatan=2022`

Laporan per angkatan.

#### GET `/reports/summary`

Ringkasan sistem:
- Total anggota
- Total simpanan
- Total penarikan
- Jumlah pembayaran pending
- Statistik per jenis simpanan

---

### 7.7 Dashboard

#### GET `/dashboard`

`[Authenticated]` Dashboard role-based.

**ANGGOTA:**
```json
{
  "success": true,
  "data": {
    "totalSavings": 2500000,
    "breakdown": { "Pokok": 100000, "Wajib": 1400000, "Sukarela": 1000000 },
    "recentPayments": [],
    "recentWithdrawals": [],
    "chartData": [],
    "unpaidMandatorySavings": []
  }
}
```

**ADMIN:**
```json
{
  "success": true,
  "data": {
    "totalMembers": 1500,
    "totalSavings": 500000000,
    "totalWithdrawals": 50000000,
    "pendingPayments": 12,
    "pendingWithdrawals": 5,
    "monthlyTrends": [],
    "angkatanStats": [],
    "recentTransactions": [],
    "alerts": [],
    "savingBreakdown": {}
  }
}
```

---

### 7.8 Notifications

#### GET `/notifications`

`[Authenticated]` Daftar notifikasi user.

#### GET `/notifications/unread-count`

`[Authenticated]` Jumlah notifikasi belum dibaca.

```json
{
  "success": true,
  "data": { "count": 5 }
}
```

#### POST `/notifications/:id/read`

`[Authenticated]` Tandai satu notifikasi sebagai sudah dibaca.

#### POST `/notifications/read-all`

`[Authenticated]` Tandai semua sebagai sudah dibaca.

#### DELETE `/notifications`

`[Authenticated]` Hapus semua notifikasi.

#### POST `/notifications/custom`

`[Admin]` Kirim notifikasi kustom ke user tertentu atau broadcast.

**Request Body:**
```json
{
  "title": "Pengumuman",
  "message": "Pesan...",
  "actionUrl": "/pengumuman/1",
  "targetUserId": "uuid_atau_kosong_untuk_broadcast"
}
```

---

### 7.9 Announcements

#### GET `/announcements/active`

`[Authenticated]` Pengumuman yang sedang aktif (dalam periode tayang).

#### GET `/announcements`

`[Admin]` Semua pengumuman.

#### POST `/announcements`

`[Admin]` Buat pengumuman.

```json
{
  "title": "Judul",
  "message": "Isi pengumuman",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "isActive": true
}
```

#### PATCH `/announcements/:id`

`[Admin]` Update pengumuman.

#### DELETE `/announcements/:id`

`[Admin]` Hapus pengumuman.

---

### 7.10 Fakultas

Semua endpoint publik (`@Public()`).

#### GET `/fakultas`

Semua fakultas beserta jurusannya.

```json
{
  "success": true,
  "data": [
    {
      "fakultas": "Fakultas Teknik",
      "jurusan": ["Informatika", "Elektro", "Mesin"]
    }
  ]
}
```

#### GET `/fakultas/list`

Daftar nama fakultas (tanpa jurusan).

#### GET `/fakultas/jurusan?fakultas=Fakultas%20Teknik`

Jurusan berdasarkan fakultas.

---

### 7.11 Email

#### POST `/email/test`

`[Authenticated]` Uji kirim email.

**Request Body:**
```json
{
  "to": "user@email.com"
}
```

---

## 8. WebSocket (Real-time)

### Connection

- **Namespace:** `/notifications`
- **URL:** `{WS_URL}/notifications`
- **Auth:** Bearer token via `auth.headers.authorization` atau `auth.query.token`

### Rooms

| Room | Anggota |
|------|---------|
| `user:{userId}` | User spesifik (mendapat notifikasi pribadi) |
| `role:ADMIN` | Semua admin (mendapat notifikasi admin) |

### Client → Server Events

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `subscribe` | `{ userId, role }` | Subscribe ke notifikasi |
| `unsubscribe` | — | Unsubscribe |

### Server → Client Events

**Event: `notification`**

```json
{
  "type": "payment|withdrawal|system",
  "action": "created|approved|rejected",
  "data": {
    "id": "uuid",
    "userName": "Nama",
    "amount": 500000,
    "status": "PENDING|APPROVED|REJECTED",
    "message": "Pesan tambahan"
  }
}
```

### Broadcast Scenarios

| Skenario | Dikirim ke |
|----------|------------|
| Pembayaran baru dibuat | Semua admin (`role:ADMIN`) |
| Pembayaran di-approve/reject | User bersangkutan (`user:{id}`) |
| Penarikan baru dibuat | Semua admin (`role:ADMIN`) |
| Penarikan di-approve/reject | User bersangkutan (`user:{id}`) |
| Notifikasi kustom | User target atau semua |

---

## 9. File Storage

### Local Storage (Default)

- **Path:** `{UPLOAD_PATH}/` (default `./uploads/`)
- **Subdirektori:**
  - `profiles/` — Foto profil
  - `proofs/` — Bukti pembayaran
- **MIME diizinkan:** `image/jpeg`, `image/png`, `image/webp`
- **Max size:** 5MB
- **Nama file:** UUID random dengan ekstensi asli
- **Serve static:** `/uploads/{subdir}/{filename}`
- **Path traversal protection** pada delete

### Cloudinary (Opsional)

Modul `cloudinary/` tersedia sebagai alternatif, dengan method `uploadImage()` dan `deleteImage()`.

---

## 10. Email Service

Menggunakan **Resend API**.

### Fitur

| Method | Penerima | Keterangan |
|--------|----------|------------|
| `sendWelcomeEmail` | User baru | Selamat datang |
| `sendPaymentNotification` | User | Status pembayaran (approve/reject) |
| `sendWithdrawalNotification` | User | Status penarikan (approve/reject) |
| `sendAdminPaymentNotification` | Admin | Ada pembayaran baru |
| `sendAdminWithdrawalNotification` | Admin | Ada penarikan baru |

- Jika `RESEND_API_KEY` tidak dikonfigurasi, service berjalan di **mock mode** (log saja, tidak kirim).

---

## 11. Environment Variables

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | `kopmasupersecretkey` | Secret access token |
| `JWT_EXPIRES_IN` | `15m` | Expiry access token |
| `REFRESH_TOKEN_SECRET` | `kopmarefreshtokensecretkey` | Secret refresh token |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d` | Expiry refresh token |
| `REFRESH_TOKEN_COOKIE_NAME` | `refresh_token` | Nama cookie |
| `PORT` | `3000` | Port server |
| `FRONTEND_URL` | `http://localhost:5173` | Origin CORS (bisa comma-separated) |
| `UPLOAD_PATH` | `./uploads` | Path upload file |
| `MAX_FILE_SIZE` | `5242880` (5MB) | Maksimal ukuran file |
| `RESEND_API_KEY` | — | API key Resend |
| `EMAIL_FROM` | `noreply@kopma.com` | Pengirim email |
| `EMAIL_FROM_NAME` | `KOPMA System` | Nama pengirim |
| `CLOUDINARY_CLOUD_NAME` | — | (opsional) |
| `CLOUDINARY_API_KEY` | — | (opsional) |
| `CLOUDINARY_API_SECRET` | — | (opsional) |
| `WS_PORT` | `3002` | Port WebSocket |

---

## 12. Cara Menjalankan

### Prasyarat

- Node.js v18+
- PostgreSQL
- npm / yarn

### Setup

```bash
# 1. Clone & masuk direktori
cd backend

# 2. Install dependencies
npm install

# 3. Copy environment
cp .env.example .env
# Edit .env sesuai konfigurasi database

# 4. Generate Prisma client & migrate
npm run prisma:generate
npm run prisma:migrate

# 5. Seed data
npm run prisma:seed       # Data contoh
# atau seed per komponen:
node prisma/seed-admin.js     # Akun admin
node prisma/seed-anggota.js   # Anggota dari CSV
node prisma/seed-simpanan.js  # Data simpanan

# 6. Jalankan development
npm run start:dev

# 7. (Optional) Prisma Studio
npm run prisma:studio
```

### Scripts Penting

| Script | Perintah |
|--------|----------|
| `start:dev` | `nest start --watch` |
| `start:prod` | `node dist/main` |
| `build` | `nest build` |
| `prisma:generate` | `prisma generate` |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:seed` | `node prisma/seed.js` |
| `prisma:studio` | `prisma studio` |
| `test` | `jest` |
| `test:e2e` | `jest --config ./test/jest-e2e.json` |
| `lint` | `eslint "{src,test}/**/*.ts" --fix` |

---

## 13. Testing

### Unit Tests (Jest)

```bash
npm test
```

Test files:
| File | Lingkup |
|------|---------|
| `payments.controller.spec.ts` | Payment controller |
| `payments.service.spec.ts` | Payment service |
| `withdrawals.service.spec.ts` | Withdrawal service |
| `notifications.service.spec.ts` | Notification service |
| `create-payment.dto.spec.ts` | Property-based testing (fast-check) |

### E2E Tests

```bash
npm run test:e2e
```

### Property-based Testing

`create-payment.dto.spec.ts` menggunakan **fast-check** untuk menguji validasi DTO dengan 100+ input acak.

---

## Catatan Arsitektur

1. **Global JWT guard**: Semua route terproteksi default; gunakan `@Public()` untuk endpoint publik.
2. **Triple notification system**: Operasi kritis mengirim notifikasi melalui 3 jalur: WebSocket (real-time) → REST Notification (persisten) → Email (async).
3. **Savings breakdown by description**: Jenis simpanan ditentukan oleh parsing string `description` pada payment (`pokok`, `wajib`, lainnya → sukarela).
4. **Token rotation + theft detection**: Refresh token membentuk chain; penggunaan ulang token yang sudah di-rotate memicu revoke seluruh keluarga token.
5. **Soft delete user**: Gunakan `isActive` flag, bukan hard delete.
6. **Transactional operations**: Approve payment dan approve withdrawal berjalan dalam Prisma `$transaction` untuk menjaga konsistensi data.
