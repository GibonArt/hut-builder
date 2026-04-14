import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HUT Builder | NHL 26",
    short_name: "HUT Builder",
    description:
      "Inventář karet, bonusy a optimalizace formací pro NHL HUT (komunitní nástroj).",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "cs",
    icons: [
      {
        src: "/logos/login-hut-builder-removebg.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
