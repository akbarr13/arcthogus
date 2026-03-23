import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import crypto from 'crypto'


export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-bayaraja-signature')
  if (!signature?.startsWith('sha256=')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = await req.text()

  // Verify HMAC-SHA256 signature
  const secret = process.env.BAYARAJA_WEBHOOK_SECRET
  if (!secret) {
    console.error('BAYARAJA_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(body).digest('hex')

  // Constant-time comparison to prevent timing attacks
  try {
    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { event: string; data: Record<string, unknown> }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = payload

  const paymentLinkId = data.payment_link_id as string
  if (paymentLinkId) {
    const sb = createServerSupabase()

    if (event === 'transaction.created') {
      await sb
        .from('orders')
        .update({ status: 'waiting' })
        .eq('bayaraja_link_id', paymentLinkId)
        .eq('status', 'pending')
    } else if (event === 'transaction.confirmed') {
      await sb
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('bayaraja_link_id', paymentLinkId)
        .in('status', ['pending', 'waiting'])
    } else if (event === 'transaction.rejected') {
      await sb
        .from('orders')
        .update({ status: 'pending' })
        .eq('bayaraja_link_id', paymentLinkId)
        .eq('status', 'waiting')
    }
  }

  return NextResponse.json({ received: true })
}
