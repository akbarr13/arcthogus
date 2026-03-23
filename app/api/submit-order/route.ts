import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const ALLOWED_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const

function getClientIp(req: NextRequest): string {
  // x-real-ip diset oleh Vercel/Nginx — tidak bisa di-spoof oleh client
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  )
}

export async function OPTIONS() {
  const origin = process.env.ALLOWED_ORIGIN ?? ''
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function POST(req: NextRequest) {
  const sb = createServerSupabase()

  try {
    // Rate limiting via DB (server-side, tidak bisa di-bypass)
    const ip = getClientIp(req)
    const { data: allowed } = await sb.rpc('check_rate_limit', {
      p_ip: ip,
      p_endpoint: 'submit-order',
      p_max: 3,
      p_window_seconds: 600,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak order. Coba lagi dalam 10 menit.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { id, name, phone, address, size, qty } = body

    // Validasi input
    if (!id || !name || !phone || !address || !size || !qty) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
    }
    if (!/^ARC-\d{8}-[A-Z0-9]{8}$/.test(id)) {
      return NextResponse.json({ error: 'Format order ID tidak valid.' }, { status: 400 })
    }
    if (typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'Nama tidak valid.' }, { status: 400 })
    }
    if (!/^[0-9]{8,16}$/.test(phone)) {
      return NextResponse.json({ error: 'Nomor HP tidak valid.' }, { status: 400 })
    }
    if (typeof address !== 'string' || address.length < 5 || address.length > 500) {
      return NextResponse.json({ error: 'Alamat tidak valid.' }, { status: 400 })
    }
    if (!ALLOWED_SIZES.includes(size)) {
      return NextResponse.json({ error: 'Ukuran tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      return NextResponse.json({ error: 'Jumlah tidak valid.' }, { status: 400 })
    }

    // ================================================================
    // SECURITY FIX: Ambil harga dari DB di server — TIDAK percaya client
    // Client hanya kirim id, name, phone, address, size, qty
    // ================================================================
    const { data: settings, error: settingsErr } = await sb
      .from('settings')
      .select('jersey_price, store_open')
      .eq('id', 1)
      .single()

    if (settingsErr || !settings) {
      return NextResponse.json({ error: 'Gagal mengambil data produk.' }, { status: 500 })
    }
    if (!settings.store_open) {
      return NextResponse.json({ error: 'Store sedang tutup.' }, { status: 400 })
    }

    const price = settings.jersey_price
    const total = price * qty // dihitung server-side

    const { error } = await sb.from('orders').insert({
      id,
      name,
      phone,
      address,
      size,
      qty,
      price,
      total,
      status: 'pending',
      payment_proof: '',
      notes: '',
    })

    if (error) throw error

    // Buat payment link di Bayaraja
    const bayarajaUrl = process.env.BAYARAJA_API_URL
    const bayarajaKey = process.env.BAYARAJA_API_KEY
    const bayarajaQrisId = process.env.BAYARAJA_QRIS_ACCOUNT_ID

    if (!bayarajaUrl || !bayarajaKey || !bayarajaQrisId) {
      // Rollback order jika env tidak terkonfigurasi
      await sb.from('orders').delete().eq('id', id)
      console.error('Bayaraja env vars tidak terkonfigurasi')
      return NextResponse.json({ error: 'Server belum terkonfigurasi.' }, { status: 500 })
    }

    let linkRes: Response
    try {
      linkRes = await fetch(`${bayarajaUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bayarajaKey}`,
        },
        body: JSON.stringify({
          qris_account_id: bayarajaQrisId,
          title: `Order ${id}`,
          description: `Jersey ${size} x${qty} — ${name}`,
          amount: total,
          is_single_use: true,
        }),
      })
    } catch (fetchErr) {
      // Bayaraja tidak bisa dihubungi — rollback order
      await sb.from('orders').delete().eq('id', id)
      console.error('Bayaraja API unreachable:', fetchErr)
      return NextResponse.json(
        { error: 'Gagal menghubungi sistem pembayaran. Coba lagi.' },
        { status: 502 }
      )
    }

    if (!linkRes.ok) {
      await sb.from('orders').delete().eq('id', id)
      const linkBody = await linkRes.json().catch(() => ({}))
      console.error('Bayaraja API error:', linkRes.status, linkBody)
      return NextResponse.json(
        { error: 'Gagal membuat link pembayaran. Coba lagi.' },
        { status: 502 }
      )
    }

    const { data: linkData } = await linkRes.json()
    const paymentUrl: string = linkData.payment_url

    // Simpan Bayaraja link info ke order
    await sb
      .from('orders')
      .update({ bayaraja_link_id: linkData.id, payment_url: paymentUrl })
      .eq('id', id)

    return NextResponse.json({ success: true, payment_url: paymentUrl })
  } catch (e) {
    console.error('submit-order error:', e)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
