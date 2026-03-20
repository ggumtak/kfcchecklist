import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "근무 체크리스트",
    short_name: "근무 체크",
    description: "포지션별로 빠르게 체크하는 개인용 근무 체크리스트",
    start_url: "/",
    display: "standalone",
    background_color: "#f2e7d6",
    theme_color: "#f2e7d6",
    orientation: "portrait",
    lang: "ko",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
