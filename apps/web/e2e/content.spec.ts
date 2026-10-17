import { expect, test } from "@playwright/test";

test("yıl sayfaları arasında gezinilir", async ({ page }) => {
  await page.goto("/enflasyon");
  await page.getByRole("link", { name: /^2025/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2025 enflasyonu");
  await expect(page.getByText(/Aralık'tan Aralık'a %30,9 arttı/)).toBeVisible();
  await page.getByRole("link", { name: "2026 →" }).click();
  await expect(page).toHaveURL(/\/enflasyon\/2026$/);
});

test("olmayan yıl 404 döner", async ({ page }) => {
  const response = await page.goto("/enflasyon/1999");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sayfa bulunamadı");
});

test("sitemap ve robots", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/enflasyon/2025</loc>");
  expect(sitemap).not.toContain("/sonuc");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
});

test("güvenlik başlıkları", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
});
