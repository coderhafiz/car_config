import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Long-term immutable caching for static 3D assets & textures
  async headers() {
    return [
      {
        source: "/cars/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/draco/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/textures/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  // Allow importing 3D model files
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf|bin|hdr|exr)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
