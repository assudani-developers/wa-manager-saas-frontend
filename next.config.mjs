const nextConfig = {
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
