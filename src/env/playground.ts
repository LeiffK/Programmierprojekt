import type { iEnvConfig } from "./Domain/iEnvConfig";
import { GaussianBanditEnv } from "./GaussianBanditEnv";

const cfg: iEnvConfig = {
  type: "gaussian",
  arms: 3,
  seed: 43,  // damit die Ergebnisse reproduzierbar sind
};

const env = new GaussianBanditEnv(cfg);

console.log("Konfiguration:");
console.log("Means:", env.config.means);
console.log("StdDevs:", env.config.stdDev);
console.log("Optimaler Arm:", env.optimalAction);

console.log("\nZiehe ein paar Arme:");
for (let i = 0; i < 5; i++) {
  const action = Math.floor(Math.random() * cfg.arms);
  const result = env.pull(action);
  console.log(`Pull ${i + 1}:`, result);
}
// console.log("funktioniert das überhaupt????")