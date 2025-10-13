import { test, expect } from "@playwright/test";
import { gotoHome, switchToAlgoMode } from "./utils";

test.describe("Algo-Mode | Chart & Sichtbarkeiten", () => {
  test("Algo-Mode zeigt RunnerControls und hält Chart sichtbar", async ({
    page,
  }) => {
    await gotoHome(page);

    await switchToAlgoMode(page);

    // RunnerControls sichtbar, Manual-Sektion nicht vorhanden
    await expect(page.locator("#runner-controls")).toBeVisible();
    await expect(page.locator("#manual-section")).toHaveCount(0);

    // Chart-Bereich rendern lassen (Canvas/SVG)
    const chart = page.locator("#chart-area");
    await expect(chart).toBeVisible();

    const canvas = chart.locator("canvas");
    const svg = chart.locator("svg");
    await Promise.race([
      canvas.first().waitFor({ state: "visible" }),
      svg.first().waitFor({ state: "visible" }),
    ]).catch(() => {});

    const hasCanvas = await canvas.count();
    const hasSvg = await svg.count();
    expect(hasCanvas + hasSvg).toBeGreaterThan(0);
  });
});
