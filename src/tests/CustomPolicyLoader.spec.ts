import { describe, it, expect } from "vitest";
import { CustomPolicyLoader } from "src/algorithms/CustomPolicyLoader.ts";
import fs from "fs";

// Hilfsfunktion: stellt sicher, dass BasePolicy existiert
const basePolicyExists = fs.existsSync("./src/algorithms/BasePolicy.ts");
if (!basePolicyExists) {
  throw new Error(
    "BasePolicy.ts nicht gefunden – Tests können nicht ausgeführt werden!",
  );
}

describe("CustomPolicyLoader", () => {
  it("lädt erfolgreich eine gültige benutzerdefinierte Policy (TS)", async () => {
    const userCode = `
      import { BasePolicy } from "./BasePolicy";
      export class MyTestPolicy extends BasePolicy {
        selectAction() {
          return this.randomArm();
        }
      }
    `;

    const policy = await CustomPolicyLoader.loadPolicy(userCode, "typescript");

    // Prüfung, ob Instanz korrekt erstellt wurde
    expect(policy).toBeDefined();
    expect(typeof policy.selectAction).toBe("function");
    expect(policy.getInfo().name).toBe("MyTestPolicy");
  });

  it("weist JavaScript-Code ab", async () => {
    const userCode = `
      const { BasePolicy } = require("./BasePolicy");
      exports.MyJSPolicy = class MyJSPolicy extends BasePolicy {
        selectAction() {
          return this.randomArm();
        }
      }
    `;

    await expect(
      CustomPolicyLoader.loadPolicy(userCode, "javascript"),
    ).rejects.toThrowError(/nur TypeScript/i);
  });

  it("wirft Fehler, wenn keine gültige Policy exportiert wird", async () => {
    const invalidCode = `
      export const foo = 42;
    `;

    await expect(
      CustomPolicyLoader.loadPolicy(invalidCode, "typescript"),
    ).rejects.toThrowError("Keine gültige Policy gefunden");
  });

  it("wirft Fehler bei verbotenem Modulimport", async () => {
    const badImport = `
      const fs = require("fs");
      export class BadPolicy {
        selectAction() { return 1; }
      }
    `;

    await expect(
      CustomPolicyLoader.loadPolicy(badImport, "typescript"),
    ).rejects.toThrowError(/Unbekanntes Modul/);
  });

  it("stellt sicher, dass Policy Methoden von BasePolicy erbt", async () => {
    const code = `
      const { BasePolicy } = require("./BasePolicy");
      export class DerivedPolicy extends BasePolicy {
        selectAction() { return this.randomArm(); }
      }
    `;
    const policy = await CustomPolicyLoader.loadPolicy(code);
    expect(typeof policy.update).toBe("function");
    expect(typeof policy.reset).toBe("function");
  });
});
