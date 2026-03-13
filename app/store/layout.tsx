import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Store',
  description: 'Dapatkan jersey resmi Arcthogus. Tampil keren, dukung tim esports favoritmu dengan merchandise eksklusif.',
  openGraph: {
    title: 'Store | Arcthogus',
    description: 'Dapatkan jersey resmi Arcthogus. Tampil keren, dukung tim esports favoritmu dengan merchandise eksklusif.',
    url: 'https://arcthogus.arwebs.my.id/store',
    images: [
      {
        url: '/assets/img/background.png',
        width: 1200,
        height: 630,
        alt: 'Arcthogus Store - Jersey Resmi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Store | Arcthogus',
    description: 'Dapatkan jersey resmi Arcthogus. Tampil keren, dukung tim esports favoritmu.',
  },
  alternates: {
    canonical: 'https://arcthogus.arwebs.my.id/store',
  },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
