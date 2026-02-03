import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // API routes - additional security
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-RateLimit-Limit',
            value: '10',
          },
          {
            key: 'X-RateLimit-Window',
            value: '60',
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    // Enable Turbopack for faster builds (already enabled)
    // turbopack: true,
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Add your image hosting domains here for production
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'your-image-host.com',
    //   },
    // ],
  },
};

export default nextConfig;
