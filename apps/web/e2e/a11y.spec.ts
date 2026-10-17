import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** WCAG 2.2 AA (docs/web.md, Bölüm 6.4): her rota ve ana durumda 0 ihlal. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

const pages = [
  "/",
  "/nasil-hesapliyoruz",
  "/enflasyon",
  "/enflasyon/2025",
  "/enflasyon/2026",
  "/gizlilik",
  "/bulunamayan",
];

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} tema`, () => {
    test.use({ colorScheme });

    for (const path of pages) {
      test(`${path} ihlalsiz`, async ({ page }) => {
        await page.goto(path);
        await expectNoViolations(page);
      });
    }

    test("dolu sepet, uyarı ve hata durumları ihlalsiz", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /Türkiye ortalaması ile doldur/ }).click();
      await expect(page.getByRole("region", { name: "Sonuç" })).toContainText("Resmi:");
      await expectNoViolations(page);

      await page.getByLabel("Yüzde (%)").check();
      await page.getByRole("textbox", { name: "Gıda", exact: true }).fill("90");
      await expect(page.getByText(/Toplam %/)).toBeVisible();
      await page.getByRole("textbox", { name: "Konut", exact: true }).fill("abc");
      await expectNoViolations(page);
    });
  });
}
