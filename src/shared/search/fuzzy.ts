/**
 * Typo tolerance.
 *
 * Google forgives a misspelling silently: "budvva" and "bidva" both find
 * Budva, and nobody is asked to try again. The engine does the same with a
 * bounded Damerau-Levenshtein distance — bounded because the answer is only
 * ever compared against a small budget, so the full matrix is wasted work.
 *
 * Transposition is a separate edit rather than two substitutions because it
 * is the single most common real typing error ("Sarnade" for "Sarande"), and
 * counting it once is what makes a one-edit budget useful.
 */

/**
 * Edit distance between `a` and `b`, capped at `maxDistance`.
 * Returns `maxDistance + 1` for anything further apart, which callers read as
 * "no match" without needing the true distance.
 */
export const boundedEditDistance = (a: string, b: string, maxDistance: number): number => {
  if (a === b) return 0;
  if (maxDistance <= 0) return 1;

  const overflow = maxDistance + 1;
  // A length gap alone already exceeds the budget.
  if (Math.abs(a.length - b.length) > maxDistance) return overflow;
  if (!a.length) return b.length <= maxDistance ? b.length : overflow;
  if (!b.length) return a.length <= maxDistance ? a.length : overflow;

  let twoRowsBack: number[] = [];
  let previous: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current: number[] = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    // Only the diagonal band within the budget can hold a usable value.
    const from = Math.max(1, i - maxDistance);
    const to = Math.min(b.length, i + maxDistance);
    let rowBest = overflow;

    for (let j = 1; j <= b.length; j += 1) {
      if (j < from || j > to) {
        current[j] = overflow;
        continue;
      }

      const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        previous[j] + 1,          // deletion
        current[j - 1] + 1,       // insertion
        previous[j - 1] + substitution
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, twoRowsBack[j - 2] + 1); // transposition
      }

      current[j] = best;
      if (best < rowBest) rowBest = best;
    }

    // Every path through this row is already over budget.
    if (rowBest > maxDistance) return overflow;

    twoRowsBack = previous;
    previous = current;
    current = new Array(b.length + 1);
  }

  const distance = previous[b.length];
  return distance <= maxDistance ? distance : overflow;
};

/**
 * How many typos a term of this length may carry.
 *
 * Short terms get none: at three characters, one edit reaches a third of the
 * alphabet and "bar" would match "car", "bay" and "bad". The budget opens at
 * four characters and widens once more for long words, which is close to
 * what search engines settle on in practice.
 */
export const typoBudget = (length: number): number => {
  if (length < 4) return 0;
  if (length < 8) return 1;
  return 2;
};

/** True when `term` is within its typo budget of `candidate`. */
export const isFuzzyMatch = (term: string, candidate: string): boolean => {
  const budget = typoBudget(term.length);
  if (budget === 0) return term === candidate;
  return boundedEditDistance(term, candidate, budget) <= budget;
};

/**
 * Fuzzy prefix match: is `term` a typo of the opening of `candidate`?
 *
 * This is what makes typing feel live — "sarnad" should still be reaching
 * for "Sarandë" while the word is half-typed, so the candidate is trimmed to
 * the term's length (plus the budget) before being compared.
 */
export const fuzzyPrefixDistance = (term: string, candidate: string): number => {
  const budget = typoBudget(term.length);
  if (budget === 0) return candidate.startsWith(term) ? 0 : budget + 1;

  const window = candidate.slice(0, Math.min(candidate.length, term.length + budget));
  return boundedEditDistance(term, window, budget);
};
