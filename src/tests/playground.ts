import { CustomPolicyLoader } from "../algorithms/CustomPolicyLoader.ts";
import { GaussianBanditEnv } from "../env/GaussianBanditEnv.ts";
import type { iEnvConfig } from "../env/Domain/iEnvConfig";

const userCode = `
  const { BasePolicy } = require("./BasePolicy");

  export class MyTestPolicy extends BasePolicy {
    selectAction() {
      // Einfach zufälligen Arm wählen
      return this.randomArm();
    }
  }
`;

const policy = CustomPolicyLoader.loadPolicy(userCode, "typescript");

const cfg: iEnvConfig = {
  type: "gaussian",
  arms: 3,
  seed: 43,
};

const env = new GaussianBanditEnv(cfg);

policy.initialize(env);

for (let i = 0; i < 5; i++) {
  const action = policy.selectAction();
  const result = env.pull(action);
  policy.update(result);
  console.log(`Step ${i + 1}:`, { action, reward: result.reward });
}

console.log("Q-Schätzungen:", policy.getEstimates());
console.log("Zählungen:", policy.getCounts());
console.log("Info:", policy.getInfo());
