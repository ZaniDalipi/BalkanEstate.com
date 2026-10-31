/**
 * One-time, idempotent startup step for databases seeded before residence
 * numbers lived on products: give the Residence Pass its included-buildings
 * count and the agency plan its free residences per year, and turn the two
 * fixed numbers in the pass's feature texts into placeholders. Nothing else on
 * existing products changes, and admin edits are never overwritten.
 */
import Product from '../../../models/Product';
import {
  AGENCY_PRODUCT_ID,
  AGENCY_RESIDENCES_PER_YEAR,
  RESIDENCE_INCLUDED_BUILDINGS,
  RESIDENCE_PRODUCTS,
} from '../../../config/residenceBilling';

const FEATURE_PLACEHOLDERS: Record<string, string> = {
  '12 months public': '{durationMonths} months public',
  '5 buildings included': '{includedBuildings} buildings included',
};

export async function migrateResidenceProducts(): Promise<number> {
  let changed = 0;
  const pass = await Product.findOne({ productId: RESIDENCE_PRODUCTS.pass });
  if (pass) {
    let dirty = false;
    if (pass.includedBuildings === undefined || pass.includedBuildings === null) {
      pass.includedBuildings = RESIDENCE_INCLUDED_BUILDINGS;
      dirty = true;
    }
    const features = (pass.features ?? []).map((f) => FEATURE_PLACEHOLDERS[f] ?? f);
    if (features.some((f, i) => f !== pass.features[i])) {
      pass.features = features;
      dirty = true;
    }
    if (dirty) {
      await pass.save();
      changed += 1;
    }
  }
  const agency = await Product.updateOne(
    { productId: AGENCY_PRODUCT_ID, residencesPerYear: { $exists: false } },
    { $set: { residencesPerYear: AGENCY_RESIDENCES_PER_YEAR } }
  );
  return changed + agency.modifiedCount;
}
