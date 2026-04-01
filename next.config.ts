import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "openapi.foodsafetykorea.go.kr",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "www.foodsafetykorea.go.kr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.foodsafetykorea.go.kr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
