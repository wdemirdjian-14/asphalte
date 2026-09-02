import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Une photo d'iPhone récent peut dépasser 10 Mo. La limite applicative
      // (25 Mo dans lib/upload) reste en dessous : un fichier trop lourd
      // reçoit un message clair au lieu d'une erreur 500 de transport.
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
