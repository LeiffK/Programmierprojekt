import { iEnvConfig } from "./iEnvConfig";

export interface BanditEnv {
  config: EnvConfig;
  optimalAction: number;
  pull(action: number): PullResult;  // Methode, um Belohnung für Aktion zu simulieren
}