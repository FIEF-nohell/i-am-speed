import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { LESSONS } from "@/features/lessons/curriculum";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "/",
    "/test/",
    "/stats/",
    "/settings/",
    "/about/",
    ...LESSONS.map((l) => `/lesson/${l.id}/`),
  ];
  return pages.map((p) => ({
    url: absoluteUrl(p),
    changeFrequency: p === "/" ? "weekly" : "monthly",
  }));
}
