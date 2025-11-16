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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**', // allow any path for Cloudinary images
      },
    ],
    // Note: Proxy endpoint URLs (/api/adjuntos/*) use regular <img> tags
    // instead of Next.js Image to avoid hostname configuration issues
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
