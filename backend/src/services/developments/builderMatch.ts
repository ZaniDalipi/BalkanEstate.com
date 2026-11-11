/**
 * Whether two residences name the same building company. Names are free text,
 * so they are compared loosely (case, accents' composed forms, extra spaces),
 * never fuzzily: "Balkan Build" and "Balkan Builders" are different companies.
 */
export const normalizeBuilderName = (name: unknown): string =>
  typeof name === 'string' ? name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en') : '';

export const sameBuilderName = (a: unknown, b: unknown): boolean => {
  const x = normalizeBuilderName(a);
  return x.length > 0 && x === normalizeBuilderName(b);
};
