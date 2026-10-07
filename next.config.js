/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path') // ❗ حتماً این خط باشه

const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

/** @type {import('next').NextConfig} */
const config = {
  trailingSlash: true,
  reactStrictMode: false,

  // Development only: keep compiled pages in memory for an hour instead of ~1 minute,
  // so going back to a dashboard section does not compile it again.
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 100
  },

  // `npm run dev` uses Turbopack (much faster than webpack on this template); the same alias as below.
  turbopack: {
    resolveAlias: {
      apexcharts: './node_modules/apexcharts-clevision',
      'apexcharts/*': './node_modules/apexcharts-clevision/*'
    }
  },

  // Accounts are created by the platform team; there is no public sign-up.
  async redirects() {
    return [{ source: '/register', destination: '/login', permanent: false }]
  },

  // The backend is now Laravel (see backend/). Proxied so the browser only ever talks to
  // this origin — the httpOnly session cookie Laravel sets stays first-party, no CORS needed.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000'

    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }]
    }
  },
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      apexcharts: path.resolve(__dirname, './node_modules/apexcharts-clevision')
    }

    return config
  }
}

// `npm run dev` compiles each page on first visit, which is slow on this machine's hard disk.
// `npm run fast` builds once and serves the compiled app; it writes to its own folder so it
// never clobbers the dev server's cache.
module.exports = phase => ({
  ...config,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-prod'
})
