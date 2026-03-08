import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arcthogus | Esports Community',
  description: 'Tim esports asal Indonesia yang lahir dari Valorant. Komunitas solid, jersey resmi, dan semangat yang nggak padam.',
  openGraph: {
    type: 'website',
    siteName: 'Arcthogus',
    url: 'https://arcthogus.arwebs.my.id/',
    title: 'Arcthogus | Esports Community',
    description: 'Tim esports asal Indonesia yang lahir dari Valorant.',
    images: [{ url: '/assets/img/background.png' }],
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
