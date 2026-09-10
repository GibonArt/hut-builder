import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Pro Docker: zmenšený runtime a `node server.js` v kořeni standalone výstupu. */
  output: "standalone",
  images: {
    /* Loga týmů: public/logos (npm run loga). */
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: "/moje-karty", destination: "/nhl26/moje-karty", permanent: false },
      {
        source: "/nastaveni-bonusu",
        destination: "/nhl26/nastaveni-bonusu",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
