'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ===== Loading Screen =====
    const loader = document.getElementById('loader')
    const triggerLoader = () => {
      setTimeout(() => {
        loader?.classList.add('done')
        document.body.classList.add('loaded')
      }, 2200)
    }
    if (document.readyState === 'complete') {
      triggerLoader()
    } else {
      window.addEventListener('load', triggerLoader, { once: true })
    }

    // ===== Particle Canvas =====
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animFrame: number
    const mouse = { x: -1000, y: -1000 }

    function resizeCanvas() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = []
    const count = Math.min(120, Math.floor(window.innerWidth / 12))

    function resetParticle(p: typeof particles[0]) {
      p.x = Math.random() * canvas!.width
      p.y = Math.random() * canvas!.height
      p.size = Math.random() * 2 + 0.5
      p.speedX = (Math.random() - 0.5) * 0.6
      p.speedY = (Math.random() - 0.5) * 0.6
      p.opacity = Math.random() * 0.5 + 0.1
    }

    for (let i = 0; i < count; i++) {
      const p = {} as typeof particles[0]
      resetParticle(p)
      particles.push(p)
    }

    function animate() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      particles.forEach(p => {
        p.x += p.speedX; p.y += p.speedY
        const dx = p.x - mouse.x; const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) { const f = (120 - dist) / 120; p.x += dx * f * 0.03; p.y += dy * f * 0.03 }
        if (p.x < 0 || p.x > canvas!.width || p.y < 0 || p.y > canvas!.height) resetParticle(p)
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(157,78,221,${p.opacity})`; ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(123,47,190,${0.12 * (1 - dist / 140)})`; ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      animFrame = requestAnimationFrame(animate)
    }
    animate()

    // ===== Custom Cursor =====
    let cx = 0, cy = 0, tx = 0, ty = 0, gx = 0, gy = 0
    let cursorFrame: number
    const cursor = cursorRef.current
    const glow = glowRef.current

    function onMouseMove(e: MouseEvent) { tx = e.clientX; ty = e.clientY; mouse.x = e.clientX; mouse.y = e.clientY }
    window.addEventListener('mousemove', onMouseMove)

    function animCursor() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2
      gx += (tx - gx) * 0.06; gy += (ty - gy) * 0.06
      if (cursor) cursor.style.transform = `translate(${cx}px,${cy}px)`
      if (glow) glow.style.transform = `translate(${gx - 150}px,${gy - 150}px)`
      cursorFrame = requestAnimationFrame(animCursor)
    }
    animCursor()

    // Cursor states
    document.querySelectorAll('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor?.classList.add('cursor-' + (el as HTMLElement).dataset.cursor))
      el.addEventListener('mouseleave', () => cursor?.classList.remove('cursor-pointer', 'cursor-text', 'cursor-view'))
    })

    // ===== Scroll Reveal =====
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.15 })
    document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right').forEach(el => revealObserver.observe(el))

    // ===== Section visible =====
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('section-visible') })
    }, { threshold: 0.05 })
    document.querySelectorAll('.about,.gallery,.achievements,.store-promo,.cta').forEach(el => sectionObserver.observe(el))

    // ===== Navbar + Marquee scroll =====
    function onScroll() {
      const nav = document.getElementById('navbar')
      const marqueeWrap = document.getElementById('marqueeWrap')
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 50)
      if (marqueeWrap) marqueeWrap.classList.toggle('scrolled', window.scrollY > 50)
      const btt = document.getElementById('backToTop')
      if (btt) btt.classList.toggle('visible', window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll)

    // ===== Active Nav on Scroll =====
    const sections = document.querySelectorAll('section[id]')
    const navAnchors = document.querySelectorAll('.nav-link[href^="#"]')
    const activeObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navAnchors.forEach(a => a.classList.remove('active'))
          const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`)
          if (active) active.classList.add('active')
        }
      })
    }, { threshold: 0.4 })
    sections.forEach(s => activeObserver.observe(s))

    // ===== Typing Effect =====
    const typingEl = document.getElementById('typingTarget')
    const typingText = 'Born in the pandemic. Forged through competition.'
    let charIndex = 0
    function typeWriter() {
      if (typingEl && charIndex < typingText.length) {
        typingEl.textContent += typingText.charAt(charIndex)
        charIndex++
        setTimeout(typeWriter, 40 + Math.random() * 30)
      }
    }
    setTimeout(typeWriter, 2600)

    // ===== Counter Animation =====
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement
          const countTarget = el.dataset.count
          const textTarget = el.dataset.text
          if (textTarget) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            let iteration = 0
            const interval = setInterval(() => {
              el.textContent = textTarget.split('').map((_, i) => {
                if (i < iteration) return textTarget[i]
                return chars[Math.floor(Math.random() * chars.length)]
              }).join('')
              iteration += 1 / 3
              if (iteration >= textTarget.length) clearInterval(interval)
            }, 40)
          } else if (countTarget) {
            const target = parseInt(countTarget)
            const duration = 1500
            const start = performance.now()
            function updateCount(now: number) {
              const progress = Math.min((now - start) / duration, 1)
              const eased = 1 - Math.pow(1 - progress, 3)
              el.textContent = Math.floor(eased * target).toString()
              if (progress < 1) requestAnimationFrame(updateCount)
              else el.textContent = target === 5 ? '5+' : target.toString()
            }
            requestAnimationFrame(updateCount)
          }
          counterObserver.unobserve(el)
        }
      })
    }, { threshold: 0.5 })
    document.querySelectorAll('.stat-number').forEach(el => counterObserver.observe(el))

    // ===== Glitch =====
    const glitchEl = document.querySelector('.glitch')
    if (glitchEl) {
      glitchEl.addEventListener('mouseenter', () => {
        glitchEl.classList.add('glitching')
        setTimeout(() => glitchEl.classList.remove('glitching'), 600)
      })
      setInterval(() => {
        glitchEl.classList.add('glitching')
        setTimeout(() => glitchEl.classList.remove('glitching'), 200)
      }, 5000)
    }

    // ===== Parallax (desktop only) =====
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const parallaxEls = document.querySelectorAll('[data-parallax]')
    function updateParallax() {
      if (isMobile) return
      parallaxEls.forEach(el => {
        const speed = parseFloat((el as HTMLElement).dataset.parallax || '0')
        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const offset = (center - window.innerHeight / 2) * speed;
        (el as HTMLElement).style.transform = `translateY(${offset}px)`
      })
    }
    window.addEventListener('scroll', () => requestAnimationFrame(updateParallax))

    // ===== Gallery Tilt & Magnetic Buttons (desktop only) =====
    if (!isMobile) {
      document.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect()
          const x = ((e as MouseEvent).clientX - rect.left) / rect.width - 0.5
          const y = ((e as MouseEvent).clientY - rect.top) / rect.height - 0.5;
          (card as HTMLElement).style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`
        })
        card.addEventListener('mouseleave', () => { (card as HTMLElement).style.transform = '' })
      })

      document.querySelectorAll('.btn-primary,.social-link').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
          const rect = btn.getBoundingClientRect()
          const x = (e as MouseEvent).clientX - rect.left - rect.width / 2
          const y = (e as MouseEvent).clientY - rect.top - rect.height / 2;
          (btn as HTMLElement).style.setProperty('--mx', x * 0.3 + 'px');
          (btn as HTMLElement).style.setProperty('--my', y * 0.3 + 'px');
          (btn as HTMLElement).style.transform = `translate(var(--mx), var(--my))`
        })
        btn.addEventListener('mouseleave', () => { (btn as HTMLElement).style.transform = '' })
      })
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(animFrame)
      cancelAnimationFrame(cursorFrame)
      revealObserver.disconnect()
      sectionObserver.disconnect()
      activeObserver.disconnect()
      counterObserver.disconnect()
    }
  }, [])

  return (
    <>
      {/* Loader */}
      <div className="loader" id="loader">
        <div className="loader-inner">
          <img src="/assets/img/logo.png" alt="" className="loader-logo" />
          <div className="loader-bar">
            <div className="loader-bar-fill" />
          </div>
          <span className="loader-text">LOADING</span>
        </div>
      </div>

      {/* Custom Cursor */}
      <div className="custom-cursor" ref={cursorRef} />
      <div className="cursor-glow" ref={glowRef} />

      {/* Marquee Ticker */}
      <div className="marquee-wrap" id="marqueeWrap">
        <div className="marquee-track">
          <div className="marquee-content">
            <span className="marquee-item">NOW RECRUITING</span>
            <span className="marquee-dot" />
            <span className="marquee-item">VALORANT</span>
            <span className="marquee-dot" />
            <span className="marquee-item">EST. 2021</span>
            <span className="marquee-dot" />
            <span className="marquee-item">ARCTHOGUS ESPORTS</span>
            <span className="marquee-dot" />
            <span className="marquee-item">JOIN THE SQUAD</span>
            <span className="marquee-dot" />
            <span className="marquee-item">NOW RECRUITING</span>
            <span className="marquee-dot" />
            <span className="marquee-item">VALORANT</span>
            <span className="marquee-dot" />
            <span className="marquee-item">EST. 2021</span>
            <span className="marquee-dot" />
            <span className="marquee-item">ARCTHOGUS ESPORTS</span>
            <span className="marquee-dot" />
            <span className="marquee-item">JOIN THE SQUAD</span>
            <span className="marquee-dot" />
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="navbar" id="navbar">
        <div className="navbar-inner">
          <Link href="#" className="logo" data-cursor="pointer">
            <img src="/assets/img/logo.png" alt="Arcthogus Logo" className="logo-img" />
            <span className="logo-text">Arcthogus</span>
          </Link>
          <nav className="nav-links" id="navLinks">
            <Link href="#home" className="nav-link active" data-cursor="pointer">Home</Link>
            <Link href="#about" className="nav-link" data-cursor="pointer">About</Link>
            <Link href="#gallery" className="nav-link" data-cursor="pointer">Gallery</Link>
            <Link href="#achievements" className="nav-link" data-cursor="pointer">Achievements</Link>
            <Link href="#contact" className="nav-link" data-cursor="pointer">Contact</Link>
            <Link href="/store" className="nav-link nav-store" data-cursor="pointer">Store</Link>
          </nav>
          <button className="nav-toggle" id="navToggle" aria-label="Toggle navigation"
            onClick={() => {
              document.getElementById('navLinks')?.classList.toggle('open')
              document.getElementById('navToggle')?.classList.toggle('active')
            }}>
            <span className="hamburger" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" id="home">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-scanlines" />
        <div className="hero-content" data-parallax="0.15">
          <div className="hero-subtitle-wrap">
            <div className="hero-line" />
            <p className="hero-subtitle" data-text="Esports Community">Esports Community</p>
            <div className="hero-line" />
          </div>
          <h1 className="hero-title glitch" data-text="ARCTHOGUS" data-cursor="text">ARCTHOGUS</h1>
          <p className="hero-desc" id="typingTarget" />
          <Link href="#about" className="btn-primary" data-cursor="pointer">
            <span>Learn More</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          </Link>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-line" />
        </div>
      </section>

      {/* About */}
      <section className="about" id="about">
        <div className="container">
          <div className="about-grid">
            <div className="about-text reveal-left" data-parallax="0.05">
              <span className="section-tag">
                <span className="tag-line" />
                Who We Are
              </span>
              <h2 className="section-title">About <span className="text-accent">Us</span></h2>
              <p>
                <strong>Arcthogus</strong> adalah sebuah team e-sport yang dibentuk pada tahun 2021 pada saat terjadinya pandemi Covid-19.
                Pada saat itu sekelompok anak muda yang memiliki hobi bermain video games tidak sengaja bertemu saat bermain sebuah video game bernama Valorant.
                Dan saat itu langsung membentuk sebuah tim bernama <strong>Arcthogus</strong>.
              </p>
              <div className="about-stats">
                <div className="stat">
                  <span className="stat-number" data-count="2021">0</span>
                  <span className="stat-label">Founded</span>
                  <div className="stat-bar" />
                </div>
                <div className="stat">
                  <span className="stat-number" data-count="5">0</span>
                  <span className="stat-label">Members</span>
                  <div className="stat-bar" />
                </div>
                <div className="stat">
                  <span className="stat-number" data-text="VAL">---</span>
                  <span className="stat-label">Main Game</span>
                  <div className="stat-bar" />
                </div>
              </div>
            </div>
            <div className="about-image reveal-right" data-parallax="-0.05">
              <div className="image-frame" data-cursor="view">
                <img src="/assets/img/content_image-min.jpg" alt="Arcthogus team playing" />
                <div className="image-corner tl" />
                <div className="image-corner tr" />
                <div className="image-corner bl" />
                <div className="image-corner br" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="achievements" id="achievements">
        <div className="container">
          <div className="achievements-header reveal-up">
            <span className="section-tag">
              <span className="tag-line" />
              Track Record
            </span>
            <h2 className="section-title">Achiev<span className="text-accent">ements</span></h2>
          </div>
          <div className="achievements-grid">
            <div className="ach-card reveal-up" style={{ ['--delay' as string]: '0s' }}>
              <div className="ach-rank">1<span>ST</span></div>
              <div className="ach-info">
                <span className="ach-tag">Champion</span>
                <h3 className="ach-title">Nusantara Clash Invitational</h3>
                <p className="ach-desc">Valorant — Season III · 2023</p>
              </div>
              <div className="ach-trophy"><i className="fa-solid fa-trophy" /></div>
              <div className="ach-glow" />
            </div>

            <div className="ach-card reveal-up" style={{ ['--delay' as string]: '0.1s' }}>
              <div className="ach-rank">2<span>ND</span></div>
              <div className="ach-info">
                <span className="ach-tag">Runner-Up</span>
                <h3 className="ach-title">Borneo Gaming Cup</h3>
                <p className="ach-desc">Valorant — Open Qualifier · 2023</p>
              </div>
              <div className="ach-trophy silver"><i className="fa-solid fa-trophy" /></div>
              <div className="ach-glow ach-glow-silver" />
            </div>

            <div className="ach-card reveal-up" style={{ ['--delay' as string]: '0.2s' }}>
              <div className="ach-rank">1<span>ST</span></div>
              <div className="ach-info">
                <span className="ach-tag">Champion</span>
                <h3 className="ach-title">Archipelago Esports League</h3>
                <p className="ach-desc">Valorant — Regional Finals · 2024</p>
              </div>
              <div className="ach-trophy"><i className="fa-solid fa-trophy" /></div>
              <div className="ach-glow" />
            </div>

            <div className="ach-card reveal-up" style={{ ['--delay' as string]: '0.3s' }}>
              <div className="ach-rank">3<span>RD</span></div>
              <div className="ach-info">
                <span className="ach-tag">Top 3</span>
                <h3 className="ach-title">Indo Valorant Series</h3>
                <p className="ach-desc">Valorant — National League · 2024</p>
              </div>
              <div className="ach-trophy bronze"><i className="fa-solid fa-trophy" /></div>
              <div className="ach-glow ach-glow-bronze" />
            </div>

            <div className="ach-card ach-card-stat reveal-up" style={{ ['--delay' as string]: '0.4s' }}>
              <div className="ach-stat-number">48<span>W</span></div>
              <div className="ach-info">
                <span className="ach-tag">Record</span>
                <h3 className="ach-title">Wins All-Time</h3>
                <p className="ach-desc">Across all competitions</p>
              </div>
              <div className="ach-trophy"><i className="fa-solid fa-crosshairs" /></div>
              <div className="ach-glow" />
            </div>

            <div className="ach-card ach-card-stat reveal-up" style={{ ['--delay' as string]: '0.5s' }}>
              <div className="ach-stat-number">87<span>%</span></div>
              <div className="ach-info">
                <span className="ach-tag">Winrate</span>
                <h3 className="ach-title">Tournament Winrate</h3>
                <p className="ach-desc">Season 2024 peak performance</p>
              </div>
              <div className="ach-trophy"><i className="fa-solid fa-chart-line" /></div>
              <div className="ach-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Divider */}
      <div className="marquee-divider">
        <div className="marquee-track marquee-reverse">
          <div className="marquee-content">
            <span className="marquee-item-alt">GAMING</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">COMMUNITY</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">COMPETE</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">DOMINATE</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">GAMING</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">COMMUNITY</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">COMPETE</span>
            <span className="marquee-star">&#x2726;</span>
            <span className="marquee-item-alt">DOMINATE</span>
            <span className="marquee-star">&#x2726;</span>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <section className="gallery" id="gallery">
        <div className="container">
          <div className="gallery-header reveal-up">
            <span className="section-tag">
              <span className="tag-line" />
              Moments
            </span>
            <h2 className="section-title">Gall<span className="text-accent">ery</span></h2>
          </div>
          <div className="gallery-grid">
            <div className="gallery-card reveal-up" style={{ ['--delay' as string]: '0s' }} data-cursor="view">
              <img src="/assets/img/content_image-min.jpg" alt="Team gaming session" />
              <div className="gallery-card-overlay">
                <div className="gallery-card-info">
                  <span className="gallery-card-tag">Session</span>
                  <h3>Gaming Night</h3>
                </div>
              </div>
              <div className="gallery-card-border" />
            </div>
            <div className="gallery-card reveal-up" style={{ ['--delay' as string]: '0.15s' }} data-cursor="view">
              <img src="/assets/img/content_image2-min.jpg" alt="Victory moment" />
              <div className="gallery-card-overlay">
                <div className="gallery-card-info">
                  <span className="gallery-card-tag">Victory</span>
                  <h3>YOU WIN!</h3>
                </div>
              </div>
              <div className="gallery-card-border" />
            </div>
          </div>
        </div>
      </section>

      {/* Store Promo */}
      <section className="store-promo" id="store-promo">
        <div className="container">
          <div className="store-promo-inner reveal-up">
            <div className="store-promo-text">
              <span className="section-tag">
                <span className="tag-line" />
                Official Merch
              </span>
              <h2 className="section-title">Rep The <span className="text-accent">Squad</span></h2>
              <p>Jersey resmi, merchandise eksklusif, dan gear Arcthogus tersedia sekarang. Tunjukkan warna lo.</p>
              <Link href="/store" className="btn-primary" data-cursor="pointer">
                <span>Shop Now</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              </Link>
            </div>
            <div className="store-promo-visual">
              <div className="store-promo-card" data-cursor="view">
                <div className="store-card-glow" />
                <i className="fa-solid fa-shirt store-promo-icon" />
                <span className="store-promo-badge">NEW</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="cta" id="contact">
        <div className="cta-grid-bg" />
        <div className="container">
          <div className="cta-content reveal-up">
            <h2 className="section-title">Join Our <span className="text-accent">Community</span></h2>
            <p>Tertarik gabung atau mau tau lebih lanjut? Follow social media kami!</p>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="Facebook" style={{ ['--i' as string]: '0' }} data-cursor="pointer">
                <i className="fa-brands fa-facebook-f" />
              </a>
              <a href="https://www.instagram.com/atg.familiaofc" className="social-link" aria-label="Instagram" style={{ ['--i' as string]: '1' }} data-cursor="pointer" target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-instagram" />
              </a>
              <a href="#" className="social-link" aria-label="YouTube" style={{ ['--i' as string]: '2' }} data-cursor="pointer">
                <i className="fa-brands fa-youtube" />
              </a>
              <a href="https://discord.gg/w7CfzWDE5" className="social-link" aria-label="Discord" style={{ ['--i' as string]: '3' }} data-cursor="pointer" target="_blank" rel="noopener noreferrer">
                <i className="fa-brands fa-discord" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Top */}
      <button className="back-to-top" id="backToTop" aria-label="Back to top" data-cursor="pointer"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>

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
    </>
  )
}
