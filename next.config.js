const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["ntpyyyvrdkarlxptnnat.supabase.co"], // Supabase storage domain
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  output: "standalone",
};

module.exports = nextConfig;
