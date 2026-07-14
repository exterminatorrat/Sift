export const WILSON_95_Z = 1.959963984540054;

export function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

// Nearest-rank matches the existing eval harness and never interpolates timings.
export function nearestRankPercentile(values, probability) {
  if (!Array.isArray(values)) {
    throw new TypeError("values must be an array.");
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError("probability must be between 0 and 1.");
  }
  if (values.length === 0) return null;
  if (!values.every(Number.isFinite)) {
    throw new TypeError("percentile values must all be finite numbers.");
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * probability) - 1);
  return sorted[index];
}

export function latencyPercentiles(valuesOrResults, probabilities = [0.5, 0.95, 0.99], accessor) {
  if (!Array.isArray(valuesOrResults)) {
    throw new TypeError("latency input must be an array.");
  }
  if (!Array.isArray(probabilities) || probabilities.length === 0) {
    throw new TypeError("probabilities must be a non-empty array.");
  }

  const getLatency = accessor ?? ((value) => (
    typeof value === "number" ? value : value?.latencyMs
  ));
  const latencies = valuesOrResults
    .map((value, index) => getLatency(value, index))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const summary = {
    count: latencies.length,
    excludedCount: valuesOrResults.length - latencies.length,
    min: latencies.length === 0 ? null : Math.min(...latencies),
    max: latencies.length === 0 ? null : Math.max(...latencies)
  };

  for (const probability of probabilities) {
    summary[percentileKey(probability)] = nearestRankPercentile(latencies, probability);
  }
  return summary;
}

// A zero-observation interval is unknown rather than the misleading range [0, 1].
export function wilsonInterval(successes, total, { z = WILSON_95_Z } = {}) {
  if (!Number.isInteger(successes) || !Number.isInteger(total)) {
    throw new TypeError("successes and total must be integers.");
  }
  if (total < 0 || successes < 0 || successes > total) {
    throw new RangeError("successes must be between 0 and total.");
  }
  if (!Number.isFinite(z) || z <= 0) {
    throw new RangeError("z must be a positive finite number.");
  }
  if (total === 0) {
    return { successes, total, rate: null, lower: null, upper: null, z };
  }

  const rate = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = (rate + zSquared / (2 * total)) / denominator;
  const margin = (
    z * Math.sqrt((rate * (1 - rate) + zSquared / (4 * total)) / total)
  ) / denominator;

  return {
    successes,
    total,
    rate,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    z
  };
}

function percentileKey(probability) {
  const percentage = probability * 100;
  if (!Number.isFinite(percentage)) {
    throw new RangeError("probability must be finite.");
  }
  return `p${String(percentage).replace(".", "_")}`;
}
