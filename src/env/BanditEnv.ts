import type {iBanditEnv} from "../Domain/iBanditEnv.ts"
import type { iEnvConfig } from "../Domain/iEnvConfig.ts";
import type { iPullResult } from "../Domain/iPullResult.ts";
import seedrandom from "seedrandom";
//Das ist die Klasse von welcher Gaussian und Bernoulli

export abstract class BanditEnv implements iBanditEnv {
    config: iEnvConfig; // Konfigurationsobjekt der Umgebung mit Parametern wie Anzahl Arme und Wahrscheinlichkeiten
    optimalAction: number; // Index des optimalen Arms (höchste Gewinnwahrscheinlichkeit)
    protected rng: () => number; // Klassen spezifische Zufallszahl Erzeugung. Protected bedeutet auch Kinder können draufzugreifen. Private wäre nur in der Klasse selbst benutzbar
  constructor(config: iEnvConfig) {

    //Error Messages:
    if (config.type !== "gaussian" && config.type !== "bernoulli") {
      throw new Error(
          `BanditEnv expects config.type to be either "gaussian" or "bernoulli".`
      );
    }
    if (!config.arms || config.arms <= 0) {
      throw new Error("Config must define a positive number of arms.");
    }


    this.config = config;
    this.rng = seedrandom(config.seed);//Seedrandom nimmt eigentlich Strings entgegen. Juckt aber nicht obs nh number ist. Funktioniert so auch
    this.optimalAction = -1; // Platzhalter Kinderklassen überschreiben das im Konstruktor
    this.config = config; // Speichere Konfiguration
}

  abstract pull(action: number): iPullResult 
}
