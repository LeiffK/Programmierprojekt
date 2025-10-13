import { test, expect } from "@playwright/test";
import { gotoHome, ensureDebugState, expectDebugUI } from "./utils";

test.describe("Persistenz | Debug-Toggle", () => {
  test("Debug ‚an‘ persistiert über Reload; danach ‚aus‘ ebenfalls", async ({
    page,
  }) => {
    await gotoHome(page);

    // AN schalten + Persistenz prüfen
    await ensureDebugState(page, true);
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("banditstudio.debug")),
      )
      .toBe("true");

    // Reload + UI-Attribut prüfen (robust für Firefox)
    await page.reload({ waitUntil: "load" });
    await expectDebugUI(page, true);

    // AUS schalten + Persistenz prüfen
    await ensureDebugState(page, false);
    await expect
      .poll(async () =>
        page.evaluate(() => localStorage.getItem("banditstudio.debug")),
      )
      .toBe("false");

    // Reload + UI-Attribut prüfen
    await page.reload({ waitUntil: "load" });
    await expectDebugUI(page, false);
  });
});
