import type { iBanditPolicy } from "./iBanditPolicy";

export type CustomPolicyRegistration = {
  id: string;
  name: string;
  factory: () => iBanditPolicy;
};
