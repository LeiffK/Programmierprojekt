//Das ist der Greedy algorithmus. Ist halt echt lackgesoffen kurz weil die Klasse "BasePolicy" schon alle wichtigen Funktionen hat
import { BasePolicy } from "./BasePolicy.ts";
import type { iBanditPolicyConfig } from "./Domain/iBanditPolicyConfig";

export class Greedy extends BasePolicy {
  /**
   * Greedy nutzt standardmäßig einen hohen optimistischen Startwert,
   * damit alle Arme mindestens einmal ausprobiert werden.
   */
  selectAction(): number {
    // return this.tiebreak(this.getEstimates() as number[]); //Welche Arme gibt es? Wenn alle gleich "gut" nimm einfach zuf�llig irgendeinen
    return this.tiebreak(this.getEstimates() as number[]);
  }
}
