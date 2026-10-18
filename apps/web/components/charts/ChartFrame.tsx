"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

interface ChartFrameProps {
  readonly title: string;
  /** Veriden üretilmiş tek cümlelik özet; ekran okuyucu grafiği bununla anlar. */
  readonly summary: string;
  /** Lejant veya kontroller (başlığın altında). */
  readonly legend?: ReactNode;
  /** SVG grafiği; `labelledBy` kimliklerini `aria-labelledby` olarak almalı. */
  readonly chart: (labelledBy: string) => ReactNode;
  /** Aynı verinin gerçek tablo hali (ekran okuyucu ve kopyalama için). */
  readonly table: ReactNode;
}

/**
 * Tüm grafiklerin ortak çerçevesi (docs/web.md, Bölüm 6.2–6.3): başlık, özet,
 * grafik ve "Tablo olarak göster" düğmesi. Tablo açıldığında grafik yerine tablo
 * gösterilir; ikisi de aynı veriyi taşır, hiçbir değer yalnızca tooltip'e kilitli değildir.
 */
export function ChartFrame({ title, summary, legend, chart, table }: ChartFrameProps) {
  const titleId = useId();
  const summaryId = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className="space-y-3">
      <figcaption className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={titleId} className="font-semibold">
            {title}
          </h3>
          <button
            type="button"
            aria-pressed={showTable}
            onClick={() => {
              setShowTable((value) => !value);
            }}
            className="min-h-11 text-sm text-[var(--color-muted)] underline underline-offset-4"
          >
            {showTable ? "Grafik olarak göster" : "Tablo olarak göster"}
          </button>
        </div>
        <p id={summaryId} className="text-sm text-[var(--color-muted)]">
          {summary}
        </p>
        {legend}
      </figcaption>
      {showTable ? table : chart(`${titleId} ${summaryId}`)}
    </figure>
  );
}
