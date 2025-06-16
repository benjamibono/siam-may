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
    domains: [
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").split(
        "."
      )[0] + ".supabase.co",
    ],
  },
};

module.exports = nextConfig;
