export function randGaussianDist(
  rng: () => number,
  lowerBound: number = -100,
  upperBound: number = 100,
  standardDeviationFactor: number = 0.5,
) {
  const mean = rng() * (upperBound - lowerBound) + lowerBound;
  const standardDeviation =
    Math.abs(rng() * (upperBound - lowerBound) + lowerBound - mean) *
    standardDeviationFactor;
  return { mean, standardDeviation };
}
