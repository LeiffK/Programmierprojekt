import type { iEnvConfig } from "../env/Domain/iEnvConfig.ts";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv.ts";
import { Greedy } from "../algorithms/greedy.ts";
const cfg: iEnvConfig = {
  type: "gaussian",
  arms: 3,
  seed: 43, // damit die Ergebnisse reproduzierbar sind
};

const env = new GaussianBanditEnv(cfg);

console.log("Konfiguration:");
console.log("Means:", env.config.means);
console.log("StdDevs:", env.config.stdDev);
console.log("Optimaler Arm:", env.optimalAction);


const algorithmus= new Greedy({seed:42})
algorithmus.initialize(env)
for (let step = 0; step < 20; step++) {
  // Policy entscheidet, welchen Arm wir ziehen
  const action = algorithmus.selectAction();

  // Environment gibt Reward zurück
  const result = env.pull(action);

  // Policy lernt daraus
  algorithmus.update(result);

  console.log(
    `Step ${step}: action=${result.action}, reward=${result.reward.toFixed(2)}, optimal=${result.isOptimal}`
  );
}
// console.log("\nZiehe ein paar Arme:");
// for (let i = 0; i < 5; i++) {
//   const action = Math.floor(Math.random() * cfg.arms);
//   const result = env.pull(action);
//   console.log(`Pull ${i + 1}:`, result);
// }
// console.log("funktioniert das überhaupt????")
