import { BasePolicy } from "./BasePolicy.ts";

export class EpsilonGreedy extends BasePolicy {
  selectAction(): number {
    const epsilon = this.getClampedEpsilon(); // bringt Epsilon in erlaubten Bereich

    // Exploration
    if (this.rng() < epsilon) {
      //Wählt in Epsilon-% Der Fälle einen zufälligen Arm
      return this.randomArm();
    }

    return this.tiebreak(this.getEstimates() as number[]); // Wenn du nicht zufällig wählst nimm den Arm mit dem höchsten estimate Reward
  }

  // Hilfsfunktion: bringt Epsilon in passenden Bereich
  protected getClampedEpsilon(): number {
    const raw = this["cfg"]?.epsilon ?? 0.1; //Wenn es ein Epsilon gibt verwende es. Ansonsten nimm 10%
    if (raw < 0) return 0; // Kleiner als 0% is Quatsch
    if (raw > 1) return 1; // Größer als 100% ist auch Quatsch
    return raw;
  }
  protected override setOptimisticInitialValue(): number {
    return this.cfg.optimisticInitialValue ?? 500;
  }
}
