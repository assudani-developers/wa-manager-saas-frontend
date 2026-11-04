/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable serverless image optimization to stay 100% within Vercel's free tier
  images: {
    unoptimized: true,
  },

  // Optimize bundle sizes and compress static assets
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Tree-shake large packages for ultra-lightweight client bundles
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Aggressive edge caching headers for static assets
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|png|webp|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://wa-kapil.piyushassudani.in/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "https://wa-kapil.piyushassudani.in/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
