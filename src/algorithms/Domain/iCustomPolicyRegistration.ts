import type { iBanditPolicy } from "./iBanditPolicy";

export interface CustomPolicyRegistration {
  id: string;
  name: string;
  factory: () => iBanditPolicy;
}

export type iCustomPolicyRegistration = CustomPolicyRegistration;
