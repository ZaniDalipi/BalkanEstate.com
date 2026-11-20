/**
 * Products in the database that are not in the seeded catalogue.
 *
 * Until the payment fixes, three code paths created a Product from whatever a
 * request or a payment said, instead of refusing an unknown plan:
 *   - the free-coupon route:  name = planName,  description = `${planName} subscription`, price 0
 *   - the Stripe handler:     the same description pattern
 *   - the Paysera callback:   description = 'Subscription via PaySera'
 * None of them set a tier, and all were created active and visible, so they
 * show on the public pricing page. Products an admin adds in the pricing
 * manager are not in the seed list either, so only the ones matching those
 * fingerprints are flagged.
 */

export interface CatalogueProduct {
  productId: string;
  name: string;
  description?: string;
  price: number;
  tier?: string;
  isActive?: boolean;
  isVisible?: boolean;
  createdAt?: Date;
}

export interface UnknownProductRow extends CatalogueProduct {
  likelyAutoCreated: boolean;
}

export const PAYSERA_AUTO_DESCRIPTION = 'Subscription via PaySera';

export const looksAutoCreated = (product: CatalogueProduct): boolean => {
  if (product.tier) return false;
  const description = product.description ?? '';
  return description === PAYSERA_AUTO_DESCRIPTION || / subscription$/.test(description);
};

/** The products whose id is not in `knownIds`, oldest first, each marked if it looks auto-created. */
export const findUnknownProducts = (
  products: CatalogueProduct[],
  knownIds: Iterable<string>
): UnknownProductRow[] => {
  const known = new Set(knownIds);
  return products
    .filter((product) => !known.has(product.productId))
    .map((product) => ({ ...product, likelyAutoCreated: looksAutoCreated(product) }))
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
};
