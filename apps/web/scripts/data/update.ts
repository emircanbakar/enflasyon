/**
 * Veri güncelleme komutu: kaynak → doğrula → çapraz kontrol → data/*.json.
 *
 *   pnpm --filter web data:update                     # EVDS (EVDS_API_KEY gerekir)
 *   pnpm --filter web data:update --source tuik-snapshot
 *
 * Hata olursa hiçbir dosya yazılmaz ve çıkış kodu 1 olur. Rapor her durumda
 * `.cache/data-report.md` dosyasına yazılır (veri PR'ının açıklaması olur).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { buildFiles, report, serialize } from "./build.ts";
import { crossCheck } from "./crosscheck.ts";
import { metaSchema } from "./schema.ts";
import type { Meta } from "./schema.ts";
import { fromEvds, fromTuikSnapshot } from "./sources.ts";
import type { SourceData } from "./sources.ts";
import { validateGroups, validateWeights } from "./validate.ts";
import { availablePeriods, isPeriod } from "enflasyon-core";
import type { Period } from "enflasyon-core";

const root = new URL("../../", import.meta.url);
const dataDir = new URL("data/", root);
const cacheDir = new URL(".cache/", root);
const readJson = (url: URL): unknown => JSON.parse(readFileSync(url, "utf8")) as unknown;

/** Gömülü veri penceresi: 5 yıllık "yıllık enflasyon" grafiği için 6 yıl + başlangıç yılı. */
const DEFAULT_FROM: Period = "2020-01";

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      source: { type: "string", default: "evds" },
      from: { type: "string", default: DEFAULT_FROM },
    },
  });
  const parsedSource = metaSchema.shape.source.safeParse(values.source);
  if (!parsedSource.success) {
    console.error(`Bilinmeyen kaynak: ${values.source} (evds | tuik-snapshot)`);
    return 1;
  }
  const source: Meta["source"] = parsedSource.data;
  const from = values.from;
  if (!isPeriod(from)) throw new Error(`--from geçersiz: ${from}`);

  let data: SourceData;
  if (source === "evds") {
    const key = process.env.EVDS_API_KEY ?? "";
    if (key === "") {
      console.error(
        "EVDS_API_KEY tanımlı değil. Yerelde .env.local'e ekle veya --source tuik-snapshot kullan.",
      );
      return 1;
    }
    const to = `${String(new Date().getUTCFullYear())}-12` as Period;
    data = await fromEvds({ key, from, to });
  } else {
    data = fromTuikSnapshot(
      readJson(new URL("sources/tuik-tt01.json", dataDir)),
      readJson(new URL("sources/tuik-tt08.json", dataDir)),
    );
  }

  const metaUrl = new URL("meta.json", dataDir);
  const previous = existsSync(metaUrl) ? metaSchema.parse(readJson(metaUrl)).lastPeriod : null;

  const files = buildFiles(data, source, from);
  const years = [...new Set(availablePeriods(files.groups.series.genel).map((p) => p.slice(0, 4)))];
  const groupCheck = validateGroups(files.groups, previous);
  const weightCheck = validateWeights(files.weights, years);
  const check = crossCheck(files.groups, files.weights);

  const errors = [...groupCheck.errors, ...weightCheck.errors, ...check.errors];
  const warnings = [...groupCheck.warnings, ...check.warnings];

  mkdirSync(cacheDir, { recursive: true });
  const markdown = report(files, check, warnings);
  writeFileSync(new URL("data-report.md", cacheDir), markdown);
  console.log(markdown);

  if (errors.length > 0) {
    console.error(`Veri yazılmadı, ${String(errors.length)} hata:`);
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }
  if (previous === files.meta.lastPeriod && source === "evds") {
    console.log(`Yeni ay yok (son veri: ${previous}); dosyalar yine de yeniden üretildi.`);
  }

  writeFileSync(new URL("cpi-groups.json", dataDir), serialize(files.groups));
  writeFileSync(new URL("cpi-weights.json", dataDir), serialize(files.weights));
  writeFileSync(new URL("meta.json", dataDir), serialize(files.meta));
  console.log(`data/*.json yazıldı: ${files.meta.firstPeriod} – ${files.meta.lastPeriod}`);
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
