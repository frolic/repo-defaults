/**
 * Returns the seed for every property test: `PROPERTY_SEED` from `env` when it is set, and
 * otherwise one fixed seed, so CI draws the same inputs on each run and passes or fails the same
 * way. Set `PROPERTY_SEED` to another integer for a local run that looks for new failures. Throws a
 * `RangeError` when `PROPERTY_SEED` isn't an integer.
 *
 * @example
 * fc.configureGlobal({ seed: propertySeed(process.env) });
 */
export function propertySeed(env: Readonly<Record<string, string | undefined>>): number {
  const value = env['PROPERTY_SEED'];
  if (value === undefined || value === '') {
    return 20_261_028;
  }
  const seed = Number(value);
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError(`PROPERTY_SEED is ${value}, not an integer.`);
  }
  return seed;
}
