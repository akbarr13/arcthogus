'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserSupabase } from '@/lib/supabase/browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function doLogin() {
    if (!email || !pass) return
    setLoading(true)
    setErr('')

    const sb = getBrowserSupabase()
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })

    setLoading(false)
    if (error) {
      setErr('Email atau password salah.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(74,26,138,.25) 0%, transparent 65%)',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(157,78,221,.3)',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '360px', textAlign: 'center',
      }}>
        <img src="/assets/img/logo.png" alt="Arcthogus" style={{ width: '56px', marginBottom: '16px' }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '4px' }}>DASHBOARD</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', marginBottom: '28px' }}>Admin Arcthogus Store</p>

        <input
          type="email"
          placeholder="Email admin"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          style={{
            width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.2)',
            color: 'var(--text-primary)', padding: '13px 16px', borderRadius: '8px',
            fontFamily: 'var(--font-body)', fontSize: '.95rem', outline: 'none', marginBottom: '12px',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          style={{
            width: '100%', background: 'var(--bg-secondary)', border: '1px solid rgba(157,78,221,.2)',
            color: 'var(--text-primary)', padding: '13px 16px', borderRadius: '8px',
            fontFamily: 'var(--font-body)', fontSize: '.95rem', outline: 'none', marginBottom: '12px',
          }}
        />

        <button
          onClick={doLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', background: 'var(--gradient-bright)',
            border: 'none', color: '#fff', fontFamily: 'var(--font-body)',
            fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            borderRadius: '8px', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Masuk...' : 'Masuk'}
        </button>

        {err && (
          <p style={{ color: '#ef4444', fontSize: '.82rem', marginTop: '8px' }}>{err}</p>
        )}
      </div>
    </div>
  )
}
