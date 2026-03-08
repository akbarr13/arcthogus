# Deploy ke cPanel (Node.js / Phusion Passenger)

## Persiapan (lakukan sekali)

Copy file environment variables:
```bash
cp .env.local.example .env.local
```
Isi `.env.local` dengan credentials Supabase kamu, lalu build dan siapkan folder deploy:
```bash
npm run build
bash deploy.sh
```
Folder `deploy_cpanel/` siap diupload.

---

## 1. Upload Files

Upload seluruh isi folder `deploy_cpanel/` ke server via **File Manager** atau **FTP/SSH**.

Contoh lokasi tujuan:
```
/home/<username>/arcthogus/
```

> Taruh di luar `public_html` supaya lebih rapi, nanti diarahkan lewat subdomain.

---

## 2. Setup Node.js App di cPanel

Buka **cPanel → Setup Node.js App → Create Application**, isi:

| Field | Value |
|---|---|
| Node.js version | `18.x` atau `20.x` |
| Application mode | `Production` |
| Application root | `/home/<user>/arcthogus` |
| Application URL | Domain/subdomain (misal `arcthogus.domain.com`) |
| Application startup file | `app.js` |

---

## 3. Set Environment Variables

Masih di halaman yang sama, scroll ke bagian **Environment Variables**, tambahkan:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key) |
| `ALLOWED_ORIGIN` | `https://domainmu.com` |

> **JANGAN** commit file `.env.local` ke git. Service role key bersifat rahasia.

---

## 4. Install & Jalankan

1. Klik **"Run NPM Install"** — tunggu hingga selesai
2. Klik **"Restart"**

---

## 5. Setup Subdomain (opsional)

Buka **cPanel → Subdomains**, buat subdomain (misal `arcthogus.domainmu.com`), arahkan document root ke folder yang sama dengan Application root di langkah 2.

---

## Update / Redeploy

Setiap ada perubahan kode:

```bash
npm run build
bash deploy.sh
```

Upload ulang isi `deploy_cpanel/` ke server (timpa file lama), lalu di cPanel klik **Restart**.

---

## Troubleshooting

- **Error saat start** → cPanel → Node.js App → klik app → **View Log**
- **Halaman tidak terbuka** → pastikan subdomain sudah mengarah ke Application root yang benar
- **API error** → cek Environment Variables sudah terisi semua dan benar
