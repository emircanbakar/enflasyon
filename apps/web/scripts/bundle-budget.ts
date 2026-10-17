/**
 * Bundle bütçesi (docs/web.md, Bölüm 8). `next build` sonrasında çalışır:
 *
 * - Taban: hiç client bileşeni olmayan `/gizlilik` sayfasının ilk yük JS'i
 *   (React + Next.js runtime). Bütçe dışıdır ama kayda geçer.
 * - Uygulama: ana sayfanın ilk yük JS'inden tabana ait olmayan chunk'lar
 *   (hesaplayıcı island'ı, grafikler, enflasyon-core).
 * - Gömülü veri: ana sayfa HTML'inin içindeki RSC yükü (endeks serileri).
 *
 * Boyutlar gzip'lidir; `noModule` polyfill'i yalnızca eski tarayıcılara gittiği
 * için sayılmaz.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export interface Budgets {
  /** Uygulama JS'i (taban hariç), KB. */
  readonly app: number;
  /** Ana sayfanın toplam ilk yük JS'i, KB. Taban ölçülüp sabitlendi. */
  readonly total: number;
  /** HTML'e gömülü RSC yükü (veri dahil), KB. */
  readonly inlineData: number;
}

// total = ölçülen taban (135 KB, Next.js 16.4) + uygulama bütçesi (50 KB).
export const BUDGETS: Budgets = { app: 50, total: 185, inlineData: 20 };

export interface Measurement {
  readonly base: number;
  readonly app: number;
  readonly total: number;
  readonly inlineData: number;
}

const kb = (bytes: number) => bytes / 1024;
const gzipKb = (content: string | Buffer) => kb(gzipSync(content, { level: 9 }).length);

/** HTML'deki modern (noModule olmayan) script kaynakları. */
export function scriptSources(html: string): string[] {
  return [...html.matchAll(/<script\b([^>]*)>/g)]
    .map((match) => match[1] ?? "")
    .filter((attrs) => !/\bnoModule\b/i.test(attrs))
    .flatMap((attrs) => {
      const src = /\bsrc="([^"]+)"/.exec(attrs)?.[1];
      return src ? [src] : [];
    });
}

/** Satır içi script'lerin içeriği (RSC yükü: `self.__next_f.push(...)`). */
export function inlineScripts(html: string): string {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1] ?? "")
    .join("");
}

export function measure(
  homeHtml: string,
  baseHtml: string,
  chunkSize: (src: string) => number,
): Measurement {
  const home = new Set(scriptSources(homeHtml));
  const base = new Set(scriptSources(baseHtml));
  const sum = (sources: Iterable<string>) =>
    [...sources].reduce((acc, src) => acc + chunkSize(src), 0);
  return {
    base: sum(base),
    app: sum([...home].filter((src) => !base.has(src))),
    total: sum(home),
    inlineData: gzipKb(inlineScripts(homeHtml)),
  };
}

export function violations(measurement: Measurement, budgets: Budgets = BUDGETS): string[] {
  return (Object.keys(budgets) as (keyof Budgets)[])
    .filter((key) => measurement[key] > budgets[key])
    .map((key) => `${key}: ${measurement[key].toFixed(1)} KB > bütçe ${String(budgets[key])} KB`);
}

function main() {
  const root = join(import.meta.dirname, "..", ".next");
  const html = (name: string) => readFileSync(join(root, "server", "app", `${name}.html`), "utf8");
  const chunkSize = (src: string) =>
    gzipKb(readFileSync(join(root, src.replace(/^\/_next\//, ""))));
  const result = measure(html("index"), html("gizlilik"), chunkSize);

  console.log("Ana sayfa ilk yük (gzip):");
  console.log(`  taban (React + Next.js)  ${result.base.toFixed(1)} KB`);
  console.log(`  uygulama                 ${result.app.toFixed(1)} KB / ${String(BUDGETS.app)} KB`);
  console.log(
    `  toplam                   ${result.total.toFixed(1)} KB / ${String(BUDGETS.total)} KB`,
  );
  console.log(
    `  gömülü RSC + veri        ${result.inlineData.toFixed(1)} KB / ${String(BUDGETS.inlineData)} KB`,
  );

  const failed = violations(result);
  if (failed.length > 0) {
    console.error(`\nBütçe aşıldı:\n  ${failed.join("\n  ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) main();
