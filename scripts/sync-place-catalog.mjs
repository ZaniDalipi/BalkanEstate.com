/**
 * Copies the app's place catalogue — the countries and cities a listing can
 * be filed under (utils/balkanLocations.ts) and the villages / resorts that
 * belong to each city (src/shared/geo/localities.ts) — into
 * backend/src/data/placeCatalog.json, so feed imports file listings under
 * exactly the cities the app offers.
 *
 * The frontend files stay the one source; a test fails when the copy is
 * out of date. Run after editing either file:  npm run sync:places
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// tsconfig maps "@/*" to both the repo root and src/; spell out the folders used.
const jiti = createJiti(import.meta.url, {
  alias: { '@/src': resolve(root, 'src'), '@/shared': resolve(root, 'src/shared'), '@/utils': resolve(root, 'utils'), '@': root },
});

const { BALKAN_LOCATIONS } = await jiti.import(resolve(root, 'utils/balkanLocations.ts'));
const { BALKAN_LOCALITIES } = await jiti.import(resolve(root, 'src/shared/geo/localities.ts'));

const catalogue = {
  countries: BALKAN_LOCATIONS,
  localities: BALKAN_LOCALITIES,
};
const out = resolve(root, 'backend/src/data/placeCatalog.json');
writeFileSync(out, `${JSON.stringify(catalogue, null, 1)}\n`);
console.log(`placeCatalog.json: ${BALKAN_LOCATIONS.length} countries, ${BALKAN_LOCATIONS.reduce((n, c) => n + c.cities.length, 0)} cities, ${BALKAN_LOCALITIES.length} localities`);
