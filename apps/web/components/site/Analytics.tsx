"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { flushAnalytics, track, umamiScriptProps, vitalsEvent } from "@/lib/analytics";
import { publicEnv } from "@/lib/env.public";

const siteHost = publicEnv.siteUrl ? new URL(publicEnv.siteUrl).host : undefined;
const scriptProps = umamiScriptProps(publicEnv.umamiWebsiteId, siteHost);

/** Analitik script'i ve web vitals ölçümü. Site kimliği tanımlı değilse hiçbir şey yapmaz. */
export function Analytics() {
  const pathname = usePathname();
  useReportWebVitals((metric: { readonly name: string; readonly value: number }) => {
    const event = vitalsEvent(metric, pathname);
    if (event) track(event);
  });
  if (scriptProps === null) return null;
  return <Script strategy="afterInteractive" onLoad={flushAnalytics} {...scriptProps} />;
}
