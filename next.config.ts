import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Photos produits / réceptions envoyées depuis un mobile
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
