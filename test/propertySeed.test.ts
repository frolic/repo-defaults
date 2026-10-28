import { expect, test } from 'vite-plus/test';
import { propertySeed } from '../src/propertySeed.ts';

test('property tests draw from one fixed seed unless PROPERTY_SEED picks another', () => {
  expect(propertySeed({})).toBe(propertySeed({}));
  expect(propertySeed({ PROPERTY_SEED: '' })).toBe(propertySeed({}));
  expect(propertySeed({ PROPERTY_SEED: '7' })).toBe(7);
  expect(() => propertySeed({ PROPERTY_SEED: 'seven' })).toThrow(RangeError);
});
