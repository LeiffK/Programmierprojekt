// Ein manueller Schritt (aka ein Zuschauer-Event)
export type ManualStep = {
    action: number;      // Arm-Index (0..N-1)
    reward: number;      // beobachteter Reward (Watchtime etc.)
    isOptimal: boolean;  // war das der beste Arm?
};