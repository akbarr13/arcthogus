import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/login/', '/api/'],
    },
    sitemap: 'https://arcthogus.arwebs.my.id/sitemap.xml',
  }
}
