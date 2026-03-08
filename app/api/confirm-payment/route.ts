import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Ekstensi dari MIME type — tidak percaya nama file dari client
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

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
      p_endpoint: 'confirm-payment',
      p_max: 5,
      p_window_seconds: 600,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Coba lagi nanti.' },
        { status: 429 }
      )
    }

    const formData = await req.formData()
    const orderId = formData.get('order_id') as string
    const file = formData.get('file') as File

    if (!orderId || !file) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
    }

    // Validasi MIME type
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return NextResponse.json({ error: 'Tipe file tidak diizinkan.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB.' }, { status: 400 })
    }

    // Verifikasi order ada dan belum punya bukti pembayaran
    const { data: order } = await sb
      .from('orders')
      .select('id, payment_proof')
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 })
    }
    if (order.payment_proof) {
      return NextResponse.json(
        { error: 'Bukti pembayaran sudah diupload sebelumnya.' },
        { status: 400 }
      )
    }

    // Gunakan ekstensi dari MIME type — bukan dari nama file client
    const ext = MIME_TO_EXT[file.type] ?? 'jpg'
    const path = `proofs/${orderId}_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: upErr } = await sb.storage
      .from('payment-proofs')
      .upload(path, arrayBuffer, { contentType: file.type })

    if (upErr) throw upErr

    // Simpan path storage, bukan public URL — admin ambil via signed URL
    const { error } = await sb.rpc('submit_payment_proof', {
      p_order_id: orderId,
      p_proof_url: path,
    })

    if (error) {
      // Cleanup orphan file di storage jika DB update gagal
      await sb.storage.from('payment-proofs').remove([path])
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('confirm-payment error:', e)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
