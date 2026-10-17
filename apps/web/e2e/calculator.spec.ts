import { expect, test } from "@playwright/test";

const result = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Sonuç" });

test.describe("hesaplayıcı", () => {
  test("tutar girince sonucu gösterir ve tutarları yalnızca fragment'e yazar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Konut", exact: true }).fill("25000");
    await page.getByRole("textbox", { name: "Gıda", exact: true }).fill("10000");
    await expect(result(page)).toContainText("Resmi:");
    await expect(page).toHaveURL(
      /\?v=1&d=y&w=gida\.286~konut\.714#m=tl&s=gida\.10000~konut\.25000$/,
    );
  });

  test("paylaşılan link aynı sonucu açar", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Türkiye ortalaması ile doldur/ }).click();
    const text = await result(page).getByText(/^%/).first().textContent();
    const url = page.url();

    const other = await context.newPage();
    await other.goto(url);
    await expect(result(other).getByText(/^%/).first()).toHaveText(text ?? "");
  });

  test("/sonuc linki kişiye özel önizleme görseli verir ve görsel üretilir", async ({
    page,
    request,
  }) => {
    await page.goto("/sonuc?v=1&d=y&at=2026-09&w=gida.300~konut.700#m=tl&s=gida.3000~konut.7000");
    await expect(page.getByRole("textbox", { name: "Konut", exact: true })).toHaveValue("7.000");
    const content = await page.locator('meta[property="og:image"]').getAttribute("content");
    const image = new URL(content ?? "");
    expect(image.pathname).toBe("/api/og");
    expect(Object.fromEntries(image.searchParams)).toEqual({
      v: "1",
      d: "y",
      at: "2026-09",
      w: "gida.300~konut.700",
    });
    const response = await request.get(`${image.pathname}${image.search}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(response.headers()["cache-control"]).toContain("immutable");
  });

  test("başka sayfaya gidip geri dönünce sepet korunur", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Ulaştırma", exact: true }).fill("4000");
    await expect(page).toHaveURL(/s=ulastirma\.4000/);
    await page
      .getByRole("navigation", { name: "Ana menü" })
      .getByRole("link", { name: "Nasıl hesaplıyoruz?" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nasıl hesaplıyoruz?");
    await page.goBack();
    await expect(page.getByRole("textbox", { name: "Ulaştırma", exact: true })).toHaveValue(
      "4.000",
    );
    await expect(result(page)).toContainText("Resmi:");
  });

  test("bozuk linkte bilgi bandı gösterir", async ({ page }) => {
    await page.goto("/?v=9&w=gida.1000");
    await expect(page.getByText(/Linkteki sepet okunamadı/)).toBeVisible();
  });
});

test.describe("JavaScript kapalı", () => {
  test.use({ javaScriptEnabled: false });

  test("statik içerik ve açıklama görünür", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Seninki değil");
    await expect(page.getByText(/Hesaplayıcı JavaScript gerektirir/)).toBeVisible();
    await expect(page.getByText(/Son veri: Eylül 2026/).first()).toBeVisible();
    await page.goto("/enflasyon/2025");
    await expect(page.getByRole("table").first()).toBeVisible();
  });
});
