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

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('submit-order error:', e)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
