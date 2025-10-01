//Hier kann man Parameter für den Algrothmus hinterlegen
export interface iBanditPolicyConfig {
  seed?: string | number;
  optimisticInitialValue?: number;
  epsilon?: number; // für epsilon-greedy
  confidence?: number; // für UCB
}
