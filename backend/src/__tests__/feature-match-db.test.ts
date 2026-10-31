/**
 * Feature matching against a real MongoDB — the regex engine there, not
 * JavaScript's, decides whether accents, case and Greek/Cyrillic text match.
 * Plain documents in a scratch collection; the clauses only read the fields.
 */

import mongoose from 'mongoose';
import { buildFeatureMatchClauses, parseFeatureMatchRequest } from '../services/featureMatch';

const collection = () => mongoose.connection.collection('feature_match_probe');

const match = async (query: Record<string, unknown>): Promise<string[]> => {
  const docs = await collection()
    .find({ $and: buildFeatureMatchClauses(parseFeatureMatchRequest(query)) })
    .toArray();
  return docs.map((d) => String(d.key)).sort();
};

beforeEach(async () => {
  await collection().insertMany([
    { key: 'sq-description', amenities: [], description: 'Apartament me ngrohje në dyshemë dhe pamje panoramike.' },
    { key: 'en-tag', amenities: ['Underfloor heating'], description: '' },
    { key: 'el-title', title: 'ΔΙΑΜΕΡΙΣΜΑ ΜΕ ΠΑΝΟΡΑΜΙΚΗ ΘΕΑ', amenities: [] },
    { key: 'mk-special', specialFeatures: ['Подно греење'], amenities: [] },
    { key: 'nothing', amenities: ['sauna'], description: 'Sea view.' },
    { key: 'lift-box', hasElevator: true, amenities: [] },
    { key: 'lift-text', description: 'Zgrada ima lift.', amenities: [] },
    { key: 'lift-said-no', hasElevator: false, description: 'Nema lift.', amenities: [] },
    { key: 'lift-said-no-but-tagged', hasElevator: false, amenities: ['Ashensor'] },
  ]);
});

it('finds a feature in any language and any field, ignoring accents and case', async () => {
  expect(await match({
    features: 'floor heating|underfloor heating|ngrohje ne dysheme|подно греење',
  })).toEqual(['en-tag', 'mk-special', 'sq-description']);
});

it('finds Greek written in capitals without accents', async () => {
  expect(await match({ features: 'panoramic view|pamje panoramike|πανοραμική θέα' }))
    .toEqual(['el-title', 'sq-description']);
});

it('requires every feature', async () => {
  expect(await match({ features: ['floor heating|ngrohje në dysheme', 'panoramic view|pamje panoramike'] }))
    .toEqual(['sq-description']);
});

it('reads a yes/no feature from the box, a tag or the text — the text only if the seller did not say no', async () => {
  expect(await match({ flags: 'hasElevator' })).toEqual(['lift-box', 'lift-said-no-but-tagged', 'lift-text']);
});
