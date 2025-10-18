import { describe, it, expect } from "vitest";
import { randBernoulli } from "../env/BernoulliBanditEnv.ts";

describe("randBernoulli", () => {
  it("gibt 1 zurück wenn rng() < p", () => {
    const rng = () => 0.3;
    const result = randBernoulli(rng, 0.5);
    expect(result).toBe(1);
  });

  it("gibt 0 zurück wenn rng() >= p", () => {
    const rng = () => 0.7;
    const result = randBernoulli(rng, 0.5);
    expect(result).toBe(0);
  });

  it("gibt immer 1 zurück wenn p = 1", () => {
    const rng = () => 0.99;
    const result = randBernoulli(rng, 1);
    expect(result).toBe(1);
  });

  it("gibt immer 0 zurück wenn p = 0", () => {
    const rng = () => 0.01;
    const result = randBernoulli(rng, 0);
    expect(result).toBe(0);
  });

  it("gibt korrektes Ergebnis für Grenzwert rng() = p", () => {
    const rng = () => 0.5;
    const result = randBernoulli(rng, 0.5);
    expect(result).toBe(0); // 0.5 ist nicht < 0.5
  });
});
