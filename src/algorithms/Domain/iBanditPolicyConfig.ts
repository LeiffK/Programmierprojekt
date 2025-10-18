// Hier kann man Parameter fuer den Algorithmus hinterlegen
export interface iBanditPolicyConfig {
  seed?: string | number;
  optimisticInitialValue?: number;
  epsilon?: number; // fuer epsilon-greedy
  confidence?: number; // fuer UCB
  alpha?: number; // fuer Gradient Bandit bzw. Beta-Alpha bei Thompson
  beta?: number; // fuer Thompson (Bernoulli)
  priorMean?: number; // fuer Thompson (Gaussian)
  priorVariance?: number; // fuer Thompson (Gaussian)
  observationVariance?: number; // fuer Thompson (Gaussian)
}
