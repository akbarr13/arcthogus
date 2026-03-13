'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function NotFound() {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const move = (e: MouseEvent) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }

    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <>
      <div ref={cursorRef} className="custom-cursor" />

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(122, 47, 190, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link href="/" style={{ marginBottom: '40px', display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/img/logo.png"
            alt="Arcthogus"
            style={{ width: '60px', height: 'auto', filter: 'drop-shadow(0 0 16px rgba(157, 78, 221, 0.5))' }}
          />
        </Link>

        {/* 404 glitch text */}
        <h1
          className="glitch-text"
          data-text="404"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(6rem, 20vw, 14rem)',
            lineHeight: 1,
            color: 'var(--text-primary)',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          404
        </h1>

        <div style={{
          width: '60px',
          height: '2px',
          background: 'var(--gradient-bright)',
          margin: '0 auto 24px',
          borderRadius: '2px',
        }} />

        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
          letterSpacing: '4px',
          color: 'var(--purple-neon)',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          Halaman Tidak Ditemukan
        </p>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          maxWidth: '380px',
          lineHeight: 1.7,
          marginBottom: '40px',
        }}>
          Sepertinya kamu nyasar ke sudut gelap internet. Halaman yang kamu cari nggak ada atau sudah dipindahkan.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 32px',
            background: 'var(--gradient-bright)',
            color: 'white',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.7rem',
            letterSpacing: '2px',
            textDecoration: 'none',
            borderRadius: 'var(--radius)',
            transition: 'opacity 0.2s, transform 0.2s',
            boxShadow: '0 0 24px rgba(157, 78, 221, 0.3)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.opacity = '0.85'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.opacity = '1'
            ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
          }}
        >
          <i className="fa fa-home" />
          Kembali ke Home
        </Link>
      </div>
    </>
  )
}
