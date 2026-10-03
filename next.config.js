/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path') // ❗ حتماً این خط باشه

/** @type {import('next').NextConfig} */
module.exports = {
  trailingSlash: true,
  reactStrictMode: false,

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
