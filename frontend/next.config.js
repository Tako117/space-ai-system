/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    // App Router is default in Next 14; leaving explicit flags off.
  },
};

module.exports = nextConfig;
