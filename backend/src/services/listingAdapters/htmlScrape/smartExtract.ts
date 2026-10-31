/**
 * Smart extraction with strict context requirements to avoid false positives.
 *
 * Rules:
 * - Require word boundaries so we don't match inside other words
 * - Validate plausible numeric ranges (e.g., 1-20 beds, not 50)
 * - Require currency symbols/units adjacent to numbers
 * - Reject obviously non-listing matches (phone numbers, dates, IDs)
 *
 * Returns `undefined` (not a guess) when there's no high-confidence match.
 */
export const smartExtract = (
  text: string | undefined,
  field: 'price' | 'beds' | 'baths' | 'sqft'
): string | undefined => {
  if (!text || text.length < 3) return undefined;
  // Normalise whitespace so multi-line cards behave like single-line text.
  const t = text.replace(/\s+/g, ' ').trim();

  switch (field) {
    case 'price': {
      // Require currency symbol/code adjacent to a number with reasonable magnitude.
      // Reject sub-100 numbers (likely fees, not listing prices) and >100M (typo).
      const patterns = [
        // €1,234,567 / EUR 250.000 / $500K / ALL 5,000,000
        /(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|KM|MKD|ден|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL)\s*([\d][\d.,\s]*[\d](?:\s*[KMB])?)(?!\d)/i,
        // 1,234,567 € / 250.000 EUR / 5.000.000 ALL
        /(?<!\d)([\d][\d.,\s]*[\d](?:\s*[KMB])?)\s*(?:€|EUR|\$|USD|£|GBP|RSD|kn|HRK|BAM|KM|MKD|ден|RON|BGN|лв\.?|ALL|Lek|HUF|Ft|TRY|TL)(?![\p{L}\d])/iu,
      ];
      for (const re of patterns) {
        const m = t.match(re);
        if (!m) continue;
        const numStr = m[1].replace(/[^\d.,KMB]/gi, '');
        const num = parseFloat(numStr.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
        if (!Number.isFinite(num) || num < 100 || num > 100_000_000) continue;
        return m[0].trim();
      }
      return undefined;
    }
    case 'beds': {
      // Require word boundary before the number so "12345 sobe" → bedroom
      // matches don't fire on phone numbers / postcodes. Require the unit
      // to be followed by a word boundary too.
      const m = t.match(
        /(?<![.\d])(\d{1,2})\s*(?:bed(?:room)?s?|soba|sobi|sobe|chambre[s]?|habitaci[oó]n(?:es)?|zimmer|schlafzimmer)(?![\p{L}\d])/iu
      );
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 15) return undefined;
      return String(n);
    }
    case 'baths': {
      // `wc` removed — too noisy (matches IDs, slugs). Use full words only.
      const m = t.match(
        /(?<![.\d])(\d{1,2})\s*(?:bath(?:room)?s?|kupatil[ao]?|toilets?|salle\s+de\s+bain|badezimmer|ba[nñ]os?)(?![\p{L}\d])/iu
      );
      if (!m) return undefined;
      const n = parseInt(m[1], 10);
      if (n < 1 || n > 10) return undefined;
      return String(n);
    }
    case 'sqft': {
      // Strict m² / m2 boundary; reject "M2" engine codes by requiring digits-then-unit
      // and rejecting an immediately-preceding letter.
      const m = t.match(
        /(?<![A-Za-z])(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|sqm|sq\.?\s*m\.?|square\s*meters?|qm|m\^2|kvadrata?|povr[sš]ina[\s:]*\d+)(?![\p{L}\d])/iu
      );
      if (!m) return undefined;
      const n = parseFloat(m[1].replace(',', '.'));
      // Realistic property areas: 10 m² (tiny studio) to 50,000 m² (large estate)
      if (!Number.isFinite(n) || n < 10 || n > 50_000) return undefined;
      return String(n);
    }
  }
  return undefined;
};
