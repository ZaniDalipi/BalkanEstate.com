process.env.SKIP_TEST_DB = 'true';

import { findUnknownProducts, looksAutoCreated, PAYSERA_AUTO_DESCRIPTION } from '../utils/unknownProducts';

const seeded = ['pro_monthly', 'pro_yearly'];

describe('findUnknownProducts', () => {
  it('lists only products that are not in the seeded catalogue, oldest first', () => {
    const rows = findUnknownProducts(
      [
        { productId: 'pro_monthly', name: 'Pro', price: 25, tier: 'pro' },
        { productId: 'later', name: 'Later', price: 9, tier: 'pro', createdAt: new Date('2026-05-02') },
        { productId: 'earlier', name: 'Earlier', price: 9, tier: 'pro', createdAt: new Date('2026-05-01') },
      ],
      seeded
    );
    expect(rows.map((r) => r.productId)).toEqual(['earlier', 'later']);
  });

  it('flags what the free-coupon route used to create', () => {
    const [row] = findUnknownProducts(
      [{ productId: 'x_enterprise', name: 'Fake Plan', description: 'Fake Plan subscription', price: 0 }],
      seeded
    );
    expect(row.likelyAutoCreated).toBe(true);
  });

  it('flags what the Paysera callback used to create', () => {
    const [row] = findUnknownProducts(
      [{ productId: 'paysera_BE_1', name: 'PaySera Subscription', description: PAYSERA_AUTO_DESCRIPTION, price: 12 }],
      seeded
    );
    expect(row.likelyAutoCreated).toBe(true);
  });

  it('does not flag a product an admin made with a tier', () => {
    const [row] = findUnknownProducts(
      [{ productId: 'spring_pro', name: 'Spring Pro', description: 'Spring Pro subscription', price: 19, tier: 'pro' }],
      seeded
    );
    expect(row.likelyAutoCreated).toBe(false);
  });
});

describe('looksAutoCreated', () => {
  it('needs the old description pattern, not just a missing tier', () => {
    expect(looksAutoCreated({ productId: 'a', name: 'A', description: 'Hand-written', price: 5 })).toBe(false);
  });
});
