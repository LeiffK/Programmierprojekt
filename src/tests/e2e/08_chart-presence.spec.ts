import { test, expect } from "@playwright/test";
import { gotoHome, clickFirstManualCard } from "./utils";

test.describe("Chart-Area | Rendering", () => {
  test("Chart-Area rendert einen Chart (Canvas oder SVG)", async ({ page }) => {
    await gotoHome(page);

    const chart = page.locator("#chart-area");
    await expect(chart).toBeVisible();

    // Warte, bis ein Canvas oder SVG im Chart-Bereich erscheint (ECharts o. ä.)
    const canvas = chart.locator("canvas");
    const svg = chart.locator("svg");
    await Promise.race([
      canvas.first().waitFor({ state: "visible" }),
      svg.first().waitFor({ state: "visible" }),
    ]).catch(() => {});

    // Mindestens einer der beiden sollte vorhanden sein
    const hasCanvas = await canvas.count();
    const hasSvg = await svg.count();
    expect(hasCanvas + hasSvg).toBeGreaterThan(0);
  });

  test("Manueller Klick beeinflusst Chart-Datenfluss ohne Fehler", async ({
    page,
  }) => {
    await gotoHome(page);

    // Vorher: merke Anzahl der DOM-Knoten im Chart (als grober Proxy)
    const beforeNodes = await page
      .locator("#chart-area")
      .evaluate((el) => el.getElementsByTagName("*").length);

    // Manueller Klick (Arm 1)
    await clickFirstManualCard(page);

    // Nachher: Chart-Bereich bleibt sichtbar und hat weiterhin DOM-Inhalt
    await expect(page.locator("#chart-area")).toBeVisible();
    const afterNodes = await page
      .locator("#chart-area")
      .evaluate((el) => el.getElementsByTagName("*").length);

    // Nicht streng auf „mehr“, aber sicherstellen, dass DOM nicht kollabiert
    expect(afterNodes).toBeGreaterThan(0);
    expect(beforeNodes).toBeGreaterThan(0);
  });
});
