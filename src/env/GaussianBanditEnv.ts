import type { iBanditEnv } from "./Domain/iBanditEnv";
import type { iEnvConfig } from "./Domain/iEnvConfig";
import type { iPullResult } from "./Domain/iPullResult";
import { randGaussianDist } from "../utils/randGaussianDist.ts";
import { BanditEnv } from "./BanditEnv.ts";
import { randNormal } from "../utils/randNormal.ts";

export class GaussianBanditEnv extends BanditEnv implements iBanditEnv {
  constructor(config: iEnvConfig) {
    super(config);

    // lokale, definierte Kopien – damit TS weiß: nicht undefined
    let means = config.means;
    let stdDev = config.stdDev;

    const hasMeans = Array.isArray(means);
    const hasStd = Array.isArray(stdDev);

    if (!hasMeans && !hasStd) {
      means = [];
      stdDev = [];
      for (let i = 0; i < config.arms; i++) {
        const { mean, standardDeviation } = randGaussianDist(this.rng);
        means.push(mean);
        stdDev.push(standardDeviation);
      }
    } else if (hasMeans && hasStd) {
      if (means!.length !== config.arms || stdDev!.length !== config.arms) {
        throw new Error(
          "Gaussian config must define 'means' and 'standard deviation' for each arm.",
        );
      }
    } else {
      throw new Error("Provide either both 'means' and 'stdDev', or none.");
    }

    // Ab hier sind beide Arrays garantiert definiert
    if (stdDev!.some((v) => v < 0)) {
      throw new Error("Gaussian standard deviation must be non-negative.");
    }

    // zurück in die (von BanditEnv geerbte) Config schreiben
    this.config.means = means!;
    this.config.stdDev = stdDev!;

    // Optimalen Arm bestimmen – nur noch mit den lokalen, definierten Arrays arbeiten
    const bestMean = Math.max(...means!);
    this.optimalAction = means!.indexOf(bestMean);
  }

  pull(action: number): iPullResult {
    //Übergabewert ist die Zahl des Arms
    const mean = this.config.means![action];
    const stdDev = this.config.stdDev![action];
    const reward = randNormal(this.rng, mean, stdDev);

    return {
      action,
      reward,
      isOptimal: action === this.optimalAction, //boolean
    };
  }
}
