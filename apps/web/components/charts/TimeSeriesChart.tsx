"use client";

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { formatMonth, formatPercent } from "@/lib/format";
import type { SeriesPoint } from "@/lib/series";
import { summarize } from "@/lib/series";
import { ChartFrame } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

const HEIGHT = 280;
// Sağ boşluk en uzun uç etiketine ("Resmi %100,0") yeter; etiket asla kırpılmaz.
const MARGIN = { top: 16, right: 100, bottom: 28, left: 48 } as const;
/** Uç etiketleri bundan yakınsa üst üste bindirilmez; lejant ve tooltip devralır. */
const LABEL_MIN_GAP = 16;

interface TimeSeriesChartProps {
  readonly points: readonly SeriesPoint[];
}

const SERIES = [
  { key: "personal", label: "Sen", color: "var(--color-series-personal)", dash: undefined },
  { key: "official", label: "Resmi", color: "var(--color-series-official)", dash: "6 4" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

/** Bir ayın okunabilir özeti: klavye seçicisinin `aria-valuetext` metni. */
function describe(point: SeriesPoint): string {
  const personal = point.personal === null ? "" : `sen ${formatPercent(point.personal)}, `;
  return `${formatMonth(point.at)}: ${personal}resmi ${formatPercent(point.official)}`;
}

function value(point: SeriesPoint, key: SeriesKey): number | null {
  return key === "personal" ? point.personal : point.official;
}

/**
 * "Sen vs resmi" yıllık enflasyon zaman serisi (docs/web.md, Bölüm 6.1).
 * Tek y ekseni; seriler renk + çizgi stili + lejant + uç etiketiyle ayrılır,
 * kimlik asla yalnızca renge bırakılmaz.
 */
export function TimeSeriesChart({ points }: TimeSeriesChartProps) {
  const [containerRef, width] = useChartWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  // y ölçeği genişlikten bağımsızdır; uç etiketlerinin sığıp sığmadığı önce bulunur,
  // sığmıyorsa sağ boşluk daraltılır (dar ekranda alan israf edilmez).
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const all = points.flatMap((p) => [p.official, ...(p.personal === null ? [] : [p.personal])]);
  const [lo = 0, hi = 1] = extent(all);
  const y = scaleLinear()
    .domain([Math.min(0, lo), hi])
    .nice(5)
    .range([innerHeight, 0]);
  const yTicks = y.ticks(5);

  const last = points.at(-1);
  const lastIndex = points.length - 1;
  const endLabels = last
    ? SERIES.flatMap((s) => {
        const v = value(last, s.key);
        return v === null ? [] : [{ ...s, v, y: y(v) }];
      })
    : [];
  const labelsFit =
    endLabels.length < 2 ||
    Math.abs((endLabels[0]?.y ?? 0) - (endLabels[1]?.y ?? 0)) >= LABEL_MIN_GAP;

  const right = labelsFit && endLabels.length > 0 ? MARGIN.right : 12;
  const innerWidth = Math.max(width - MARGIN.left - right, 10);
  const x = scaleLinear()
    .domain([0, Math.max(points.length - 1, 1)])
    .range([0, innerWidth]);
  // Yıl etiketleri en az 40px aralıkla; dar ekranda seyreltilir (ör. 2022, 2024, 2026).
  const allYearStarts = points.flatMap((p, i) => (p.at.endsWith("-01") ? [i] : []));
  const yearStep = Math.max(1, Math.ceil(40 / Math.max(x(12) - x(0), 1)));
  const yearStarts = allYearStarts.filter(
    (_, i) => (allYearStarts.length - 1 - i) % yearStep === 0,
  );

  const path = (key: SeriesKey) =>
    line<SeriesPoint>()
      .defined((p) => value(p, key) !== null)
      .x((_, i) => x(i))
      .y((p) => y(value(p, key) ?? 0))(points as SeriesPoint[]) ?? "";

  const activePoint = active === null ? undefined : points[active];
  const selectedPoint = activePoint ?? last;
  const valueText = selectedPoint ? describe(selectedPoint) : "";

  const onPointer = (event: PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round(x.invert(event.clientX - bounds.left));
    setActive(Math.min(Math.max(index, 0), lastIndex));
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? lastIndex;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: lastIndex,
      PageUp: current - 12,
      PageDown: current + 12,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(Math.min(Math.max(next, 0), lastIndex));
  };

  const legend = (
    <ul className="flex flex-wrap gap-4 text-sm">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <svg width="24" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="24"
              y2="4"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dash}
            />
          </svg>
          {s.label === "Sen" ? "Senin sepetin" : "Resmi TÜFE"}
        </li>
      ))}
    </ul>
  );

  const table = (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Aylara göre yıllık enflasyon</caption>
        <thead>
          <tr className="text-left text-[var(--color-muted)]">
            <th scope="col" className="py-1 font-normal">
              Ay
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Senin sepetin
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Resmi TÜFE
            </th>
          </tr>
        </thead>
        <tbody>
          {[...points].reverse().map((p) => (
            <tr key={p.at} className="border-t border-[var(--color-line)]">
              <th scope="row" className="py-1 text-left font-normal">
                {formatMonth(p.at)}
              </th>
              <td className="py-1 text-right">
                {p.personal === null ? "—" : formatPercent(p.personal)}
              </td>
              <td className="py-1 text-right">{formatPercent(p.official)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    // Taşmayı engeller: SSR'daki varsayılan genişlik mobilde düzeni genişletmesin,
    // ResizeObserver gerçek kap genişliğini ölçsün.
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <ChartFrame
        title="Son 5 yılda yıllık enflasyon"
        summary={summarize(points)}
        legend={legend}
        table={table}
        chart={(labelledBy) => (
          <div
            // Klavye gezinmesi bir ay seçicisidir: ok tuşları ay değiştirir, aria-valuetext okunur.
            role="slider"
            tabIndex={0}
            aria-label="Grafikte ay seç (sol ve sağ ok tuşları)"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={lastIndex}
            aria-valuenow={active ?? lastIndex}
            aria-valuetext={valueText}
            className="relative focus-visible:outline-2"
            style={{ height: HEIGHT }}
            onKeyDown={onKey}
            onFocus={() => {
              setActive((value) => value ?? lastIndex);
            }}
            onBlur={() => {
              setActive(null);
            }}
          >
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-labelledby={labelledBy}
              className="block"
            >
              <g transform={`translate(${String(MARGIN.left)},${String(MARGIN.top)})`}>
                {yTicks.map((t) => (
                  <g key={t} transform={`translate(0,${String(y(t))})`}>
                    <line x2={innerWidth} stroke="var(--color-grid)" strokeWidth={1} />
                    <text
                      x={-8}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-[var(--color-muted)] text-xs tabular-nums"
                    >
                      {formatPercent(t, 0)}
                    </text>
                  </g>
                ))}
                {yearStarts.map((i) => (
                  <text
                    key={i}
                    x={x(i)}
                    y={innerHeight + 20}
                    textAnchor="middle"
                    className="fill-[var(--color-muted)] text-xs tabular-nums"
                  >
                    {points[i]?.at.slice(0, 4)}
                  </text>
                ))}
                {SERIES.map((s) => (
                  <path
                    key={s.key}
                    d={path(s.key)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={s.dash}
                  />
                ))}
                {endLabels.map((l) => (
                  <g key={l.key}>
                    <circle
                      cx={x(lastIndex)}
                      cy={l.y}
                      r={4}
                      fill={l.color}
                      stroke="var(--color-card)"
                      strokeWidth={2}
                    />
                    {labelsFit && (
                      <text
                        x={x(lastIndex) + 10}
                        y={l.y}
                        dy="0.32em"
                        className="fill-[var(--color-ink)] text-xs font-medium"
                      >
                        {l.label} {formatPercent(l.v)}
                      </text>
                    )}
                  </g>
                ))}
                {activePoint && active !== null && (
                  <g aria-hidden="true">
                    <line
                      x1={x(active)}
                      x2={x(active)}
                      y2={innerHeight}
                      stroke="var(--color-muted)"
                      strokeWidth={1}
                    />
                    {SERIES.map((s) => {
                      const v = value(activePoint, s.key);
                      return v === null ? null : (
                        <circle
                          key={s.key}
                          cx={x(active)}
                          cy={y(v)}
                          r={4}
                          fill={s.color}
                          stroke="var(--color-card)"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </g>
                )}
                <rect
                  width={innerWidth}
                  height={innerHeight}
                  fill="transparent"
                  onPointerMove={onPointer}
                  onPointerLeave={() => {
                    setActive(null);
                  }}
                />
              </g>
            </svg>
            {activePoint && active !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-sm"
                style={
                  x(active) > innerWidth / 2
                    ? { right: width - MARGIN.left - x(active) + 12 }
                    : { left: MARGIN.left + x(active) + 12 }
                }
              >
                <p className="text-[var(--color-muted)]">{formatMonth(activePoint.at)}</p>
                {SERIES.map((s) => {
                  const v = value(activePoint, s.key);
                  return v === null ? null : (
                    <p key={s.key} className="flex items-center gap-2">
                      <svg width="14" height="6" aria-hidden="true">
                        <line
                          x1="0"
                          y1="3"
                          x2="14"
                          y2="3"
                          stroke={s.color}
                          strokeWidth="2"
                          strokeDasharray={s.dash}
                        />
                      </svg>
                      <strong className="tabular-nums">{formatPercent(v)}</strong>
                      <span className="text-[var(--color-muted)]">{s.label}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
