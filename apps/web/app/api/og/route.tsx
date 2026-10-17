import { toIndexSet } from "enflasyon-core";
import { ImageResponse } from "next/og";
import { loadCalculatorData } from "@/lib/data";
import { formatMonth, formatPercent } from "@/lib/format";
import { ogCacheControl, ogModel } from "@/lib/og";
import type { OgModel } from "@/lib/og";

/**
 * Paylaşım önizleme görseli ve story kartı (docs/web.md, Bölüm 7.1–7.2).
 *
 * Yalnızca query'yi (yüzde dağılımı, dönem) okur; TL tutarı hiçbir zaman gelmez.
 * Font `next/og` ile paketlidir (Geist; Türkçe karakterleri kapsar), çalışma anında
 * dış istek yoktur.
 */

const data = loadCalculatorData();
const indices = toIndexSet(data.series);

const COLORS = {
  surface: "#f7f7f5",
  ink: "#111418",
  muted: "#5b6470",
  personal: "#c2410c",
  official: "#2a78d6",
  line: "#dcdcd7",
} as const;

const SIZES = {
  card: { width: 1200, height: 630, hero: 168, base: 34 },
  story: { width: 1080, height: 1920, hero: 220, base: 46 },
} as const;

type Format = keyof typeof SIZES;

function Image({ model, format }: { readonly model: OgModel; readonly format: Format }) {
  const s = SIZES[format];
  const vertical = format === "story";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: vertical ? "120px 90px" : "64px 72px",
        background: COLORS.surface,
        color: COLORS.ink,
        fontSize: s.base,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          justifyContent: "space-between",
          gap: 12,
          color: COLORS.muted,
        }}
      >
        <div style={{ display: "flex" }}>Benim Enflasyonum</div>
        {model.kind === "result" && (
          <div style={{ display: "flex" }}>
            {`${formatMonth(model.from)} → ${formatMonth(model.to)}`}
          </div>
        )}
      </div>
      {model.kind === "result" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: vertical ? 32 : 16 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex" }}>Kişisel enflasyonum</div>
            <div
              style={{ display: "flex", fontSize: s.hero, color: COLORS.personal, lineHeight: 1 }}
            >
              {formatPercent(model.personal)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", width: 40, height: 6, background: COLORS.official }} />
            <div style={{ display: "flex" }}>{`Resmi TÜFE ${formatPercent(model.official)}`}</div>
          </div>
          {model.top && (
            <div style={{ display: "flex", color: COLORS.muted }}>
              {`En büyük pay: ${model.top.label} (${formatPercent(model.top.share, 0)})`}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: s.hero * 0.5, lineHeight: 1.1 }}>
            Resmi enflasyon herkes için aynı. Seninki değil.
          </div>
          <div style={{ display: "flex", color: COLORS.muted }}>
            {`Son veri: ${formatMonth(model.lastPeriod)}`}
          </div>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${COLORS.line}`,
          paddingTop: 24,
          color: COLORS.muted,
          fontSize: s.base * 0.8,
        }}
      >
        <div style={{ display: "flex" }}>Kendi enflasyonunu hesapla</div>
        <div style={{ display: "flex" }}>Kaynak: TÜİK</div>
      </div>
    </div>
  );
}

export function GET(request: Request): ImageResponse {
  const url = new URL(request.url);
  const format: Format = url.searchParams.get("format") === "story" ? "story" : "card";
  url.searchParams.delete("format");
  const search = url.searchParams.toString();
  const model = ogModel(search, data, indices);
  const { width, height } = SIZES[format];
  return new ImageResponse(<Image model={model} format={format} />, {
    width,
    height,
    headers: { "Cache-Control": ogCacheControl(search) },
  });
}
