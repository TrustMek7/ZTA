import { describe, expect, it } from 'vitest';
import { parsePEN } from './domain';
describe('CA-05.1 dinero en céntimos sin redondeo flotante', () => {
  it.each([['1', 100], ['1.01', 101], ['10,20', 1020], ['1000.00', 100000], ['0.29', 29]])('convierte %s a %s', (text, expected) => expect(parsePEN(text)).toBe(expected));
  it.each(['1.001', '1e3', '-1', '', '1,000.00', 'NaN'])('rechaza %s', value => expect(parsePEN(value)).toBeNull());
});
