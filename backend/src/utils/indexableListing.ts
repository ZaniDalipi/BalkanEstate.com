/**
 * Which listings search engines may index: active, our own (not imported
 * from another website — those pages are `noindex`, their text and photos
 * belong to the source), and with a description (a page with nothing but a
 * price says nothing a search result should point to).
 *
 * The listings sitemap and the market landing pages both use this, so the
 * pages a landing page counts as "indexable" are exactly the ones the sitemap
 * lists.
 */

/** Not imported: no source recorded. */
export const NOT_IMPORTED_FILTER = {
  $or: [{ source: { $exists: false } }, { source: null }, { source: '' }],
};

export const INDEXABLE_LISTING_FILTER = {
  status: 'active',
  ...NOT_IMPORTED_FILTER,
  description: { $exists: true, $ne: '' },
};

/**
 * The same test as an aggregation expression (status is matched separately),
 * for counting indexable listings inside a `$group`.
 */
export const INDEXABLE_LISTING_EXPR = {
  $and: [
    { $eq: [{ $ifNull: ['$source', ''] }, ''] },
    { $ne: [{ $ifNull: ['$description', ''] }, ''] },
  ],
};
