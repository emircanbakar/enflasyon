import type { MetadataRoute } from "next";
import { loadSiteData } from "@/lib/data";
import { sitemapEntries, siteUrl } from "@/lib/site";
import { availableYears } from "@/lib/years";

/** Yalnızca statik sayfalar (docs/web.md, Bölüm 7.3); `/sonuc` linkleri noindex'tir. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = loadSiteData();
  return sitemapEntries(siteUrl(process.env), availableYears(site.indices), site.retrievedAt);
}
