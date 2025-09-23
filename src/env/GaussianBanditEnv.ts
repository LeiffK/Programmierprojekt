import type { iBanditEnv } from "../Domain/iBanditEnv.ts";
import type { iEnvConfig } from "../Domain/iEnvConfig.ts";
import type { iPullResult } from "../Domain/iPullResult.ts";
import {randGaussianDist} from "../utils/randGaussianDist.ts";
import {BanditEnv} from "./BanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";

export class GaussianBanditEnv extends BanditEnv implements iBanditEnv {

  constructor(config: iEnvConfig) {
    super(config)//Führe den Konstruktor der Elternklasse aus ==> BanditEnv
    // Grundlegende Validierung

    const hasMeans = Array.isArray(config.means); //Ist eines der Arrays leer??
    const hasStd   = Array.isArray(config.stdDev);

    if (!hasMeans || !hasStd) { // jo ist leer also:
      
      config.means  = [];
      config.stdDev = [];
      for (let i = 0; i < config.arms; i++) { //solange wir nicht genug Mittelwerte und Std. Verteilungen für unsere haben füge mehr hinzu
        const { mean, standardDeviation } = randGaussianDist(this.rng); //erzeuge ein neues paar
        config.means.push(mean); //Zu den arrays hinzufügen
        config.stdDev.push(standardDeviation);
      }
    } else if (hasMeans && hasStd) {
      // Beide Arrays übergeben--> sind die vollständig??
      if (config.means!.length !== config.arms || config.stdDev!.length !== config.arms) {
        throw new Error("Gaussian config must define 'means' and 'standard deviation' for each arm.");
      }
    } else {
      // Nur eins übergeben → Fehler
      throw new Error("Provide either both 'means' and 'stdDev', or none.");
    }
    if (config.stdDev.some(v => v < 0)) {
      throw new Error("Gaussian standard deviation must be non-negative.");
    }







    // Optimaler Arm: hier nach höchstem Mittelwert (bei gleichen Standardabweichungen optimal).
    // Hier mal bitte Auge zu drücken. Ich will jetzt nicht analysieren, wie sich das mit den ganzen Standardabweichungen verhält.  
    const { means } = config;
    const bestMean = Math.max(...means); // Durchsuche alle Mittelwerte und nimm den höchsten
    this.optimalAction = means.indexOf(bestMean); //muss als index übergeben werden, da iPullResult auch immer nur indizes übergeben bekommt
  }

  pull(action: number): iPullResult { //Übergabewert ist die Zahl des Arms
    const mean = this.config.means![action];
    const stdDev = this.config.stdDev![action];
    const reward=randNormal(this.rng,mean,stdDev)

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction, //boolean
    };
  }
}



