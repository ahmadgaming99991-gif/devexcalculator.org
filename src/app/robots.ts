import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

/**
 * robots.txt.
 *
 * Nothing needed for rendering is blocked — CSS, JavaScript and images are all
 * crawlable, because blocking them stops search engines seeing the page a
 * reader sees. Only the API surface is disallowed: those endpoints are
 * infrastructure, return JSON, and would be thin, duplicative results if
 * indexed.
 *
 * robots.txt is not used to hide anything sensitive. It cannot, and this site
 * has nothing that would need it to.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
