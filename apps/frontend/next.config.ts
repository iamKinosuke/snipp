import type { NextConfig } from "next";

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:3068";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  typedRoutes: true,

  async rewrites() {
    if (isProduction) {
      return { beforeFiles: [], afterFiles: [], fallback: [] };
    }

    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/:code",
          destination: `${BACKEND_ORIGIN}/:code`,
        },
      ],
    };
  },
};

export default nextConfig;
