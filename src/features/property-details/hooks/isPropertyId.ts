/**
 * True for an id the property API accepts: the encoded 16-character id every
 * API response carries (`id`), or a raw 24-character ObjectId. Anything else
 * would only earn a 400, so queries skip it.
 */
export const isPropertyId = (value: string): boolean =>
  /^[a-f\d]{24}$/i.test(value) || /^[A-Za-z0-9_-]{16}$/.test(value);
