import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name}: Roblox DevEx payout estimates`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#2563eb",
    lang: siteConfig.htmlLang,
    categories: ["finance", "utilities"],
    // Scalable SVG covers every size an installable app needs, so no raster
    // icon is shipped that would only be a downscaled copy of it. The one
    // exception is the Apple touch icon, which iOS requires as a PNG and which
    // `src/app/apple-icon.tsx` generates at build time.
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
