import fs from "fs";
import path from "path";
import ts from "typescript";
import type { iBanditPolicy } from "./Domain/iBanditPolicy";
import seedrandom from "seedrandom";

export class CustomPolicyLoader {
  /**
   * Lädt eine benutzerdefinierte Policy aus TypeScript oder JavaScript-Code.
   * Erwartet, dass der Code eine Klasse exportiert, die von BasePolicy erbt.
   */
  static async loadPolicy(
    code: string,
    lang: "typescript" | "javascript" = "typescript",
  ): Promise<iBanditPolicy> {
    //Methode kriegt Code und Sprache übergeben. Bei Default Typescript
    //static--> Gehört rein zu dieser Klasse und kann nicht vererbt werden

    // 1. User-Code transpilen
    const jsUser =
      lang === "typescript" // Wenn die Sprache Typescript
        ? ts.transpileModule(code, {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
          }).outputText //Dann Kompiliere den Code in JS und gebe ihn aus. Bei Compiler Einstellungen wird sich für CommonJS entschieden (statt ESM).
        : code; // Ansonsten gib einfach den Eingangs Code zurück

    // 2. BasePolicy-Quellcode einlesen und auch transpilen
    let baseSrc: string;
    try {
      if (typeof window !== "undefined") {
        // Browser-Variante: per fetch laden
        baseSrc = await fetch("/src/algorithms/BasePolicy.ts").then((r) =>
          r.text(),
        );
      } else {
        // Node/Vitest-Variante: per fs laden
        const basePath = path.resolve(
          process.cwd(),
          "src/algorithms/BasePolicy.ts",
        );
        baseSrc = fs.readFileSync(basePath, "utf8");
      }
    } catch (err) {
      throw new Error("BasePolicy konnte nicht geladen werden");
    }

    const jsBase = ts.transpileModule(baseSrc, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;

    // 3. Sandbox vorbereiten
    const exports: Record<string, unknown> = {}; //Variable, welche alle Exports speichert. Pro Datensatz soll jeweils ein String und ein unbekannter Datentyp gespeichert werden
    //String: zum Speichern des Namens des exportierten Objektes
    //unknown: zum Speichern des Wertes des exportierten Objektes
    //const = Man darf Werte ändern, aber nicht komplett neuzuweisen
    let BasePolicyRef: any;

    const sandboxRequire = (mod: string) => {
      //Ist eine Funktion mit welcher man im Editor Klassen implementieren kann: const { BasePolicy } = require("./BasePolicy");
      if (mod.includes("BasePolicy")) {
        //Wenn im Code versucht wird BasePolicy zu importieren...
        return { BasePolicy: BasePolicyRef }; //...dann wird die Referenz auf unsere BasePolicy-Klasse übergeben
      }

      if (mod.includes("seedrandom")) {
        //Require ist die JS Form von Import (bei TS).
        //   //Hier: Wenn im BasePolicy-Code "seedrandom" importiert wird, geben wir das Modul manuell weiter.
        return { __esModule: true, default: seedrandom }; //seedrandom wird im Sandbox-Kontext erlaubt
      }
      throw new Error(`Unbekanntes Modul: ${mod}`); // Ansonsten Error weil dann versucht wird andere Imports zu machen (Abuse Vermeidung)
    };

    // 4. BasePolicy ausführen und Referenz speichern
    const baseExports: Record<string, unknown> = {};
    const baseFunc = new Function("exports", "require", jsBase); // Hier passiert die "Magie". Wir können hier Parameternamen und Code als String übergeben.
    baseFunc(baseExports, sandboxRequire); // Dann übergeben wir hier unsere Variablen (exports und require)
    BasePolicyRef = Object.values(baseExports)[0]; // erste exportierte Klasse (BasePolicy) wird gespeichert

    // 5. User-Code ausführen
    const userExports: Record<string, unknown> = {};
    const userFunc = new Function("exports", "require", jsUser); // erstellt Funktion aus Usercode
    userFunc(userExports, sandboxRequire); //führt Usercode im gleichen Sandbox-Kontext aus

    // 6. Nach einer exportierten Policy-Klasse suchen
    const policyClass = Object.values(userExports).find(
      (val) =>
        typeof val === "function" && //Bei JS Klasse = Function --> val muss Klasse bzw. Funktion sein
        typeof (val as any).prototype?.selectAction === "function", //Wir erkennen eine Policy-Klasse daran, dass sie selectAction implementiert
    );

    /*
      val => beschreibt Bedingung
      type of val === "function": Bei JS Klasse= Function--> val muss Klasse bzw Funktion sein
      Object.prototype.isPrototypeOf.call(BasePolicy, val.prototype) : (nicht mehr hier nötig) - früherer Vererbungscheck 
      Object: Urvater aller Dinge in JS
      Object.prototype: In JS keine echten Klassen --> "prototype" ist ein ähnliches Konzept, beschreibt also die Elternklasse
    */

    if (!policyClass)
      throw new Error(
        "Keine gültige Policy gefunden (muss BasePolicy erweitern).",
      ); //Wenn keine Policy Class vorhanden Error

    // 7. Instanziieren
    const policyInstance = new (policyClass as any)(); //PolicyInstance ist eine neue Klasse dessen Typ wir selber nicht wissen, weil der Typ ja in dem Code übergeben wird. --> as any = irgendein Datentyp
    return policyInstance; // Das Object wird übergeben
  }
}
