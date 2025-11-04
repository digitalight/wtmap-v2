const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-image-domain.com'], // Replace with your image domain if needed
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;