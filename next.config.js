/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // File nhap danh sach gui len may chu qua server action, mac dinh chi 1 MB
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

module.exports = nextConfig;
