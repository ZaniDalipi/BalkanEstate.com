/** Residence numbers come from the admin-editable products, with config fallbacks. */
import Product from '../../models/Product';
import { clearResidenceTermsCache, monthsFromDays, residenceTerms } from '../../services/developments/billing/residenceTerms';
import { migrateResidenceProducts } from '../../services/developments/billing/residenceProductMigration';

const product = (productId: string, extra: Record<string, unknown>) =>
  Product.create({ productId, name: productId, price: 1, currency: 'EUR', type: 'non_consumable', ...extra });

beforeEach(() => clearResidenceTermsCache());

describe('residenceTerms', () => {
  it('falls back to the config without products', async () => {
    expect(await residenceTerms()).toEqual({ includedBuildings: 5, passMonths: 12, residencesPerYear: 1 });
  });

  it('reads the numbers an admin set on the products', async () => {
    await product('residence_pass_yearly', { includedBuildings: 8, durationDays: 182 });
    await product('agency_yearly', { residencesPerYear: 2, type: 'subscription' });
    expect(await residenceTerms()).toEqual({ includedBuildings: 8, passMonths: 6, residencesPerYear: 2 });
  });

  it('converts days to whole months', () => {
    expect(monthsFromDays(365)).toBe(12);
    expect(monthsFromDays(30)).toBe(1);
    expect(monthsFromDays(1)).toBe(1);
  });
});

describe('migrateResidenceProducts', () => {
  it('adds the numbers and turns the fixed feature texts into placeholders, once', async () => {
    await product('residence_pass_yearly', { durationDays: 365, features: ['12 months public', '5 buildings included', 'Interactive explorer'] });
    await product('agency_yearly', { type: 'subscription', features: ['750 listings'] });
    expect(await migrateResidenceProducts()).toBe(2);
    const pass = await Product.findOne({ productId: 'residence_pass_yearly' }).lean();
    expect(pass?.features).toEqual(['{durationMonths} months public', '{includedBuildings} buildings included', 'Interactive explorer']);
    expect(pass?.includedBuildings).toBe(5);
    expect((await Product.findOne({ productId: 'agency_yearly' }).lean())?.residencesPerYear).toBe(1);
    expect(await migrateResidenceProducts()).toBe(0);
  });

  it('never overwrites an admin edit', async () => {
    await product('residence_pass_yearly', { includedBuildings: 9, features: ['Big projects welcome'] });
    await migrateResidenceProducts();
    const pass = await Product.findOne({ productId: 'residence_pass_yearly' }).lean();
    expect(pass?.includedBuildings).toBe(9);
    expect(pass?.features).toEqual(['Big projects welcome']);
  });
});
