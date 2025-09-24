//Hier kann man Parameter für den Algrothmus hinterlegen
export interface iBanditPolicyConfig {
  seed?: number;
  epsilon?: number;   // für epsilon-greedy
  c?: number;         // für UCB
}