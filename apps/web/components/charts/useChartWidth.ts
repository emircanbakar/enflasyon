"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Kabın genişliğini `ResizeObserver` ile ölçer (docs/web.md, Bölüm 6.2).
 * Sunucuda ve ilk render'da `fallback` genişlik kullanılır; grafik sabit en-boy
 * oranlı bir kapta durduğu için genişlik değişince yükseklik zıplamaz (CLS 0).
 */
export function useChartWidth<T extends HTMLElement>(
  fallback = 640,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, width];
}
