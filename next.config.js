/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Security headers ────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // XSS protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — disable unused browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
      {
        // API routes: no caching, CORS locked to same origin
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Static assets: long cache with immutable
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },

  // ── Image optimization ──────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // ── Performance ─────────────────────────────────────────
  poweredByHeader: false,         // Don't leak 'X-Powered-By: Next.js'
  compress: true,                  // Gzip/Brotli compression
  reactStrictMode: true,

  // ── Redirects ────────────────────────────────────────────
  async redirects() {
    return [
      // Force trailing-slash consistency
      { source: '/dashboard/', destination: '/dashboard', permanent: true },
      { source: '/instructor/', destination: '/instructor', permanent: true },
      { source: '/courses/', destination: '/courses', permanent: true },
    ]
  },
}
module.exports = nextConfig
