'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'

type Order = {
  id: string; name: string; phone: string; address: string
  size: string; qty: number; price: number; total: number
  status: string; payment_proof: string; notes: string; created_at: string
}

type Settings = {
  jersey_price: number; jersey_description: string
  jersey_image: string; qris_image: string; qris_string: string; store_open: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu Verifikasi', confirmed: 'Pembayaran Terkonfirmasi',
  processing: 'Sedang Diproses', shipped: 'Sedang Dikirim',
  done: 'Selesai', cancelled: 'Dibatalkan',
}

function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
function formatRp(n: number) { return 'Rp\u00a0' + Number(n).toLocaleString('id-ID') }

export default function DashboardPage() {
  const router = useRouter()

  const [tab, setTab] = useState<'orders' | 'settings'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailStatus, setDetailStatus] = useState('')
  const [detailNotes, setDetailNotes] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [updating, setUpdating] = useState(false)
  const [proofLoading, setProofLoading] = useState(false)

  // Settings form state
  const [setPrice, setSetPrice] = useState('')
  const [setDesc, setSetDesc] = useState('')
  const [storeOpen, setStoreOpen] = useState(true)
  const [qrisString, setQrisString] = useState('')
  const [jerseyFile, setJerseyFile] = useState<File | null>(null)
  const [qrisFile, setQrisFile] = useState<File | null>(null)
  const [jerseyPreview, setJerseyPreview] = useState('')
  const [qrisPreview, setQrisPreview] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingQris, setSavingQris] = useState(false)
  const [okProduct, setOkProduct] = useState(false)
  const [okQris, setOkQris] = useState(false)

  // New pass state
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')
  const [okPass, setOkPass] = useState(false)

  const loadOrders = useCallback(async () => {
    const sb = getBrowserSupabase()
    const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false })
    setOrders(data || [])
  }, [])

  const loadSettings = useCallback(async () => {
    const sb = getBrowserSupabase()
    const { data } = await sb.from('settings').select('*').eq('id', 1).single()
    if (!data) return
    setSettings(data)
    setSetPrice(String(data.jersey_price || ''))
    setSetDesc(data.jersey_description || '')
    setStoreOpen(data.store_open !== false)
    setQrisString(data.qris_string || '')
    if (data.jersey_image) setJerseyPreview(data.jersey_image)
    if (data.qris_image) setQrisPreview(data.qris_image)
  }, [])

  useEffect(() => {
    loadSettings()
    loadOrders()
  }, [loadSettings, loadOrders])

  useEffect(() => {
    document.body.style.cursor = 'auto'
    return () => { document.body.style.cursor = '' }
  }, [])

  async function logout() {
    const sb = getBrowserSupabase()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function openDetail(order: Order) {
    setSelectedOrder(order)
    setDetailStatus(order.status)
    setDetailNotes(order.notes || '')
    setProofUrl('')

    if (order.payment_proof) {
      setProofLoading(true)
      const sb = getBrowserSupabase()
      const { data } = await sb.storage
        .from('payment-proofs')
        .createSignedUrl(order.payment_proof, 3600)
      if (data) setProofUrl(data.signedUrl)
      setProofLoading(false)
    }
  }

  async function updateOrder() {
    if (!selectedOrder) return
    setUpdating(true)
    const sb = getBrowserSupabase()
    const { error } = await sb.from('orders')
      .update({ status: detailStatus, notes: detailNotes })
      .eq('id', selectedOrder.id)
    setUpdating(false)
    if (error) { alert('Gagal update. Coba lagi.'); return }
    await loadOrders()
    setSelectedOrder(null)
  }

  async function uploadToStorage(file: File, bucket: string, path: string): Promise<string> {
    const sb = getBrowserSupabase()
    const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  }
  const ALLOWED_IMAGE_TYPES = Object.keys(MIME_TO_EXT)

  async function saveProduct() {
    const price = parseInt(setPrice)
    if (!price || price <= 0) { alert('Masukkan harga yang valid.'); return }
    if (jerseyFile && !ALLOWED_IMAGE_TYPES.includes(jerseyFile.type)) {
      alert('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau GIF.'); return
    }
    setSavingProduct(true)
    const sb = getBrowserSupabase()
    const payload: Record<string, unknown> = { jersey_price: price, jersey_description: setDesc, store_open: storeOpen }
    if (jerseyFile) {
      const ext = MIME_TO_EXT[jerseyFile.type] ?? 'jpg'
      payload.jersey_image = await uploadToStorage(jerseyFile, 'store-assets', `jersey/jersey.${ext}`)
    }
    const { error } = await sb.from('settings').update(payload).eq('id', 1)
    setSavingProduct(false)
    if (error) { alert('Gagal menyimpan.'); return }
    setOkProduct(true)
    setTimeout(() => setOkProduct(false), 2500)
  }

  async function saveQris() {
    if (!qrisString && !qrisFile) { alert('Masukkan string QRIS atau upload gambar.'); return }
    if (qrisFile && !ALLOWED_IMAGE_TYPES.includes(qrisFile.type)) {
      alert('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau GIF.'); return
    }
    setSavingQris(true)
    const sb = getBrowserSupabase()
    const payload: Record<string, unknown> = {}
    if (qrisString) payload.qris_string = qrisString
    if (qrisFile) {
      const ext = MIME_TO_EXT[qrisFile.type] ?? 'jpg'
      payload.qris_image = await uploadToStorage(qrisFile, 'store-assets', `qris/qris.${ext}`)
    }
    const { error } = await sb.from('settings').update(payload).eq('id', 1)
    setSavingQris(false)
    if (error) { alert('Gagal menyimpan QRIS.'); return }
    setOkQris(true)
    setTimeout(() => setOkQris(false), 2500)
  }

  async function savePassword() {
    if (!newPass) { alert('Masukkan password baru.'); return }
    if (newPass.length < 8) { alert('Password minimal 8 karakter.'); return }
    if (newPass !== confPass) { alert('Password tidak cocok!'); return }
    const sb = getBrowserSupabase()
    const { error } = await sb.auth.updateUser({ password: newPass })
    if (error) { alert('Gagal: ' + error.message); return }
    setNewPass(''); setConfPass('')
    setOkPass(true)
    setTimeout(() => setOkPass(false), 2500)
  }

  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const stats = {
    total: orders.length,
    pending: pendingCount,
    active: orders.filter(o => ['confirmed','processing','shipped'].includes(o.status)).length,
    done: orders.filter(o => o.status === 'done').length,
    revenue: orders.filter(o => o.status === 'done').reduce((s, o) => s + o.total, 0),
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.2)',
    color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px',
    fontFamily: 'var(--font-body)', fontSize: '.9rem', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px', background: 'var(--bg-card)',
        borderRight: '1px solid rgba(157,78,221,.12)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: '22px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/assets/img/logo.png" alt="" style={{ width: '30px' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '.7rem', color: 'var(--text-secondary)' }}>ARCTHOGUS</span>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {(['orders', 'settings'] as const).map(t => (
            <div key={t}
              onClick={() => setTab(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '.86rem', marginBottom: '2px',
                background: tab === t ? 'rgba(157,78,221,.15)' : 'transparent',
                color: tab === t ? 'var(--purple-bright)' : 'var(--text-secondary)',
              }}
            >
              <i className={`fa ${t === 'orders' ? 'fa-list-check' : 'fa-gear'}`} style={{ width: '16px', textAlign: 'center' }} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'orders' && pendingCount > 0 && (
                <span style={{ marginLeft: 'auto', background: 'var(--purple)', color: '#fff', fontSize: '.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '10px' }}>
                  {pendingCount}
                </span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <div onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '.86rem', color: 'var(--text-muted)' }}>
            <i className="fa fa-right-from-bracket" style={{ width: '16px' }} /> Logout
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px', minHeight: '100vh' }}>

        {/* ===== Orders Tab ===== */}
        {tab === 'orders' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: '4px' }}>Orders</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Kelola semua pesanan masuk</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { num: stats.total, lbl: 'Total Orders', color: 'var(--purple-bright)' },
                { num: stats.pending, lbl: 'Menunggu Verifikasi', color: '#eab308' },
                { num: stats.active, lbl: 'Diproses', color: '#f97316' },
                { num: stats.done, lbl: 'Selesai', color: '#22c55e' },
                { num: formatRp(stats.revenue), lbl: 'Total Revenue', color: 'var(--purple-bright)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.12)', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: i === 4 ? '1rem' : '1.7rem', color: s.color }}>{s.num}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.12)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '.88rem', fontWeight: 600, flex: 1 }}>Daftar Pesanan</h3>
                <select
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.2)', color: 'var(--text-primary)', padding: '7px 12px', borderRadius: '6px', fontSize: '.8rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">Semua Status</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button onClick={loadOrders} style={{ background: 'transparent', border: '1px solid rgba(157,78,221,.3)', color: 'var(--purple)', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '.8rem' }}>
                  <i className="fa fa-rotate-right" /> Refresh
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr>
                      {['Order ID','Nama','WhatsApp','Size','Qty','Total','Status','Tanggal',''].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>Tidak ada pesanan</td></tr>
                    ) : filtered.map(o => {
                      const safeStatus = /^[a-z]+$/.test(o.status) ? o.status : 'unknown'
                      const waPhone = o.phone.replace(/\D/g,'').replace(/^0/,'62')
                      return (
                        <tr key={o.id}>
                          <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '.76rem', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{esc(o.id)}</td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{esc(o.name)}</td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-bright)' }}>{esc(o.phone)}</a>
                          </td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                            <span className="badge" style={{ background: 'rgba(157,78,221,.1)', color: 'var(--purple-bright)', border: '1px solid rgba(157,78,221,.3)' }}>{esc(o.size)}</span>
                          </td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{o.qty}</td>
                          <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--purple-bright)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>{formatRp(o.total)}</td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                            <span className={`badge b-${safeStatus}`}>{STATUS_LABELS[o.status] || o.status}</span>
                          </td>
                          <td style={{ padding: '11px 16px', fontSize: '.76rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                            {new Date(o.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' })}
                          </td>
                          <td style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                            <button onClick={() => openDetail(o)} style={{ background: 'rgba(157,78,221,.1)', border: '1px solid rgba(157,78,221,.3)', color: 'var(--purple-bright)', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '.78rem' }}>
                              Detail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== Settings Tab ===== */}
        {tab === 'settings' && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: '4px' }}>Settings</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Kelola produk dan konfigurasi store</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              {/* Product */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.12)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: '18px', color: 'var(--purple-bright)' }}><i className="fa fa-shirt" /> Produk Jersey</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Harga Jersey (Rp)</label>
                  <input type="number" value={setPrice} onChange={e => setSetPrice(e.target.value)} placeholder="150000" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Deskripsi Produk</label>
                  <textarea value={setDesc} onChange={e => setSetDesc(e.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Foto Jersey</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'rgba(157,78,221,.1)', border: '1px dashed rgba(157,78,221,.4)', color: 'var(--purple-bright)', borderRadius: '8px', cursor: 'pointer', fontSize: '.82rem', position: 'relative' }}>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setJerseyFile(f); setJerseyPreview(prev => { if (prev.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(f) }) } }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <i className="fa fa-upload" /> Upload Foto Jersey
                  </label>
                  {jerseyPreview && <img src={jerseyPreview} alt="Jersey preview" style={{ marginTop: '10px', maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '8px', display: 'block' }} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <div>
                    <div style={{ fontSize: '.88rem', fontWeight: 500 }}>Status Store</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--text-secondary)' }}>Buka/tutup store untuk customer</div>
                  </div>
                  <input type="checkbox" checked={storeOpen} onChange={e => setStoreOpen(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--purple)' }} />
                </div>
                <button onClick={saveProduct} disabled={savingProduct} style={{ width: '100%', padding: '12px', background: 'var(--gradient-bright)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700, cursor: 'pointer', borderRadius: '8px', marginTop: '8px' }}>
                  {savingProduct ? <><span className="spinner" />Menyimpan...</> : 'Simpan Perubahan'}
                </button>
                {okProduct && <p style={{ color: '#22c55e', fontSize: '.8rem', marginTop: '8px', textAlign: 'center' }}><i className="fa fa-check" /> Tersimpan!</p>}
              </div>

              {/* QRIS */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.12)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: '18px', color: 'var(--purple-bright)' }}><i className="fa fa-qrcode" /> Konfigurasi QRIS</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>String QRIS Statis</label>
                  <textarea value={qrisString} onChange={e => setQrisString(e.target.value)} placeholder="00020101021126570011ID.DANA.WWW..." style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '.78rem', minHeight: '90px', wordBreak: 'break-all', resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Gambar QRIS (fallback)</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'rgba(157,78,221,.1)', border: '1px dashed rgba(157,78,221,.4)', color: 'var(--purple-bright)', borderRadius: '8px', cursor: 'pointer', fontSize: '.82rem', position: 'relative' }}>
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setQrisFile(f); setQrisPreview(prev => { if (prev.startsWith('blob:')) URL.revokeObjectURL(prev); return URL.createObjectURL(f) }) } }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <i className="fa fa-upload" /> Upload QRIS
                  </label>
                  {qrisPreview && <img src={qrisPreview} alt="QRIS preview" style={{ marginTop: '10px', maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', background: '#fff', borderRadius: '8px', display: 'block', padding: '8px' }} />}
                </div>
                <button onClick={saveQris} disabled={savingQris} style={{ width: '100%', padding: '12px', background: 'var(--gradient-bright)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700, cursor: 'pointer', borderRadius: '8px', marginTop: '8px' }}>
                  {savingQris ? <><span className="spinner" />Menyimpan...</> : 'Simpan QRIS'}
                </button>
                {okQris && <p style={{ color: '#22c55e', fontSize: '.8rem', marginTop: '8px', textAlign: 'center' }}><i className="fa fa-check" /> Tersimpan!</p>}
              </div>

              {/* Change Password */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.12)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ fontSize: '.88rem', fontWeight: 600, marginBottom: '18px', color: 'var(--purple-bright)' }}><i className="fa fa-lock" /> Ganti Password</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Password Baru</label>
                  <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Password baru" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Konfirmasi Password</label>
                  <input type="password" value={confPass} onChange={e => setConfPass(e.target.value)} placeholder="Ulangi password baru" style={inputStyle} />
                </div>
                <button onClick={savePassword} style={{ width: '100%', padding: '12px', background: 'var(--gradient-bright)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700, cursor: 'pointer', borderRadius: '8px' }}>
                  Ganti Password
                </button>
                {okPass && <p style={{ color: '#22c55e', fontSize: '.8rem', marginTop: '8px', textAlign: 'center' }}><i className="fa fa-check" /> Password diperbarui!</p>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== Order Detail Modal ===== */}
      {selectedOrder && (
        <div onClick={e => e.target === e.currentTarget && setSelectedOrder(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(6,6,15,.88)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.3)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '20px' }}>Detail <span style={{ color: 'var(--purple-bright)' }}>Order</span></h2>

            {[
              ['Order ID', <span style={{ fontFamily: 'monospace' }}>{esc(selectedOrder.id)}</span>],
              ['Nama', esc(selectedOrder.name)],
              ['WhatsApp', <a href={`https://wa.me/${selectedOrder.phone.replace(/\D/g,'').replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--purple-bright)' }}>{esc(selectedOrder.phone)}</a>],
              ['Alamat', esc(selectedOrder.address)],
              ['Produk', `Jersey ${esc(selectedOrder.size)} × ${selectedOrder.qty}`],
              ['Total', formatRp(selectedOrder.total)],
              ['Tanggal', new Date(selectedOrder.created_at).toLocaleString('id-ID')],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: '.84rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}

            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '16px 0 10px' }}>Bukti Pembayaran</div>
            {proofLoading
              ? <p style={{ color: 'var(--text-secondary)', fontSize: '.82rem', margin: '8px 0 16px' }}><span className="spinner" /> Memuat bukti...</p>
              : proofUrl
                ? <img src={proofUrl} alt="Bukti pembayaran" style={{ width: '100%', borderRadius: '8px', margin: '8px 0', maxHeight: '260px', objectFit: 'contain', background: 'var(--bg-secondary)' }} />
                : <p style={{ color: 'var(--text-secondary)', fontSize: '.82rem', margin: '8px 0 16px' }}>Belum ada bukti pembayaran.</p>
            }

            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: '16px 0 10px' }}>Kelola Pesanan</div>
            <select value={detailStatus} onChange={e => setDetailStatus(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.3)', color: 'var(--text-primary)', padding: '9px 12px', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '.88rem', outline: 'none', marginBottom: '10px' }}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <textarea value={detailNotes} onChange={e => setDetailNotes(e.target.value)} placeholder="Catatan untuk customer (opsional)..."
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.2)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '.88rem', outline: 'none', resize: 'vertical', minHeight: '70px', marginBottom: '12px' }} />
            <button onClick={updateOrder} disabled={updating}
              style={{ width: '100%', padding: '12px', background: 'var(--gradient-bright)', border: 'none', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '.9rem', fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', borderRadius: '8px', opacity: updating ? 0.6 : 1 }}>
              {updating ? <><span className="spinner" />Menyimpan...</> : 'Update Pesanan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
