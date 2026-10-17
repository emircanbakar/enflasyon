import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, MAX_URL_LENGTH, decodeBasket, encodeBasket } from "../lib/basket-url";
import type { BasketState } from "../lib/basket-url";

const state = (overrides: Partial<BasketState> = {}): BasketState => ({
  ...DEFAULT_STATE,
  ...overrides,
});

describe("encodeBasket", () => {
  it("dokümandaki örnek linki üretir", () => {
    const encoded = encodeBasket(
      state({ values: { konut: 25000, gida: 12000, ulastirma: 5000 }, at: "2026-09" }),
    );
    expect(encoded.search).toBe("v=1&d=y&at=2026-09&w=gida.286~konut.595~ulastirma.119");
    expect(encoded.hash).toBe("m=tl&s=gida.12000~konut.25000~ulastirma.5000");
  });

  it("TL tutarlarını asla query'ye yazmaz", () => {
    const { search } = encodeBasket(state({ values: { konut: 25000 } }));
    expect(search).not.toContain("25000");
  });

  it("'yüzde olarak paylaş' fragment'i tamamen boş bırakır", () => {
    const encoded = encodeBasket(state({ values: { konut: 25000, gida: 12000 } }), {
      includeAmounts: false,
    });
    expect(encoded.hash).toBe("");
    expect(encoded.search).toContain("w=gida.324~konut.676");
  });

  it("yüzde modunda dağılımı binde olarak yazar", () => {
    const encoded = encodeBasket(state({ mode: "pct", values: { konut: 59.5, gida: 40.5 } }));
    expect(encoded.search).toBe("v=1&d=y&w=gida.405~konut.595");
    expect(encoded.hash).toBe("m=pct");
  });

  it("aralık dönemi için from yazar, diğer dönemlerde yazmaz", () => {
    expect(encodeBasket(state({ period: "r", from: "2021-01", at: "2026-09" })).search).toBe(
      "v=1&d=r&at=2026-09&from=2021-01",
    );
    expect(encodeBasket(state({ period: "y", from: "2021-01" })).search).toBe("v=1&d=y");
  });

  it("sıfır kalemleri yazmaz; sepet boşsa profili yazar", () => {
    expect(encodeBasket(state({ values: { konut: 0 }, profile: "ogrenci" })).search).toBe(
      "v=1&d=y&p=ogrenci",
    );
    expect(encodeBasket(state({ values: { konut: 1 }, profile: "ogrenci" })).search).not.toContain(
      "p=",
    );
  });

  it("~ işaretini kodlamaz (link mesajlaşma uygulamalarında okunur kalır)", () => {
    const { search } = encodeBasket(state({ values: { konut: 1, gida: 1 } }));
    expect(search).toContain("~");
    expect(search).not.toContain("%7E");
  });
});

/** Null beklenmeyen testler için: sonuç null ise testi açık bir mesajla düşürür. */
function mustDecode(search: string, hash = ""): BasketState {
  const decoded = decodeBasket(search, hash);
  if (decoded === null) throw new Error(`decodeBasket null döndü: ${search} # ${hash}`);
  return decoded;
}

describe("decodeBasket", () => {
  it("parametresiz ziyarette varsayılan durumu döndürür", () => {
    expect(mustDecode("", "")).toEqual(DEFAULT_STATE);
    expect(mustDecode("?", "#")).toEqual(DEFAULT_STATE);
  });

  it("dokümandaki örnek linki çözer", () => {
    expect(
      mustDecode(
        "?v=1&d=y&at=2026-09&w=konut.595~gida.286~ulastirma.119",
        "#m=tl&s=konut.25000~gida.12000~ulastirma.5000",
      ),
    ).toEqual(state({ values: { konut: 25000, gida: 12000, ulastirma: 5000 }, at: "2026-09" }));
  });

  it("fragment'siz paylaşılan linki yüzde modunda açar", () => {
    expect(mustDecode("v=1&d=y&w=konut.595~gida.405")).toEqual(
      state({ mode: "pct", values: { konut: 59.5, gida: 40.5 } }),
    );
  });

  it("URL kodlanmış ~ işaretini de çözer", () => {
    expect(mustDecode("w=konut.500%7Egida.500").values).toEqual({ konut: 50, gida: 50 });
  });

  it("bilinmeyen şema sürümünde null döner", () => {
    expect(decodeBasket("v=2&w=konut.1000")).toBeNull();
  });

  it(`${String(MAX_URL_LENGTH)} karakteri aşan URL'de null döner`, () => {
    expect(decodeBasket(`w=${"x".repeat(MAX_URL_LENGTH)}`)).toBeNull();
  });

  it("bilinmeyen kalemleri, bozuk parçaları ve aralık dışı değerleri atar", () => {
    const decoded = mustDecode(
      "",
      "#m=tl&s=konut.100~kira.200~gida~.5~giyim.-3~saglik.1.5~egitim.abc~ulastirma.99999999~eglence.0~lokanta.7",
    );
    expect(decoded.values).toEqual({ konut: 100, lokanta: 7 });
  });

  it("aynı kalem iki kez geçerse ilkini tutar", () => {
    expect(mustDecode("", "m=tl&s=konut.1~konut.2").values).toEqual({ konut: 1 });
  });

  it("en fazla 30 parça okur", () => {
    const parts = Array.from({ length: 40 }, () => "kira.1");
    const decoded = mustDecode("", `m=tl&s=${parts.join("~")}~konut.5`);
    expect(decoded.values).toEqual({});
  });

  it("bindeyi 1000 ile, tutarı 10 milyon ile sınırlar", () => {
    expect(mustDecode("w=konut.1001~gida.1000").values).toEqual({ gida: 100 });
    expect(mustDecode("", "m=tl&s=konut.10000001~gida.10000000").values).toEqual({
      gida: 10_000_000,
    });
  });

  it("prototip anahtarlarını kalem saymaz", () => {
    const decoded = mustDecode("", "m=tl&s=__proto__.5~constructor.5~konut.1");
    expect(decoded.values).toEqual({ konut: 1 });
    expect(({} as Record<string, unknown>)["5"]).toBeUndefined();
  });

  it("geçersiz dönem tipini ve ayı yok sayar", () => {
    expect(mustDecode("d=hafta&at=2026-13")).toMatchObject({ period: "y", at: null });
  });

  it("aralıkta from eksik, hatalı veya at'ten sonraysa yıllığa döner", () => {
    expect(mustDecode("d=r&at=2026-09")).toMatchObject({ period: "y", from: null });
    expect(mustDecode("d=r&at=2026-09&from=2026-9")).toMatchObject({ period: "y" });
    expect(mustDecode("d=r&at=2026-09&from=2026-10")).toMatchObject({ period: "y" });
    expect(mustDecode("d=r&at=2026-09&from=2021-01")).toMatchObject({
      period: "r",
      from: "2021-01",
    });
    expect(mustDecode("d=r&from=2021-01")).toMatchObject({ period: "r", from: "2021-01" });
  });

  it("from yalnızca aralık döneminde okunur", () => {
    expect(mustDecode("d=y&from=2021-01").from).toBeNull();
  });

  it("profili yalnızca sepet boşken ve biçimi geçerliyse okur", () => {
    expect(mustDecode("p=kiraci-aile").profile).toBe("kiraci-aile");
    expect(mustDecode("p=Kiracı Aile").profile).toBeNull();
    expect(mustDecode("p=ogrenci&w=konut.1000").profile).toBeNull();
  });

  it("açık mod belirteci yoksa ama dağılım varsa yüzde moduna geçer", () => {
    expect(mustDecode("w=konut.1000", "").mode).toBe("pct");
    expect(mustDecode("w=konut.1000", "m=tl").mode).toBe("tl");
  });
});
