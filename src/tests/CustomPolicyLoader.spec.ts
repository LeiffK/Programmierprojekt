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
  it("lädt erfolgreich eine gültige benutzerdefinierte Policy (TS)", () => {
    const userCode = `
      const { BasePolicy } = require("./BasePolicy");
      export class MyTestPolicy extends BasePolicy {
        selectAction() {
          return this.randomArm();
        }
      }
    `;

    const policy = CustomPolicyLoader.loadPolicy(userCode, "typescript");

    // Prüfung, ob Instanz korrekt erstellt wurde
    expect(policy).toBeDefined();
    expect(typeof policy.selectAction).toBe("function");
    expect(policy.getInfo().name).toBe("MyTestPolicy");
  });

  it("lädt erfolgreich eine gültige benutzerdefinierte Policy (JS)", () => {
    const userCode = `
      const { BasePolicy } = require("./BasePolicy");
      exports.MyJSPolicy = class MyJSPolicy extends BasePolicy {
        selectAction() {
          return this.randomArm();
        }
      }
    `;

    const policy = CustomPolicyLoader.loadPolicy(userCode, "javascript");
    expect(policy).toBeDefined();
    expect(policy.getInfo().name).toBe("MyJSPolicy");
  });

  it("wirft Fehler, wenn keine gültige Policy exportiert wird", () => {
    const invalidCode = `
      export const foo = 42;
    `;

    expect(() =>
      CustomPolicyLoader.loadPolicy(invalidCode, "typescript"),
    ).toThrowError("Keine gültige Policy gefunden");
  });

  it("wirft Fehler bei verbotenem Modulimport", () => {
    const badImport = `
      const fs = require("fs");
      export class BadPolicy {
        selectAction() { return 1; }
      }
    `;

    expect(() =>
      CustomPolicyLoader.loadPolicy(badImport, "typescript"),
    ).toThrowError(/Unbekanntes Modul/);
  });

  it("kompiliert auch fehlerfreien JS-Code ohne TypScript-Transpilation", () => {
    const simpleJS = `
      const { BasePolicy } = require("./BasePolicy");
      exports.Simple = class Simple extends BasePolicy {
        selectAction() { return 0; }
      }
    `;
    const policy = CustomPolicyLoader.loadPolicy(simpleJS, "javascript");
    expect(policy).toBeDefined();
    expect(policy.getInfo().name).toBe("Simple");
  });

  it("stellt sicher, dass Policy Methoden von BasePolicy erbt", () => {
    const code = `
      const { BasePolicy } = require("./BasePolicy");
      export class DerivedPolicy extends BasePolicy {
        selectAction() { return this.randomArm(); }
      }
    `;
    const policy = CustomPolicyLoader.loadPolicy(code);
    expect(typeof policy.update).toBe("function");
    expect(typeof policy.reset).toBe("function");
  });
});
