/**
 * Returns the seed for every property test: `PROPERTY_SEED` from `env` when it is set, and
 * otherwise one fixed seed, so CI draws the same inputs on each run and passes or fails the same
 * way. Set `PROPERTY_SEED` to another integer for a local run that looks for new failures. Throws a
 * `RangeError` when `PROPERTY_SEED` isn't an integer.
 *
 * @example
 * fc.configureGlobal({ seed: propertySeed(process.env) });
 */
export declare function propertySeed(env: Readonly<Record<string, string | undefined>>): number;
