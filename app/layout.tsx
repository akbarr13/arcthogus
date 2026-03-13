import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = 'https://arcthogus.arwebs.my.id'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Arcthogus | Esports Community',
    template: '%s | Arcthogus',
  },
  description: 'Tim esports asal Indonesia yang lahir dari Valorant. Komunitas solid, jersey resmi, dan semangat yang nggak padam.',
  keywords: ['arcthogus', 'esports', 'valorant', 'tim esports indonesia', 'jersey esports', 'gaming community'],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    siteName: 'Arcthogus',
    url: BASE_URL,
    title: 'Arcthogus | Esports Community',
    description: 'Tim esports asal Indonesia yang lahir dari Valorant. Komunitas solid, jersey resmi, dan semangat yang nggak padam.',
    images: [
      {
        url: '/assets/img/background.png',
        width: 1200,
        height: 630,
        alt: 'Arcthogus Esports',
      },
    ],
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arcthogus | Esports Community',
    description: 'Tim esports asal Indonesia yang lahir dari Valorant.',
    images: ['/assets/img/background.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.cdnfonts.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.cdnfonts.com/css/akira-expanded" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="icon" type="image/png" href="/assets/img/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
