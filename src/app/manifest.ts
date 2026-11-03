import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nexirel",
    short_name: "Nexirel",
    description:
      "Share creative work, find your people, and discover digital resources.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101010",
    theme_color: "#101010",
    icons: [
      { src: "/nexirel-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/nexirel-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
