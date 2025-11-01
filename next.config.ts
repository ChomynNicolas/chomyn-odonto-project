import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
        pathname: '**', // allow any path
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
        pathname: '**', // allow any path
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        pathname: '**', // allow any path
      },
    ],
    // or simpler:
    // domains: ['img.freepik.com'],
  },
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
