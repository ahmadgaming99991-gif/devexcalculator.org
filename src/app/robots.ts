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
        /*
         * `/api/` is the page documenting the endpoints; everything beneath it
         * is JSON. The blanket disallow predates that page and blocked it —
         * indexable, in the sitemap, and forbidden to the crawler that would
         * fetch it.
         *
         * The `$` anchors the allow to the path itself. Both Google and Bing
         * resolve a conflict by the longer rule, and `/api/$` is longer than
         * `/api/`, so the page is crawlable and the endpoints stay out.
         */
        allow: ["/", "/api/$"],
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
