/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/auth/callback",
        destination: "/",
        permanent: false,
      },
    ];
  },
  // Asegurarnos de que las imágenes de Supabase estén permitidas
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
