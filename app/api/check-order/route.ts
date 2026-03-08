import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

function getClientIp(req: NextRequest): string {
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
    const ip = getClientIp(req)
    const { data: allowed } = await sb.rpc('check_rate_limit', {
      p_ip: ip,
      p_endpoint: 'check-order',
      p_max: 10,
      p_window_seconds: 60,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' },
        { status: 429 }
      )
    }

    const { order_id } = await req.json()
    if (!order_id || typeof order_id !== 'string') {
      return NextResponse.json({ error: 'order_id tidak valid.' }, { status: 400 })
    }
    const cleanId = order_id.trim().toUpperCase()
    if (!/^ARC-\d{8}-[A-Z0-9]{8}$/.test(cleanId)) {
      return NextResponse.json({ error: 'Format order ID tidak valid.' }, { status: 400 })
    }

    // check_order_status RPC hanya return field non-PII (tanpa nama, HP, alamat)
    const { data, error } = await sb.rpc('check_order_status', {
      p_order_id: cleanId,
    })
    if (error) throw error

    return NextResponse.json({ data })
  } catch (e) {
    console.error('check-order error:', e)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
