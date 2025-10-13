import { test, expect } from "@playwright/test";
import { gotoHome } from "./utils";

test.describe("Overlays | Thema verstehen", () => {
  test("TopicUnderstanding öffnet und lässt sich verlässlich schließen", async ({
    page,
  }) => {
    await gotoHome(page);

    // Öffnen
    await page.getByRole("button", { name: /Thema verstehen/i }).click();
    const header = page.getByText(/Multi-Armed-Bandits — Überblick/i).first();
    await expect(header).toBeVisible();

    // Dialog-Locator (falls die Komponente role=dialog setzt)
    const dialog = page.getByRole("dialog").first();

    // 1) ESC versuchen
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150); // kurze Stabilisierung

    const isDialogVisible = (await dialog.count())
      ? await dialog.isVisible().catch(() => false)
      : false;
    const isHeaderVisible = await header.isVisible().catch(() => false);

    // Falls noch sichtbar: 2) Close-Button suchen und klicken
    if (isDialogVisible || isHeaderVisible) {
      const scope = (await dialog.count()) ? dialog : page;
      const closeBtn = scope.getByRole("button", {
        name: /schließen|close|×|esc/i,
      });
      if (await closeBtn.count()) {
        await closeBtn.first().click();
      } else {
        // 3) Backdrop-Klick (oben links), falls die Komponente das unterstützt
        await page.mouse.click(5, 5);
      }
    }

    // Finaler Nachweis: Overlay ist weg oder unsichtbar
    if (await dialog.count()) {
      await expect(dialog).toBeHidden({ timeout: 3000 });
    } else {
      await expect(header).not.toBeVisible({ timeout: 3000 });
    }
  });
});
