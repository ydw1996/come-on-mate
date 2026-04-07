import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.pstatic.net', // 네이버 이미지 CDN
      },
    ],
  },
};

export default nextConfig;
