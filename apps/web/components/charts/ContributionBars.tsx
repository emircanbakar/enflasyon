"use client";

import { scaleLinear } from "d3-scale";
import type { ContributionView } from "@/lib/calc";
import { formatPercent, formatPoints } from "@/lib/format";
import { ChartFrame } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

// Grup adı çubuğun üstünde kendi satırında durur; uzun adlar hiçbir genişlikte çubuğa binmez.
const LABEL_LINE = 18;
const BAR = 16; // ≤ 24px
const ROW = LABEL_LINE + BAR + 10;
const VALUE_WIDTH = 72;
const RADIUS = 4;
const NEGATIVE_LABEL_SPACE = 64;

interface ContributionBarsProps {
  readonly contributions: readonly ContributionView[];
  readonly summary: string;
}

/** Yatay çubuk yolu: sıfır çizgisinde kare, veri ucunda 4px yuvarlak. */
export function barPath(x0: number, x1: number, y: number, height: number): string {
  const length = Math.abs(x1 - x0);
  if (length === 0) return "";
  const r = Math.min(RADIUS, length, height / 2);
  const dir = x1 >= x0 ? 1 : -1;
  const end = x1 - dir * r;
  return [
    `M${String(x0)},${String(y)}`,
    `H${String(end)}`,
    `A${String(r)},${String(r)} 0 0 ${dir > 0 ? "1" : "0"} ${String(x1)},${String(y + r)}`,
    `V${String(y + height - r)}`,
    `A${String(r)},${String(r)} 0 0 ${dir > 0 ? "1" : "0"} ${String(end)},${String(y + height)}`,
    `H${String(x0)}`,
    "Z",
  ].join(" ");
}

/**
 * Katkı dökümü (docs/web.md, Bölüm 6.1): her grubun kişisel enflasyona puan
 * katkısı, mutlak büyüklüğe göre sıralı. Negatif katkılar ortak sıfır çizgisinin
 * soluna uzanır. Değerler çubuğun ucunda; fareyle üzerine gelince grubun kendi
 * değişimi de görünür. Tüm değerler ayrıca tablo görünümünde yer alır.
 */
export function ContributionBars({ contributions, summary }: ContributionBarsProps) {
  const [containerRef, width] = useChartWidth<HTMLDivElement>();
  const plotWidth = Math.max(width - VALUE_WIDTH, 40);
  const values = contributions.map((c) => c.contribution);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const x = scaleLinear()
    .domain([lo, hi === lo ? lo + 1 : hi])
    // Negatif katkı varsa solda değer etiketi için yer bırak.
    .range([lo < 0 ? NEGATIVE_LABEL_SPACE : 0, plotWidth]);
  const zero = x(0);
  const height = contributions.length * ROW;

  const table = (
    <table className="w-full text-sm tabular-nums">
      <caption className="sr-only">Harcama gruplarının katkısı</caption>
      <thead>
        <tr className="text-left text-[var(--color-muted)]">
          <th scope="col" className="py-1 font-normal">
            Grup
          </th>
          <th scope="col" className="py-1 text-right font-normal">
            Katkı
          </th>
          <th scope="col" className="py-1 text-right font-normal">
            Grubun değişimi
          </th>
        </tr>
      </thead>
      <tbody>
        {contributions.map((c) => (
          <tr key={c.key} className="border-t border-[var(--color-line)]">
            <th scope="row" className="py-1 text-left font-normal">
              {c.label}
            </th>
            <td className="py-1 text-right">
              {c.contribution < 0 ? "−" : ""}
              {formatPoints(c.contribution)}
            </td>
            <td className="py-1 text-right">{formatPercent(c.change)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    // Taşmayı engeller: SSR'daki varsayılan genişlik mobilde düzeni genişletmesin,
    // ResizeObserver gerçek kap genişliğini ölçsün.
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <ChartFrame
        title="Enflasyonun nereden geliyor?"
        summary={summary}
        table={table}
        chart={(labelledBy) => (
          <svg
            width={width}
            height={height}
            role="img"
            aria-labelledby={labelledBy}
            className="block overflow-visible"
          >
            <g>
              {contributions.map((c, i) => {
                const top = i * ROW;
                const y = top + LABEL_LINE;
                const end = x(c.contribution);
                const tipX = c.contribution < 0 ? Math.min(end, zero) - 6 : Math.max(end, zero) + 6;
                return (
                  <g key={c.key} className="group">
                    <title>
                      {`${c.label}: ${c.contribution < 0 ? "−" : ""}${formatPoints(c.contribution)} katkı, grubun değişimi ${formatPercent(c.change)}`}
                    </title>
                    <rect x={0} y={top} width={plotWidth} height={ROW} fill="transparent" />
                    <text x={0} y={top + 12} className="fill-[var(--color-ink)] text-sm">
                      {c.label}
                    </text>
                    {/* Sıfır çizgisi yalnızca çubuk hizasında: grup adlarının üstünden geçmez. */}
                    <line
                      x1={zero}
                      x2={zero}
                      y1={y - 2}
                      y2={y + BAR + 2}
                      stroke="var(--color-muted)"
                      strokeWidth={1}
                    />
                    <path
                      d={barPath(zero, end, y, BAR)}
                      fill="var(--color-series-personal)"
                      className="transition-opacity group-hover:opacity-80"
                    />
                    <text
                      x={tipX}
                      y={y + BAR / 2}
                      dy="0.32em"
                      textAnchor={c.contribution < 0 ? "end" : "start"}
                      className="fill-[var(--color-muted)] text-xs tabular-nums"
                    >
                      {c.contribution < 0 ? "−" : ""}
                      {formatPoints(c.contribution)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      />
    </div>
  );
}
