import { number } from "echarts"
import seedrandom from "seedrandom"



export interface Arm{
    id: number;
    standardDeviation: number;
    mean: number;
    calcMean: number; // Was wissen wir und was wird von dem Arm erwartet??
    iterations: number;
}

export interface ChosenData{ //Um daten der gewählten Schritte zu speichern
    iteration: number;
    chosen: Arm;
    result: number;
}


export interface Simulation{
    arms: Arm[];
    sumIteration: number;
    winnings: number;
    history: ChosenData[]; 
    seed: number;
    rng: () => number; 
}



function randGaussianDist(
    rng : seedrandom,
    lowerBound: number = -100,
    upperBound: number = 100,
    standardDeviationFactor: number = 0.5
) {
    
    const mean = rng() * (upperBound - lowerBound) + lowerBound;
    const standardDeviation = Math.abs(
        rng()* (upperBound - lowerBound) + lowerBound-mean
    )*standardDeviationFactor;
    return { mean, standardDeviation };
}



// const rng= seedrandom(5);
// for (let i=0;i<5;i++){
//     console.log(randGaussianDist(rng));    
// }



export function createSim(
    armNumber:number,
    seed:number,
    lowerBound: number = -100, // Wird später für kontext wichtig. Hier kann man also einstellen welcher Max bzw min. Wert der Mittelwert unserer Funktion haben soll.
    upperBound: number = 100,
    standardDeviationFactor: number = 0.5 //Wert Größer machen = weiter streuen
    
): Simulation{ // mit :Simulation soll festgehalten werden, dass der Rückgabewert zum Objekt Simulation passt 
    //Wie viele Arme?? Welche Wahrscheinlichkeit sollen die haben??
        const rng= seedrandom(seed);

        const arms: Arm[]=Array.from({ length: armNumber }, (_, i) => {
            const {mean,standardDeviation}=randGaussianDist(
                rng,
                lowerBound,
                upperBound,
                standardDeviationFactor
            );
            return{
                id:i,
                mean,
                standardDeviation,
                calcMean:0,
                iterations:0,
            };
        });

    return {arms,sumIteration: 0,winnings: 0, history: [], seed:seed, rng: rng};
}

/**
 * Erzeugt eine normalverteilte Zufallszahl mit Mittelwert µ und Standardabweichung σ
 * über das Box–Muller-Verfahren.
 *
 */
export function randNormal(
  rng: () => number,
  mean: number = 0,
  stdDev: number = 1
): number {
  let u1 = 0, u2 = 0;

  // u1 darf nicht 0 sein (weil log(0) undefiniert ist)
  while (u1 === 0) u1 = rng(); // u1 zuständig für Radius
  u2 = rng(); //u2 zuständig für Winkel

  // Box–Muller-Transformation
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2); //Teil 1 der Formel zur Bestimmung der Länge der Hypotenuse/Radius, Teil 2 zur Bestimmung des Winkel des Dreiecks im Kreis.

  // Auf N(mean, stdDev^2) abbilden
  return mean + z0 * stdDev; //Box Muller Funktion gibt Werte Standard Normalverteilt zurück (also Mittelwert 0 & Standardabweichung =1)
}


function calcNewMean(
    oldCalcMean:number,
    result:number,
    armIterations:number
){
    return (oldCalcMean*armIterations+result)/(armIterations+1)
}


function play(
    simulation:Simulation,
    chosenArmNumber:number):Simulation
    { 
    let chosenArm=simulation.arms[chosenArmNumber] //Auswählen des Arms
    
    let currResult= randNormal(simulation.rng,chosenArm.mean,chosenArm.standardDeviation)
    simulation.sumIteration+=1;
    simulation.history.push({
        iteration: simulation.sumIteration,
        chosen: chosenArm,
        result: currResult
    })
    simulation.winnings+= currResult;
    chosenArm.calcMean=calcNewMean(chosenArm.calcMean,currResult,chosenArm.iterations)
    simulation.arms[chosenArmNumber]=chosenArm //Arm mit neuen Werten überschreiben
    return simulation 
}

let sim1 =createSim(5,5)
console.log("Simulation:")
console.log(sim1)
play(sim1,1)
play(sim1,1)
play(sim1,1)
play(sim1,1)
console.log("Simulation nach Iteration:")
console.log(sim1)



