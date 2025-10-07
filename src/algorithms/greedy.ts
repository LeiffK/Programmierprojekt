//Das ist der Greedy algorithmus. Ist halt echt lackgesoffen kurz weil die Klasse "BasePolicy" schon alle wichtigen Funktionen hat
import { BasePolicy } from "./BasePolicy.ts";
export class Greedy extends BasePolicy {
  selectAction(): number {
    // return this.tiebreak(this.getEstimates() as number[]); //Welche Arme gibt es? Wenn alle gleich "gut" nimm einfach zufällig irgendeinen
    return this.tiebreak(this.getEstimates() as number[]);
  }
  protected override setOptimisticInitialValue(): number {
    return this.cfg.optimisticInitialValue ?? 350; // Hier geringerer Wert weil Greedy sonst "zu oft" den passenden Arm gefunden hat
  }
}
