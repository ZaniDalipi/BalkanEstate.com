process.env.SKIP_TEST_DB = 'true';

import mongoose, { Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../../utils/encodeRefsOnJSON';
import { encodeId } from '../../utils/idObfuscation';

describe('encodeRefsOnJSON', () => {
  it('encodes top-level and nested references, and leaves a missing one alone', () => {
    const schema = new Schema({ ownerId: Schema.Types.ObjectId, builder: { name: String, businessListingId: Schema.Types.ObjectId } });
    encodeRefsOnJSON(schema, ['ownerId', 'builder.businessListingId']);
    const Model = mongoose.model(`EncodeRefs${Date.now()}`, schema);
    const ownerId = new mongoose.Types.ObjectId();
    const businessListingId = new mongoose.Types.ObjectId();
    const json = JSON.parse(JSON.stringify(new Model({ ownerId, builder: { name: 'B', businessListingId } })));
    expect(json.ownerId).toBe(encodeId(String(ownerId)));
    expect(json.builder.businessListingId).toBe(encodeId(String(businessListingId)));
    const bare = JSON.parse(JSON.stringify(new Model({ ownerId })));
    expect(bare.builder?.businessListingId).toBeUndefined();
  });
});
