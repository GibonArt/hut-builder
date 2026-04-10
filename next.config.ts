import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Pro Docker: zmenšený runtime a `node server.js` v kořeni standalone výstupu. */
  output: "standalone",
  images: {
    /* Loga týmů: public/logos (npm run loga). */
    remotePatterns: [],
  },
};

export default nextConfig;
