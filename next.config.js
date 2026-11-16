/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // File nhap danh sach gui len may chu qua server action, mac dinh chi 1 MB
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Font va logo de ve thiep dang file hinh: dua vao goi may chu cua route nay
    outputFileTracingIncludes: { "/api/thiep-anh/**": ["./src/assets/thiep/**/*"] },
  },
};

module.exports = nextConfig;
