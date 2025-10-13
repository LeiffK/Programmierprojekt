import { test, expect } from "@playwright/test";
import { gotoHome } from "./utils";

test.describe("Smoke | Branding & Layout", () => {
  test("Header, Branding, Action-Bar-Controls sichtbar", async ({ page }) => {
    await gotoHome(page);

    await expect(page.locator(".brand")).toContainText(/Bandit-Studio/i);
    await expect(page.locator("svg.yt-logo")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /Zurücksetzen/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Debug:/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Thema verstehen/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Anwendung verstehen/i }),
    ).toBeVisible();

    await expect(page.locator("#chart-area")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Verläufe/i }),
    ).toBeVisible();
  });

  test("Default-Ansicht zeigt manuellen Bereich inkl. Toast", async ({
    page,
  }) => {
    await gotoHome(page);
    await expect(page.locator("#manual-section")).toBeVisible();
    // Sinnvoller Check: mindestens eine Karte per Label vorhanden (UI-Vertrag)
    await expect(page.getByText(/Thumbnail\s*A\b/i)).toBeVisible();
    await expect(page.locator(".toast")).toBeVisible();
  });
});
