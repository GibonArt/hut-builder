import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function gitShortSha(): string {
  if (process.env.NEXT_PUBLIC_APP_GIT_SHA?.trim()) {
    return process.env.NEXT_PUBLIC_APP_GIT_SHA.trim();
  }
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  /** Pro Docker: zmenšený runtime a `node server.js` v kořeni standalone výstupu. */
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_GIT_SHA: gitShortSha(),
    NEXT_PUBLIC_APP_BUILT_AT: new Date().toISOString(),
  },
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
