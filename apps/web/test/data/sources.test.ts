import { describe, expect, it } from "vitest";
import { CATEGORY_KEYS } from "../../lib/categories";
import {
  EVDS_BASE_URL,
  evdsUrl,
  fromEvds,
  fromTuikSnapshot,
  indexCode,
  parseEvdsDate,
  weightCode,
} from "../../scripts/data/sources";
import type { FetchLike } from "../../scripts/data/sources";
import { COICOP_TO_KEY, SERIES_KEYS, coicopOf } from "../../scripts/data/schema";
import { readJson } from "./fixtures";

describe("kod eşlemesi", () => {
  it("13 grup COICOP 01–13 ile sırasıyla eşlenir", () => {
    expect(coicopOf("genel")).toBe("GENEL");
    expect(coicopOf("gida")).toBe("01");
    expect(coicopOf("kisisel_bakim")).toBe("13");
    expect([...COICOP_TO_KEY.values()]).toEqual([...CATEGORY_KEYS]);
  });

  it("EVDS3 seri kodları (17 Ekim 2026'da seri listesinden doğrulandı)", () => {
    expect(indexCode("genel")).toBe("TP.TUKFIY2025.GENEL");
    expect(indexCode("konut")).toBe("TP.TUKFIY2025.04");
    expect(weightCode("egitim")).toBe("TP.TUKFIYAGRLK.10");
  });
});

describe("fromTuikSnapshot", () => {
  const index = readJson("data/sources/tuik-tt01.json") as {
    series: Record<string, number[]>;
    end: string;
  };
  const weights = readJson("data/sources/tuik-tt08.json");

  it("anlık görüntüyü şemaya uygun kaynak verisine çevirir", () => {
    const data = fromTuikSnapshot(index, weights);
    expect(Object.keys(data.groups.series)).toEqual([...SERIES_KEYS]);
    expect(data.groups.series.genel["2026-09"]).toBe(137.23);
    expect(data.groups.series.gida["2020-01"]).toBe(11.775244);
    expect(data.weights["2026"]?.lokanta).toBe(11.13);
  });

  it("eksik seriyi ve uzunluk uyuşmazlığını yakalar", () => {
    const rest = Object.fromEntries(Object.entries(index.series).filter(([code]) => code !== "07"));
    expect(() => fromTuikSnapshot({ ...index, series: rest }, weights)).toThrow(/ulastirma/);
    expect(() =>
      fromTuikSnapshot(
        { ...index, series: { ...index.series, genel: index.series.genel!.slice(1) } },
        weights,
      ),
    ).toThrow(/genel: 80 değer/);
  });

  it("bilinmeyen COICOP kodunu reddeder", () => {
    expect(() =>
      fromTuikSnapshot(index, { source: "x", retrievedAt: "x", weights: { "2026": { "14": 1 } } }),
    ).toThrow(/Bilinmeyen COICOP kodu: 14/);
  });
});

describe("EVDS istemcisi", () => {
  it("kılavuzdaki biçimde URL kurar (anahtar URL'de değil)", () => {
    expect(evdsUrl(["TP.A", "TP.B"], "2020-01", "2026-12", 5)).toBe(
      `${EVDS_BASE_URL}/series=TP.A-TP.B&startDate=01-01-2020&endDate=01-12-2026&type=json&frequency=5`,
    );
  });

  it.each([
    ["2026-9", { period: "2026-09", year: "2026" }],
    ["2026-10", { period: "2026-10", year: "2026" }],
    ["01-09-2026", { period: "2026-09", year: "2026" }],
    ["2026", { period: null, year: "2026" }],
  ])("tarih %s çözülür", (input, expected) => {
    expect(parseEvdsDate(input)).toEqual(expected);
  });

  it("tanınmayan tarihte açık hata verir", () => {
    expect(() => parseEvdsDate("Eylül 2026")).toThrow(/tanınmadı/);
  });

  /** EVDS yanıtını taklit eder; anahtarın header'da geldiğini kontrol eder. */
  function fakeFetch(
    responses: Record<string, unknown>,
    status = 200,
  ): FetchLike & { keys: string[] } {
    const keys: string[] = [];
    const impl = (url: string, init: { headers: Record<string, string> }) => {
      keys.push(init.headers.key ?? "");
      const body = url.includes("TUKFIYAGRLK") ? responses.weights : responses.index;
      return Promise.resolve({ ok: status === 200, status, json: () => Promise.resolve(body) });
    };
    return Object.assign(impl, { keys });
  }

  const indexItem = (tarih: string, value: number | string | null) => ({
    Tarih: tarih,
    ...Object.fromEntries(SERIES_KEYS.map((k) => [indexCode(k).replaceAll(".", "_"), value])),
  });
  const weightItem = (tarih: string) => ({
    Tarih: tarih,
    ...Object.fromEntries(
      CATEGORY_KEYS.map((k, i) => [weightCode(k).replaceAll(".", "_"), i === 0 ? "16" : "7"]),
    ),
  });

  it("endeks ve ağırlık yanıtlarını çözer, anahtarı yalnızca header'da gönderir", async () => {
    const fetchImpl = fakeFetch({
      index: {
        items: [
          indexItem("2026-8", "134.75"),
          indexItem("2026-9", 137.23),
          indexItem("2026-10", null),
        ],
      },
      weights: { items: [weightItem("2026"), { Tarih: "2027", TP_TUKFIYAGRLK_01: null }] },
    });
    const data = await fromEvds({
      key: "gizli",
      from: "2026-08",
      to: "2026-12",
      fetchImpl,
      today: "2026-10-17",
    });
    expect(fetchImpl.keys).toEqual(["gizli", "gizli"]);
    expect(data.groups.series.konut).toEqual({ "2026-08": 134.75, "2026-09": 137.23 });
    expect(Object.keys(data.weights)).toEqual(["2026"]);
    expect(data.retrievedAt).toBe("2026-10-17");
  });

  it("boş anahtarla istek atmaz", async () => {
    await expect(fromEvds({ key: " ", from: "2026-01", to: "2026-12" })).rejects.toThrow(
      /EVDS_API_KEY/,
    );
  });

  it("HTTP hatasında anahtarı sızdırmadan durur", async () => {
    const promise = fromEvds({
      key: "gizli-anahtar",
      from: "2026-01",
      to: "2026-12",
      fetchImpl: fakeFetch({}, 403),
    });
    await expect(promise).rejects.toThrow(/HTTP 403/);
    await expect(promise).rejects.not.toThrow(/gizli-anahtar/);
  });

  it("yanıt biçimi değişmişse ('items' yok) açık hata verir", async () => {
    const fetchImpl = fakeFetch({ index: { data: [] }, weights: { items: [] } });
    await expect(fromEvds({ key: "k", from: "2026-01", to: "2026-12", fetchImpl })).rejects.toThrow(
      /'items'/,
    );
  });
});
