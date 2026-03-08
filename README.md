<div align="center">
  <img src="public/assets/img/logo.png" alt="Arcthogus Logo" width="100" />
  <h1>Arcthogus Esports</h1>
  <p><strong>Born in the pandemic. Forged through competition.</strong></p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
  ![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)
</div>

---

Website resmi **Arcthogus** — tim esports Valorant asal Indonesia yang berdiri sejak 2021. Dibangun dengan Next.js 16 dan Supabase, dilengkapi sistem toko jersey online, panel admin, dan halaman profil tim yang interaktif.

## Fitur

- **Homepage interaktif** — particle canvas, custom cursor, parallax, scroll reveal, glitch effect, dan typing animation
- **Toko jersey** — order online dengan QRIS dinamis per nominal, upload bukti bayar, dan cek status order via Order ID
- **Panel admin** — kelola pesanan, update status, lihat bukti bayar, atur harga dan stok toko, ganti password
- **Keamanan** — rate limiting per IP (Supabase RPC), harga dihitung di server, validasi MIME upload, CSP headers, HSTS, dan CORS

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI | React 19, TypeScript 5 |
| Backend / Auth | Supabase (PostgreSQL, Auth, Storage) |
| Deploy | cPanel + Phusion Passenger |

## Struktur Proyek

```
app/
├── page.tsx              # Homepage
├── store/page.tsx        # Toko jersey
├── login/page.tsx        # Login admin
├── dashboard/page.tsx    # Panel admin
└── api/
    ├── submit-order/     # Terima order baru
    ├── confirm-payment/  # Upload bukti bayar
    ├── check-order/      # Cek status order (publik)
    └── auth/callback/    # OAuth callback Supabase
lib/
└── supabase/
    ├── server.ts         # Service role client (server-only)
    └── browser.ts        # Anon key client (browser)
proxy.ts                  # Middleware auth
```

## Setup Lokal

**1. Clone & install**

```bash
git clone https://github.com/akbarr13/arcthogus.git
cd arcthogus
npm install
```

**2. Environment variables**

```bash
cp .env.local.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGIN=http://localhost:3000
```

**3. Supabase — buat tabel & fungsi**

Buat dua tabel di Supabase:

- `orders` — kolom: `id, name, phone, address, size, qty, price, total, status, payment_proof, notes, created_at`
- `settings` — wajib ada row dengan `id = 1`

Buat tiga RPC functions:

```sql
check_rate_limit(p_ip, p_endpoint, p_max, p_window_seconds) → boolean
check_order_status(p_order_id) → row (tanpa PII)
submit_payment_proof(p_order_id, p_proof_url) → void
```

Buat dua storage bucket:

- `payment-proofs` → **private**
- `store-assets` → **public**

Aktifkan RLS di tabel `orders`.

**4. Jalankan dev server**

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Deploy ke cPanel

Lihat [`DEPLOY.md`](DEPLOY.md) untuk panduan lengkap.

```bash
npm run build
bash deploy.sh
# Upload isi deploy_cpanel/ ke server, lalu restart Node.js App di cPanel
```

## Sosial Media

[![Instagram](https://img.shields.io/badge/@atg.familiaofc-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://www.instagram.com/atg.familiaofc)
[![Discord](https://img.shields.io/badge/Join%20Discord-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/w7CfzWDE5)

---

<div align="center">
  &copy; 2021 Arcthogus&trade; — All Rights Reserved.
</div>
