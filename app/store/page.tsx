'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase/browser'

type Settings = {
  jersey_price: number; jersey_description: string; jersey_image: string
  qris_image: string; qris_string: string; store_open: boolean
}

function esc(str: unknown): string {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
}
function formatRp(n: number) { return 'Rp\u00a0' + Number(n).toLocaleString('id-ID') }

function generateId(): string {
  const d = new Date()
  const date = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  const rand = Array.from(arr, b => chars[b % 36]).join('')
  return `ARC-${date}-${rand}`
}

function crc16(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4,'0')
}

function convertQrisDinamis(qrisStatic: string, nominal: number): string {
  const qris = qrisStatic.trim().slice(0, -4)
  const step1 = qris.replace('010211', '010212')
  const step2 = step1.split('5802ID')
  if (step2.length < 2) throw new Error('Format QRIS tidak valid')
  const nomStr = String(nominal)
  const uang = '54' + String(nomStr.length).padStart(2,'0') + nomStr + '5802ID'
  const fix = step2[0] + uang + step2[1]
  return fix + crc16(fix)
}

const SIZES = ['S','M','L','XL','XXL']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Verifikasi', confirmed: 'Pembayaran Terkonfirmasi',
  processing: 'Sedang Diproses', shipped: 'Sedang Dikirim',
  done: 'Selesai', cancelled: 'Dibatalkan',
}

export default function StorePage() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const qrisRef = useRef<HTMLDivElement>(null)

  // Settings & loading
  const settingsRef = useRef<Partial<Settings>>({})
  const loadingRef = useRef(true)

  // Selection
  const selectedSizeRef = useRef<string|null>(null)
  const qtyRef = useRef(1)

  // Modal state
  const currentOrderIdRef = useRef('')
  const proofFileRef = useRef<File|null>(null)

  useEffect(() => {
    // ===== Loading Screen =====
    const loader = document.getElementById('loader')
    const triggerLoader = () => setTimeout(() => { loader?.classList.add('done'); document.body.classList.add('loaded') }, 2200)
    if (document.readyState === 'complete') triggerLoader()
    else window.addEventListener('load', triggerLoader, { once: true })

    // ===== Custom Cursor =====
    let cx=0, cy=0, tx=0, ty=0, gx=0, gy=0
    let cf: number
    const cursor = cursorRef.current
    const glow = glowRef.current
    function onMouseMove(e: MouseEvent) { tx=e.clientX; ty=e.clientY }
    document.addEventListener('mousemove', onMouseMove)
    function animCursor() {
      cx+=(tx-cx)*.2; cy+=(ty-cy)*.2; gx+=(tx-gx)*.06; gy+=(ty-gy)*.06
      if (cursor) cursor.style.transform=`translate(${cx}px,${cy}px)`
      if (glow) glow.style.transform=`translate(${gx-150}px,${gy-150}px)`
      cf = requestAnimationFrame(animCursor)
    }
    animCursor()
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor?.classList.add('cursor-'+(el as HTMLElement).dataset.cursor))
      el.addEventListener('mouseleave', () => cursor?.classList.remove('cursor-pointer','cursor-text','cursor-view'))
    })

    // ===== Navbar =====
    const toggle = document.getElementById('navToggle')
    const links = document.getElementById('navLinks')
    toggle?.addEventListener('click', () => { links?.classList.toggle('open'); toggle.classList.toggle('active') })
    document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => { links?.classList.remove('open'); toggle?.classList.remove('active') }))
    window.addEventListener('scroll', () => document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50))

    // ===== ESC to close modal =====
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAllModals()
    }
    window.addEventListener('keydown', onKey)

    // ===== Init button state =====
    const btnK = document.getElementById('btnKonfirmasi') as HTMLButtonElement
    if (btnK) btnK.disabled = true

    // ===== Load settings & render =====
    async function init() {
      const sb = getBrowserSupabase()
      const { data } = await sb.from('settings').select('*').eq('id', 1).single()
      if (data) settingsRef.current = data
      loadingRef.current = false
      renderStore()
    }
    init()

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(cf)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  function openModal(id: string) {
    document.getElementById(id)?.classList.add('open')
    document.body.style.overflow = 'hidden'
  }
  function closeModal(id: string) {
    document.getElementById(id)?.classList.remove('open')
    document.body.style.overflow = ''
  }
  function closeAllModals() {
    document.querySelectorAll('.overlay.open').forEach(o => closeModal(o.id))
  }

  function getTotal() {
    return (settingsRef.current.jersey_price || 0) * qtyRef.current
  }

  function renderStore() {
    const s = settingsRef.current
    const content = document.getElementById('storeContent')
    if (!content) return

    if (loadingRef.current) {
      content.innerHTML = '<div style="text-align:center;padding:60px 0;color:var(--text-muted)"><span class="spinner"></span> Memuat produk...</div>'
      return
    }

    if (!s.store_open) {
      content.innerHTML = `<div class="closed-banner"><i class="fa fa-store-slash"></i><h3 style="font-family:var(--font-heading);margin-bottom:8px">STORE CLOSED</h3><p style="color:var(--text-secondary)">Store sedang tutup sementara. Cek lagi nanti!</p></div>`
      return
    }

    const imgHtml = s.jersey_image
      ? `<img src="${esc(s.jersey_image)}" alt="Jersey Arcthogus" />`
      : `<div class="product-img-placeholder"><i class="fa fa-shirt"></i><span style="font-size:.8rem">Foto belum diset</span></div>`

    content.innerHTML = `
      <div class="product-wrap">
        <div class="product-img-frame">${imgHtml}</div>
        <div class="product-info">
          <h2>Official Jersey</h2>
          <p class="product-desc">${esc(s.jersey_description) || 'Jersey resmi tim Arcthogus. Material berkualitas, desain eksklusif.'}</p>
          <div class="price-tag">${formatRp(s.jersey_price || 0)}</div>
          <div class="opt-label">Ukuran</div>
          <div class="sizes">
            ${SIZES.map(sz => `<button class="size-btn" data-size="${sz}" data-cursor="pointer">${sz}</button>`).join('')}
          </div>
          <div class="opt-label">Jumlah</div>
          <div class="qty-row">
            <button class="qty-ctrl" id="btnQtyMinus" data-cursor="pointer">&#8722;</button>
            <span class="qty-val" id="qtyVal">1</span>
            <button class="qty-ctrl" id="btnQtyPlus" data-cursor="pointer">+</button>
          </div>
          <div class="total-line">
            <span class="lbl">Total</span>
            <span class="val" id="totalVal">${formatRp(s.jersey_price || 0)}</span>
          </div>
          <button class="btn-order" id="btnOrder" data-cursor="pointer">
            <i class="fa fa-bag-shopping"></i> Order Sekarang
          </button>
        </div>
      </div>`

    // Bind size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSizeRef.current = (btn as HTMLElement).dataset.size || null
        document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b === btn))
      })
    })

    // Bind qty
    document.getElementById('btnQtyMinus')?.addEventListener('click', () => {
      qtyRef.current = Math.max(1, qtyRef.current - 1)
      updateQtyDisplay()
    })
    document.getElementById('btnQtyPlus')?.addEventListener('click', () => {
      qtyRef.current = Math.min(10, qtyRef.current + 1)
      updateQtyDisplay()
    })

    // Bind order button
    document.getElementById('btnOrder')?.addEventListener('click', openOrderForm)
  }

  function updateQtyDisplay() {
    const s = settingsRef.current
    const el = document.getElementById('qtyVal')
    const tv = document.getElementById('totalVal')
    if (el) el.textContent = String(qtyRef.current)
    if (tv) tv.textContent = formatRp((s.jersey_price || 0) * qtyRef.current)
  }

  function openOrderForm() {
    if (!selectedSizeRef.current) { alert('Pilih ukuran jersey dulu ya!'); return }
    const s = settingsRef.current
    const summary = document.getElementById('orderSummary')
    if (summary) {
      summary.innerHTML = `
        <div class="srow"><span class="k">Produk</span><span>Official Jersey</span></div>
        <div class="srow"><span class="k">Ukuran</span><span>${selectedSizeRef.current}</span></div>
        <div class="srow"><span class="k">Jumlah</span><span>${qtyRef.current}x</span></div>
        <div class="srow"><span class="k">Harga Satuan</span><span>${formatRp(s.jersey_price || 0)}</span></div>
        <div class="srow total"><span class="k">Total</span><span>${formatRp(getTotal())}</span></div>`
    }
    openModal('orderOverlay')
  }

  async function submitOrder() {
    if (!selectedSizeRef.current) { alert('Pilih ukuran jersey dulu ya!'); return }
    const name = (document.getElementById('custName') as HTMLInputElement)?.value.trim()
    const phone = (document.getElementById('custPhone') as HTMLInputElement)?.value.trim()
    const address = (document.getElementById('custAddress') as HTMLTextAreaElement)?.value.trim()
    if (!name || !phone || !address) { alert('Lengkapi semua data pemesanan!'); return }

    const btn = document.getElementById('btnLanjut') as HTMLButtonElement
    btn.disabled = true
    btn.innerHTML = '<span class="spinner"></span> Memproses...'

    const orderId = generateId()
    try {
      const res = await fetch('/api/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, name, phone, address, size: selectedSizeRef.current, qty: qtyRef.current }),
      })
      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Gagal membuat order. Coba lagi.')
        btn.disabled = false; btn.innerHTML = 'Lanjut ke Pembayaran'
        return
      }

      currentOrderIdRef.current = orderId
      closeModal('orderOverlay')
      showQrisModal(orderId, getTotal())
    } catch {
      alert('Gagal terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      btn.disabled = false; btn.innerHTML = 'Lanjut ke Pembayaran'
    }
  }

  async function showQrisModal(orderId: string, total: number) {
    const dispId = document.getElementById('dispOrderId')
    const dispTotal = document.getElementById('dispTotal')
    if (dispId) dispId.textContent = orderId
    if (dispTotal) dispTotal.textContent = formatRp(total)

    const wrap = qrisRef.current
    if (wrap) {
      wrap.innerHTML = ''
      const s = settingsRef.current
      if (s.qris_string) {
        try {
          const { default: QRCode } = await import('qrcode')
          const dynamicQris = convertQrisDinamis(s.qris_string, total)
          const canvas = document.createElement('canvas')
          await QRCode.toCanvas(canvas, dynamicQris, { width: 162, margin: 1 })
          wrap.appendChild(canvas)
        } catch { wrap.innerHTML = '<div class="qris-empty">String QRIS tidak valid.</div>' }
      } else if (s.qris_image) {
        wrap.innerHTML = `<img src="${esc(s.qris_image)}" alt="QRIS" />`
      } else {
        wrap.innerHTML = '<div class="qris-empty"><i class="fa fa-qrcode" style="font-size:3rem;color:#ccc;display:block;margin-bottom:8px"></i>QRIS belum diset oleh admin</div>'
      }
    }

    proofFileRef.current = null
    const prev = document.getElementById('proofPrev') as HTMLImageElement
    if (prev) prev.style.display = 'none'
    const fileInput = document.getElementById('proofFile') as HTMLInputElement
    if (fileInput) fileInput.value = ''
    const btnKonfirmasi = document.getElementById('btnKonfirmasi') as HTMLButtonElement
    if (btnKonfirmasi) btnKonfirmasi.disabled = true
    openModal('qrisOverlay')
  }

  function previewProof(input: HTMLInputElement) {
    const file = input.files?.[0]
    if (!file) return
    const ALLOWED = ['image/jpeg','image/png','image/webp','image/gif']
    if (!ALLOWED.includes(file.type)) { alert('File harus berupa gambar (JPG, PNG, WebP, GIF).'); input.value=''; return }
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB.'); input.value=''; return }
    proofFileRef.current = file
    const prev = document.getElementById('proofPrev') as HTMLImageElement
    if (prev) {
      if (prev.src.startsWith('blob:')) URL.revokeObjectURL(prev.src)
      prev.src = URL.createObjectURL(file)
      prev.style.display = 'block'
    }
    const btn = document.getElementById('btnKonfirmasi') as HTMLButtonElement
    if (btn) btn.disabled = false
  }

  async function konfirmasiPembayaran() {
    if (!proofFileRef.current) { alert('Upload bukti pembayaran dulu!'); return }
    const btn = document.getElementById('btnKonfirmasi') as HTMLButtonElement
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Mengirim...'

    const formData = new FormData()
    formData.append('order_id', currentOrderIdRef.current)
    formData.append('file', proofFileRef.current)

    try {
      const res = await fetch('/api/confirm-payment', { method: 'POST', body: formData })
      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Gagal mengirim bukti. Coba lagi.')
        return
      }

      closeModal('qrisOverlay')
      const sid = document.getElementById('successOrderId')
      if (sid) sid.textContent = currentOrderIdRef.current
      openModal('successOverlay')
    } catch {
      alert('Gagal terhubung ke server. Periksa koneksi internet kamu.')
    } finally {
      btn.disabled = false; btn.innerHTML = 'Konfirmasi Pesanan'
    }
  }

  function selesai() {
    closeModal('successOverlay')
    selectedSizeRef.current = null; qtyRef.current = 1; currentOrderIdRef.current = ''; proofFileRef.current = null
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'))
    renderStore()
    ;(document.getElementById('custName') as HTMLInputElement)?.value && ((document.getElementById('custName') as HTMLInputElement).value = '')
    ;(document.getElementById('custPhone') as HTMLInputElement)?.value && ((document.getElementById('custPhone') as HTMLInputElement).value = '')
    ;(document.getElementById('custAddress') as HTMLTextAreaElement)?.value && ((document.getElementById('custAddress') as HTMLTextAreaElement).value = '')
  }

  async function cekStatus() {
    const input = document.getElementById('orderIdInput') as HTMLInputElement
    const id = input?.value.trim().toUpperCase()
    if (!id) return
    const card = document.getElementById('statusCard')!
    card.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)"><span class="spinner"></span> Mencari...</div>'
    card.classList.add('show')

    try {
      const res = await fetch('/api/check-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id }),
      })
      const json = await res.json()
      const row = json.data?.[0]

      if (!res.ok || !row) {
        card.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)"><i class="fa fa-circle-xmark" style="color:#ef4444;font-size:2rem;display:block;margin-bottom:10px"></i>Order ID tidak ditemukan.</div>`
        return
      }

      const s = String(row.status)
      const safeStatus = /^[a-z]+$/.test(s) ? s : 'unknown'
      card.innerHTML = `
        <div class="srow2"><span class="k">Order ID</span><span style="font-family:monospace">${esc(row.id)}</span></div>
        <div class="srow2"><span class="k">Produk</span><span>Jersey ${esc(row.size)} &times; ${esc(row.qty)}</span></div>
        <div class="srow2"><span class="k">Total</span><span>${formatRp(row.total)}</span></div>
        <div class="srow2"><span class="k">Status</span><span><span class="badge b-${safeStatus}">${esc(STATUS_LABELS[s] || s)}</span></span></div>
        <div class="srow2"><span class="k">Tanggal Order</span><span>${new Date(row.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</span></div>
        ${row.notes ? `<div class="notes-box">Catatan admin: ${esc(row.notes)}</div>` : ''}`
    } catch {
      card.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)"><i class="fa fa-circle-xmark" style="color:#ef4444;font-size:2rem;display:block;margin-bottom:10px"></i>Gagal terhubung ke server.</div>`
    }
  }

  function copyText(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    navigator.clipboard.writeText(el.textContent || '')
    const btn = document.querySelector(`[data-copy-for="${id}"]`) as HTMLElement
    if (!btn) return
    const orig = btn.innerHTML
    btn.innerHTML = '<i class="fa fa-check"></i> Tersalin!'
    btn.style.color = '#22c55e'; btn.style.borderColor = 'rgba(34,197,94,.4)'
    setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; btn.style.borderColor = '' }, 1800)
  }
  // expose to inline handlers
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).submitOrder = submitOrder;
    (window as unknown as Record<string, unknown>).konfirmasiPembayaran = konfirmasiPembayaran;
    (window as unknown as Record<string, unknown>).selesai = selesai;
    (window as unknown as Record<string, unknown>).cekStatus = cekStatus;
    (window as unknown as Record<string, unknown>).copyText = copyText;
    (window as unknown as Record<string, unknown>).closeModal = closeModal;
    (window as unknown as Record<string, unknown>).previewProof = previewProof;
  }

  return (
    <>
      {/* Loader */}
      <div className="loader" id="loader">
        <div className="loader-inner">
          <img src="/assets/img/logo.png" alt="" className="loader-logo" />
          <div className="loader-bar"><div className="loader-bar-fill" /></div>
          <span className="loader-text">LOADING</span>
        </div>
      </div>

      {/* Custom Cursor */}
      <div className="custom-cursor" ref={cursorRef} />
      <div className="cursor-glow" ref={glowRef} />

      {/* Navbar */}
      <header className="navbar" id="navbar">
        <div className="navbar-inner">
          <Link href="/" className="logo" data-cursor="pointer">
            <img src="/assets/img/logo.png" alt="Arcthogus Logo" className="logo-img" />
            <span className="logo-text">Arcthogus</span>
          </Link>
          <nav className="nav-links" id="navLinks">
            <Link href="/" className="nav-link" data-cursor="pointer">Home</Link>
            <Link href="/#about" className="nav-link" data-cursor="pointer">About</Link>
            <Link href="/#gallery" className="nav-link" data-cursor="pointer">Gallery</Link>
            <Link href="/#achievements" className="nav-link" data-cursor="pointer">Achievements</Link>
            <Link href="/#contact" className="nav-link" data-cursor="pointer">Contact</Link>
            <Link href="/store" className="nav-link active" data-cursor="pointer">Store</Link>
          </nav>
          <button className="nav-toggle" id="navToggle" aria-label="Toggle navigation">
            <span className="hamburger" />
          </button>
        </div>
      </header>

      {/* Store Hero */}
      <section className="store-hero">
        <span className="section-tag"><span className="tag-line" />Official Merchandise</span>
        <h1>MERCH <span className="text-accent">STORE</span></h1>
      </section>

      {/* Products */}
      <section className="products-section">
        <div className="container">
          <div id="storeContent">
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <span className="spinner" /> Memuat produk...
            </div>
          </div>
        </div>
      </section>

      {/* Status Checker */}
      <section className="checker-section">
        <div className="container">
          <div className="checker-inner">
            <h2>Cek <span className="text-accent">Status</span> Pesanan</h2>
            <p>Masukkan Order ID yang kamu terima setelah checkout</p>
            <div className="checker-row">
              <input type="text" id="orderIdInput" placeholder="ARC-20240101-ABCD"
                onKeyDown={e => e.key === 'Enter' && cekStatus()} />
              <button className="btn-cek" onClick={cekStatus}>Cek</button>
            </div>
            <div className="status-card" id="statusCard" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <img src="/assets/img/logo.png" alt="Arcthogus" className="footer-logo" />
              <span className="footer-name">Arcthogus</span>
            </div>
            <p className="footer-copy">&copy; 2021 Arcthogus&trade; &mdash; All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Order Form Modal */}
      <div className="overlay" id="orderOverlay" onClick={e => e.target === e.currentTarget && closeModal('orderOverlay')}>
        <div className="mbox">
          <button className="mclose" onClick={() => closeModal('orderOverlay')}>&times;</button>
          <h2>Data <span className="text-accent">Pemesanan</span></h2>
          <div className="fg"><label>Nama Lengkap</label><input type="text" id="custName" placeholder="John Doe" maxLength={100} /></div>
          <div className="fg"><label>No. WhatsApp</label><input type="tel" id="custPhone" placeholder="08xxxxxxxxxx" maxLength={16} /></div>
          <div className="fg"><label>Alamat Pengiriman</label><textarea id="custAddress" placeholder="Jl. ... No. ..., Kelurahan, Kecamatan, Kota, Kode Pos" maxLength={500} /></div>
          <div className="summary-box" id="orderSummary" />
          <div className="btn-row">
            <button className="btn-cancel" onClick={() => closeModal('orderOverlay')}>Batal</button>
            <button className="btn-sub" id="btnLanjut" onClick={submitOrder}>Lanjut ke Pembayaran</button>
          </div>
        </div>
      </div>

      {/* QRIS Modal */}
      <div className="overlay" id="qrisOverlay" onClick={e => e.target === e.currentTarget && closeModal('qrisOverlay')}>
        <div className="mbox">
          <button className="mclose" onClick={() => closeModal('qrisOverlay')}>&times;</button>
          <h2>Pembayaran <span className="text-accent">QRIS</span></h2>
          <div className="oid-chip">
            <div>
              <div className="lbl">Order ID</div>
              <div className="val" id="dispOrderId">-</div>
            </div>
            <button className="copy-btn" data-copy-for="dispOrderId" onClick={() => copyText('dispOrderId')}><i className="fa fa-copy" /> Salin</button>
          </div>
          <div className="pay-amount">
            <div className="lbl">Total Pembayaran</div>
            <div className="val" id="dispTotal">-</div>
          </div>
          <div className="qris-wrap" ref={qrisRef} />
          <div className="info-box">
            Buka aplikasi e-wallet / m-banking, scan QR di atas, lalu bayar sesuai nominal yang tertera.<br />
            Setelah bayar, upload screenshot bukti pembayaran di bawah.
          </div>
          <img className="proof-prev" id="proofPrev" alt="Preview bukti bayar" />
          <div className="upload-area">
            <input type="file" accept="image/*" id="proofFile"
              onChange={e => previewProof(e.target as HTMLInputElement)} />
            <i className="fa fa-upload" />
            <p>Klik untuk upload bukti pembayaran</p>
          </div>
          <button className="btn-sub full" id="btnKonfirmasi" onClick={konfirmasiPembayaran}>
            Konfirmasi Pesanan
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <div className="overlay" id="successOverlay">
        <div className="mbox" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>&#x2705;</div>
          <h2>Pesanan Diterima!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '.9rem', lineHeight: 1.6 }}>
            Pesananmu sedang kami proses. Simpan Order ID di bawah untuk tracking status pesanan.
          </p>
          <div className="oid-chip" style={{ justifyContent: 'center', gap: '12px' }}>
            <div>
              <div className="lbl">Order ID Kamu</div>
              <div className="val" id="successOrderId">-</div>
            </div>
            <button className="copy-btn" data-copy-for="successOrderId" onClick={() => copyText('successOrderId')}><i className="fa fa-copy" /> Salin</button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', margin: '12px 0 20px' }}>
            Admin akan memverifikasi pembayaranmu segera. Pantau status di kolom &ldquo;Cek Status Pesanan&rdquo;.
          </p>
          <button className="btn-sub full" onClick={selesai}>Selesai</button>
        </div>
      </div>
    </>
  )
}
